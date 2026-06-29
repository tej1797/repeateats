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

## 2. App transactional emails (support, collab notifications, …)
These go through the shared Supabase **`send-email`** edge function (which calls
ZeptoMail). **No Vercel env is needed** — web calls the edge fn with the
service-role key it already has, and the ZeptoMail token lives only as a
**Supabase edge secret**.

Set as **Supabase → Edge Functions → Secrets** (same place as the IG secrets —
NOT Vercel):

| Key | Value |
|---|---|
| `ZEPTOMAIL_TOKEN` | the ZeptoMail Send Mail token |
| `ZEPTOMAIL_FROM` | `noreply@support.repeateats.ca` |

`src/lib/zeptoMail.ts` `sendEmail()` POSTs `{SUPABASE_URL}/functions/v1/send-email`
with `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`. No-ops if the URL/service
key are missing; the edge fn no-ops if `ZEPTOMAIL_TOKEN` is unset.

### Wired
- **Support ticket** — DB-triggered (`support_ticket_created_email` →
  `send-support-email`) on any insert (web or mobile). Web does NOT send it
  directly (would duplicate).
- **Collab application received** → restaurant owner (`restaurants.owner_email`).
- **Collab accepted / declined / shortlisted** → creator (`users.email`).

### Easy next uses
- Restaurant notification toggles (Deal claimed / expired / Weekly summary).
Each is one `sendEmail({ to, subject, html: emailLayout(...) })` call.

## Notes
- Region: `.ca` endpoints (`smtp.zeptomail.ca`, `api.zeptomail.ca`). Don't mix with `.com`.
- The Send Mail token is a secret — set it only in Supabase SMTP + Vercel env, never in the repo.
