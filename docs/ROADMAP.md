# Roadmap

Outflow is built in 8 phases, each with concrete acceptance criteria. The full plan lives in `.cursor/plans/elite-portfolio-saas_*.plan.md`.

## Status

- [x] **Phase 0** — Project setup (monorepo, Docker, base CI, docs)
- [ ] **Phase 1** — Auth & account foundation (JWT, Google OAuth login, 2FA, audit log)
- [ ] **Phase 2** — Gmail connection & sync pipeline (OAuth data scope, history API, dedupe)
- [ ] **Phase 3** — Parser registry & subscription detection (vendor parsers + regex + LLM fallback)
- [ ] **Phase 4** — Trial-end / duplicate / price-hike alerts
- [ ] **Phase 5** — Dashboard, insights, manual entry, CSV import
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

## Phase 1 preview

Will add:

- `users`, `refresh_tokens`, `audit_logs`, `billing_accounts` Prisma models
- `auth` module (signup, login, refresh, logout, verify-email, forgot-password)
- Google OAuth login flow (separate from Gmail data scope)
- TOTP 2FA enrollment + verification + recovery codes
- Argon2id password hashing + HIBP breach check
- Web pages for `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/onboarding`
- Audit interceptor live for all mutating routes
- Playwright e2e covering full auth flow
