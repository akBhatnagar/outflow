# Roadmap

Outflow is built in 8 phases, each with concrete acceptance criteria.

## Status

- [x] **Phase 0** — Project setup (monorepo, Docker, base CI, docs)
- [x] **Phase 1** — Auth + manual subscription tracker
- [x] **Phase 1.5** — Email verification, forgot/reset password, HIBP, audit log, **production deployment**
- [ ] **Phase 2** — Gmail connection & sync pipeline (OAuth data scope, history API, dedupe)
- [ ] **Phase 3** — Parser registry & subscription detection (vendor parsers + regex + LLM fallback)
- [ ] **Phase 4** — Trial-end / duplicate / price-hike alerts
- [ ] **Phase 5** — CSV import, advanced insights, public share links
- [ ] **Phase 6** — Stripe billing, 2FA TOTP, Google OAuth login, security review
- [ ] **Phase 7** — Observability stack (Loki + Prometheus + Grafana), Sentry, README polish, launch

Phases end when their acceptance criteria are met. No skipping ahead.

## Phase 0 acceptance criteria

- [x] `pnpm install` works at the repo root
- [x] `apps/api`, `apps/web`, `packages/contracts`, `packages/ui` all installed and recognized by Turborepo
- [x] `docker compose -f docker-compose.dev.yml up -d` boots Postgres + Redis + Mailhog + MinIO
- [x] `.github/workflows/ci.yml` runs lint + typecheck + test + build
- [x] Conventional Commits enforced via Husky + commitlint
- [x] README, LICENSE, SECURITY, CONTRIBUTING, docs/LEARNING.md, docs/STACK.md committed

## Phase 1 — what shipped

- Prisma schema: `users`, `refresh_tokens`, `audit_logs`, `billing_accounts`, `subscriptions`, `categories`, `charges`
- Hand-crafted SQL migration; categories seed
- API auth module: signup, login, refresh (rotation + reuse detection), logout, `/auth/me`
- API subscriptions, categories, insights modules
- Cookie-based session (httpOnly access + refresh, SameSite=Lax)
- Argon2id + constant-time login + global default-deny `JwtAuthGuard`
- Pino structured logs with secret redaction; Helmet; throttling
- Web: marketing → signup → login → dashboard → subscriptions → settings → logout
- 13 unit tests

## Phase 1.5 — what shipped

### Auth hardening

- **Email verification** — token issued on signup, link expires 24 h, single-use; resend endpoint + dashboard banner
- **Forgot / reset password** — k-anonymous password lookup before accepting new password; reset invalidates every refresh-token family + clears lockout
- **HIBP integration** — calls `api.pwnedpasswords.com/range/{prefix}` with sha1 prefix only; fail-open on network error; threshold > 5 breaches
- **Login lockout** — 10 failed attempts → 15-min lock, cleared on first successful login
- **Password rotation invalidates sessions** — `passwordChangedAt` tracked on `User`; refresh tokens issued before password change are rejected
- **Audit log + viewer** — global interceptor writes append-only `audit_logs` for any route decorated with `@Audit(...)`; `/api/v1/audit-logs` returns the user's own log; settings UI surfaces it
- **Mail abstraction** — `MailService` with three drivers (`smtp` for Mailhog, `resend` for prod HTTP API, `log` for tests/CI)

### Production deployment

- **`docker-compose.prod.yml`** — postgres + redis + migrate (one-shot) + api + web + nginx + certbot, all health-checked, with `depends_on: { migrate: { condition: service_completed_successfully } }`
- **Nginx** — TLS termination, HSTS, OCSP stapling, rate-limit zones for `/api/v1/auth/*` + general `/api/`, WebSocket upgrade map, security headers, `_next/static` immutable cache
- **Let's Encrypt** — certbot sidecar in compose; first-issuance bootstrapped by `infra/scripts/init-letsencrypt.sh` (dummy → real cert swap); auto-renew every 12 h
- **Bootstrap script** — `infra/scripts/bootstrap-droplet.sh` is one idempotent command from a cold Ubuntu 24.04 droplet to a host that's ready for `init-letsencrypt.sh` (Docker, ufw, fail2ban, deploy user, `/opt/outflow` checkout, `.env` with random secrets)
- **Deploy script** — `infra/scripts/deploy.sh` rolls api → wait healthy → web → wait healthy → reload nginx; bails on bad migration
- **GitHub Actions CD** — `.github/workflows/deploy.yml` builds/pushes to GHCR, SSHes to the droplet, calls deploy.sh, runs a smoke check
- **ADRs** — `005-deployment-strategy`, `006-ssl-via-certbot`
- **DEPLOYMENT runbook** — `docs/DEPLOYMENT.md` covers DNS, bootstrap, env, first SSL, GHA wiring, day-2 ops, rollback, common failures

### Tests added

- AuthTokenService consume idempotency (single-use, expiry, wrong-purpose rejection)
- HibpService: known-pwned, fresh password, network failure (fail-open), `HIBP_ENABLED=false` short-circuit, threshold enforcement
- AuthService lockout after 10 failures + reset on success

23 tests in 5 suites passing.

## Phase 2 preview (next)

- Gmail connection screen + Google OAuth data-scope flow
- AES-256-GCM encryption for stored OAuth tokens
- BullMQ worker process for background syncs
- Initial Gmail history-API sync; dedupe by `messageId`
- Subscription source = `EMAIL_PARSER` rows feeding the dashboard
