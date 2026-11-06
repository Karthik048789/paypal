import crypto from 'crypto';
import dns from 'dns/promises';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hexKey = process.env.CREDENTIALS_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypts sensitive test credentials with AES-256-GCM (NFR-S3)
 */
export function encryptCredentials(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts sensitive test credentials with AES-256-GCM (NFR-S3)
 */
export function decryptCredentials(cipherString: string): string {
  if (!cipherString) return '';
  const parts = cipherString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted credentials format.');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * SSRF URL Validator (FR-15, NFR-S5)
 * - Only HTTPS protocol
 * - Valid domain format
 * - Resolves hostname and verifies no private/loopback/cloud metadata IP ranges
 * - Max length 2048 chars
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  // Normalize IPv6 mapped IPv4
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  // IPv6 loopback / local / unique local
  if (ip === '::1' || ip === '::' || ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fe80')) {
    return true;
  }

  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const [b0, b1] = parts;
    if (b0 === 127) return true; // 127.0.0.0/8 (Loopback)
    if (b0 === 10) return true; // 10.0.0.0/8 (Private)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12 (Private)
    if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16 (Private)
    if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 (Link-local & AWS metadata 169.254.169.254)
    if (b0 === 0) return true; // 0.0.0.0/8 (Current network)
    if (b0 >= 224) return true; // Multicast / Future use
  }

  return false;
}

export async function validateSubmissionUrl(inputUrl: string): Promise<{ valid: boolean; error?: string }> {
  if (!inputUrl || inputUrl.length > 2048) {
    return { valid: false, error: 'URL is required and must not exceed 2048 characters.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return { valid: false, error: 'Malformed URL provided.' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'URL must use secure HTTPS protocol.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Disallow localhost or IP literals directly in URL
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { valid: false, error: 'Localhost and internal hostnames are prohibited (SSRF prevention).' };
  }

  // Check if hostname is an IP address
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateOrReservedIP(hostname)) {
      return { valid: false, error: 'Access to private or loopback IP ranges is prohibited (SSRF prevention).' };
    }
  }

  // Resolve hostname via DNS to verify it doesn't resolve to private IP
  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    for (const record of lookupResults) {
      if (isPrivateOrReservedIP(record.address)) {
        return {
          valid: false,
          error: `Domain ${hostname} resolves to prohibited private/internal IP address: ${record.address}.`,
        };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DNS lookup failed';
    return { valid: false, error: `Domain could not be resolved: ${message}` };
  }

  return { valid: true };
}

/**
 * Builds standard idempotency keys (Section 3.4 & Shared Contracts)
 * 'job:{id}:run:{id}:capture'
 */
export function buildCaptureIdempotencyKey(jobId: string, runId: string): string {
  return `job:${jobId}:run:${runId}:capture`;
}

export function buildVoidIdempotencyKey(jobId: string, reason: string): string {
  const sanitizedReason = reason.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  return `job:${jobId}:void:${sanitizedReason}`;
}

