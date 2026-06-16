# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Pin pnpm to match the host (lockfile v9) and avoid newer pnpm's release-age policy.
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate

# ── deps ──
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ── builder ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── runner ──
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

LABEL org.opencontainers.image.title="DBBS — Database Backup System" \
      org.opencontainers.image.description="Connect MySQL databases, snapshot them, and restore into another database." \
      org.opencontainers.image.source="https://github.com/okdohyuk/dbbs" \
      org.opencontainers.image.licenses="MIT"

# MySQL client tools (mysqldump / mysql) used for snapshot + restore.
# default-mysql-client is the MariaDB client on Debian; the snapshot flag
# builder detects the client kind and only emits compatible flags.
RUN apt-get update \
 && apt-get install -y --no-install-recommends default-mysql-client gzip ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Drizzle migration SQL is read at runtime (not traced by standalone)
COPY --from=builder --chown=nextjs:nodejs /app/lib/server/store/migrations ./lib/server/store/migrations

RUN mkdir -p /data/snapshots && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
