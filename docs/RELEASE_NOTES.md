# Release notes — v0.1.0 (MVP)

The MVP of GrantPilot: draft grant proposals against a funder's template, review them, track deadlines and export the result.

## What is in this release

**Accounts and organizations**
- Email/password sign-up and sign-in, JWT in httpOnly cookies, rotating refresh tokens
- Organizations with Owner / Editor / Viewer roles; invitations valid for 7 days
- One user can belong to several organizations and switch between them

**Organization knowledge base**
- Profile: mission, vision, who you serve, team, annual budget, programs, past results
- Document upload (PDF, DOCX, TXT, MD up to 20 MB) with automatic text extraction

**Funder templates**
- Starter library: foundation grant, letter of inquiry, startup innovation grant, government grant
- Import from an RFP: the AI reads out sections, word limits, eligibility and scoring criteria for you to review and save

**AI drafting**
- Section-by-section drafting from your own profile and documents, streamed as it is written
- Rewrite actions: shorten, expand, more formal, plainer language, or a custom instruction
- Never invents facts — missing ones appear as `[NEEDS INPUT: …]`
- Full version history per section, including which versions came from the AI

**Review**
- Instant checks: empty sections, word and character limits, leftover placeholders, unused length, missing deadline
- AI review: a score out of 5 against each of the funder's criteria with what would raise it
- Funder fit score (0-100) with reasons and gaps

**Deadlines**
- Deadlines linked to proposals, with overdue / next-30-days / later grouping
- Email reminders 14, 7, 3 and 1 day before, sent by a daily job (never twice for the same reminder)
- `.ics` download for Google, Outlook and Apple Calendar

**Export**
- DOCX and PDF in the funder's section order, with export history and re-download

**Operations**
- Rate limits (10/min on credentials, 120/hour on AI routes, 300/min overall), Helmet headers, strict CORS
- AI usage logged per call (model, tokens, latency, failures) and visible at `/admin/ai-usage`
- `GET /api/v1/health` for uptime monitoring

## Known issues and limits

| # | Issue | Workaround / plan |
|---|-------|-------------------|
| 1 | **S3 storage is not implemented** — `STORAGE_DRIVER=s3` throws `NotImplemented`; only local disk works | Mount a persistent disk at `UPLOAD_DIR`, or implement the S3 driver before real uploads (see DEPLOYMENT.md) |
| 2 | **Scanned PDFs** produce no text, so template import fails on them | Upload a text PDF or Word file, or build the template by hand; OCR is Phase 2 |
| 3 | **Section text is plain text**, not rich text — no bold, italics or bullet formatting carried into exports | Deliberate for the MVP; a rich-text editor is Phase 2 |
| 4 | **Member invitations have no UI** — the API returns a token that must be shared manually | Invitation screen and invitation emails are Phase 2 |
| 5 | **The reminder job runs inside the API process** | Fine for one instance; move it to a dedicated worker before scaling out |
| 6 | **AI features need `ANTHROPIC_API_KEY`** — without it those endpoints return 503 | The rest of the app, including the code-based review checks, works without it |
| 7 | **No end-to-end browser tests** — coverage is unit tests plus a scripted API smoke test | Playwright suite is Phase 2 |
| 8 | **Redis is not wired up** — background jobs run in-process | Only needed when generation moves to a queue |

## Not in this release (agreed as Phase 2)

Payments and subscriptions · funder discovery (searching for suitable funders) · real-time collaborative editing · vector search over large document sets · budget builder · submitting directly to funder portals · two-way calendar sync · languages other than English · mobile app

## Upgrade notes

First deployment — no upgrade steps. Run `prisma migrate deploy` and then `db:seed` once to load the starter template library.
