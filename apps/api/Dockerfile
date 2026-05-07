################################
# Outflow API — multi-stage build
################################
ARG NODE_VERSION=22.13.0

# ---------- deps ----------
FROM node:${NODE_VERSION}-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

# Copy workspace manifests for accurate install.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
COPY packages/ui/package.json packages/ui/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && \
    pnpm install --frozen-lockfile=false

# ---------- builder ----------
FROM node:${NODE_VERSION}-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo
COPY --from=deps /repo /repo
COPY . .
RUN pnpm --filter @outflow/api exec prisma generate
RUN pnpm --filter @outflow/api build
RUN pnpm --filter @outflow/api deploy --prod /out

# ---------- runtime ----------
FROM node:${NODE_VERSION}-alpine AS runtime
# Prisma's musl engine dlopen()s libssl/libcrypto at runtime, so make sure
# OpenSSL 3 is present even on minimal Alpine images. libc6-compat is a
# small belt-and-braces package for glibc-style binaries shipped by some
# Node native modules.
RUN apk add --no-cache tini openssl libc6-compat && addgroup -S app && adduser -S app -G app
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=app:app /out ./
COPY --from=builder --chown=app:app /repo/apps/api/prisma ./prisma
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:4000/health/live || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
