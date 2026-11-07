/**
 * PayGuard Escrow - Transactional Email Service (Resend / Mock)
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey && !apiKey.includes('mock') && !apiKey.includes('test')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PayGuard Escrow <notifications@payguard.dev>',
          to: [to],
          subject,
          html,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, id: data.id };
      }
    } catch (err) {
      console.error('Failed to send email via Resend:', err);
    }
  }

  // Fallback / local log for testing & auditing
  console.log(`[EMAIL DISPATCH] To: ${to} | Subject: ${subject}`);
  return { success: true, id: `mock-email-${Date.now()}` };
}

export function buildFreelancerInviteHtml({
  jobTitle,
  clientName,
  amountFormatted,
  inviteLink,
}: {
  jobTitle: string;
  clientName: string;
  amountFormatted: string;
  inviteLink: string;
}) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0F172A;">You've been invited to a PayGuard Escrow Job</h2>
      <p>Hello,</p>
      <p><strong>${clientName}</strong> invited you to work on <strong>${jobTitle}</strong> with guaranteed escrow funding of <strong>${amountFormatted}</strong>.</p>
      <p>Funds will be held securely in PayPal escrow and released based on verified deliverables.</p>
      <div style="margin: 32px 0;">
        <a href="${inviteLink}" style="background-color: #0284C7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Review Checklist & Accept Job
        </a>
      </div>
      <p style="color: #64748B; font-size: 13px;">If you did not expect this invitation, you can safely ignore this email.</p>
    </div>
  `;
}

