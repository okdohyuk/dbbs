# DBBS — Database Backup System

Connect MySQL databases, capture named snapshots, and restore them into another
database — across servers. A self-hosted, dashboard-style backup tool built on a
single Next.js 16 stack and shipped as a Docker Compose stack.

> **A → B in one click:** snapshot `A`'s `test` database and restore it into
> `B`'s `anything` database, with options for data-only / schema-only / full
> (procedures, triggers, events).

![CI](https://img.shields.io/github/actions/workflow/status/okdohyuk/dbbs/docker-publish.yml?label=docker%20build)
![Docker Image](https://img.shields.io/docker/v/okdohyuk/dbbs?label=docker%20hub&sort=semver)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Projects → connections → snapshots** organized in a left-sidebar dashboard
- **Connect & test** MySQL servers; passwords encrypted at rest (AES-256-GCM)
- **Browse tables** (rows, size, engine) of any connected database
- **Snapshots** via `mysqldump` with streaming + gzip; choose:
  - full / schema-only / data-only
  - stored procedures & functions, triggers, events, `DROP TABLE`, single-transaction
- **Restore** any completed snapshot into another connection / database
  (the target DB is created automatically — `A.test → B.other` works across servers)
- **Live progress** over Server-Sent Events; job state persists across restarts
- **Bilingual UI** — English / 한국어, switchable in Settings

## Tech stack

Next.js 16 (App Router, RSC, Server Actions) · TypeScript · Tailwind CSS v4 ·
shadcn/ui (Base UI) · Drizzle ORM + PostgreSQL (metadata) · `mysql2` +
`mysqldump`/`mysql` CLI (backup engine) · Docker Compose · Playwright (E2E).

## Quick start (Docker Compose)

```bash
git clone https://github.com/okdohyuk/dbbs.git
cd dbbs
cp .env.example .env        # set DBBS_MASTER_KEY to a strong random value
docker compose up --build -d
```

Open <http://localhost:3000>. The stack starts four services:

| Service    | Purpose                                              |
| ---------- | ---------------------------------------------------- |
| `app`      | DBBS (Next.js) + MySQL client tools                  |
| `meta-db`  | PostgreSQL — stores projects/connections/snapshots   |
| `mysql-a`  | Demo source DB (seeded with tables, data, procedure) |
| `mysql-b`  | Demo restore target (empty server)                   |

Try it: create a project → add a connection (`host: mysql-a`, user `root`,
password `root`) → snapshot the `test` database → restore it into `mysql-b`.

### Using the published image

```yaml
# docker-compose.yml (excerpt)
services:
  app:
    image: okdohyuk/dbbs:latest   # instead of build: .
    environment:
      DATABASE_URL: postgres://dbbs:dbbs@meta-db:5432/dbbs
      DBBS_MASTER_KEY: ${DBBS_MASTER_KEY}
      SNAPSHOT_DIR: /data/snapshots
    volumes:
      - ./snapshots:/data/snapshots
```

## Configuration

| Variable           | Description                                                          |
| ------------------ | ------------------------------------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string for the metadata store                 |
| `DBBS_MASTER_KEY`  | Secret used to derive the AES-256-GCM key (any strong string)       |
| `SNAPSHOT_DIR`     | Directory where dump files are written (mounted volume in Docker)   |
| `DBBS_PASSWORD`    | Optional — set to require a login before accessing the app          |
| `DBBS_MYSQL_BIN_DIR` | Optional override for the `mysqldump`/`mysql` binary directory     |

**Login gate:** set `DBBS_PASSWORD` to require a password (a signed, HTTP-only
session cookie is issued on login). Leave it unset to run open for a single user
on a trusted network. The app has no built-in TLS — put it behind HTTPS in
production.

Snapshot dumps are written to the mounted `SNAPSHOT_DIR`. To reach a MySQL server
running on the host, use `host.docker.internal` as the connection host.

## Development

```bash
pnpm install
docker compose up -d meta-db mysql-a mysql-b   # back the app with the DBs
pnpm drizzle-kit generate                       # regenerate migrations after schema edits
pnpm dev                                         # http://localhost:3000
pnpm exec playwright test                        # E2E (needs the docker stack up)
```

## How it works

- **Backup** shells out to `mysqldump` with `spawn` (argv, never a shell) and
  streams stdout → gzip → file. Credentials go through a temporary `0600`
  `--defaults-extra-file`, never the argv/`ps` table.
- **Single-database dumps** omit `CREATE DATABASE`/`USE`, so a snapshot can be
  restored into a differently named database on another server.
- **Restore** streams the dump (gunzip) into `mysql --database=<target>`.
- The engine sits behind a `DbAdapter` interface (`lib/server/db/adapter.ts`),
  so other engines (PostgreSQL, MariaDB) can be added later.

## Security

Connection passwords are encrypted at rest with AES-256-GCM; the plaintext never
crosses to the client (a password-stripped DTO is used). Identifiers are
whitelist-validated, metadata queries are parameterized, and snapshot paths are
constrained to `SNAPSHOT_DIR`.

## License

[MIT](./LICENSE) © 2026 okdohyuk
