# GrantPilot — AI-Assisted Grant/Proposal Writing Platform

Drafts grant proposals against funder templates and tracks application deadlines for nonprofits, startups and grant writers.

| Document                                       | What it covers                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)   | Scope, architecture, data model, AI pipeline, 15-day plan, progress |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md)       | How to use the app, end to end                                      |
| [docs/API.md](docs/API.md)                     | Every endpoint, roles and rate limits                               |
| [docs/FREE_HOSTING.md](docs/FREE_HOSTING.md)   | Run it on free plans only (Gemini, Neon, Render, Vercel, Brevo)     |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)       | Production setup and the pre-launch checklist                       |
| [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | What shipped, and the known issues                                  |

## What it does

- **Organization knowledge base** — profile plus uploaded past proposals, reports and funder guidelines (text is extracted automatically)
- **Funder templates** — a starter library, or import an RFP and let the AI read out its sections, word limits, eligibility and scoring criteria
- **AI drafting** — section-by-section drafts from your own facts, streamed live, with shorten/expand/tone rewrites and full version history
- **Formatting** — bold, italics, bulleted and numbered lists, carried into the Word and PDF exports
- **Review** — instant limit and placeholder checks, plus an AI score against the funder's criteria and a 0-100 funder-fit score
- **Deadlines** — reminders by email 14/7/3/1 days before, calendar export, status pipeline
- **Export** — DOCX and PDF in the funder's section order
- **Team** — invite colleagues by email as owner, editor or viewer; change roles; account and password settings

The AI never invents facts: anything it was not given appears as `[NEEDS INPUT: …]`.

## Structure

```
apps/
  web/        React + Vite + TypeScript + Tailwind (frontend)
  api/        NestJS + Prisma + PostgreSQL (backend)
  e2e/        Playwright browser tests
packages/
  shared/     Enums, Zod schemas, rich-text parser and types shared by web and api
docs/         Plan, user guide, API reference, deployment guide, release notes
scripts/      smoke-test.sh (API check), ai-check.mjs (live AI check), seed-demo.mjs (demo data), free-ports.mjs
infra/docker/ Dockerfile (built by GitHub Actions, not needed locally)
render.yaml   Render blueprint for the API
```

## Requirements

- Node.js 22+ (24 recommended)
- pnpm (`npm install -g pnpm`)
- PostgreSQL 16+ running locally
- An AI key, only for the AI features: a **free Google Gemini key** (https://aistudio.google.com/apikey, no card) or Groq, or a paid Anthropic key. Without one everything else works and AI endpoints answer `503`
- Docker is **not** required for local development

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Environment files
cp apps/api/.env.example apps/api/.env      # set the DATABASE_URL password
cp apps/web/.env.example apps/web/.env
# optional: paste a free Gemini key into AI_API_KEY in apps/api/.env

# 3. Create the database, tables and starter templates
pnpm db:migrate
pnpm db:seed

# 4. Start web + api
pnpm dev
```

To see the app with realistic data, load the demo workspace (the API must be running):

```bash
node scripts/seed-demo.mjs          # then sign in as demo@grantpilot.test / DemoPass2026
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/v1 (health check: `/api/v1/health`)

If the database password contains `@`, `#`, `/` or `:`, percent-encode it in `DATABASE_URL` (`@` → `%40`).

## Scripts

| Command                      | What it does                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                   | Builds `shared`, then runs web, api and shared in watch mode       |
| `pnpm build`                 | Production build of all packages                                   |
| `pnpm typecheck`             | TypeScript checks in all packages                                  |
| `pnpm test`                  | Unit tests (vitest)                                                |
| `pnpm e2e`                   | Browser tests (Playwright) against the running `pnpm dev`          |
| `pnpm format`                | Format code with Prettier                                          |
| `pnpm format:check`          | Fail if any file is not formatted (what CI runs)                   |
| `pnpm db:migrate`            | Create/apply Prisma migrations (development)                       |
| `pnpm db:seed`               | Load the starter funder template library                           |
| `pnpm db:generate`           | Regenerate the Prisma client                                       |
| `pnpm db:studio`             | Browse the database                                                |
| `bash scripts/smoke-test.sh` | End-to-end check against a running API                             |
| `node scripts/ai-check.mjs`  | Runs every AI feature once with the real key (needs the demo data) |

## Testing

```bash
pnpm test                                   # unit tests
pnpm dev                                    # in another terminal, then:
pnpm e2e                                    # browser tests (uses your installed Chrome)
bash scripts/smoke-test.sh                  # full API flow, cleans up after itself
node scripts/ai-check.mjs                   # once ANTHROPIC_API_KEY is set: extraction, drafting, review
```

On a machine without Chrome, install a browser once with `pnpm --filter @grant/e2e exec playwright install chromium`.

CI runs formatting, typechecks, unit tests, both builds, the Docker image build, the smoke test and the browser tests against a real PostgreSQL service. After CI passes on `main`, `.github/workflows/deploy.yml` deploys the API to Render and the web app to Vercel, once their secrets are added (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
