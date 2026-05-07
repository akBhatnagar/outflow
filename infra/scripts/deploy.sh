#!/usr/bin/env bash
# Outflow — zero-downtime deploy.
#
# Pulls the new image tag and rolls services one at a time. Triggered:
#   - manually:    bash infra/scripts/deploy.sh latest
#   - via CI:      ssh outflow@droplet 'cd /opt/outflow && IMAGE_TAG=<sha> bash infra/scripts/deploy.sh'
#
# We rely on Docker Compose's healthchecks: a service is only treated as up
# once it answers /health/ready (api) or '/' (web).

set -euo pipefail

cd "$(dirname "$0")/../.."

ENV_FILE=".env"
COMPOSE_FILE="docker-compose.prod.yml"
TAG="${1:-${IMAGE_TAG:-latest}}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE — run infra/scripts/bootstrap-droplet.sh first." >&2
    exit 1
fi

# Persist the new tag so future commands see the same value.
if grep -qE "^IMAGE_TAG=" "$ENV_FILE"; then
    sed -i.bak -E "s|^IMAGE_TAG=.*|IMAGE_TAG=$TAG|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
else
    echo "IMAGE_TAG=$TAG" >> "$ENV_FILE"
fi

# Re-source so the COMPOSE() helper picks up GHCR_OWNER / IMAGE_TAG.
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
COMPOSE() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

echo "==> Deploying image tag '$TAG'"

# 1) Pre-pull the new image so the cutover is fast and atomic.
COMPOSE pull api web migrate

# 2) Run migrations to completion.
COMPOSE run --rm migrate

# 3) Restart api first (the web app talks to it).
COMPOSE up -d --no-deps --force-recreate api
echo "    waiting for api to become healthy..."
for i in {1..30}; do
    state=$(docker inspect --format='{{.State.Health.Status}}' "$(COMPOSE ps -q api)" 2>/dev/null || echo "starting")
    [[ "$state" == "healthy" ]] && break
    sleep 2
    [[ $i -eq 30 ]] && {
        echo "API failed to become healthy. Last logs:" >&2
        COMPOSE logs --tail=80 api >&2
        exit 1
    }
done

# 4) Restart the web app.
COMPOSE up -d --no-deps --force-recreate web
echo "    waiting for web to become healthy..."
for i in {1..30}; do
    state=$(docker inspect --format='{{.State.Health.Status}}' "$(COMPOSE ps -q web)" 2>/dev/null || echo "starting")
    [[ "$state" == "healthy" ]] && break
    sleep 2
    [[ $i -eq 30 ]] && {
        echo "Web failed to become healthy. Last logs:" >&2
        COMPOSE logs --tail=80 web >&2
        exit 1
    }
done

# 5) Reload nginx in case any conf files in the repo changed.
if COMPOSE ps -q nginx >/dev/null 2>&1; then
    COMPOSE exec nginx nginx -t && COMPOSE exec nginx nginx -s reload || true
fi

# 6) Cull dangling images we no longer need.
docker image prune -f >/dev/null 2>&1 || true

echo
echo "==> Deploy complete. Tag: $TAG"
COMPOSE ps
