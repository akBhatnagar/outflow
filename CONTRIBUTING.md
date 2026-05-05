# Contributing to Outflow

Thanks for the interest. Outflow is currently a solo portfolio project, but contributions and issues are welcome.

## Development setup

```bash
# 1. Install Node 22 (use nvm)
nvm install
nvm use

# 2. Enable pnpm via corepack (ships with Node)
corepack enable
corepack prepare pnpm@9.15.0 --activate

# 3. Install dependencies
pnpm install

# 4. Boot infra (Postgres, Redis, Mailhog, MinIO)
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d

# 5. Run dev servers
pnpm dev
# api → http://localhost:4000  (docs at /docs)
# web → http://localhost:3000
```

## Commit style

Outflow uses [Conventional Commits](https://www.conventionalcommits.org/). Husky enforces this on every commit:

- `feat(scope): ...` — new feature
- `fix(scope): ...` — bug fix
- `refactor(scope): ...` — internal refactor
- `chore(scope): ...` — tooling, deps
- `docs(scope): ...` — docs only
- `test(scope): ...` — tests only
- `perf(scope): ...` — performance

Examples:

```
feat(auth): add 2FA via TOTP
fix(parsers/netflix): handle annual receipts with VAT line
chore(deps): bump prisma to 5.22
```

## Branching

- `main` — protected, deploys to production
- `develop` — protected, deploys to staging
- `feat/*`, `fix/*`, `chore/*` — feature branches off `develop`

Open PRs against `develop`. Squash-merge with the PR title as the commit message.

## Code style

- Prettier + ESLint enforced via pre-commit hook
- Run `pnpm format` to format the whole repo
- Run `pnpm lint` and `pnpm typecheck` before pushing

## Testing

- Unit: `pnpm test`
- E2E (Phase 6+): `pnpm test:e2e`
- Add tests for any new module's services and processors. The parser module's fixture-based snapshot tests are mandatory.
