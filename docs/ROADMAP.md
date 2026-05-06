# Roadmap

Outflow is built in 8 phases, each with concrete acceptance criteria. The full plan lives in `.cursor/plans/elite-portfolio-saas_*.plan.md`.

## Status

- [x] **Phase 0** — Project setup (monorepo, Docker, base CI, docs)
- [x] **Phase 1** — Auth + manual subscription tracker (signup/login/logout, JWT rotation, dashboard, CRUD)
- [ ] **Phase 1.5** — Email verification, forgot/reset password, 2FA TOTP, Google OAuth login
- [ ] **Phase 2** — Gmail connection & sync pipeline (OAuth data scope, history API, dedupe)
- [ ] **Phase 3** — Parser registry & subscription detection (vendor parsers + regex + LLM fallback)
- [ ] **Phase 4** — Trial-end / duplicate / price-hike alerts
- [ ] **Phase 5** — CSV import, advanced insights, public share links
- [ ] **Phase 6** — Stripe billing, test hardening, security review
- [ ] **Phase 7** — DigitalOcean deploy, observability stack, README polish, launch

Each phase ends when its acceptance criteria are met. No skipping ahead — Phase 1 doesn't start until Phase 0's `pnpm install && pnpm build` is green and committed.

## Phase 0 acceptance criteria (this phase)

- [x] `pnpm install` works at the repo root
- [x] `apps/api`, `apps/web`, `packages/contracts`, `packages/ui` all installed and recognized by Turborepo
- [x] `docker compose -f docker-compose.dev.yml up -d` boots Postgres + Redis + Mailhog + MinIO
- [x] `.github/workflows/ci.yml` runs lint + typecheck + test + build
- [x] Conventional Commits enforced via Husky + commitlint
- [x] README, LICENSE, SECURITY, CONTRIBUTING, docs/LEARNING.md, docs/STACK.md committed

## What Phase 1 actually shipped

- Prisma models: `users`, `refresh_tokens`, `audit_logs`, `billing_accounts`, `subscriptions`, `categories`, `charges`, plus enums `Plan`, `Cadence`, `SubscriptionStatus`, `SubscriptionSource`
- Hand-crafted SQL migration in `apps/api/prisma/migrations/20260507000000_initial/migration.sql` (matches Prisma schema; idempotent extensions)
- Categories seed (`prisma/seed.ts`) — 10 global categories
- API auth module: signup, login, refresh (with rotation + reuse detection), logout, `/auth/me`
- API subscriptions module: full CRUD + status transitions + soft delete
- Categories API: list global categories
- Insights API: dashboard summary with monthly amortisation across cadences
- Cookie-based session (httpOnly access + refresh, SameSite=Lax, AES-equivalent rotation)
- Argon2id + constant-time login + global default-deny `JwtAuthGuard`
- Pino structured logs with secret redaction; Helmet; throttling
- Web: marketing landing → signup → login → dashboard → subscriptions → settings → logout
- Web: protected `(app)` layout with sidebar + topbar + theme toggle + user menu
- Web: subscription card grid, add/edit dialog, status changes, soft delete
- 13 unit tests across auth rotation logic, monthly conversion math, health endpoints
- Updated `docs/LEARNING.md` with Phase 1 concepts (cookie auth, rotation, Argon2, RSC + cookies, etc.)

## Phase 1.5 preview (next)

- Email verification flow (Resend + Mailhog in dev)
- Forgot password + reset password
- TOTP 2FA enrollment + verification + recovery codes
- Google OAuth login (separate consent screen, `userinfo.email` scope only)
- HIBP password breach check on signup/change-password
- Audit interceptor wired across mutating routes
