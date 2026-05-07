#!/usr/bin/env bash
# Outflow — zero-downtime deploy for the host-nginx variant.
#
# Use when the box already has its own nginx + certbot (multi-tenant droplet).
# Pulls images, runs migrations, rolls api → web. Does NOT touch host nginx.
# Reload host nginx by hand if you've changed the site config:
#   sudo nginx -t && sudo systemctl reload nginx

set -euo pipefail

cd "$(dirname "$0")/../.."

ENV_FILE=".env"
COMPOSE_FILE="docker-compose.host-nginx.yml"
TAG="${1:-${IMAGE_TAG:-latest}}"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }

if grep -qE "^IMAGE_TAG=" "$ENV_FILE"; then
    sed -i.bak -E "s|^IMAGE_TAG=.*|IMAGE_TAG=$TAG|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
else
    echo "IMAGE_TAG=$TAG" >> "$ENV_FILE"
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
COMPOSE() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

echo "==> Deploying image tag '$TAG' (host-nginx variant)"

COMPOSE pull api web migrate
COMPOSE run --rm migrate

COMPOSE up -d --no-deps --force-recreate api
echo "    waiting for api to become healthy..."
for i in {1..40}; do
    state=$(docker inspect --format='{{.State.Health.Status}}' "$(COMPOSE ps -q api)" 2>/dev/null || echo "starting")
    [[ "$state" == "healthy" ]] && break
    sleep 2
    [[ $i -eq 40 ]] && {
        echo "API failed to become healthy. Last logs:" >&2
        COMPOSE logs --tail=120 api >&2
        exit 1
    }
done

COMPOSE up -d --no-deps --force-recreate web
echo "    waiting for web to become healthy..."
for i in {1..40}; do
    state=$(docker inspect --format='{{.State.Health.Status}}' "$(COMPOSE ps -q web)" 2>/dev/null || echo "starting")
    [[ "$state" == "healthy" ]] && break
    sleep 2
    [[ $i -eq 40 ]] && {
        echo "Web failed to become healthy. Last logs:" >&2
        COMPOSE logs --tail=120 web >&2
        exit 1
    }
done

docker image prune -f >/dev/null 2>&1 || true

echo
echo "==> Deploy complete. Tag: $TAG"
COMPOSE ps
