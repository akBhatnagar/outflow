# Learning Guide — every tool in Outflow, why it's here, and what it teaches

This document is for you (the builder) and for anyone reading the repo. For each tool we use, you'll find:

- **What it is** — one sentence, plain English.
- **Why we picked it** — what problem it solves in _this_ project.
- **What to learn** — the senior-level concept(s) it forces you to understand.

Read top-to-bottom for a tour of a modern TypeScript SaaS stack, or jump to a section by category.

---

## 0. Mental map

```
Browser ──▶ Nginx ──▶ Next.js (web) ──▶ NestJS (api) ──▶ Postgres
                                              │              ▲
                                              ├──▶ Redis ──┐ │
                                              │          (queues, cache)
                                              ├──▶ Worker ──┘
                                              ├──▶ Gmail API
                                              ├──▶ OpenAI
                                              └──▶ Stripe / Resend
```

A user types in the browser. Next.js renders the UI and talks to NestJS over HTTPS. NestJS reads/writes Postgres for user data and uses Redis for queues + caching. Background workers pick up jobs (sync inbox, parse email, send alert) and call third-party APIs.

---

## 1. Language & Runtime

### TypeScript

**What it is.** A typed superset of JavaScript that compiles to plain JS.
**Why we use it.** Strong types catch bugs before they ship; refactoring becomes safe; the editor becomes useful. A 100-file backend without types is a maintenance trap.
**What to learn.** Generics, conditional types, discriminated unions, `infer`, `satisfies`, structural typing vs nominal. The single biggest leverage upgrade you can make as a developer.

### Node.js (v22 LTS)

**What it is.** A V8-based JavaScript runtime for the server.
**Why we use it.** It's the runtime NestJS and Next.js both target. v22 is "Active LTS" — production-ready and supported until 2027.
**What to learn.** The event loop (microtasks vs macrotasks vs `setImmediate`), streams, `AbortController`, why CPU-bound work blocks the loop, when to reach for `worker_threads`.

### pnpm (via Corepack)

**What it is.** A fast, disk-efficient package manager that uses a content-addressable store and symlinks per project.
**Why we use it.** Workspaces are first-class (we have 4 packages). `pnpm install` is faster than npm/yarn and uses far less disk. `corepack` ships with Node, so we don't even install pnpm globally.
**What to learn.** Monorepo dependency hoisting, `workspace:*` protocol, the difference between `dependencies`, `devDependencies`, and `peerDependencies`.

---

## 2. Monorepo tooling

### pnpm workspaces

**What it is.** A way to put multiple packages (`apps/*`, `packages/*`) in one repo and have them depend on each other directly via `workspace:*`.
**Why we use it.** The web app and API both need shared types (`@outflow/contracts`) and components (`@outflow/ui`). One repo means atomic commits across boundaries; no version-bump dance.
**What to learn.** Why monorepos win for full-stack TS, and where they hurt (CI cache invalidation, language polyglot pain).

### Turborepo

**What it is.** A task orchestrator that knows your dependency graph and caches outputs.
**Why we use it.** When you change one file in `packages/ui`, Turbo only rebuilds + lints what's downstream. CI goes from minutes to seconds on incremental runs.
**What to learn.** Task graphs, content-hash-based caching, remote caching, why this matters more than it sounds at scale.

---

## 3. Frontend

### Next.js 15 (App Router)

**What it is.** The React framework. The App Router is the modern one — built on React Server Components.
**Why we use it.** Server-side rendering for fast first paint; React Server Components for zero-JS data fetching; nested layouts; built-in routing, image optimization, font loading, and middleware. We're not gluing 15 libraries together — Next gives us the platform.
**What to learn.** RSC vs Client Components (the most important mental model in 2026 React), streaming with `<Suspense>`, `cookies()`/`headers()` server-only APIs, route handlers, server actions.

### React 19

**What it is.** The UI library Next is built on.
**Why we use it.** v19 added `use()`, ref-as-prop, action-aware forms, and finalized RSC. It's where the ecosystem is going.
**What to learn.** When _not_ to use `useEffect`, why hooks must be called unconditionally, the renderer/reconciler split, transitions and `useDeferredValue`.

### Tailwind CSS

**What it is.** Utility-first CSS framework.
**Why we use it.** No file naming arguments, no specificity wars, design tokens via CSS vars, ships only the classes you use. Pairs perfectly with shadcn/ui.
**What to learn.** When utilities scale and when they don't, the `@apply` escape hatch, theming via CSS variables, dark-mode-via-class strategy.

### shadcn/ui (Radix primitives + Tailwind)

**What it is.** **Not a library** — a copy-paste component generator built on accessible Radix primitives.
**Why we use it.** You own the components. No vendor lock-in. Accessible by default. Beautiful defaults you can change.
**What to learn.** Why Radix primitives are the gold standard for headless UI, the cost of "owning" components vs depending on them, polymorphism via `asChild`.

### TanStack Query (React Query)

**What it is.** Async-state manager for server data — caching, deduping, background refetch, optimistic updates.
**Why we use it.** Server state is fundamentally different from UI state. Query handles loading/error/stale/refetch better than any hand-rolled solution.
**What to learn.** Cache keys as data identity, `staleTime` vs `gcTime`, mutation invalidation, why server state ≠ Redux.

### Zustand

**What it is.** A 1KB state-management library with a hooks API.
**Why we use it.** For UI-only state (sidebar open, command palette state). React Query handles server state — Zustand handles ephemeral UI state. Don't reach for Redux unless you genuinely need its devtools/middleware story.
**What to learn.** Picking the smallest tool that fits, when global state is a code smell.

### `clsx` + `tailwind-merge` (`cn` helper)

**What it is.** Two tiny utilities composed: `clsx` joins class names conditionally, `tailwind-merge` resolves Tailwind conflicts (`p-4` overriding `p-2`).
**Why we use it.** Composable styling without bugs.
**What to learn.** Why "last-class-wins" matters, why naive concatenation breaks Tailwind component APIs.

### `next-themes`

**What it is.** Drop-in dark-mode toggle that respects system preference and avoids flash-of-wrong-theme on hydration.
**Why we use it.** Dark mode that doesn't flash is genuinely tricky on SSR.
**What to learn.** Hydration mismatches, why setting the class on `<html>` server-side requires a script-injection trick.

### `sonner`

**What it is.** Headless toast notifications.
**Why we use it.** Pretty, accessible, opinionated. We don't reinvent toasts.

### Lucide React

**What it is.** Icon set, fork of Feather.
**Why we use it.** Tree-shakeable, consistent stroke weight, plays nicely with Tailwind.

---

## 4. Backend

### NestJS 10

**What it is.** A TypeScript framework for Node servers, organized like Angular: modules, controllers, providers, decorators.
**Why we use it.** Opinionated structure prevents the "Express spaghetti at month 6" problem. DI container, validation pipeline, guards, interceptors, and exception filters are all built in. It scales from MVP to "10 microservices behind a gateway" without rewrites.
**What to learn.** Dependency injection (the most underrated backend concept), aspect-oriented programming via decorators, request lifecycle (middleware → guards → interceptors → pipes → handler → interceptor → filter), modular boundaries.

### `@nestjs/config`

**What it is.** Type-safe environment variable loading with namespace + validation.
**Why we use it.** No `process.env.WHATEVER` scattered through the code.
**What to learn.** 12-factor app config, why secrets must come from env, validation at boot.

### `class-validator` + `class-transformer`

**What it is.** Decorator-based DTO validation (`@IsEmail()`, `@MinLength(12)`) and serialization.
**Why we use it.** Every public endpoint validates its input declaratively. Combined with NestJS's `ValidationPipe`, attacks on malformed input never reach our services.
**What to learn.** Why validation belongs at the boundary, not inside business logic.

### Zod

**What it is.** A schema-first runtime validator.
**Why we use it.** For things class-validator doesn't fit: webhook bodies (Stripe, Google Pub/Sub), shared contracts between Web and API. Schemas are also the source of truth for TypeScript types.
**What to learn.** Parse-don't-validate: the pattern of converting unknown input into typed values _once_, at the edge.

### Prisma

**What it is.** A type-safe ORM. You define your schema in `schema.prisma`; Prisma generates a fully typed client.
**Why we use it.** End-to-end types from DB to API to web. Migrations are first-class. Connection pooling, query logging, and Studio are batteries-included.
**What to learn.** Why ORMs leak their abstraction (the "N+1" problem), `include` vs `select`, transactions, Prisma's "expand-only" migration philosophy for zero-downtime deploys.

### Pino + `nestjs-pino`

**What it is.** Pino is the fastest JSON logger for Node. `nestjs-pino` wires it into Nest as a request-scoped logger with automatic correlation IDs.
**Why we use it.** Production logs need to be structured (so Loki/Datadog can query them) and fast (so logging doesn't become the bottleneck).
**What to learn.** Why structured logging beats string logs, log levels (`trace/debug/info/warn/error/fatal`), redacting sensitive fields, correlation IDs.

### Helmet

**What it is.** Express middleware that sets security headers (CSP, HSTS, X-Frame-Options, …).
**Why we use it.** A free baseline against XSS, clickjacking, MIME-sniffing.
**What to learn.** What each header actually does, why CSP is the most important and the most painful.

### `@nestjs/terminus`

**What it is.** Health-check building blocks: ping a DB, ping Redis, check memory, check disk.
**Why we use it.** Docker, Nginx, and Kubernetes all read health endpoints. Distinguishing "alive" from "ready" matters for zero-downtime deploys.
**What to learn.** Liveness vs readiness vs startup probes — the three different questions you ask a process.

### `@nestjs/swagger`

**What it is.** Auto-generated OpenAPI spec from your decorators.
**Why we use it.** Free interactive docs at `/docs`. The spec also drives client generation later.
**What to learn.** OpenAPI as a contract, not a doc; client code-gen workflows.

---

## 5. Database

### PostgreSQL 16

**What it is.** The relational database.
**Why we use it.** Mature, ACID, JSON support when you need NoSQL flexibility, full-text search, partitioning, listen/notify, extensions. It's the right default for ~95% of apps.
**What to learn.** Indexing (B-tree vs GIN vs IVFFlat), `EXPLAIN ANALYZE`, transaction isolation levels, connection pooling, window functions, CTEs, why MVCC matters.

### Postgres extensions enabled in Outflow

- **`citext`** — case-insensitive text. Stop writing `LOWER(email) = LOWER($1)` everywhere.
- **`pg_trgm`** — trigram indexes for fuzzy search (vendor name matching).
- **`pgcrypto`** — `gen_random_uuid()` for UUID v4. (We'll add UUID v7 helpers in app code for time-orderable IDs.)
- **`vector`** (pgvector) — stores ML embeddings; used in Lookback heavily, available in Outflow if needed.

**What to learn.** When extensions are the right answer vs adding a new database. The extension ecosystem is one of Postgres's strongest moats.

### Prisma migrations

**What it is.** Versioned SQL changesets generated from schema diffs.
**Why we use it.** Reproducible schema across environments. CI applies them in `prisma migrate deploy` as a separate, gated step.
**What to learn.** Forward-only migrations, expand/contract pattern, why "edit the migration after generation" is sometimes the right call.

---

## 6. Cache, queues, and background work

### Redis 7

**What it is.** An in-memory data structure store. We use it for caching, rate limiting, and as a queue backend.
**Why we use it.** Sub-millisecond reads, atomic operations, built-in pub/sub, perfect queue substrate.
**What to learn.** Eviction policies, persistence (`AOF` vs `RDB`), why Redis-backed locks are tricky (Redlock controversy), TTL strategies.

### BullMQ

**What it is.** A Redis-backed job queue for Node.
**Why we use it.** Email sync, parsing, alerts — all async. BullMQ gives us retries with exponential backoff, dead-letter queues, repeatable jobs (cron), and a UI.
**What to learn.** Idempotent job design, "at-least-once" semantics, the difference between queues and streams, why concurrency limits matter for downstream APIs (we won't get rate-limited by Gmail).

### `@nestjs/throttler`

**What it is.** Rate limiting middleware for NestJS, Redis-backed.
**Why we use it.** Per-IP login throttling, per-user LLM call budgets.
**What to learn.** Token-bucket vs leaky-bucket, sliding-window rate limiters, why you must distribute rate-limit state.

---

## 7. Auth & Security

### JWT (RS256, access + rotating refresh)

**What it is.** Signed tokens that carry claims. Access JWT is short-lived (15 min); refresh JWT is long-lived (30 days) and _rotates_ on every use.
**Why we use it.** Stateless API auth, scalable across many API replicas, mobile-friendly.
**What to learn.** Why HS256 is fine for monoliths but RS256 is right for microservices (asymmetric keys), refresh-token rotation + family invalidation on theft, why putting JWTs in localStorage is XSS-bait.

### Argon2id

**What it is.** A memory-hard password hashing function — winner of the Password Hashing Competition.
**Why we use it.** It's the OWASP-recommended successor to bcrypt. Tunable memory + time cost defeats GPU-based cracking.
**What to learn.** Why fast hashes are bad for passwords, what "memory-hard" means, picking parameters.

### Google OAuth 2.0 (with two scopes)

**What it is.** A standard authorization protocol. Outflow has _two_ OAuth flows:

1. **Login OAuth** — `userinfo.email` scope. Just authenticate the user.
2. **Gmail data OAuth** — `gmail.readonly` scope. Read user's inbox to find subscriptions.

**Why split them.** Login should not require inbox access. Asking for restricted scopes upfront kills conversion.
**What to learn.** OAuth code-flow with PKCE, refresh tokens, scope minimization (request only what you need), the consent screen tax of restricted scopes, the difference between Google sign-in and Google data access.

### TOTP 2FA (`otplib`)

**What it is.** Time-based one-time passwords. The same standard Google Authenticator and Authy use.
**Why we use it.** Sensitive operations (disconnect inbox, change billing) require 2FA.
**What to learn.** RFC 6238, the time-skew window, why SMS 2FA is worse than TOTP.

### AES-256-GCM token encryption at rest

**What it is.** We encrypt OAuth refresh tokens before storing them in Postgres. Even if the DB leaks, tokens are useless without our encryption key.
**Why we use it.** Belt + suspenders. The DB password is one secret; the encryption key is another.
**What to learn.** Authenticated encryption (AEAD), why GCM > CBC, key rotation strategies, why you should never roll your own crypto.

### CSP, HSTS, SameSite cookies

**What it is.** Browser-enforced security policies.
**Why we use it.** Defense-in-depth against XSS, MITM, CSRF.
**What to learn.** What each one actually prevents, common mistakes (CSP `unsafe-inline` defeats the point), how `SameSite=Lax` plus a CSRF token covers most cookie attacks.

---

## 8. AI & Email Parsing

### OpenAI API (GPT-4o-mini for parser fallback)

**What it is.** A managed LLM you call over HTTPS.
**Why we use it.** When our 30 vendor parsers and regex fallback fail to recognize a receipt, we ask the LLM to extract `{vendor, amount, currency, charged_at, cadence}` with a JSON-schema-validated response.
**Why a _fallback_.** LLMs are slow ($) and non-deterministic. They're the right tool for the long tail, the wrong tool for the head.
**What to learn.** Structured outputs (JSON mode + schema validation), prompt versioning, content-hash caching, token budgets, "one prompt = one bug fix per change" discipline.

### Mozilla Readability (in Lookback later)

**What it is.** The library Firefox Reader View uses to extract main article content from a webpage.
**Why we use it.** Better than parsing raw HTML for article body extraction.
**What to learn.** Heuristic content extraction, why "scraping" is a misleading word for content APIs.

---

## 9. Payments

### Stripe (Checkout + Customer Portal + Webhooks)

**What it is.** Payments-as-a-service.
**Why we use it.** Checkout is a hosted page (no PCI scope), Customer Portal is a hosted self-serve cancel/upgrade, Webhooks tell our app what happened.
**What to learn.** Webhook idempotency (event-id deduping), the difference between `subscription` and `invoice` and `payment_intent`, why client-secrets and signing-secrets are different, the `latest_invoice.payment_intent` pattern, dunning state machines.

---

## 10. Email

### Resend

**What it is.** Transactional email API. Like SendGrid but with sane DX.
**Why we use it.** Reliable delivery, simple pricing, React Email integration.
**What to learn.** SPF/DKIM/DMARC (you cannot ship a real product without understanding these), bounces vs complaints vs unsubscribes, list-unsubscribe headers.

### React Email

**What it is.** Write transactional email templates in React/JSX. Renders to email-safe HTML.
**Why we use it.** No more table-soup HTML. Compose with components.
**What to learn.** Why email HTML is two decades behind web HTML, what Outlook actually renders, dark-mode email gotchas.

### MailHog (dev only)

**What it is.** A local SMTP server with a web UI that catches every outgoing email.
**Why we use it.** Test your email flows without spamming real inboxes.
**What to learn.** SMTP basics; the joy of "click → email arrives in MailHog UI in 100ms".

---

## 11. Containers & DevOps

### Docker

**What it is.** Containers + image format.
**Why we use it.** "Works on my machine" eliminated. One `docker compose up` and the whole stack is running.
**What to learn.** The difference between an image and a container, layer caching, multi-stage builds, the principle of least privilege (run as non-root, drop capabilities, use distroless), why `:latest` is forbidden in prod.

### Multi-stage Dockerfiles + distroless base

**What it is.** Build in a fat image, copy only the artifact into a minimal runtime image.
**Why we use it.** Final API image goes from ~1GB to ~150MB. Smaller attack surface, faster pulls.
**What to learn.** Why `node:alpine` is fine but `gcr.io/distroless/nodejs` is better, BuildKit cache mounts, `tini` as PID 1, healthchecks.

### docker-compose

**What it is.** Multi-container orchestration via a YAML file.
**Why we use it.** Local dev parity with prod.
**What to learn.** Service dependencies + healthchecks + condition `service_healthy`, named volumes, networks, the `init` flag.

### Nginx (production reverse proxy)

**What it is.** A reverse proxy + TLS terminator + static file server.
**Why we use it.** TLS termination, HTTP/2, gzip/brotli, upstream health checks, blue/green via upstream swap.
**What to learn.** Worker model, `proxy_pass`, why you should set `proxy_set_header X-Forwarded-*` correctly, rate-limiting at the edge.

### Let's Encrypt (Certbot)

**What it is.** Free TLS certificates with automated renewal.
**Why we use it.** No more $99/year DigiCert renewals.
**What to learn.** ACME protocol, HTTP-01 vs DNS-01 challenges, certificate chains.

### DigitalOcean Droplet

**What it is.** A VPS — basically `ssh root@your-server` but managed.
**Why we use it.** It's the cheapest "real server" option, predictable pricing, snapshots/backups built in.
**What to learn.** Linux server hygiene (fail2ban, unattended-upgrades, ufw), monitoring at the OS level, when to graduate to managed Postgres.

---

## 12. CI/CD

### GitHub Actions

**What it is.** YAML-defined workflows that run on push/PR.
**Why we use it.** Free for public repos, integrates natively with GitHub, huge marketplace of actions.
**What to learn.** Job vs step vs action, matrix builds, caching strategies (pnpm store + turbo cache + Docker layer cache), reusable workflows, OIDC for cloud auth (no static keys).

### Pipeline anatomy in this repo

1. **`ci.yml`** — every PR: format check → lint → typecheck → unit tests → build → audit. Uses Postgres + Redis services for integration tests later.
2. **`cd-staging.yml`** (Phase 7) — on merge to `develop`: build images → push to GHCR → SSH into staging droplet → `docker compose pull && up -d`.
3. **`cd-prod.yml`** (Phase 7) — on git tag `v*`: same as staging plus a manual approval gate.
4. **`db-migrate.yml`** — `workflow_dispatch` for manual `prisma migrate deploy`.

**What to learn.** Why migrations should be a separate, manual workflow (not embedded in the deploy), how to ship safely with expand-only schema changes.

### Concurrency groups

The CI config uses `concurrency: { group: ${{ workflow }}-${{ ref }}, cancel-in-progress: true }`.
**What to learn.** Why force-pushing during CI used to leave stale jobs running, how this saves money + queue time.

---

## 13. Observability

### Pino logs → Promtail → Loki → Grafana

**What it is.** Structured logs are scraped from Docker by Promtail, indexed by Loki (a "Prometheus for logs"), and visualized in Grafana.
**Why we use it.** Free self-hosted alternative to Datadog/Logtail. Loki is cheap because it indexes labels, not log content.
**What to learn.** Cardinality (the silent killer of logging budgets), structured fields vs free-text grepping, log retention policies.

### Prometheus + Grafana

**What it is.** Prometheus scrapes metrics endpoints; Grafana visualizes them.
**Why we use it.** Industry-standard, free, well-understood. Our `/metrics` endpoint exposes RED metrics (Rate, Errors, Duration), queue depth, LLM token spend.
**What to learn.** RED vs USE methods, histograms vs summaries, exemplars, why you should never `count(*) over time` on high-cardinality labels.

### OpenTelemetry → Tempo

**What it is.** Vendor-neutral tracing. We instrument once and export to any backend.
**Why we use it.** When a request is slow, traces tell you _which_ downstream call (DB? Gmail? OpenAI?) caused it.
**What to learn.** Spans, context propagation, sampling strategies (head vs tail), why distributed tracing is the only way to debug microservices.

### Sentry

**What it is.** Error tracking with source maps.
**Why we use it.** Production errors with full stack traces, release tagging, user context, performance traces.
**What to learn.** Source-map upload pipelines, release health, "how to actually use the user feedback widget".

---

## 14. Testing

### Jest

**What it is.** The default test runner for Node + TypeScript.
**Why we use it.** Fast, well-supported, Nest-friendly.
**What to learn.** `describe/it/beforeEach`, mocking strategies, snapshot tests (and when they harm), coverage as a _signal_ not a goal.

### `@nestjs/testing`

**What it is.** Helpers to compile a Nest module with mocked providers for unit/integration tests.
**Why we use it.** Test services with a real DI container — closer to production than hand-stitched mocks.

### Supertest

**What it is.** HTTP assertions against an Express/Fastify app instance.
**Why we use it.** Full HTTP lifecycle tests for API endpoints without booting a real port.

### Testcontainers (Phase 6)

**What it is.** Spin up real Postgres + Redis containers per test suite.
**Why we use it.** Integration tests against the real thing — migrations, RLS, queue processors — instead of brittle mocks.
**What to learn.** Why "mock everything" leaks production bugs, when integration tests are mandatory.

### Playwright (Phase 6)

**What it is.** End-to-end browser automation, the modern Selenium/Cypress.
**Why we use it.** It's faster, more reliable, and supports parallelism better than Cypress. Trace viewer is a debugging superpower.
**What to learn.** Locator strategies (role-based > selector-based), trace recording, network mocking for deterministic tests.

### k6 (Phase 6)

**What it is.** Load testing in JS.
**Why we use it.** Generate realistic traffic shapes against `/api/subscriptions` and verify p95 SLOs.
**What to learn.** RPS vs concurrency, ramping vs constant arrival, why p99 matters more than mean.

---

## 15. Code quality tooling

### ESLint 9 (flat config)

**What it is.** A pluggable JS/TS linter. v9 introduced "flat config" — a single `eslint.config.mjs` instead of nested `.eslintrc.*`.
**Why we use it.** Catch bugs (`no-floating-promises`), enforce style (`consistent-type-imports`).
**What to learn.** Flat config migration, the `typescript-eslint` typed-rules set, why `eslint-config-prettier` exists (turn off conflicting rules).

### Prettier

**What it is.** Opinionated code formatter.
**Why we use it.** Stops bikeshedding about commas and semicolons. Auto-runs on commit via `lint-staged`.

### Husky

**What it is.** Git hooks made easy.
**Why we use it.** `pre-commit` runs `lint-staged`, `commit-msg` runs `commitlint`. Catches issues _before_ they hit CI.

### lint-staged

**What it is.** Runs commands only on staged files.
**Why we use it.** Fast pre-commit feedback. We don't lint the world to commit one file.

### commitlint + Conventional Commits

**What it is.** Enforces commit message format like `feat(auth): add 2FA`.
**Why we use it.** Auto-generated changelogs, semantic versioning, easy CI rules ("only run e2e on `feat`/`fix`").
**What to learn.** Why structured commit messages compound over time.

### EditorConfig

**What it is.** Editor-agnostic file describing indentation, line endings, etc.
**Why we use it.** Consistent files even when contributors use different editors.

### gitleaks

**What it is.** Scans your repo for accidentally committed secrets.
**Why we use it.** Catches `OPENAI_API_KEY=sk-...` before it lands in git history.
**What to learn.** Why `git filter-branch` cannot truly remove a leaked secret (rotate it!).

---

## 16. Glossary of senior-level concepts you'll touch

By the time Outflow ships, you'll have hands-on experience with:

| Concept                                      | Where in Outflow                                      |
| -------------------------------------------- | ----------------------------------------------------- |
| Dependency injection                         | Every NestJS service                                  |
| Idempotency                                  | Stripe webhooks, Gmail message dedupe, BullMQ job ids |
| Eventual consistency                         | Email sync, recurring-charge detection job            |
| At-least-once delivery semantics             | BullMQ + idempotent processors                        |
| Refresh token rotation + reuse detection     | Auth module                                           |
| OAuth 2.0 with PKCE, restricted scopes       | Login + Gmail integration                             |
| Encryption at rest (AEAD / GCM)              | OAuth token vault                                     |
| Rate limiting (token bucket)                 | LLM budget, login throttle                            |
| Structured logging + correlation IDs         | Pino + cls-hooked                                     |
| Health-check semantics (live vs ready)       | Terminus + Docker + Nginx                             |
| Multi-stage Docker + distroless              | Dockerfiles                                           |
| Zero-downtime deploys                        | Phase 7 deploy script                                 |
| OpenAPI as a contract                        | Swagger generation                                    |
| Schema-first design                          | Prisma + Zod contracts                                |
| Forward-only migrations                      | Prisma migrate deploy                                 |
| Event-driven architecture                    | BullMQ pipelines                                      |
| Scheduled jobs (TZ-aware crons)              | Trial-end alerts                                      |
| RFC 7807 problem+json errors                 | Global exception filter                               |
| Browser security headers (CSP/HSTS/SameSite) | Helmet + Next config                                  |
| Observability (RED metrics, traces, logs)    | Phase 7                                               |
| Test pyramid (unit > integration > e2e)      | Phase 6                                               |

---

## How to use this document

- **As a study guide** — pick a section, read it, then go find that file/usage in the codebase. Tracing a concept from "abstract" to "this exact line" is how senior knowledge sticks.
- **As an interview prep checklist** — every concept above is a possible interview question. Try explaining each one out loud.
- **As a portfolio narrative** — when a recruiter asks "what's the most interesting thing in this project?", pick three from this list and tell the story.

---

## Phase 1 additions (auth + manual subscription tracker)

These concepts joined the codebase in the Phase 1 commit.

### Cookie-based session auth (vs localStorage tokens)

**What's in the code.** `apps/api/src/modules/auth/auth.controller.ts` sets two `httpOnly` cookies on signup/login: `outflow_at` (15-minute access JWT) and `outflow_rt` (30-day opaque refresh token). The browser sends them automatically on every fetch with `credentials: 'include'` (`apps/web/src/lib/client/api.ts`).

**Why httpOnly cookies, not localStorage.** Tokens in `localStorage` are readable by any JS that runs on the page. One leaked dependency, one XSS, and your token's gone. `httpOnly` cookies are inaccessible to JS — even on a successful XSS, the attacker can't exfiltrate the token.

**Trade-off.** CSRF becomes a real concern. Mitigations live alongside: `SameSite=Lax` (defaults to lax in modern browsers), CORS with explicit `credentials: true` and an origin allowlist, and — when we ship a real domain in Phase 7 — `SameSite=Strict` for the refresh cookie.

### Refresh-token rotation with reuse detection

**The pattern.** Every `POST /auth/refresh` does three things atomically:

1. Look up the presented refresh token by SHA-256 hash.
2. If it's already revoked → revoke the **whole family** (every token derived from the same login) and return 401. That's the signal of a stolen-token replay.
3. Otherwise issue a new access + refresh pair in the same family and revoke the old refresh.

**Where in code.** `apps/api/src/modules/auth/auth.service.ts → refresh()`. The fake-prisma test in `auth.service.spec.ts` exercises the family-burn path explicitly.

**Why it matters.** Without rotation, a stolen refresh token grants infinite sessions. With rotation but without reuse detection, you can't tell legitimate from theft. With both, theft becomes a one-time event you can audit.

### Argon2id password hashing

**Why not bcrypt.** Bcrypt resists CPU brute-force but not GPU. Argon2id is the OWASP-recommended default — a memory-hard function that defeats GPU/ASIC parallelism. Each guess costs the attacker proportionally more memory.

**Constant-time login.** When a user doesn't exist, we still hash the supplied password against a dummy invalid argon2 string before returning 401. This makes "user exists" vs "user doesn't exist" indistinguishable from request timings — closing a small but real account-enumeration oracle.

### Global guard via APP_GUARD

**Default-deny security model.** `app.module.ts` registers `JwtAuthGuard` as `APP_GUARD` — every controller method requires auth unless tagged `@Public()`. New controllers added later inherit this protection automatically. You won't accidentally ship an unauthenticated endpoint.

### RFC 7807 problem+json errors

**The shape.** `apps/api/src/common/filters/all-exceptions.filter.ts` returns errors as `{ type, title, status, detail, errors, instance }`, content-type `application/problem+json`. This is the IETF standard for HTTP error bodies — clients can parse a single shape across every API.

**Bonus.** The filter maps Prisma's `P2002` (unique violation) to HTTP 409 and `P2025` (record not found) to 404 — so you don't end up with raw 500s for ordinary collisions.

### Prisma soft deletes + composite indexes

**Convention.** `subscriptions` (and other user-data tables) use `deletedAt` rather than physical delete. Index `(userId, deletedAt)` plus `WHERE deletedAt IS NULL` keeps queries fast. Composite index `(userId, status, nextChargeDate)` powers the dashboard's "active subs sorted by next charge" query in one B-tree seek.

### Money as integer cents + ISO currency

**Never store money as floats.** `0.1 + 0.2 !== 0.3` in IEEE-754. We store `amountCents` as `INTEGER` plus a 3-letter ISO 4217 currency code. Display logic converts to user-locale strings via `Intl.NumberFormat`.

### Cadence amortisation

**See** `apps/api/src/modules/insights/insights.service.ts → monthlyAmountCents()`. Yearly subs are divided by 12, weekly by `12/52`, custom days by `(365/12) / customDays`. The unit test in `insights.service.spec.ts` is a good place to start when you want to extend with new cadences.

### Server Components reading httpOnly cookies

**The pattern.** `apps/web/src/lib/server/api.ts` is marked `import 'server-only'`. It reads cookies via `next/headers → cookies()` and forwards them to the API. Pages that fetch protected data (`/dashboard`, `/subscriptions`) are Server Components, so they run only on the server with full cookie access — there's no need to ship the user's session to the client.

**Why this is huge.** Initial page render comes back fully populated (no loading flicker, no second-fetch waterfall). Client components handle mutations and live updates via TanStack Query.

### TanStack Query as the boundary between server and client state

**The split.**

- **Server data** (subscriptions, categories, insights) → React Query. Initial data comes from the SSR fetch, then the client refetches/invalidates on mutation.
- **UI state** (dialog open, theme, sidebar collapsed) → React `useState` or Zustand.

**Why both.** Mixing them is the classic React mistake — putting server data in Redux and stale invalidation in your code forever. Query handles "are we fetching", "are we stale", "did this mutation just succeed", and "did another tab change something".

### Route groups vs URL segments

**The Phase 1 fix.** `(auth)` and `(app)` are route groups — wrapped in parens, they don't show up in URLs but let us share a layout (sidebar+topbar for app, two-column auth shell for auth). Real URL structure stays flat: `/`, `/login`, `/signup`, `/dashboard`, `/subscriptions`, `/settings`. We ran into a duplicate `/` route when both `app/page.tsx` and `app/(app)/page.tsx` resolved to `/` — moving the dashboard into `(app)/dashboard/page.tsx` fixed it. **Lesson:** route groups are not paths, only layout wrappers.

### Concepts added to the senior-knowledge map

| Concept                                        | Where in Outflow                     |
| ---------------------------------------------- | ------------------------------------ |
| Cookie auth + SameSite + CORS-with-credentials | Auth controller, web fetch helpers   |
| Refresh token rotation + family burn           | `auth.service.ts → refresh()`        |
| Constant-time login (timing-oracle defence)    | `auth.service.ts → dummyVerify()`    |
| Argon2id (memory-hard hashing)                 | Same                                 |
| Default-deny via APP_GUARD + @Public()         | `app.module.ts` + decorator          |
| RFC 7807 problem+json                          | `AllExceptionsFilter`                |
| Prisma soft delete + partial index             | `schema.prisma` + migration SQL      |
| Money as integer cents + ISO currency          | `Subscription` model + `formatMoney` |
| Server-only RSC data fetching with cookies     | `lib/server/api.ts`                  |
| Route groups vs URL segments                   | `apps/web/src/app/(auth)/`, `(app)/` |

---

## Phase 1.5 — Mail, account recovery, deployment

This phase moved Outflow from "works on my laptop" to "lives on the internet at outflow.akshaybhatnagar.in." Everything we added is in the same spirit as Phase 1: **boring, well-known building blocks wired together carefully** rather than a single magic library.

### Single-use tokens for recovery flows

**The pattern.** Every email-based recovery flow (verification, password reset) shares the same one-time-token shape:

1. The cleartext token is generated by `crypto.randomBytes(32).toString('base64url')` — **256 bits of entropy**, URL-safe.
2. Only `sha256(token)` lands in the database. If the DB leaks tomorrow, the live email links are still useless without the original cleartext.
3. The token has a `purpose` (`EMAIL_VERIFY` | `PASSWORD_RESET`), a `userId`, an `expiresAt`, and a nullable `consumedAt`.
4. Consumption is atomic: `UPDATE auth_tokens SET consumed_at = now() WHERE token_hash = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > now()`. If `result.count === 0` the token was either fake, expired, or already used. **No race possible** — even if the user clicks the link twice, only the first consumes.

**See** `apps/api/src/infra/auth-tokens/auth-token.service.ts`. The companion test (`*.spec.ts`) covers the three failure modes.

### HIBP password lookup (k-anonymity)

**Why this is genuinely interesting.** [Have I Been Pwned](https://haveibeenpwned.com/Passwords) hosts ~860 million leaked password hashes. We could download the whole set (~40 GB), but their API offers a slick alternative:

1. SHA-1 the password locally. (SHA-1 is broken for collision-resistance but **fine** for this lookup, which only needs preimage-style matching.)
2. Send the **first 5 hex chars** of the hash to `api.pwnedpasswords.com/range/{prefix}`.
3. The server returns a list of _all_ hashes that share that prefix — typically a few hundred — along with a count.
4. We scan the response locally for the remaining 35 chars. The plaintext password never crosses the wire, and the API can't even tell which password we looked up.

**Implementation notes** (`apps/api/src/infra/hibp/hibp.service.ts`):

- `Add-Padding: true` request header — HIBP returns extra random rows so the response size doesn't fingerprint your prefix to a passive observer.
- 3-second timeout via `AbortController`. Network failure = **fail open** (return 0). Better to let a user with a flaky network sign up than to refuse them.
- `HIBP_ENABLED=false` env switch for offline development / CI.
- Threshold of `>5` breaches: anything that's appeared in only a handful of leaks is probably your friend's birthday on a forum, not "password123". Above 5 we say no.

### Email pluggability without a framework

There are great Nest modules for this (`@nestjs-modules/mailer` for example), but they add layers we don't need yet. `MailService` (`apps/api/src/infra/mail/mail.service.ts`) is 110 lines and supports three drivers:

- **`smtp`** — `nodemailer.createTransport({ host, port, ... })`. Used in dev with Mailhog (`http://localhost:8025` shows every outgoing email). Also works with any production SMTP server if you decide later you don't want Resend.
- **`resend`** — direct `fetch('https://api.resend.com/emails', ...)` with a Bearer token. No SDK, no surprises, ~25 lines.
- **`log`** — writes the message to the logger and returns. Used in unit tests and when running the API standalone with no infra.

Templates are inline strings (`templates.ts`) with a tiny `escapeHtml`. No JSX, no framework, no template engine. Two emails so far; the day we have ten we can revisit.

### NestJS interceptors as cross-cutting policy

**The pattern.** `AuditInterceptor` is registered globally via `APP_INTERCEPTOR` in `AuditModule`. On every request it asks the `Reflector` whether the matched handler has the `@Audit({...})` metadata; if not, it does nothing. If yes, it runs the handler, then in a `tap()` operator on the response stream writes a row to `audit_logs`.

**Why this is the right shape.** The alternative is sprinkling `await this.audit.write(...)` calls inside every controller method. That works but:

- Couples business code to logging policy — change the audit format and you edit 30 files.
- Easy to forget on a new endpoint (the most security-sensitive moment of all).
- Hides intent: "what's audited?" requires grep.

The decorator-based approach moves the policy to the route signature itself. `@Audit({ action: 'subscription.delete', resourceType: 'subscription' })` reads like documentation and is one line.

**The `resourceIdFrom` trick.** For `POST /subscriptions` the resource id only exists in the _response_, not the request. The decorator accepts a dotted path (`'id'`, `'user.id'`, `'subscription.id'`) and the interceptor walks the response body to extract it. Falls back to `req.params.id` for `PATCH/DELETE` routes.

### Login lockout and password rotation

Two more credential-stuffing defences that cost a tiny amount of code:

- **Lockout.** After 10 failed attempts the user row gets `lockedUntil = now() + 15min`. Login throws while that window is open, **even with the correct password** — that's the point. Cleared on the first successful login. The login endpoint already has rate limiting at the nginx + throttler layers; lockout is the per-account cap.
- **`passwordChangedAt`.** Stored on `User`, updated on signup default + every password reset. Refresh tokens issued before the change are rejected. Without this, an attacker who steals a refresh token survives a password change — which defeats the whole point of resetting your password.

### Cookies that survive a redeploy

When the API restarts, JWT signing keys must stay constant or every browser-side `outflow_at` cookie immediately becomes invalid. The bootstrap script generates `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` once and writes them to `/opt/outflow/.env` — never rotated by deploys, never logged, never committed to git. Same for `TOKEN_ENCRYPTION_KEY` (used in Phase 2 for OAuth tokens at rest).

### Docker Compose `depends_on` with conditions

A footgun avoided: Compose's classic `depends_on: [postgres]` only waits for the container to _start_, not for Postgres to actually accept connections. The fix is `condition: service_healthy` plus a real `healthcheck:` block. We chain it further: `migrate` is gated on a healthy postgres, then `api` is gated on a `service_completed_successfully` migrate. The whole stack boots in the right order, every time, with no shell-script polling.

```yaml
api:
  depends_on:
    postgres: { condition: service_healthy }
    redis: { condition: service_healthy }
    migrate: { condition: service_completed_successfully }
```

### Nginx as a small-but-mighty reverse proxy

The nginx config has six learning moments worth highlighting:

1. **`map $http_upgrade $connection_upgrade`** — must live in the `http {}` context, _not_ in a snippet that's `include`d inside `server {}`. We hit this in dev. Lesson: nginx's directive context rules are exact, and the docs spell out where each can appear.
2. **`limit_req_zone` + `limit_req`** — token-bucket per IP. Two zones: `auth` (10 req/s) for credential endpoints, `api` (60 req/s) for everything else. Defence in depth — the in-app `ThrottlerGuard` is still there, but nginx swats away abusers before they ever touch Node.
3. **`X-Forwarded-For` + `set_real_ip_from`** — without telling nginx which upstream IPs to trust, all incoming requests look like they came from `127.0.0.1` to the API. We trust the docker bridge ranges (`10/8`, `172.16/12`, `192.168/16`).
4. **`Strict-Transport-Security` + 1 year** — once a browser sees this header it refuses to talk to `outflow.akshaybhatnagar.in` over plain HTTP for the next year. Safe because we ship HTTPS-only.
5. **`/_next/static/` immutable cache.** Next.js fingerprints these filenames; their content is content-addressed forever. Marking them `Cache-Control: max-age=31536000, immutable` saves bandwidth and round-trips.
6. **`proxy_buffering off`** — we want streaming responses (and future SSE) to actually stream. Without this, nginx will hold up to ~64 KB of the response before flushing.

### Let's Encrypt via certbot + the dummy-cert dance

When you ship `nginx -c outflow.conf` for the first time, nginx tries to load `/etc/letsencrypt/live/outflow.akshaybhatnagar.in/fullchain.pem` and **dies** if the file doesn't exist. But the file can only exist after certbot solves a challenge served by nginx. Chicken, meet egg.

The fix (`infra/scripts/init-letsencrypt.sh`) is the well-known three-step dance:

1. Generate a 1-day **self-signed dummy** at the expected path.
2. Boot nginx — it loads the dummy and answers `/.well-known/acme-challenge/` from a shared volume.
3. Run `certbot certonly --webroot` in a one-shot container; certbot writes the challenge file, Let's Encrypt verifies, certbot saves the real cert to the _same_ volume nginx is reading from. `nginx -s reload` and we're live.

Renewal is a sidecar that loops `certbot renew --quiet` every 12 hours. Renewals don't change the cert path, so most of the time nginx doesn't even need to reload.

### GitHub Actions as a turnkey deploy bot

The deploy workflow (`.github/workflows/deploy.yml`) is two jobs:

1. **`build-and-push`** — `docker/build-push-action@v6` with `cache-from`/`cache-to` of type `gha`. Every dependency layer survives between runs in GitHub's per-repo cache. First build: ~5 min. Subsequent: ~30 s.
2. **`deploy`** — `appleboy/ssh-action@v1.2.0` connects with a private key from `secrets.DROPLET_SSH_KEY`, runs `git fetch && reset --hard origin/main && IMAGE_TAG=$SHA bash infra/scripts/deploy.sh`. After it finishes, `curl https://$APP_DOMAIN/health/ready` is the smoke check.

**The two non-obvious bits:**

- `concurrency: { group: deploy-prod, cancel-in-progress: false }` — if you push twice, the second deploy queues until the first finishes instead of racing.
- `environment: production` lets you require manual approval in the GH UI later without changing the workflow.

### Concepts added to the senior-knowledge map

| Concept                                                  | Where in Outflow                                 |
| -------------------------------------------------------- | ------------------------------------------------ |
| One-time tokens (hash-only at rest)                      | `infra/auth-tokens/auth-token.service.ts`        |
| HIBP k-anonymity password check                          | `infra/hibp/hibp.service.ts`                     |
| Pluggable mail driver (smtp/resend/log)                  | `infra/mail/mail.service.ts`                     |
| `@Audit(...)` interceptor + Reflector                    | `modules/audit/audit.{decorator,interceptor}.ts` |
| Login lockout + `passwordChangedAt`                      | `modules/auth/auth.service.ts`                   |
| Compose `depends_on` conditions                          | `docker-compose.prod.yml`                        |
| Nginx as reverse proxy + rate limiter + TLS terminator   | `infra/nginx/*`                                  |
| Let's Encrypt dummy-cert bootstrap dance                 | `infra/scripts/init-letsencrypt.sh`              |
| GHCR + GHA `cache-from: type=gha`                        | `.github/workflows/deploy.yml`                   |
| Idempotent droplet bootstrap (apt + ufw + Docker + user) | `infra/scripts/bootstrap-droplet.sh`             |
| Zero-downtime deploy via per-service health gates        | `infra/scripts/deploy.sh`                        |
| ADRs for non-trivial decisions                           | `docs/adr/005`, `docs/adr/006`                   |
