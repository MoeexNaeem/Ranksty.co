# Deploying rankkw.online on the Contabo server

rankkw.online runs on the same Contabo server as rankkw.com, as its own PM2 app
(`rankkw-online`, port 3300, local only). Its data lives in MongoDB Atlas, cluster
`database.vjpfzm9`, database **`rankkw_online`**. It shares nothing with rankkw.com
except the machine.

Run everything below in the server terminal (aaPanel > Terminal, or SSH).

## 1. Database (MongoDB Atlas)

- Database name: **`rankkw_online`**. Never `guestpost`: that one belongs to the
  guest post website, and both apps keep their accounts in a `users` collection,
  so sharing it would mix the two sites' users. Atlas creates `rankkw_online` by
  itself on the first write; there is nothing to create by hand.
- Atlas > Network Access: add the Contabo server's public IP (the one rankkw.com's
  server uses). Without it the app cannot reach the database.
- The connection string is the cluster's usual one with `/rankkw_online?` as the
  database part:
  `mongodb+srv://<user>:<password>@database.vjpfzm9.mongodb.net/rankkw_online?retryWrites=true&w=majority&appName=Database`

## 2. Code and environment

```bash
cd /www/wwwroot
git clone https://github.com/MoeexNaeem/Ranksty.co.git rankkw-online
cd rankkw-online
cp .env.local.example .env.local
nano .env.local
```

In `.env.local` set at least:

| Variable | Value |
|---|---|
| `MONGODB_URI` | the Atlas string from step 1 (database **`rankkw_online`**) |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://rankkw.online` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | two **different** long random values (if they are equal, a 30-day refresh token also passes as a login token) |
| `ETSY_API_KEY`, `ETSY_SHARED_SECRET` | the keystring and shared secret of the **rankkw.online** Etsy app |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | the support@rankkw.online mailbox (a personal Gmail works, but its emails then come from that Gmail address) |
| `ADMIN_EMAILS` | your admin email(s) only |
| `SUPPORT_EMAIL` | `support@rankkw.online` (where contact-form messages go) |
| `CRON_SECRET` | a long random value |
| `TOKEN_ENC_KEY` | its own random key, set before any shop connects (encrypts saved Etsy shop tokens; without it the key is derived from `JWT_SECRET`, so rotating that later would lock out every connected shop) |
| `GEMINI_API_KEY` (or `Gemini_API_KEY`), Google Ads keys | as before |

Then build and start:

```bash
npm install --no-audit --no-fund
npm run build
pm2 start ecosystem.config.cjs
pm2 save
curl -s http://127.0.0.1:3300/api/health     # expects "ok":true
```

Later deploys: `bash scripts/deploy.sh` (safe build, swap, health check, auto rollback).

## 3. Website (nginx) and SSL

1. Cloudflare: add rankkw.online, set an `A` record for `@` and `www` to the
   server's IP, proxy ON (orange cloud), SSL/TLS mode **Full**.
2. aaPanel > Website > Add site: `rankkw.online` and `www.rankkw.online`.
3. Site > Reverse proxy: target `http://127.0.0.1:3300`, send host `$host`.
4. Site > SSL: Cloudflare Origin Certificate (or Let's Encrypt), force HTTPS.
5. Open https://rankkw.online and https://rankkw.online/api/health.

## 4. Daily snapshot job (replaces the old Vercel cron)

```bash
crontab -e
```
add (03:00 server time every day):
```
0 3 * * * curl -s -m 600 -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3300/api/cron/snapshot >/dev/null 2>&1
```

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
