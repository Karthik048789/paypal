/**
 * PayGuard Escrow - PayPal API Client
 * Wraps PayPal Orders v2 & Payments v2 API endpoints
 */

export interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
}

function getCredentials(): PayPalCredentials {
  return {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
  };
}

function getBaseUrl(mode: 'sandbox' | 'live'): string {
  return mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const creds = getCredentials();

  // If using demo mock credentials, return a mock token
  if (
    !creds.clientId ||
    !creds.clientSecret ||
    (creds.clientId.startsWith('sb-client-id') && creds.clientSecret.startsWith('sb-client-secret'))
  ) {
    return 'mock_access_token_' + Date.now();
  }

  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60000) {
    return cachedAccessToken.token;
  }

  const authHeader = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const res = await fetch(`${getBaseUrl(creds.mode)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`PayPal OAuth failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Creates PayPal Order with intent=AUTHORIZE (FR-10)
 */
export async function createPayPalAuthorizeOrder({
  jobId,
  amountCents,
  freelancerEmail,
  description,
}: {
  jobId: string;
  amountCents: number;
  freelancerEmail: string;
  description: string;
}) {
  const creds = getCredentials();
  const token = await getPayPalAccessToken();
  const amountStr = (amountCents / 100).toFixed(2);

  // Mock response for offline/sandbox development
  if (token.startsWith('mock_access_token_')) {
    return {
      id: `ORDER-MOCK-${Date.now()}`,
      status: 'CREATED',
      intent: 'AUTHORIZE',
      purchase_units: [
        {
          reference_id: jobId,
          amount: { currency_code: 'USD', value: amountStr },
          payee: { email_address: freelancerEmail },
        },
      ],
    };
  }

  const payload: Record<string, unknown> = {
    intent: 'AUTHORIZE',
    purchase_units: [
      {
        reference_id: jobId,
        description: description.slice(0, 127),
        amount: {
          currency_code: 'USD',
          value: amountStr,
        },
      },
    ],
  };

  if (freelancerEmail) {
    (payload.purchase_units as any[])[0].payee = { email_address: freelancerEmail };
  }

  const res = await fetch(`${getBaseUrl(creds.mode)}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create PayPal order: ${errorText}`);
  }

  return await res.json();
}

/**
 * Authorizes a buyer-approved PayPal order (FR-11)
 */
export async function authorizePayPalOrder(orderId: string) {
  const creds = getCredentials();
  const token = await getPayPalAccessToken();

  if (token.startsWith('mock_access_token_')) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 29); // 29 days authorization validity
    return {
      id: orderId,
      status: 'COMPLETED',
      purchase_units: [
        {
          payments: {
            authorizations: [
              {
                id: `AUTH-MOCK-${Date.now()}`,
                status: 'CREATED',
                expiration_time: expiresAt.toISOString(),
              },
            ],
          },
        },
      ],
    };
  }

  const res = await fetch(`${getBaseUrl(creds.mode)}/v2/checkout/orders/${orderId}/authorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to authorize PayPal order: ${errorText}`);
  }

  return await res.json();
}

/**
 * Captures an authorized payment (FR-26, BR-1, BR-2)
 * Supports idempotency header PayPal-Request-Id
 */
export async function capturePayPalAuthorization({
  authId,
  amountCents,
  finalCapture,
  idempotencyKey,
}: {
  authId: string;
  amountCents: number;
  finalCapture: boolean;
  idempotencyKey: string;
}) {
  const creds = getCredentials();
  const token = await getPayPalAccessToken();
  const amountStr = (amountCents / 100).toFixed(2);

  if (token.startsWith('mock_access_token_')) {
    return {
      id: `CAPTURE-MOCK-${Date.now()}`,
      status: 'COMPLETED',
      final_capture: finalCapture,
      amount: { currency_code: 'USD', value: amountStr },
    };
  }

  const res = await fetch(`${getBaseUrl(creds.mode)}/v2/payments/authorizations/${authId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': idempotencyKey,
    },
    body: JSON.stringify({
      amount: {
        currency_code: 'USD',
        value: amountStr,
      },
      final_capture: finalCapture,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`PayPal capture failed (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Voids an authorization hold (FR-36, FR-37)
 */
export async function voidPayPalAuthorization({
  authId,
  idempotencyKey,
}: {
  authId: string;
  idempotencyKey: string;
}) {
  const creds = getCredentials();
  const token = await getPayPalAccessToken();

  if (token.startsWith('mock_access_token_')) {
    return {
      id: authId,
      status: 'VOIDED',
    };
  }

  const res = await fetch(`${getBaseUrl(creds.mode)}/v2/payments/authorizations/${authId}/void`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': idempotencyKey,
    },
  });

  if (!res.ok && res.status !== 204) {
    const errorText = await res.text();
    throw new Error(`PayPal void failed (${res.status}): ${errorText}`);
  }

  return { id: authId, status: 'VOIDED' };
}

/**
 * Reauthorizes an existing authorization hold after honor period (FR-13, Section 3.8)
 */
export async function reauthorizePayPalHold({
  authId,
  amountCents,
}: {
  authId: string;
  amountCents: number;
}) {
  const creds = getCredentials();
  const token = await getPayPalAccessToken();
  const amountStr = (amountCents / 100).toFixed(2);

  if (token.startsWith('mock_access_token_')) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 29);
    return {
      id: `REAUTH-MOCK-${Date.now()}`,
      status: 'CREATED',
      expiration_time: expiresAt.toISOString(),
    };
  }

  const res = await fetch(`${getBaseUrl(creds.mode)}/v2/payments/authorizations/${authId}/reauthorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: {
        currency_code: 'USD',
        value: amountStr,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`PayPal reauthorization failed: ${errorText}`);
  }

  return await res.json();
}

