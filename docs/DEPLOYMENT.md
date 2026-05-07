# Outflow — Deployment Runbook

End-to-end guide for getting `outflow.akshaybhatnagar.in` online (or any other
domain) on a single DigitalOcean droplet.

---

## 0. The story in one paragraph

A push to `main` triggers GitHub Actions. CI builds two OCI images
(`outflow-api`, `outflow-web`) tagged with the commit SHA, pushes them to
GitHub Container Registry, then SSHes into the droplet and runs
`infra/scripts/deploy.sh`. The script pulls the new images, runs Prisma
migrations as a one-shot container, then rolls api → web behind nginx with
healthchecks gating each step. Let's Encrypt certs are renewed every 12 h by
a sidecar; nginx is reloaded on the next deploy.

---

## 1. Pre-flight checklist

Before the droplet is ever touched, gather these once:

| Item                        | Where to get it                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Droplet's public IP         | DigitalOcean → Droplets                                                                                                       |
| Domain DNS access           | Wherever `akshaybhatnagar.in` is registered                                                                                   |
| GitHub repo URL             | `https://github.com/<owner>/outflow`                                                                                          |
| GitHub username (lowercase) | Used as `GHCR_OWNER`                                                                                                          |
| Personal Access Token       | GH → Settings → Developer settings → Tokens (`read:packages`, `write:packages`) — only needed if the repo/images are private. |
| Resend API key (optional)   | https://resend.com — for outbound mail in production                                                                          |

Recommended droplet:

- **Ubuntu 24.04 LTS**
- **Basic / 2 vCPU / 4 GB RAM / 80 GB SSD** (Outflow is comfortable here)
- IPv4 + private networking (no Floating IP needed yet)

---

## 2. DNS

Add a single A record at your DNS provider:

| Type | Host                                     | Value          | TTL |
| ---- | ---------------------------------------- | -------------- | --- |
| A    | `outflow` (`outflow.akshaybhatnagar.in`) | `<droplet IP>` | 300 |

Verify before continuing:

```bash
dig +short outflow.akshaybhatnagar.in
# expect: <your droplet IP>
```

If it points elsewhere Let's Encrypt will fail to issue.

---

## 3. SSH key on the droplet

You need a key that GitHub Actions can use later for SSH-based deploy.

```bash
# On your laptop, generate a deploy-only key (do this once):
ssh-keygen -t ed25519 -f ~/.ssh/outflow_deploy -C "outflow-deploy"
```

Copy `~/.ssh/outflow_deploy.pub` somewhere handy — you will give it to the
bootstrap script in step 4.

> Already have a working SSH login as `root`? You can skip this; the bootstrap
> script will still create a dedicated `outflow` user. The deploy user must
> not be `root` because GHA + root SSH is a bad pattern.

---

## 4. First-boot bootstrap

SSH into the droplet **as root**:

```bash
ssh root@<droplet-ip>
```

Run the bootstrap script. Use whichever method you prefer:

### Option A — One-liner from the repo

(Replace `<owner>` with your GitHub username.)

```bash
curl -fsSL https://raw.githubusercontent.com/<owner>/outflow/main/infra/scripts/bootstrap-droplet.sh \
  -o /tmp/bootstrap.sh
bash /tmp/bootstrap.sh \
  --app-domain  outflow.akshaybhatnagar.in \
  --acme-email  you@example.com \
  --ghcr-owner  <owner> \
  --ssh-pubkey  "$(cat ~/.ssh/outflow_deploy.pub-on-laptop)"
```

### Option B — Clone + run

```bash
git clone https://github.com/<owner>/outflow.git /tmp/outflow
bash /tmp/outflow/infra/scripts/bootstrap-droplet.sh \
  --app-domain  outflow.akshaybhatnagar.in \
  --acme-email  you@example.com \
  --ghcr-owner  <owner> \
  --ssh-pubkey  "ssh-ed25519 AAAA... outflow-deploy"
```

What it does (idempotent — safe to re-run):

- `apt update`, base tools (git/jq/htop/etc.)
- Docker + Compose v2 from the official Docker apt repo
- ufw (allow 22, 80, 443; deny everything else)
- fail2ban
- `useradd outflow`, adds it to the `docker` group
- Installs your SSH pubkey for the `outflow` user
- Clones the repo to `/opt/outflow`
- Generates `/opt/outflow/.env` with strong random secrets
- Pre-pulls images

When it finishes you'll see a "next steps" block.

---

## 5. Edit `/opt/outflow/.env`

```bash
sudo -iu outflow
cd /opt/outflow
$EDITOR .env
```

The bootstrap script generates a complete `.env` skeleton with random secrets
already filled in. The fields you'll typically want to fill manually:

```ini
# Mail — set to "log" if you don't have Resend yet (no emails will be sent
# but the API still boots fine; verification + reset flows return 200).
MAIL_DRIVER=resend
RESEND_API_KEY=re_...
MAIL_FROM=Outflow <noreply@outflow.akshaybhatnagar.in>
```

Do **not** rotate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or
`TOKEN_ENCRYPTION_KEY` after first boot — every existing user session and
encrypted token would die. Treat them like the password you'd give a friend
to look after the cat: write them down somewhere safe.

---

## 6. First SSL provisioning + first boot

```bash
# As outflow@droplet, in /opt/outflow:
bash infra/scripts/init-letsencrypt.sh
```

What it does:

1. Brings up `postgres` and `redis`.
2. Creates a 1-day self-signed dummy cert at the path nginx expects (so
   nginx can boot at all).
3. Boots api, web, nginx with the dummy cert.
4. Replaces dummy with a real Let's Encrypt cert via HTTP-01 webroot.
5. Reloads nginx.
6. Brings up the certbot renewal sidecar.

Verify:

```bash
curl -I https://outflow.akshaybhatnagar.in/health/ready
# expect: HTTP/2 200, content-type: application/json
```

If it answers 200 — **you are live.**

---

## 7. Wire up GitHub Actions

In the GitHub repo Settings → Secrets and variables → Actions:

| Name              | Value                                                            |
| ----------------- | ---------------------------------------------------------------- |
| `DROPLET_HOST`    | Droplet public IP                                                |
| `DROPLET_USER`    | `outflow`                                                        |
| `DROPLET_PORT`    | `22` (omit unless you changed it)                                |
| `DROPLET_SSH_KEY` | Contents of `~/.ssh/outflow_deploy` (the **private** key)        |
| `GHCR_PULL_USER`  | Your GitHub username                                             |
| `GHCR_PULL_TOKEN` | A PAT with `read:packages` (only required if images are private) |
| `APP_DOMAIN`      | `outflow.akshaybhatnagar.in`                                     |

Optional: create an environment called `production` so the deploy job is
gated by it (default policy allows you to require manual approval).

Push a commit to `main`. Watch the workflow run:

- `build-and-push` builds + pushes images to GHCR.
- `deploy` SSHes to the droplet and runs `infra/scripts/deploy.sh`.
- Smoke check curls `https://$APP_DOMAIN/health/ready`.

---

## 8. Day-2 operations

### Tail logs

```bash
docker compose -f docker-compose.prod.yml logs -f api web nginx
```

### Manual deploy of a specific tag

```bash
cd /opt/outflow
IMAGE_TAG=abc1234 bash infra/scripts/deploy.sh
```

### Rollback

```bash
# Find the last-known-good tag (or just use the SHA before the bad one):
docker images ghcr.io/<owner>/outflow-api --format '{{.Tag}} {{.CreatedAt}}'

cd /opt/outflow
IMAGE_TAG=<good-sha> bash infra/scripts/deploy.sh
```

### Database backup

For now, dump on demand:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U outflow -d outflow --format=custom --no-owner --no-privileges \
  > "/var/backups/outflow-$(date +%F-%H%M).pgdump"
```

A daily systemd timer + offsite copy lands in Phase 7.

### Restart everything

```bash
cd /opt/outflow
docker compose -f docker-compose.prod.yml restart
```

### Resize the droplet

DigitalOcean → Droplet → Resize. CPU/RAM resizes are live; disk requires
power-off. Boot back up, run `docker compose up -d`.

---

## 9. Common failures

### "wrong cert" or browser cert errors after first boot

Usually means the dummy cert is still in place (Let's Encrypt didn't issue).

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 certbot
```

Most common causes:

- DNS isn't pointing here yet (`dig +short outflow.akshaybhatnagar.in`)
- Port 80 is firewalled by something upstream of ufw (DO firewall? cloud LB?)
- Rate-limited by Let's Encrypt (100 issuances per ip per 3 h — wait it out)

Re-run `bash infra/scripts/init-letsencrypt.sh` once the cause is fixed.

### `migrate` exits non-zero on deploy

The deploy script intentionally aborts here so a bad migration doesn't take
the app down.

```bash
docker compose -f docker-compose.prod.yml logs --no-color migrate | tail -50
```

If the migration is truly broken, roll back to the previous image tag. The
Postgres data volume is untouched — schema and data both stay where they
were.

### `api` healthcheck fails

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 api
```

99% of the time it's a missing env var (`DATABASE_URL`, `JWT_*`) that you
haven't filled in. The container intentionally fails fast rather than
booting in a half-configured state.

### Disk filling up

```bash
docker system df
docker system prune -af --volumes  # only if you've checked what's there!
```

The deploy script already runs `docker image prune -f` after each rollout,
but this can still fill if you've rolled back many times.

---

## 10. Hardening checklist (Phase 7 candidates)

- [ ] Daily Postgres dump → off-droplet (DO Spaces / S3)
- [ ] Sentry DSN for the API + web
- [ ] Loki + Promtail for centralised logs (or just `journald` + `journalctl --since`)
- [ ] Prometheus + Grafana for metrics
- [ ] Cloudflare in front of nginx (DDoS, hides origin IP)
- [ ] Automated nginx reload on cert renewal (currently manual once per 60–90 d)
- [ ] Consider DNS-01 challenge for cert issuance to remove port-80 dependency
