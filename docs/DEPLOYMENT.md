# Deployment Guide

Three pieces go to production: the **web** app (static files), the **api** (Node container) and **PostgreSQL**. No Docker is needed on a developer machine — CI builds the image.

## 1. Accounts to create

| Service | Used for | Notes |
|---------|----------|-------|
| **Neon** (or AWS RDS) | PostgreSQL 16+ | Copy the connection string, keep `sslmode=require` |
| **Render** (or AWS ECS / Fly.io) | API container | Needs a Docker deploy from this repo |
| **Vercel** | Web app | Static build, no server code |
| **AWS S3** (or R2 / B2) | Uploaded and exported files | One private bucket; an IAM role or user with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on it |
| **Resend** | Reminder emails | Verify the sending domain |
| **Anthropic Console** | AI features | Create an API key, set a monthly spend limit |
| **Sentry** (optional) | Error tracking | |

## 2. Environment variables (API)

```
NODE_ENV=production
PORT=4000
WEB_ORIGIN=https://app.yourdomain.com      # exact origin of the web app, no trailing slash

DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

JWT_ACCESS_SECRET=<64 random characters>
JWT_REFRESH_SECRET=<a different 64 random characters>

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5

STORAGE_DRIVER=s3
MAX_UPLOAD_MB=20
S3_BUCKET=grantpilot-files
S3_REGION=eu-west-1
# Leave the two keys empty on AWS to use the server's IAM role.
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
# Only for S3-compatible services such as Cloudflare R2, Backblaze B2 or MinIO:
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false

EMAIL_DRIVER=resend
RESEND_API_KEY=re_...
EMAIL_FROM="GrantPilot <noreply@yourdomain.com>"
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never reuse the development secrets, and never commit `.env`.

## Environment variables (web)

```
VITE_API_URL=https://api.yourdomain.com/api/v1
```

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

On Render: *New → Web Service → Docker*, point at this repo, set the Dockerfile path, add the environment variables above, health check path `/api/v1/health`.

The reminder job runs inside the API process at 08:00 server time. If you ever run more than one API instance, move that job to a single worker instance so reminders are not sent twice — the `deadline_reminders` table makes duplicates unlikely but not impossible.

## 5. Web app

On Vercel: import the repo and set

- Framework preset: **Vite**
- Root directory: `apps/web`
- Build command: `cd ../.. && pnpm install && pnpm --filter @grant/shared build && pnpm --filter @grant/web build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL`

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
- [ ] Take a database backup and restore it once into a scratch database.

## 7. Releasing

`main` is production. CI (`.github/workflows/ci.yml`) runs format, typecheck, tests, builds both apps and builds the API image on every push and pull request. Deploy by merging to `main`; both Render and Vercel redeploy from that branch.

Rollback: redeploy the previous image/commit. Database migrations are additive so far; check `apps/api/prisma/migrations` before rolling back past one.
