# Release notes

## v0.2.0

A redesign of the interface, a working team feature, and production file storage.

**New interface**
- Dark sidebar with grouped navigation (Writing, Library, Organization), icons and an organization switcher
- Top bar with breadcrumbs and a "New proposal" button available from anywhere
- Dashboard rebuilt around what to do next: an "Up next" card for the nearest draft deadline, a setup checklist, the pipeline with requested amounts per stage, and upcoming deadlines as calendar tiles
- Proposals as a table with status tabs, amounts and next deadlines
- Template cards, template-picker cards when starting a proposal, deadline date tiles with inline actions
- Proposal editor: status dropdown, Export menu (Word / PDF), word-limit progress bar under the text
- Sign-in and sign-up with a live preview of the editor
- Pages load on demand, so the first visit downloads less

**Team**
- New Team page: members with role changes and removal, pending invitations with revoke
- Invitations are emailed, and the link is also shown once with a Copy button
- Invitation page shows who invited you and to which organization before you sign in; new accounts return to it automatically

**Account and settings**
- New Settings page: change your name, change your password (signs out every other session), edit the organization's details
- **Forgot password**: a one-time emailed link (60 minutes) to choose a new password; it never reveals whether an address has an account
- **Change email address** from Settings, confirmed with the current password; the old address is notified

**Working as an organization**
- Every proposal has someone responsible: assign it in the editor, filter the list by **Assigned to me**, and the new owner is notified
- Owners see **Who is writing what** on the dashboard: open proposals, amounts, nearest deadline and unassigned work per person
- The interface follows the role: read-only members see the pages without the buttons that write, and the editor's text box is read-only for them
- Read-only members can no longer start AI reviews or fit scores, which cost money or free-tier quota

**Notifications (new)**
- A bell in the top bar with an unread count: review notes, approvals, new members and deadline reminders
- Opening one switches to the right organization, goes to the proposal or deadline and marks it read; "Mark all read" clears the rest
- Nobody is notified about their own actions

**Review and sign-off (new)**
- Review notes on a proposal or on one section, written by any member (viewers included), resolved rather than deleted
- Open-note counts in the proposal header and the proposals list
- Owners approve a proposal for submission; the header records who approved it and when
- Any later edit withdraws the approval automatically, so it always refers to the text that was read

**Activity trail (new)**
- Every change in an organization is recorded: proposals, sections, templates, documents, library passages, deadlines, exports, profile and team
- New Activity page grouped by day, with the author, the time and a link to the proposal
- Repeated saves of one section fold into a single entry; proposal text is never stored in the trail

**Identity**
- New product mark: a compass needle, north in brass, on the dark shell — in the sidebar, on the sign-in screens and in emails
- Real favicon plus installable icons (`apple-touch-icon.png`, 192 and 512 px) and a web manifest, so the app can be added to a phone's home screen; `pnpm icons` redraws them from the same mark

**Content library (new)**
- A library of approved, reusable passages per organization: history, programs, impact, team, finance, policies
- Insert a passage into any section from the editor's **Library** button, or save the section (or the selected text) as a new passage
- The AI drafts from the library as well as the profile and documents, so applications reuse your own wording; the most-used passages come first
- Search, category filters, copy, edit and a use counter; viewers can read the library but not change it

**Writing**
- Formatting toolbar in the editor: bold, italics, bulleted and numbered lists, with Ctrl+B / Ctrl+I and a preview
- Formatting is kept in the Word and PDF exports (real bold, italics and lists; numbering restarts per list)
- AI drafts may now use lists and bold where they help; word counts and limits ignore formatting marks

**Emails**
- Deadline reminders and invitations are sent as designed HTML emails with a plain-text version
- In development, every email is also saved as an HTML file in `apps/api/.email-previews/`

**Storage**
- `STORAGE_DRIVER=s3` now works with AWS S3 and S3-compatible services (Cloudflare R2, Backblaze B2, MinIO)

**Runs on free plans**
- AI works with Google Gemini's free tier, Groq, a local Ollama or any OpenAI-style API, as well as Anthropic Claude: set `AI_PROVIDER` and `AI_API_KEY`. Answers from these models are checked and repaired against the expected structure (missing fields, numbers written as text, JSON inside prose), with one automatic retry
- `STORAGE_DRIVER=database` keeps uploaded and exported files in PostgreSQL, so no storage bucket is needed
- `EMAIL_DRIVER=brevo` sends through Brevo's free plan, which needs no domain
- Daily reminders can be triggered by a scheduled GitHub workflow (`POST /cron/reminders`), for hosts that sleep when idle
- The web app can reach the API through a Vercel proxy (`/api`), so sign-in works when the two are on different free domains
- `render.yaml` now targets Render's free plan; step-by-step guide in `docs/FREE_HOSTING.md`
- Checked end to end with a real Gemini key: RFP import, drafting, rewriting, review and fit score all pass `scripts/ai-check.mjs`
- Free-tier resilience: busy models are retried, then fallback models are tried in turn (each has its own daily allowance); a model that has used its daily allowance or is no longer offered is skipped at once
- A draft whose stream breaks off part-way is written again automatically instead of saving half a section; if it fails, the editor puts back the previous text
- Rate limits count each visitor separately behind proxies (`TRUST_PROXY_HOPS`)

**Reliability and operations**
- Error reporting to Sentry for the API and the web app, switched on by setting `SENTRY_DSN` / `VITE_SENTRY_DSN`; proposal text, cookies and request bodies are never sent
- An error screen replaces the blank page when a page fails to load, with a "newer version is ready" message when the app was updated while the tab was open
- Deploy workflow: after CI passes on `main`, the API is deployed to Render and the web app to Vercel, then the API's health and version are checked
- `render.yaml` blueprint for the API service

**Fixes**
- Normal page loads could hit the sign-in rate limit (`429`) and log people out — the tight limit now applies only to register, login and password change
- Proposals no longer show a writing-progress bar once they are submitted or decided
- AI drafts bold only two or three headline figures instead of every number (prompt v3)
- "Days left" counted hours, so a deadline three days away could show "4 days left" early in the day and a reminder could go out a day early; it now counts calendar days everywhere
- `pnpm dev` first frees ports 4000 and 5173 left over from a previous run, and the web app no longer silently moves to another port
- Rebuilding the API while it runs no longer crashes the development server

**Other**
- `GET /health` reports whether the AI key is configured; the sidebar shows it
- `scripts/seed-demo.mjs` loads a realistic demo workspace for client demos
- The smoke test now covers team invitations, acceptance, viewer permissions, renaming and password changes
- Playwright browser tests for sign-up and sign-in, writing and exporting a proposal, deadlines and team invitations; CI runs them against the production build
- `scripts/ai-check.mjs` runs RFP extraction, drafting, rewriting, review and fit score once against the real AI, for use before demos and after prompt changes

## v0.1.0 (MVP)

Accounts and organizations with roles · organization profile and document upload with text extraction · funder template library and AI import from RFPs · section-by-section AI drafting with rewrites and version history · compliance review and funder fit score · deadlines with email reminders and calendar files · DOCX and PDF export · rate limits, usage logging and health checks.

## Known issues and limits

| # | Issue | Workaround / plan |
|---|-------|-------------------|
| 1 | **Scanned PDFs** produce no text, so template import fails on them | Upload a text PDF or Word file, or build the template by hand; OCR is Phase 2 |
| 2 | **Formatting is limited** to bold, italics and lists — no headings, tables or images inside a section | Enough for funder forms, which are mostly plain text; tables are Phase 2 |
| 3 | **The reminder job runs inside the API process** | Fine for one instance; move it to a dedicated worker before scaling out |
| 4 | **AI features need an AI key** — without one they return 503 | A free Gemini key is enough; everything else, including the code-based review checks, works without one |
| 5 | **AI output not yet checked against real client RFPs** | Run `scripts/ai-check.mjs` and a UAT round with real funder calls once the API key and RFPs are available |
| 6 | **Free hosting sleeps** — the first request after 15 idle minutes takes about a minute; Gemini's free tier may use content to improve Google's products | Fine for demos and pilots; see FREE_HOSTING.md for what to change for production |

## Not in these releases (Phase 2)

Payments and subscriptions · funder discovery · real-time collaborative editing · vector search over large document sets · budget builder · submitting directly to funder portals · two-way calendar sync · languages other than English · mobile app
