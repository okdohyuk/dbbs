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

# Database client tools used for snapshot + restore:
#  - MySQL/MariaDB: default-mysql-client (MariaDB client on Debian)
#  - PostgreSQL: postgresql-client-17 from the PGDG apt repo (client >= server)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      default-mysql-client gzip ca-certificates curl gnupg \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client-17 \
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
