// ZeptoMail transactional email sender (HTTP API).
// Used for app-sent emails (support ticket confirmations, collab notifications…).
// Auth emails (signup verification, OTP, recovery) are sent by Supabase Auth —
// point those at ZeptoMail via Supabase → Auth → SMTP settings (no code).
//
// Env:
//   ZEPTOMAIL_TOKEN — the ZeptoMail "Send Mail" token (a.k.a. enczapikey). Same
//                     token works for SMTP password and the HTTP API.
//   ZEPTOMAIL_FROM  — verified sender, e.g. "noreply@support.repeateats.ca"
//   ZEPTOMAIL_FROM_NAME — display name, defaults to "RepEAT"
//   ZEPTOMAIL_API_URL — defaults to the .ca region endpoint.
//
// No-ops (returns { ok:false, skipped:true }) when ZEPTOMAIL_TOKEN is unset, so
// nothing breaks before the token is configured.

const API_URL = process.env.ZEPTOMAIL_API_URL ?? 'https://api.zeptomail.ca/v1.1/email';

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail({ to, toName, subject, html, replyTo }: SendEmailInput): Promise<SendEmailResult> {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const from  = process.env.ZEPTOMAIL_FROM ?? 'noreply@support.repeateats.ca';
  const fromName = process.env.ZEPTOMAIL_FROM_NAME ?? 'RepEAT';

  if (!token) return { ok: false, skipped: true };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        // ZeptoMail uses this exact scheme; the token already includes its prefix.
        Authorization: token.startsWith('Zoho-enczapikey') ? token : `Zoho-enczapikey ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from: { address: from, name: fromName },
        to: [{ email_address: { address: to, name: toName ?? to } }],
        ...(replyTo ? { reply_to: [{ address: replyTo }] } : {}),
        subject,
        htmlbody: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `ZeptoMail ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}

/** Minimal branded wrapper so transactional emails look consistent. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <div style="font-size:22px;font-weight:800;margin-bottom:4px">Rep<span style="color:#E85D04">EAT</span></div>
    <h1 style="font-size:18px;margin:16px 0 12px">${title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#333">${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
    <p style="font-size:12px;color:#999">RepEAT · Ontario restaurant deals · repeateats.ca</p>
  </div>`;
}
