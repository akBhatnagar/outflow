#!/usr/bin/env bash
# Outflow droplet bootstrap.
#
# Usage (run as root on a fresh Ubuntu 22.04 / 24.04 droplet):
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/infra/scripts/bootstrap-droplet.sh | bash -s -- --app-domain outflow.example.com --acme-email me@example.com --ghcr-owner <owner> [--ssh-pubkey "ssh-ed25519 AAAA... user@host"]
#
# What it does:
#   1) Updates apt + installs base tooling (git, ufw, fail2ban, docker, compose v2)
#   2) Configures the firewall (allow 22, 80, 443; deny everything else)
#   3) Creates an `outflow` deploy user, optionally with an SSH pubkey baked in
#   4) Lays out /opt/outflow with the docker-compose stack + nginx config
#   5) Generates a `.env` skeleton with strong random secrets
#   6) Pre-pulls images and stages the first cert issuance
#
# This script is idempotent — re-running it will not destroy state.

set -euo pipefail

APP_DOMAIN=""
ACME_EMAIL=""
GHCR_OWNER=""
SSH_PUBKEY=""
REPO_URL="https://github.com/__OWNER__/outflow.git"

usage() {
    cat <<EOF
Usage: $0 --app-domain <domain> --acme-email <email> --ghcr-owner <gh-username> [--ssh-pubkey "ssh-ed25519 ..."] [--repo-url <git-url>]

Required:
  --app-domain    Public domain name pointing to this droplet (e.g. outflow.akshaybhatnagar.in)
  --acme-email    Email used for Let's Encrypt notifications
  --ghcr-owner    GitHub user/org under which images live (lowercased automatically)

Optional:
  --ssh-pubkey    Authorized public key to install for the 'outflow' deploy user
  --repo-url      Git URL to clone (defaults to https://github.com/<ghcr-owner>/outflow.git)
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --app-domain) APP_DOMAIN="$2"; shift 2;;
        --acme-email) ACME_EMAIL="$2"; shift 2;;
        --ghcr-owner) GHCR_OWNER="$2"; shift 2;;
        --ssh-pubkey) SSH_PUBKEY="$2"; shift 2;;
        --repo-url) REPO_URL="$2"; shift 2;;
        -h|--help) usage;;
        *) echo "Unknown arg: $1"; usage;;
    esac
done

[[ -z "$APP_DOMAIN" || -z "$ACME_EMAIL" || -z "$GHCR_OWNER" ]] && usage
[[ "${EUID}" -ne 0 ]] && { echo "Run as root or via sudo." >&2; exit 1; }

# Normalize: GHCR owners must be lowercase per spec.
GHCR_OWNER_LOWER=$(echo "$GHCR_OWNER" | tr '[:upper:]' '[:lower:]')
if [[ "$REPO_URL" == *"__OWNER__"* ]]; then
    REPO_URL="https://github.com/${GHCR_OWNER}/outflow.git"
fi

echo "==> Outflow droplet bootstrap"
echo "    domain      = $APP_DOMAIN"
echo "    acme email  = $ACME_EMAIL"
echo "    ghcr owner  = $GHCR_OWNER_LOWER"
echo "    repo url    = $REPO_URL"
echo

# ---- 1) System packages ----
echo "==> Updating apt + installing base tooling"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y -qq
apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release \
    git vim htop jq unzip \
    ufw fail2ban \
    unattended-upgrades

# ---- 2) Docker + Compose v2 ----
if ! command -v docker >/dev/null; then
    echo "==> Installing Docker"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    UBU_CODENAME=$(. /etc/os-release && echo "${UBUNTU_CODENAME:-${VERSION_CODENAME}}")
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${UBU_CODENAME} stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
fi

# ---- 3) Firewall ----
echo "==> Configuring ufw firewall"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw --force enable

# ---- 4) fail2ban (basic SSH brute-force protection) ----
systemctl enable --now fail2ban || true

# ---- 5) Deploy user ----
if ! id -u outflow >/dev/null 2>&1; then
    echo "==> Creating deploy user 'outflow'"
    useradd -m -s /bin/bash outflow
    usermod -aG docker outflow
fi
install -d -m 0700 -o outflow -g outflow /home/outflow/.ssh
touch /home/outflow/.ssh/authorized_keys
chown outflow:outflow /home/outflow/.ssh/authorized_keys
chmod 600 /home/outflow/.ssh/authorized_keys
if [[ -n "$SSH_PUBKEY" ]]; then
    if ! grep -qF "$SSH_PUBKEY" /home/outflow/.ssh/authorized_keys; then
        echo "$SSH_PUBKEY" >> /home/outflow/.ssh/authorized_keys
        echo "    installed SSH pubkey for deploy user"
    fi
fi

# ---- 6) /opt/outflow layout ----
echo "==> Setting up /opt/outflow"
install -d -m 0755 -o outflow -g outflow /opt/outflow
cd /opt/outflow

if [[ ! -d /opt/outflow/.git ]]; then
    sudo -u outflow git clone --depth 50 "$REPO_URL" /opt/outflow
else
    sudo -u outflow git -C /opt/outflow fetch --quiet
fi

# ---- 7) .env skeleton ----
ENV_FILE=/opt/outflow/.env
if [[ ! -f "$ENV_FILE" ]]; then
    echo "==> Generating /opt/outflow/.env (random secrets)"
    rand() { openssl rand -hex 32; }
    rand_b64() { openssl rand -base64 32 | tr -d '\n'; }
    POSTGRES_PASSWORD=$(rand)
    JWT_ACCESS_SECRET=$(rand)
    JWT_REFRESH_SECRET=$(rand)
    TOKEN_ENCRYPTION_KEY=$(rand_b64)
    cat > "$ENV_FILE" <<EOF
# Generated by infra/scripts/bootstrap-droplet.sh on $(date --iso-8601=seconds)
# Add real values for any blank fields below before going live.

GHCR_OWNER=$GHCR_OWNER_LOWER
IMAGE_TAG=latest
APP_DOMAIN=$APP_DOMAIN
ACME_EMAIL=$ACME_EMAIL

# Postgres
POSTGRES_USER=outflow
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=outflow

# JWT (do not change once issued)
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# OAuth token encryption
TOKEN_ENCRYPTION_KEY=base64:$TOKEN_ENCRYPTION_KEY

# Mail (defaults to Resend; set MAIL_DRIVER=log to disable while testing)
MAIL_DRIVER=resend
MAIL_FROM=Outflow <noreply@$APP_DOMAIN>
RESEND_API_KEY=

# HIBP
HIBP_ENABLED=true

# Logging
LOG_LEVEL=info
EOF
    chown outflow:outflow "$ENV_FILE"
    chmod 600 "$ENV_FILE"
fi

# ---- 8) Pre-pull and stage first SSL ----
echo "==> Pre-pulling images"
sudo -u outflow bash -c "cd /opt/outflow && docker compose -f docker-compose.prod.yml --env-file .env pull || true"

echo
echo "==> Bootstrap complete."
cat <<EOF

Next steps:

  1) Confirm DNS is pointing $APP_DOMAIN at this droplet:
       dig +short $APP_DOMAIN

  2) Switch to the deploy user and finish the setup:
       sudo -iu outflow
       cd /opt/outflow
       # Edit the env file if you want to add a Resend key right away
       \$EDITOR .env

  3) Issue the first SSL cert + boot the stack:
       bash infra/scripts/init-letsencrypt.sh

  4) Verify:
       curl -I https://$APP_DOMAIN/health/ready

  Tail logs:
       docker compose -f docker-compose.prod.yml logs -f api web nginx

EOF
