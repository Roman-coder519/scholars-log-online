# Scholar's Log — Portable Setup

This archive contains the complete source code and a development database export. It is prepared to run in another IDE or local development environment.

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer
- PostgreSQL 14 or newer

The app uses PostgreSQL-specific features, including enums and numeric columns. SQLite is not supported without a database rewrite.

## 1. Install pnpm and dependencies

This project uses pnpm workspaces and the `catalog:` protocol. Do not run `npm install` in the project root.

With a recent Node.js installation, enable the pinned pnpm version:

```bash
corepack enable
corepack install --global pnpm@10.26.1
```

From the extracted project directory:

```bash
pnpm install
```

The workspace root also supports these commands:

```bash
pnpm run db:push
pnpm run db:import
pnpm run dev:api
pnpm run dev:web
pnpm run build
```

These commands call the individual packages directly and do not depend on platform-specific recursive path matching.

If Windows reports `@rollup/rollup-win32-x64-msvc` is missing, remove the copied dependency folder and reinstall it on Windows:

```powershell
Remove-Item -Recurse -Force node_modules
pnpm install --force
```

Do not copy `node_modules` from Replit/Linux into Windows. The fresh install must create Windows-native optional dependencies.

## 2. Configure PostgreSQL and environment variables

The API requires PostgreSQL. You have two options:

### Option A: Docker Desktop

If Docker Desktop is installed, run this from the project root:

```bash
docker compose up -d db
```

The included `docker-compose.yml` creates a local `scholars_log` database.

### Option B: Existing PostgreSQL

Create an empty database named `scholars_log`.

Then copy `.env.example` to `.env` and update `DATABASE_URL`. The default value matches the included Docker setup:

```text
postgresql://postgres:postgres@127.0.0.1:5432/scholars_log
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Edit `.env` if your PostgreSQL username, password, host, or port differs. The project now loads this file automatically; you do not need Linux `export` commands.

Do not put real production passwords or API keys in source control.

Create the tables:

```bash
pnpm run db:push
```

## 3. Restore the included saved data

The ZIP includes `development-data-export.json`, which contains the saved development records available when this archive was created.

```bash
pnpm run db:import
```

The import is safe to rerun: existing conflicting rows are skipped and serial sequences are refreshed.

## 4. Run the API server

In terminal 1:

```bash
pnpm run dev:api
```

The cross-platform launcher reads `.env`, builds the API, and starts it on port 8080.

## 5. Run the frontend

In terminal 2:

```bash
pnpm run dev:web
```

Open `http://localhost:25350`.

The frontend reads `PORT`, `BASE_PATH`, and `API_PROXY_TARGET` from `.env`. The local Vite proxy forwards `/api` requests to the API server. Replit's path router handles this automatically in the workspace.

## Optional integrations

- Set `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` to enable AI chat.
- Set the `VAPID_*` values to enable web push notifications.
- The API still starts without AI credentials; only AI chat returns an unavailable response until those values are configured.
- The rest of the app works without these optional integrations.

## What is not included

- `node_modules` and build caches
- Replit-managed secrets and database connection strings
- Production database records that were inaccessible while the production database was suspended
- Browser push authentication tokens

The included data export is from the development database, not a dump of the suspended production database.