# GrantPilot — AI-Assisted Grant/Proposal Writing Platform

Drafts grant proposals against funder templates and tracks application deadlines for nonprofits, startups and grant writers.

| Document                                       | What it covers                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)   | Scope, architecture, data model, AI pipeline, 15-day plan, progress |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md)       | How to use the app, end to end                                      |
| [docs/API.md](docs/API.md)                     | Every endpoint, roles and rate limits                               |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)       | Production setup and the pre-launch checklist                       |
| [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | What shipped, and the known issues                                  |

## What it does

- **Organization knowledge base** — profile plus uploaded past proposals, reports and funder guidelines (text is extracted automatically)
- **Funder templates** — a starter library, or import an RFP and let the AI read out its sections, word limits, eligibility and scoring criteria
- **AI drafting** — section-by-section drafts from your own facts, streamed live, with shorten/expand/tone rewrites and full version history
- **Review** — instant limit and placeholder checks, plus an AI score against the funder's criteria and a 0-100 funder-fit score
- **Deadlines** — reminders by email 14/7/3/1 days before, calendar export, status pipeline
- **Export** — DOCX and PDF in the funder's section order

The AI never invents facts: anything it was not given appears as `[NEEDS INPUT: …]`.

## Structure

```
apps/
  web/        React + Vite + TypeScript + Tailwind (frontend)
  api/        NestJS + Prisma + PostgreSQL (backend)
packages/
  shared/     Enums, Zod schemas and types shared by web and api
docs/         Plan, user guide, API reference, deployment guide, release notes
scripts/      smoke-test.sh — end-to-end check against a running API
infra/docker/ Dockerfile (built by GitHub Actions, not needed locally)
```

## Requirements

- Node.js 22+ (24 recommended)
- pnpm (`npm install -g pnpm`)
- PostgreSQL 16+ running locally
- Anthropic API key — only for the AI features; without it everything else works and AI endpoints answer `503`
- Docker is **not** required for local development

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Environment files
cp apps/api/.env.example apps/api/.env      # set the DATABASE_URL password
cp apps/web/.env.example apps/web/.env

# 3. Create the database, tables and starter templates
pnpm db:migrate
pnpm db:seed

# 4. Start web + api
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/v1 (health check: `/api/v1/health`)

If the database password contains `@`, `#`, `/` or `:`, percent-encode it in `DATABASE_URL` (`@` → `%40`).

## Scripts

| Command                      | What it does                                                 |
| ---------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                   | Builds `shared`, then runs web, api and shared in watch mode |
| `pnpm build`                 | Production build of all packages                             |
| `pnpm typecheck`             | TypeScript checks in all packages                            |
| `pnpm test`                  | Unit tests (vitest)                                          |
| `pnpm format`                | Format code with Prettier                                    |
| `pnpm db:migrate`            | Create/apply Prisma migrations (development)                 |
| `pnpm db:seed`               | Load the starter funder template library                     |
| `pnpm db:generate`           | Regenerate the Prisma client                                 |
| `pnpm db:studio`             | Browse the database                                          |
| `bash scripts/smoke-test.sh` | End-to-end check against a running API                       |

## Testing

```bash
pnpm test                                   # unit tests
pnpm --filter @grant/api build && node apps/api/dist/main.js &
bash scripts/smoke-test.sh                  # full API flow, cleans up after itself
```

CI runs formatting, typechecks, unit tests, both builds, the Docker image build and the smoke test against a real PostgreSQL service.
