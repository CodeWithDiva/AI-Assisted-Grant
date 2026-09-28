# Free Hosting Guide

Run GrantPilot for a demo or pilot with **no paid services and no credit card**. Everything below uses a free plan; about one hour of setup in total.

| Piece | Free service | Free allowance (check the current terms) |
|-------|--------------|------------------------------------------|
| AI | **Google Gemini API** (Google AI Studio) | A daily request allowance per model (for example 20 a day for `gemini-3.8-flash`); the app uses `gemini-3.6-flash` and falls back to three other free models, so the allowances add up |
| Database and files | **Neon** PostgreSQL | 0.5 GB storage; uploaded and exported files are kept in the database |
| API | **Render** free web service | Sleeps after 15 minutes idle; the first request after that takes about a minute |
| Web app | **Vercel** Hobby | Static site; also proxies `/api` to Render so sign-in cookies work |
| Email | **Brevo** free plan | 300 emails a day; no domain needed |
| Daily reminders | **GitHub Actions** | Free for this repository |
| Error tracking (optional) | **Sentry** Developer plan | |

## What the free setup trades away

- **The API sleeps when idle.** The first visit after a quiet spell shows a loading state for up to a minute. Everything after that is normal speed.
- **Gemini's free tier may use prompts and answers to improve Google's products.** Fine for a demo with sample data; for real client proposals switch to Groq (free, its terms say inputs are not used for training), a paid Gemini tier or Anthropic, by changing two environment variables.
- **Free AI limits are per day, per model.** The app starts with `gemini-3.6-flash` and, when a model is busy or its allowance is used up, moves on to `gemini-3.8-flash`, `gemini-3.5-flash` and `gemini-3.5-flash-lite`. When all of them are used up, AI buttons answer *"the free daily limit is used up"* until the next day; writing, review checks, exports and everything else keep working. See the current allowances in AI Studio → Rate limits.
- **Free models are sometimes overloaded.** A busy answer is retried automatically, and a draft that breaks off part-way is written again, so users rarely notice; very occasionally an AI button asks them to try again.
- **Storage is 0.5 GB** including uploaded files. Plenty for a pilot; set `MAX_UPLOAD_MB` low (10 is the default here) and move to S3 when it fills up.
- **Vercel's Hobby plan is for non-commercial use.** Use it for the demo and pilot; for commercial production, move the web app to Vercel Pro or to Cloudflare Pages (free, commercial use allowed; same static build).

## 1. AI key: Google AI Studio (5 minutes)

1. Open https://aistudio.google.com/apikey and sign in with a Google account.
2. **Create API key**. Copy it; it is shown once.
3. Locally, paste it into `apps/api/.env`:

   ```
   AI_PROVIDER=gemini
   AI_API_KEY=<the key>
   ```

4. Restart `pnpm dev`. The sidebar dot turns green (**AI drafting ready**).
5. Check every AI feature once: `node scripts/seed-demo.mjs` (first time only), then `node scripts/ai-check.mjs`.

**Using Groq instead:** create a key at https://console.groq.com/keys and set `AI_PROVIDER=groq`, `AI_API_KEY=<key>`. Groq's free per-minute token budget is small, so very long RFPs may need to be shortened before import.

## 2. Database: Neon (10 minutes)

1. Sign up at https://neon.tech (GitHub or Google sign-in).
2. Create a project, region **Frankfurt** (closest to the Render region below).
3. Dashboard → **Connect** → copy the connection string. It looks like `postgresql://user:password@ep-….eu-central-1.aws.neon.tech/neondb?sslmode=require`.
4. From your machine, create the tables and the starter templates:

   ```bash
   DATABASE_URL="<the Neon string>" pnpm --filter @grant/api exec prisma migrate deploy
   DATABASE_URL="<the Neon string>" pnpm --filter @grant/api db:seed
   ```

   (On Windows PowerShell: `$env:DATABASE_URL="<the Neon string>"` on its own line first, then the two commands without the prefix.)

## 3. Email: Brevo (10 minutes)

1. Sign up at https://www.brevo.com (free plan).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: use the email address reminders should come from, and confirm the email Brevo sends to it.
3. **SMTP & API → API keys → Generate a new API key**. Copy it.
4. Keep the sender address; it goes into `EMAIL_FROM` below, e.g. `GrantPilot <you@gmail.com>`.

Emails from a Gmail or Yahoo address sent through Brevo can land in spam. A custom domain verified in Brevo fixes that later; for a pilot, ask recipients to mark the first reminder as "not spam".

## 4. API: Render (15 minutes)

1. Push this repository to GitHub (already done if you are reading it there).
2. Sign up at https://render.com with GitHub.
3. **New → Blueprint**, pick the repository. Render reads `render.yaml` and shows the service `grantpilot-api` on the **Free** plan.
4. Fill in the values it asks for:

   | Key | Value |
   |-----|-------|
   | `WEB_ORIGIN` | `https://<your-project>.vercel.app` (from step 5; edit later if you do not know it yet) |
   | `DATABASE_URL` | the Neon connection string |
   | `AI_API_KEY` | the Gemini key |
   | `BREVO_API_KEY` | the Brevo key |
   | `EMAIL_FROM` | `GrantPilot <the sender you verified>` |
   | `SENTRY_DSN` | leave empty unless you use Sentry |

   JWT secrets and `CRON_SECRET` are generated by Render.

5. **Apply**. The first build takes 5–10 minutes. When it is live, open `https://grantpilot-api.onrender.com/api/v1/health`. You should see `"database":"up"` and `"ai":"configured"`.

If Render gave the service a different address (for example with a suffix), note it: the web app's proxy in step 5 must point to it.

## 5. Web app: Vercel (10 minutes)

1. Sign up at https://vercel.com with GitHub (Hobby plan).
2. **Add New → Project**, import the repository, and set:
   - Framework preset: **Vite**
   - Root directory: `apps/web`
   - Build command: `cd ../.. && pnpm install && pnpm --filter @grant/shared build && pnpm --filter @grant/web build`
   - Output directory: `dist`
   - Environment variable: `VITE_API_URL` = `/api/v1`
3. **Deploy**, and note the address (`https://<your-project>.vercel.app`).
4. If the Render address from step 4 is not `https://grantpilot-api.onrender.com`, change the destination in `apps/web/vercel.json` to it, commit, and redeploy.
5. Back in Render, set `WEB_ORIGIN` to the Vercel address exactly (no trailing slash) and save; Render restarts the API.

The browser only ever talks to the Vercel address. Vercel forwards `/api/...` to Render, so sign-in cookies stay first-party and work in every browser, including Safari.

## 6. Daily reminders and automatic deploys: GitHub (5 minutes)

In the GitHub repository: **Settings → Secrets and variables → Actions**.

| Name | Kind | Value |
|------|------|-------|
| `API_URL` | Variable | `https://grantpilot-api.onrender.com/api/v1` |
| `CRON_SECRET` | Secret | copy it from Render → service → Environment |
| `RENDER_DEPLOY_HOOK_URL` | Secret (optional) | Render → service → Settings → Deploy Hook |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Secrets (optional) | see [DEPLOYMENT.md](DEPLOYMENT.md#7-releasing) |

- `.github/workflows/reminders.yml` then calls the API at 08:00 Pakistan time every day, waking it if needed, and sends the reminder emails. Run it once by hand (Actions → Deadline reminders → Run workflow) to check.
- With the deploy secrets, every change merged to `main` that passes CI is deployed automatically. Without them, Render deploys with **Manual Deploy** and Vercel deploys on push.

## 7. First sign-in

1. Open the Vercel address and create your account and organization.
2. Make yourself platform administrator (Neon → SQL Editor):

   ```sql
   UPDATE users SET "platformRole" = 'ADMIN' WHERE email = 'you@example.com';
   ```

3. Optional demo data: `node scripts/seed-demo.mjs https://<your-project>.vercel.app/api/v1`.
4. Run `node scripts/ai-check.mjs https://<your-project>.vercel.app/api/v1` (after step 3) to confirm the AI works in production.

## Moving off the free plans later

Nothing needs to be rebuilt; change environment variables only:

| To | Set |
|----|-----|
| Anthropic Claude | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` |
| Paid Gemini (no training on your data) | enable billing in AI Studio; same key |
| S3 / Cloudflare R2 for files | `STORAGE_DRIVER=s3` and the `S3_*` variables (existing files stay in the database; move them before switching) |
| Resend with your domain | `EMAIL_DRIVER=resend`, `RESEND_API_KEY` |
| An API that never sleeps | Render → change the instance type to Starter |
