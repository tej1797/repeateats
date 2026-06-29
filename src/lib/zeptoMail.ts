// Transactional email — sends via the shared Supabase `send-email` edge function
// (which talks to ZeptoMail). Web calls the edge fn with the service-role key it
// already has, so the ZeptoMail token lives ONLY as a Supabase edge secret — no
// Vercel env needed. Auth emails (verification/OTP/recovery) ride Supabase SMTP.
//
// Edge fn: POST {SUPABASE_URL}/functions/v1/send-email
//   Authorization: Bearer <service role key>  (not callable with anon key)
//   body { to, to_name?, subject, html, reply_to?, reply_to_name? }
//   → { ok:true } | { ok:true, skipped } (token unset) | { error }
//
// No-ops gracefully if the Supabase URL/service key are missing.

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, skipped: true };

  try {
    const res = await fetch(`${url}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ to, to_name: toName, subject, html, reply_to: replyTo }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `send-email ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}

/** Minimal branded wrapper so transactional emails look consistent (shared with mobile). */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <div style="font-size:22px;font-weight:800;margin-bottom:4px">Rep<span style="color:#E85D04">EAT</span></div>
    <h1 style="font-size:18px;margin:16px 0 12px">${title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#333">${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
    <p style="font-size:12px;color:#999">RepEAT · Ontario restaurant deals · repeateats.ca</p>
  </div>`;
}
