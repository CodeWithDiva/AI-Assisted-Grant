# GrantPilot — AI-Assisted Grant/Proposal Writing Platform

Drafts grant proposals against funder templates and tracks application deadlines for nonprofits, startups and grant writers.

See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for scope, architecture and the 15-day plan.

## Structure

```
apps/
  web/        React + Vite + TypeScript + Tailwind (frontend)
  api/        NestJS + Prisma + PostgreSQL (backend)
packages/
  shared/     Enums, Zod schemas and types shared by web and api
docs/         Project plan and documentation
infra/docker/ Dockerfiles (built by GitHub Actions, not needed locally)
```

## Requirements

- Node.js 22+ (24 recommended)
- pnpm (`npm install -g pnpm`)
- PostgreSQL 16+ running locally
- Upstash Redis URL (free tier), needed once background jobs are added
- Docker is **not** required for local development
- Anthropic API key - only for AI features; without it the app runs and AI endpoints answer `503`

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Environment files
cp apps/api/.env.example apps/api/.env      # set DATABASE_URL password
cp apps/web/.env.example apps/web/.env

# 3. Create the database (once)
psql -U postgres -c "CREATE DATABASE grant_platform;"

# 4. Run migrations, generate the Prisma client and load starter templates
pnpm db:migrate
pnpm db:seed

# 5. Start web + api
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/v1 (health check: `/api/v1/health`)

## Scripts

| Command            | What it does                                                 |
| ------------------ | ------------------------------------------------------------ |
| `pnpm dev`         | Builds `shared`, then runs web, api and shared in watch mode |
| `pnpm build`       | Production build of all packages                             |
| `pnpm typecheck`   | TypeScript checks in all packages                            |
| `pnpm format`      | Format code with Prettier                                    |
| `pnpm db:migrate`  | Create/apply Prisma migrations (development)                 |
| `pnpm db:generate` | Regenerate the Prisma client                                 |
| `pnpm db:seed`     | Load the starter funder template library                     |
| `pnpm db:studio`   | Open Prisma Studio to browse the database                    |
