# Stack & Decision Log

A short, opinionated map of _why_ this stack and not the alternatives. For tutorial-style explanations of each tool, see [`LEARNING.md`](LEARNING.md).

## Stack at a glance

| Layer               | Choice                                              | Main alternative considered      | Why we picked this                                             |
| ------------------- | --------------------------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| Language            | TypeScript                                          | JavaScript / Go                  | Type safety scales; single language across web + api + workers |
| Runtime             | Node 22 LTS                                         | Bun, Deno                        | Tooling maturity, NestJS targets Node, library coverage        |
| Package manager     | pnpm via Corepack                                   | npm, yarn                        | Workspaces + speed + disk efficiency                           |
| Build orchestration | Turborepo                                           | Nx                               | Smaller config, content-hash caching, just enough features     |
| Frontend framework  | Next.js 15 (App Router)                             | Remix, Astro, Vite SPA           | RSC + SSR + routing + image/font/middleware all in one         |
| UI library          | React 19                                            | Solid, Svelte                    | Ecosystem + Next + RSC alignment                               |
| Styling             | Tailwind CSS                                        | CSS modules, vanilla-extract     | Speed of iteration, design tokens via CSS vars                 |
| Components          | shadcn/ui (Radix + Tailwind)                        | MUI, Mantine, Chakra             | Own the components, accessible by default, no lock-in          |
| Server-state        | TanStack Query                                      | SWR, RTK Query                   | Best DX for server cache + mutations                           |
| Client-state        | Zustand                                             | Redux Toolkit, Jotai             | Smallest tool that fits — UI state only                        |
| Backend framework   | NestJS 10                                           | Fastify + tRPC, Hono             | Modular structure, DI, guards/pipes/interceptors built-in      |
| Validation          | class-validator + Zod                               | Joi, Yup                         | Decorator DTOs at the edge + Zod for shared contracts          |
| ORM                 | Prisma                                              | Drizzle, Kysely, TypeORM         | Type-safe end-to-end, migrations, Studio                       |
| Database            | PostgreSQL 16                                       | MySQL, MongoDB                   | Mature, JSON when needed, extension ecosystem (pgvector)       |
| Cache / queues      | Redis 7 + BullMQ                                    | Postgres LISTEN/NOTIFY, RabbitMQ | Speed + ergonomic Node libraries                               |
| Auth                | JWT (RS256) + Google OAuth + TOTP                   | Supabase Auth, Auth0             | Owned, not rented; learning value; no vendor lock-in           |
| LLM                 | OpenAI API                                          | Anthropic, local Ollama          | Best structured-output support, JSON mode is mature            |
| Payments            | Stripe                                              | Lemon Squeezy, Paddle            | Industry-standard, deepest docs                                |
| Email               | Resend + React Email                                | SendGrid, Postmark               | DX; React Email is the only sane way to author emails          |
| Logs                | Pino → Promtail → Loki → Grafana                    | Datadog, Logtail                 | Free self-host, structured by default                          |
| Metrics             | Prometheus → Grafana                                | Datadog                          | Free, ubiquitous                                               |
| Errors              | Sentry                                              | Honeybadger, Bugsnag             | Best free tier, source maps, performance data                  |
| Tracing             | OpenTelemetry → Tempo                               | Honeycomb                        | Vendor-neutral instrumentation                                 |
| Containers          | Docker                                              | Podman                           | Ubiquity, ecosystem                                            |
| Reverse proxy       | Nginx                                               | Caddy, Traefik                   | Battle-tested, predictable                                     |
| Hosting             | DigitalOcean Droplet                                | Fly.io, Railway, AWS             | Cheapest "real server" with snapshots, predictable bill        |
| CI                  | GitHub Actions                                      | CircleCI, Buildkite              | Free for public repos, native to GitHub                        |
| Testing             | Jest + Supertest + Playwright + Testcontainers + k6 | Vitest, Cypress                  | Mature stack, well-understood failure modes                    |

## Architectural decisions worth knowing

### 1. Modular monolith, not microservices

A single NestJS API process and a single worker process talking to one Postgres + one Redis. Modules have strong boundaries — splitting later is mechanical if ever needed. For a solo build, microservices are pure cost.

### 2. No multi-tenant workspaces

Outflow is **consumer SaaS** — accounts, not tenants. Family tier (v1.5) adds shared views via account membership, not RLS. This avoids ~30% of the complexity that a B2B build would force.

### 3. Three-layer parser strategy

Vendor parsers handle the head, regex handles known patterns, LLM handles the long tail with budgets and content-hash caching. LLM-only would be slow, expensive, and non-deterministic. Vendor-only would never reach the long tail.

### 4. Two separate Google OAuth flows

Login OAuth (`userinfo.email`) and Gmail-data OAuth (`gmail.readonly`) are deliberately separated. A user can sign up, look around, and only consent to inbox access when they're convinced the product is worth it. Mixing them tanks signup conversion.

### 5. Gmail polling > Pub/Sub for v1

Pub/Sub push notifications require a verified domain webhook with HTTPS and Google verification — a high-friction setup for solo builds. Polling every 6 hours via repeatable BullMQ jobs is simpler, easily good enough for a subscription-tracker workload, and documented as a v2 upgrade.

### 6. Encryption at rest for OAuth tokens

Even though Postgres has its own access controls, OAuth tokens are encrypted with AES-256-GCM using a key from env. Belt + suspenders: a leaked DB dump is useless without the encryption key.

### 7. Expand-only migrations

Schema changes are deployable in any order against a running app. New columns are nullable on creation; backfills run as separate migrations; old columns are removed only after the new code is fully rolled out. This is how you ship without downtime windows.

### 8. Distroless multi-stage Docker images

Final API image is ~150MB instead of ~1GB. Non-root user, `tini` as PID 1, healthcheck. Smaller blast radius, faster pulls, fewer CVEs from unused base packages.

### 9. JSON structured logs with correlation IDs

Pino emits JSON; nestjs-pino injects a per-request correlation id; redaction list prevents tokens/passwords from ever hitting logs. When something breaks in prod, you can grep one trace through API + worker logs.

### 10. CASA disclosed up front

The Gmail `gmail.readonly` scope is restricted; until CASA verification, the app serves only 100 OAuth test users. Rather than hide this, we document it in the README and link a runbook (Phase 7). Recruiters who know this respect the awareness; those who don't won't notice.

## Decisions log

Major decisions go into `docs/adr/NNN-title.md` as Architectural Decision Records. The format is short:

```
# ADR-NNN: Title

Date: YYYY-MM-DD
Status: Accepted | Superseded by ADR-MMM

## Context
Why we needed to make this decision.

## Decision
What we chose.

## Consequences
What this enables, what it costs, and what it forecloses.
```

ADRs to be written across the project lifecycle:

- `001-modular-monolith.md`
- `002-two-google-oauth-flows.md`
- `003-three-layer-parser-strategy.md`
- `004-no-multi-tenant.md`
- `005-gmail-polling-vs-pubsub.md`
- `006-encryption-at-rest.md`
- `007-expand-only-migrations.md`
- `008-distroless-images.md`
