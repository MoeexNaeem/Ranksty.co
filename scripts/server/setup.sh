#!/usr/bin/env bash
# One-time setup of rankkw.online on this server (run as root, from the cloned
# repo). Safe to re-run.
#
#   git clone https://github.com/MoeexNaeem/Ranksty.co.git /www/wwwroot/rankkw-online
#   bash /www/wwwroot/rankkw-online/scripts/server/setup.sh
#
# Installs Node.js + PM2 if missing, asks you to paste the .env.local, builds and
# starts the site as PM2 app `rankkw-online` on 127.0.0.1:3300, and puts nginx in
# front for rankkw.online (Cloudflare connects to it on port 443). Other sites on
# this server (guestposting.live on 3100, anything on port 80) are left untouched.
set -euo pipefail

main() {

APP=rankkw-online
DOMAIN=rankkw.online
PORT=3300
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

say()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mXX  %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Please run this as root."
cd "$APP_DIR"
[ -f package.json ] && grep -q '"name": "rankkw-online"' package.json || die "Run this from the rankkw.online code folder (got $APP_DIR)."

if command -v apt-get >/dev/null 2>&1; then PKG=apt
elif command -v dnf >/dev/null 2>&1; then PKG=dnf
elif command -v yum >/dev/null 2>&1; then PKG=yum
else die "Unsupported system (no apt, dnf or yum)."; fi
pkg_install() {
  if [ "$PKG" = apt ]; then DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"; else "$PKG" install -y "$@"; fi
}

# ---------------------------------------------------------------- 1. tools
say "1/7 Tools"
[ "$PKG" = apt ] && apt-get update -y >/dev/null
pkg_install git curl openssl ca-certificates >/dev/null
node_ok() {
  command -v node >/dev/null 2>&1 &&
    node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>20||(a===20&&b>=9)?0:1)'
}
if node_ok; then
  echo "Node.js $(node -v) already installed"
else
  say "Installing Node.js 22"
  if [ "$PKG" = apt ]; then curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  else curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - >/dev/null; fi
  pkg_install nodejs >/dev/null
  hash -r
  node_ok || die "Node.js 20.9+ is required but $(node -v 2>/dev/null || echo 'none') is active."
fi
command -v pm2 >/dev/null 2>&1 || { say "Installing PM2"; npm install -g pm2 >/dev/null; }

# The build needs about 2 GB of memory. On a small server without swap, add 2 GB
# of swap so the build is not killed (it is only used when memory runs short).
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -lt 4096 ] && [ "$SWAP_MB" -lt 1024 ] && [ ! -e /swapfile ]; then
  say "Adding 2 GB swap (server has ${MEM_MB} MB memory and no swap)"
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------------------------------------------------------------- 2. settings
say "2/7 Settings (.env.local)"
if [ -f .env.local ]; then
  echo "Keeping the existing $APP_DIR/.env.local"
else
  echo "Open D:\\LET RANK\\Ranktsy\\.env.server on your PC, copy ALL of it,"
  echo "paste it here, then press Enter and Ctrl+D."
  umask 077
  cat > .env.local.tmp </dev/tty
  grep -q '^MONGODB_URI=' .env.local.tmp || { rm -f .env.local.tmp; die "That did not look like the env file (no MONGODB_URI). Run this again."; }
  mv .env.local.tmp .env.local
  chmod 600 .env.local
  echo "Saved $APP_DIR/.env.local"
fi
grep -q '^MONGODB_URI=.*/guestpost?' .env.local && die "MONGODB_URI points at the guestpost database (the guest post site's). Use /rankkw_online instead."
grep -qE '^ETSY_API_KEY=.+' .env.local || warn "ETSY_API_KEY is empty: the site will run, but Etsy tools fail until you add the rankkw.online Etsy app's keystring and shared secret."

# ---------------------------------------------------------------- 3. build + run
say "3/7 Building and starting (a few minutes)"
if ss -ltnH "sport = :$PORT" 2>/dev/null | grep -q . && ! pm2 describe "$APP" >/dev/null 2>&1; then
  die "Port $PORT is already used by another program."
fi
bash scripts/deploy.sh
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || warn "Could not enable PM2 start-on-boot (run: pm2 startup)."
pm2 save >/dev/null

# ---------------------------------------------------------------- 4. nginx
say "4/7 nginx for $DOMAIN"
OWNER80=$(ss -ltnpH 'sport = :80' 2>/dev/null | grep -o '(("[^"]*"' | head -1 | tr -d '("' || true)
HTTPS_ONLY=0
if [ -n "$OWNER80" ] && [ "$OWNER80" != nginx ]; then
  HTTPS_ONLY=1
  echo "Port 80 belongs to $OWNER80 (left untouched); nginx serves $DOMAIN on port 443"
fi
if [ -x /www/server/nginx/sbin/nginx ]; then
  NGINX=/www/server/nginx/sbin/nginx; CONF_DIR=/www/server/panel/vhost/nginx; SYSTEM_NGINX=0
  echo "Using aaPanel's nginx"
else
  SYSTEM_NGINX=1; CONF_DIR=/etc/nginx/conf.d
  if ! command -v nginx >/dev/null 2>&1; then
    echo "Installing nginx"
    if [ "$HTTPS_ONLY" = 1 ] && [ "$PKG" = apt ] && [ ! -e /usr/sbin/policy-rc.d ]; then
      printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod +x /usr/sbin/policy-rc.d
      pkg_install nginx >/dev/null || { rm -f /usr/sbin/policy-rc.d; die "Installing nginx failed."; }
      rm -f /usr/sbin/policy-rc.d
    else
      pkg_install nginx >/dev/null
    fi
  fi
  NGINX=$(command -v nginx)
  [ "$HTTPS_ONLY" = 1 ] && rm -f /etc/nginx/sites-enabled/default
fi
mkdir -p "$CONF_DIR"

# Certificate for the Cloudflare -> server hop (Cloudflare SSL/TLS mode "Full").
CERT_DIR=/etc/ssl/rankkw-online
if [ ! -s "$CERT_DIR/fullchain.pem" ]; then
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -subj "/CN=$DOMAIN" -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN" \
    -keyout "$CERT_DIR/privkey.pem" -out "$CERT_DIR/fullchain.pem" >/dev/null 2>&1
  chmod 600 "$CERT_DIR/privkey.pem"
fi
if [ "$HTTPS_ONLY" = 1 ]; then LISTEN="listen 443 ssl;"; else LISTEN="listen 80;
    listen 443 ssl;"; fi

cat > "$CONF_DIR/$DOMAIN.conf" <<EOF
# rankkw.online -> Next.js on 127.0.0.1:$PORT (written by scripts/server/setup.sh)
server {
    $LISTEN
    server_name www.$DOMAIN;
    ssl_certificate     $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    return 301 https://$DOMAIN\$request_uri;
}

server {
    $LISTEN
    server_name $DOMAIN;
    ssl_certificate     $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header CF-Connecting-IP \$http_cf_connecting_ip;
        proxy_read_timeout 300s;
    }
}
EOF
"$NGINX" -t || die "nginx rejected the config ($CONF_DIR/$DOMAIN.conf)."
if [ "$SYSTEM_NGINX" = 1 ]; then
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl reload nginx 2>/dev/null || systemctl restart nginx || die "nginx did not start. See: journalctl -u nginx -n 30"
else
  "$NGINX" -s reload 2>/dev/null || "$NGINX"
fi
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 443/tcp >/dev/null
elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
  firewall-cmd --permanent --add-service=https >/dev/null; firewall-cmd --reload >/dev/null
fi

# ---------------------------------------------------------------- 5. daily job
say "5/7 Daily snapshot job (03:00)"
CRON_SECRET=$(grep -E '^CRON_SECRET=' .env.local | head -1 | cut -d= -f2- | tr -d "\"'")
if [ -n "$CRON_SECRET" ]; then
  LINE="0 3 * * * curl -s -m 600 -H 'Authorization: Bearer $CRON_SECRET' http://127.0.0.1:$PORT/api/cron/snapshot >/dev/null 2>&1 # rankkw-online"
  ( crontab -l 2>/dev/null | grep -v '# rankkw-online$' || true; echo "$LINE" ) | crontab -
  echo "Added (crontab -l to see it)"
else
  warn "No CRON_SECRET in .env.local: the daily snapshot job was not added."
fi

# ---------------------------------------------------------------- 6. checks
say "6/7 Checking"
problems=0
code=$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" || true)
if [ "$code" = 200 ]; then echo "OK   $DOMAIN answers through nginx on port 443"; else warn "HTTPS returned $code"; problems=1; fi
if curl -s -m 30 "http://127.0.0.1:$PORT/api/health" | grep -q '"ok":true'; then
  echo "OK   database connected"
else
  warn "The database did not answer. In MongoDB Atlas > Network Access add this server's IP: $(curl -s --max-time 5 https://api.ipify.org || echo 'see your server IP'), then run: pm2 restart $APP"
  problems=1
fi

# ---------------------------------------------------------------- 7. done
say "7/7 Done"
if [ "$problems" = 0 ]; then
  echo "rankkw.online is running. In Cloudflare: A record @ -> this server (orange cloud), SSL/TLS mode Full."
else
  warn "Setup finished with the problems above."
fi
echo
echo "Future updates:  bash $APP_DIR/scripts/deploy.sh"
echo "Logs:            pm2 logs $APP"
}

main "$@"
