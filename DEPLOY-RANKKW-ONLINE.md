# Deploying rankkw.online

rankkw.online runs on its own server, **13.140.168.178** (aaPanel), as the PM2 app
`rankkw-online` on 127.0.0.1:3300, behind nginx on port 443 and Cloudflare. Its
data lives in MongoDB Atlas, cluster `database.vjpfzm9`, database
**`rankkw_online`**. It shares nothing with rankkw.com.

## 1. Before you start

- **Cloudflare DNS** (zone rankkw.online): `A` record `@` -> `13.140.168.178`,
  proxied (orange cloud); `CNAME` `www` -> `rankkw.online`, proxied. SSL/TLS
  mode **Full**.
- **Atlas > Network Access**: add `13.140.168.178`. Without it the app cannot
  reach the database.
- **Database name**: `rankkw_online`, never `guestpost` (that one belongs to the
  guest post website; both apps keep accounts in a `users` collection). Atlas
  creates it on the first write.
- **Settings file**: `.env.server` on your PC (gitignored, never committed). It
  holds the production values, with its own JWT, token-encryption and cron
  secrets.

## 2. Setup (one command, as root in the server terminal)

```bash
git clone https://github.com/MoeexNaeem/Ranksty.co.git /www/wwwroot/rankkw-online
bash /www/wwwroot/rankkw-online/scripts/server/setup.sh
```

When it asks, paste all of `.env.server`, press Enter, then Ctrl+D. The script
installs Node.js and PM2 if needed, builds and starts the app, writes the nginx
site (port 443, self-signed origin certificate for Cloudflare "Full"), adds the
daily 03:00 snapshot job to root's crontab and checks the site and database.
It leaves other sites on the server alone. Safe to re-run.

Later updates: `cd /www/wwwroot/rankkw-online && git pull && bash scripts/deploy.sh`
(build on the side, swap, health check, automatic rollback).

## 3. Settings reference (`.env.local` on the server)

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas string with `/rankkw_online?` as the database part |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://rankkw.online` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | two **different** long random values |
| `TOKEN_ENC_KEY` | its own random key; never change it once shops are connected (it encrypts saved Etsy shop tokens) |
| `ETSY_API_KEY`, `ETSY_SHARED_SECRET` | keystring and shared secret of the **rankkw.online** Etsy app |
| `ETSY_REDIRECT_URI` | `https://rankkw.online/api/etsy/oauth/callback` |
| `SMTP_*`, `EMAIL_FROM` | the mailbox that sends codes and contact mail |
| `SUPPORT_EMAIL` | where contact-form messages go |
| `ADMIN_EMAILS` | your admin email(s) only |
| `CRON_SECRET` | long random value (used by the daily job) |
| `GEMINI_API_KEY`, Google Ads keys | as before |

After editing it on the server: `pm2 restart rankkw-online` (or
`bash scripts/deploy.sh` for `NEXT_PUBLIC_*` changes, which are built in).

## 4. Email to support@rankkw.online

Cloudflare > rankkw.online > Email > Email Routing: create `support@rankkw.online`
forwarding to your inbox. Then set `SUPPORT_EMAIL=support@rankkw.online`.

## 5. Etsy app (for Commercial Access)

In the Etsy developer portal, for the **rankkw.online** app:

- App name: **Rankkw** (no "Etsy" or "-tsy" in it), website `https://rankkw.online`.
- Callback URL: `https://rankkw.online/api/etsy/oauth/callback`
- Then "Request Commercial Access". Describe it as a keyword research and shop
  analytics tool for Etsy sellers that uses only the official API, OAuth (PKCE)
  for shop data, and caches listing data for at most 5 hours.

What the site already does for the review:

- The required disclaimer, word for word, in the site footer, dashboard footer,
  Terms, Service Policy and Methodology: "The term 'Etsy' is a trademark of Etsy,
  Inc. This application uses the Etsy API but is not endorsed or certified by
  Etsy, Inc."
- Only the official Etsy Open API v3; no scraping.
- Every call sends the keystring **and** shared secret (`x-api-key`), required
  since 9 February 2026.
- OAuth with PKCE for private shop data.
- Listing data is shown at most 5 hours old (Etsy allows 6), including the
  saved packages in Collective Keyword Search.
- Privacy Policy, Terms, Refund, Service Policy, Methodology, About and a
  working Contact form, all on rankkw.online.
- No invented figures, testimonials or "featured in" logos.
