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

**Storage**
- `STORAGE_DRIVER=s3` now works with AWS S3 and S3-compatible services (Cloudflare R2, Backblaze B2, MinIO)

**Fixes**
- Normal page loads could hit the sign-in rate limit (`429`) and log people out — the tight limit now applies only to register, login and password change
- Proposals no longer show a writing-progress bar once they are submitted or decided

**Other**
- `GET /health` reports whether the AI key is configured; the sidebar shows it
- `scripts/seed-demo.mjs` loads a realistic demo workspace for client demos
- The smoke test now covers team invitations, acceptance, viewer permissions, renaming and password changes

## v0.1.0 (MVP)

Accounts and organizations with roles · organization profile and document upload with text extraction · funder template library and AI import from RFPs · section-by-section AI drafting with rewrites and version history · compliance review and funder fit score · deadlines with email reminders and calendar files · DOCX and PDF export · rate limits, usage logging and health checks.

## Known issues and limits

| # | Issue | Workaround / plan |
|---|-------|-------------------|
| 1 | **Scanned PDFs** produce no text, so template import fails on them | Upload a text PDF or Word file, or build the template by hand; OCR is Phase 2 |
| 2 | **Section text is plain text** — no bold, italics or bullets in exports | Deliberate for the MVP; rich text is Phase 2 |
| 3 | **The reminder job runs inside the API process** | Fine for one instance; move it to a dedicated worker before scaling out |
| 4 | **AI features need `ANTHROPIC_API_KEY`** — without it they return 503 | Everything else, including the code-based review checks, works without it |
| 5 | **No end-to-end browser tests** — coverage is unit tests plus a scripted API smoke test | Playwright suite is Phase 2 |
| 6 | **Email address cannot be changed** from Settings | Change it in the database for now |

## Not in these releases (Phase 2)

Payments and subscriptions · funder discovery · real-time collaborative editing · vector search over large document sets · budget builder · submitting directly to funder portals · two-way calendar sync · languages other than English · mobile app
