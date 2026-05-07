#!/usr/bin/env bash
# Outflow — first-time SSL provisioning.
#
# Idempotent: safe to re-run after a Let's Encrypt rate-limit, expired cert,
# or a domain change. Reads APP_DOMAIN + ACME_EMAIL from /opt/outflow/.env.
#
# Strategy:
#   1) Spin up nginx with a 1-day self-signed dummy cert at the expected path
#      (without it nginx refuses to start).
#   2) Solve the HTTP-01 challenge via webroot, replacing the dummy with a
#      real Let's Encrypt cert.
#   3) Reload nginx to pick up the real cert.

set -euo pipefail

cd "$(dirname "$0")/../.."   # land in repo root (/opt/outflow on droplet)
ENV_FILE=".env"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE — run infra/scripts/bootstrap-droplet.sh first." >&2
    exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
: "${APP_DOMAIN:?APP_DOMAIN must be set in $ENV_FILE}"
: "${ACME_EMAIL:?ACME_EMAIL must be set in $ENV_FILE}"

DOMAIN="$APP_DOMAIN"
LIVE_DIR="/etc/letsencrypt/live/$DOMAIN"
COMPOSE() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

echo "==> Init Let's Encrypt for $DOMAIN  (account email: $ACME_EMAIL)"

# Bring base infra up so the migrate + api boot when nginx is ready later.
# We can defer api/web until after the cert exists since they don't need 80/443.
COMPOSE up -d postgres redis

# 1) Dummy cert so nginx can boot
echo "==> Creating dummy self-signed cert"
COMPOSE run --rm --entrypoint "sh -c '
  mkdir -p \"$LIVE_DIR\" &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout \"$LIVE_DIR/privkey.pem\" \
    -out    \"$LIVE_DIR/fullchain.pem\" \
    -subj \"/CN=$DOMAIN\" \
'" certbot

# Boot api/web/nginx now that the cert path exists.
COMPOSE up -d api web nginx

# 2) Replace dummy with real Let's Encrypt cert
echo "==> Removing dummy cert and requesting real one"
COMPOSE run --rm --entrypoint "sh -c '
  rm -rf \"/etc/letsencrypt/live/$DOMAIN\" \"/etc/letsencrypt/archive/$DOMAIN\" \"/etc/letsencrypt/renewal/$DOMAIN.conf\"
'" certbot

COMPOSE run --rm --entrypoint "sh -c '
  certbot certonly --webroot -w /var/www/certbot \
    --email \"$ACME_EMAIL\" --agree-tos --no-eff-email \
    --rsa-key-size 4096 \
    -d \"$DOMAIN\"
'" certbot

# 3) Reload nginx with the real cert
echo "==> Reloading nginx"
COMPOSE exec nginx nginx -s reload

# Bring up the renewal sidecar last
COMPOSE up -d certbot

echo
echo "==> Done. Verify with:"
echo "    curl -I https://$DOMAIN/health/ready"
