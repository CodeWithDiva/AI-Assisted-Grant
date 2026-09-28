# Deployment Guide

> **No budget?** [FREE_HOSTING.md](FREE_HOSTING.md) sets the whole app up on free plans (Gemini, Neon, Render, Vercel, Brevo). This guide covers the paid, production-grade setup.

Three pieces go to production: the **web** app (static files), the **api** (Node container) and **PostgreSQL**. No Docker is needed on a developer machine — CI builds the image.

## 1. Accounts to create

| Service | Used for | Notes |
|---------|----------|-------|
| **Neon** (or AWS RDS) | PostgreSQL 16+ | Copy the connection string, keep `sslmode=require` |
| **Render** (or AWS ECS / Fly.io) | API container | Needs a Docker deploy from this repo |
| **Vercel** | Web app | Static build, no server code |
| **AWS S3** (or R2 / B2) | Uploaded and exported files | One private bucket; an IAM role or user with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on it |
| **Resend** | Reminder emails | Verify the sending domain |
| **Anthropic Console** (or Google AI Studio / Groq) | AI features | Create an API key, set a monthly spend limit. Gemini and Groq have free tiers; see FREE_HOSTING.md |
| **Sentry** (optional) | Error tracking | One project for the API (Node) and one for the web app (React); copy each DSN |

## 2. Environment variables (API)

```
NODE_ENV=production
PORT=4000
WEB_ORIGIN=https://app.yourdomain.com      # exact origin of the web app, no trailing slash

DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

JWT_ACCESS_SECRET=<64 random characters>
JWT_REFRESH_SECRET=<a different 64 random characters>

AI_PROVIDER=anthropic                       # or gemini / groq / ollama / openai-compatible
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5
# For gemini / groq instead: AI_API_KEY=... (AI_MODEL optional)

# Only if the API is behind a proxy: Render = 1, Vercel /api proxy + Render = 2
TRUST_PROXY_HOPS=1
# Lets .github/workflows/reminders.yml run the daily reminders (any long random string)
CRON_SECRET=

STORAGE_DRIVER=s3                           # or "database" to keep files in PostgreSQL
MAX_UPLOAD_MB=20
S3_BUCKET=grantpilot-files
S3_REGION=eu-west-1
# Leave the two keys empty on AWS to use the server's IAM role.
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
# Only for S3-compatible services such as Cloudflare R2, Backblaze B2 or MinIO:
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false

EMAIL_DRIVER=resend                         # or "brevo" with BREVO_API_KEY
RESEND_API_KEY=re_...
EMAIL_FROM="GrantPilot <noreply@yourdomain.com>"

# Optional error reporting; leave empty to turn it off.
SENTRY_DSN=https://…@….ingest.sentry.io/…
SENTRY_ENVIRONMENT=production
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never reuse the development secrets, and never commit `.env`.

## Environment variables (web)

```
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_SENTRY_DSN=https://…@….ingest.sentry.io/…   # optional
```

`VITE_` variables are baked in at build time, so redeploy the web app after changing them.

Only unexpected errors are reported: 5xx responses, crashes and failed reminder runs. Request bodies, cookies and proposal text are never sent.

## 3. Database

```bash
# Once, from a machine that can reach the database:
DATABASE_URL="postgresql://…" pnpm --filter @grant/api exec prisma migrate deploy
DATABASE_URL="postgresql://…" pnpm --filter @grant/api db:seed   # starter template library
```

`migrate deploy` also runs automatically when the API container starts (see `infra/docker/api.Dockerfile`).

Enable **daily automated backups** with at least 7 days of retention (Neon and RDS both offer this), and test a restore once before handover.

## 4. API container

The image is built from the repo root:

```bash
docker build -f infra/docker/api.Dockerfile -t grantpilot-api .
```

On Render: *New → Blueprint*, pick this repo. `render.yaml` defines the service (Docker, health check `/api/v1/health`, generated JWT secrets), and Render asks once for the values marked secret. Auto-deploy is off in the blueprint because the deploy workflow (section 7) triggers it after CI passes.

The reminder job runs inside the API process at 08:00 server time. With `CRON_SECRET` set, `.github/workflows/reminders.yml` also triggers it every morning through `POST /api/v1/cron/reminders`, which covers hosts that put the API to sleep. Each reminder is recorded, so running both never sends one twice. If you ever run more than one API instance, rely on the workflow and keep one scheduler.

## 5. Web app

On Vercel: import the repo and set

- Framework preset: **Vite**
- Root directory: `apps/web`
- Build command: `cd ../.. && pnpm install && pnpm --filter @grant/shared build && pnpm --filter @grant/web build`
- Output directory: `dist`
- Environment variables: `VITE_API_URL`, and `VITE_SENTRY_DSN` if used
- If you use the deploy workflow (section 7), turn off Vercel's automatic production deployments for `main`, so a commit that fails CI cannot reach production

Because the app is a single-page router, add a rewrite so deep links work:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

## 6. Before going live

- [ ] `STORAGE_DRIVER=s3` with a **private** bucket (block all public access). The API reads and writes files itself; nothing is served from the bucket directly.
- [ ] `WEB_ORIGIN` matches the web domain exactly, so cookies and CORS work.
- [ ] Cookies are `secure` automatically when `NODE_ENV=production`; the API must be served over HTTPS.
- [ ] Set a spend limit on the Anthropic key, and watch `GET /admin/ai-usage`.
- [ ] Create the first administrator: `UPDATE users SET "platformRole" = 'ADMIN' WHERE email = '…';`
- [ ] Point an uptime monitor at `GET /api/v1/health`.
- [ ] Run `node scripts/ai-check.mjs` locally with the production key and read the generated text once.
- [ ] (Optional) Set `SENTRY_DSN` and `VITE_SENTRY_DSN`, then confirm a test error arrives.
- [ ] Take a database backup and restore it once into a scratch database.

## 7. Releasing

`main` is production. CI (`.github/workflows/ci.yml`) runs format, typecheck, unit tests, both builds, the API image build, the API smoke test and the browser tests on every push and pull request.

When CI passes on `main`, `.github/workflows/deploy.yml` deploys that exact commit. Add these under *Settings → Secrets and variables → Actions*; each step is skipped until its secrets exist:

| Name | Kind | Where to find it |
|------|------|------------------|
| `RENDER_DEPLOY_HOOK_URL` | secret | Render → service → Settings → Deploy Hook |
| `VERCEL_TOKEN` | secret | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | secret | `.vercel/project.json` after running `npx vercel link` in `apps/web` |
| `API_URL` | variable | e.g. `https://api.yourdomain.com/api/v1`; the workflow waits until `/health` reports the new version |

The workflow can also be started by hand: Actions → Deploy → Run workflow.

Rollback: redeploy the previous image/commit. Database migrations are additive so far; check `apps/api/prisma/migrations` before rolling back past one.
