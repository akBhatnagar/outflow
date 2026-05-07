# ADR-006: SSL via Certbot in a sidecar container

- **Date:** 2026-05-07
- **Status:** Accepted
- **Deciders:** @akshay

## Context

`outflow.akshaybhatnagar.in` is served exclusively over HTTPS. The cert
issuer must be:

- Free (this is a portfolio project).
- Automated (no human in the loop for renewals).
- Co-located with nginx (no third-party termination — we want to keep ops
  surface area inside the droplet).

The two practical options are:

1. Run **Certbot on the host** with a cron job, mount certs into the nginx
   container.
2. Run **Certbot as a Compose sidecar**, share `/etc/letsencrypt` and
   `/var/www/certbot` via named volumes with nginx.

## Decision

Run Certbot as a sidecar (`certbot/certbot:latest`) inside the same Compose
project as nginx. Two named volumes mediate the relationship:

- `certbot-conf` (`/etc/letsencrypt`) — cert + private key live here.
- `certbot-www` (`/var/www/certbot`) — webroot for HTTP-01 challenges.

nginx mounts both volumes read-only. The certbot service runs `certbot renew`
every 12 h and writes a `.reload` marker to the shared webroot when a
certificate has been issued; a future polling sidecar (or simple cron-on-host)
will translate that into an `nginx -s reload`. For now we accept that the
cert is live but nginx must be reloaded manually after renewal — Let's
Encrypt certs are valid for 90 days and we have a daily ops touch anyway.

First-time issuance is bootstrapped by `infra/scripts/init-letsencrypt.sh`:

1. Generate a 1-day self-signed dummy at the path nginx expects so it can
   start at all.
2. Boot nginx, then run certbot to swap the dummy for a real Let's Encrypt
   certificate via the HTTP-01 webroot challenge.
3. `nginx -s reload` to pick up the real cert.

## Consequences

- **Positive**
  - Zero packages installed on the host beyond Docker. The certbot version
    is upgraded by simply pulling a newer image.
  - The same Compose file describes _all_ certificate lifecycle on the box.
  - Re-running the init script is safe — it cleans up dummy certs before
    requesting real ones.
- **Negative**
  - HTTP-01 challenge requires inbound port 80, which we keep open and
    redirect-only. DNS-01 would be more flexible but requires a DNS provider
    plug-in, which is project-specific and not worth the lift today.
  - We must remember to reload nginx after each renewal. Mitigated by a
    deploy-script step (`nginx -t && nginx -s reload`) and by future
    `--deploy-hook` automation once we add a host-level reload helper.
- **Neutral**
  - Wildcard certs are unsupported via HTTP-01. We have only one hostname so
    this isn't a concern.

## Alternatives considered

1. **Certbot on the host via apt** — works fine but increases host package
   surface and ties certificate ops to host updates. Rejected for cleanliness.
2. **Caddy as the reverse proxy** — Caddy is brilliant at automatic HTTPS but
   nginx is the industry-standard reference and that's a deliberate learning
   choice for this project. Reconsider in a future ADR if SSL ops become a
   real burden.
3. **Cloudflare in front of nginx** — moves TLS termination upstream, hides
   origin IP, gives free DDoS protection. Adds an external dependency and
   a third-party privacy/policy surface. Worth revisiting once the app has
   real users.
