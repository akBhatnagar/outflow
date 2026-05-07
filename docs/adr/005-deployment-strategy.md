# ADR-005: Single-droplet deployment with Docker Compose + GHCR

- **Date:** 2026-05-07
- **Status:** Accepted
- **Deciders:** @akshay

## Context

Outflow ships from a solo developer to ~real users on a portfolio budget. We
have one DigitalOcean droplet (4 GB / 2 vCPU class), no managed Postgres, no
Kubernetes, and no team. The deployment must be:

- **Reproducible** — a fresh droplet gets to "running" with one bootstrap script.
- **Auditable** — every release is tied to a git SHA and an OCI image digest.
- **Recoverable** — a bad rollout reverts in under a minute.
- **Cheap** — one box, no managed runtime, no per-environment surcharge.

We explicitly _did not_ consider Kubernetes (operator overhead), DigitalOcean
App Platform (lower control + still pricey for our shape), or shipping the
binary directly via systemd (no isolation, painful pre-prod parity).

## Decision

- **One droplet, Docker Compose v2** — every long-lived process is a service
  in `docker-compose.prod.yml`. Postgres + Redis run on the same box with
  volumes pinned to the host. We accept the box as a single failure domain.
- **Images live in GHCR** — `ghcr.io/<owner>/outflow-{api,web}:<git-sha>`.
  Tagging by SHA gives us free immutability and easy rollbacks.
- **CI builds, droplet pulls** — GitHub Actions builds and pushes; the droplet
  pulls. No build tooling, source code, or pnpm cache lives in production.
- **Schema migrations as a one-shot service** — Compose's
  `depends_on: { migrate: { condition: service_completed_successfully } }`
  blocks app boot until `prisma migrate deploy` succeeds.
- **Zero-downtime swap, not blue/green** — `infra/scripts/deploy.sh` rolls
  api → wait healthy → web → wait healthy → reload nginx. With healthchecks
  and connection-keepalive in nginx, in-flight requests stay alive through
  the swap. True blue/green would need two stacks, twice the RAM, and a
  release-controller — not worth it for current traffic shape.
- **Bootstrap script** — `infra/scripts/bootstrap-droplet.sh` is idempotent
  and configures: apt updates, Docker, ufw firewall (22/80/443), fail2ban,
  the `outflow` deploy user, `/opt/outflow` checkout, and a `.env` with
  random secrets baked in.

## Consequences

- **Positive**
  - One file (`docker-compose.prod.yml`) describes the entire production
    topology — readable in 60 seconds.
  - Rollbacks: `IMAGE_TAG=<old-sha> bash infra/scripts/deploy.sh`. ~30 s.
  - No extra services to babysit. Logs flow to journald via Docker.
  - The same compose file works on a Mac (with `--env-file`) for prod parity.
- **Negative**
  - Single point of failure. Hard outage if the droplet dies — we'll cut a
    daily Postgres dump (Phase 7) to bound RPO at 24 h.
  - No multi-region, no canary, no traffic-splitting. Acceptable today.
  - Resizing requires reboot (DO live-resize is OK for vCPU/RAM but not disk).
- **Neutral**
  - Compose v2 is now stable upstream and bundled with Docker; no longer the
    "v1 vs v2" footgun it was a couple of years ago.

## Alternatives considered

1. **Kubernetes (DOKS or k3s)** — overkill for a one-app workload. Pulls in
   ingress, cert-manager, helm, and a cluster of "what's broken now?". Worth
   revisiting at Phase 6 when there's a worker fleet to scale.
2. **DigitalOcean App Platform** — closer to the right shape, but it costs
   ~3× a droplet for the equivalent CPU/RAM and gives up control over nginx,
   SSL config, and on-host debugging.
3. **systemd + bare Node** — no isolation, no rollbacks, painful image
   parity between staging and prod.
4. **Fly.io / Railway** — both reasonable; rejected because we already have
   the DO droplet and the goal is to demonstrate ops fluency, not lift-and-shift.
