# Email — ZeptoMail setup

RepEAT sends two kinds of email. Both route through ZeptoMail.

## 1. Auth emails (signup verification, OTP codes, password/PIN recovery, magic links)
These are sent by **Supabase Auth**, not app code. Point Supabase at ZeptoMail SMTP:

**Supabase dashboard → Project → Authentication → Emails → SMTP Settings → Enable Custom SMTP:**
- Sender email: `noreply@support.repeateats.ca` (must be on the verified ZeptoMail domain)
- Sender name: `RepEAT`
- Host: `smtp.zeptomail.ca`
- Port: `587` (TLS) — or `465` (SSL)
- Username: `emailapikey`
- Password: *(your ZeptoMail **Send Mail token** — the SMTP password from the Zepto dashboard)*

Save. Supabase will now send all auth emails via ZeptoMail. (DNS: the CNAME/TXT you added in Porkbun for ZeptoMail domain verification must be verified — confirm in the ZeptoMail dashboard.)

## 2. App transactional emails (support ticket confirmations, collab notifications, …)
Sent by app code via `src/lib/zeptoMail.ts` (ZeptoMail HTTP API). Set these env vars in **Vercel → Settings → Environment Variables** (then redeploy):

| Key | Value |
|---|---|
| `ZEPTOMAIL_TOKEN` | the ZeptoMail Send Mail token (same value as the SMTP password) |
| `ZEPTOMAIL_FROM` | `noreply@support.repeateats.ca` |
| `ZEPTOMAIL_FROM_NAME` | `RepEAT` (optional) |
| `ZEPTOMAIL_API_URL` | optional; defaults to `https://api.zeptomail.ca/v1.1/email` |

Until `ZEPTOMAIL_TOKEN` is set, `sendEmail()` no-ops gracefully (nothing breaks).

### Wired so far
- **Support ticket confirmation** — `POST /api/support/tickets` emails the contact address a "request received" confirmation.

### Easy next uses (not wired yet)
- Collab application received (→ restaurant), accepted/declined (→ creator).
- Restaurant notification toggles (Deal claimed / expired / Collab requests / Weekly summary).
Each is one `sendEmail({ to, subject, html: emailLayout(...) })` call at the relevant event.

## Notes
- Region: `.ca` endpoints (`smtp.zeptomail.ca`, `api.zeptomail.ca`). Don't mix with `.com`.
- The Send Mail token is a secret — set it only in Supabase SMTP + Vercel env, never in the repo.
