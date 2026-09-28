# API Reference

Base URL: `http://localhost:4000/api/v1` (development).

## Conventions

- **Auth**: every endpoint needs a signed-in user except those marked **public**. The access token is sent as an httpOnly cookie (`gp_access`); the browser sends it automatically with `credentials: 'include'`. A `Bearer` token in the `Authorization` header also works.
- **Roles**: routes under `/orgs/:orgId` require membership of that organization. Where a role is listed (OWNER / EDITOR), a VIEWER gets `403`.
- **Validation**: request bodies are validated with Zod. A failure returns `400` with `{ "message": ["field: reason"], "error": "Bad Request", "statusCode": 400 }`.
- **Rate limits**: 300 requests/minute per IP overall; 10/minute on register, login and password change; 120/hour on the proposal and template routes (these can call the AI).

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | **public** — `{ name, email, password }` (password ≥ 8). Sets cookies, returns the user. |
| POST | `/auth/login` | **public** — `{ email, password }`. |
| POST | `/auth/refresh` | **public** — rotates the refresh token from the cookie. |
| POST | `/auth/logout` | **public** — revokes the refresh token, clears cookies. `204`. |
| GET | `/auth/me` | Current user. |
| PATCH | `/auth/me` | `{ name }` — rename the signed-in user. |
| POST | `/auth/password` | `{ currentPassword, newPassword }`. Revokes every session, then issues new cookies for this one. `204`. |
| POST | `/auth/email` | `{ email, currentPassword }`. Changes the sign-in address, emails a notice to the old one, issues new cookies. `409` if the address is taken. |
| POST | `/auth/forgot-password` | **public** — `{ email }`. Emails a one-time link (`/reset-password/:token`, valid 60 minutes). Always `204`, so it cannot reveal which addresses have accounts; at most one email a minute per account. |
| POST | `/auth/reset-password` | **public** — `{ token, password }`. Sets the password, revokes every session and signs the user in. `400` for a used or expired link. |

## Organizations

| Method | Path | Role | Notes |
|--------|------|------|-------|
| POST | `/orgs` | — | `{ name, type: NONPROFIT\|STARTUP\|OTHER, country?, website? }`. Creator becomes OWNER. |
| GET | `/orgs` | — | Organizations the user belongs to, each with the user's `role`. |
| GET | `/orgs/:orgId` | member | |
| PATCH | `/orgs/:orgId` | OWNER | |
| GET | `/orgs/:orgId/members` | member | |
| PATCH | `/orgs/:orgId/members/:membershipId` | OWNER | `{ role }`. Refuses to demote the last owner. |
| DELETE | `/orgs/:orgId/members/:membershipId` | OWNER | Refuses to remove the last owner. |
| GET | `/orgs/:orgId/invitations` | OWNER | Pending (not accepted, not expired) invitations. |
| POST | `/orgs/:orgId/invitations` | OWNER | `{ email, role }`. Emails the link and returns it once as `link` + `token`, with `emailed`. Replaces any pending invitation to the same address. Valid 7 days. |
| DELETE | `/orgs/:orgId/invitations/:invitationId` | OWNER | Revokes a pending invitation. `204`. |
| GET | `/invitations/:token` | **public** | Preview: organization, inviter, email, role, and `status` (`PENDING`, `ACCEPTED`, `EXPIRED`). |
| POST | `/invitations/:token/accept` | — | The signed-in user's email must match the invitation. |

## Organization profile and documents

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/orgs/:orgId/profile` | member | `null` until saved. |
| PUT | `/orgs/:orgId/profile` | OWNER, EDITOR | Mission, vision, beneficiaries, team, budget, programs, past results. |
| GET | `/orgs/:orgId/documents` | member | Metadata plus `textLength`. |
| POST | `/orgs/:orgId/documents` | OWNER, EDITOR | `multipart/form-data`: `file` + `kind` (`PAST_PROPOSAL`, `REPORT`, `RFP`, `OTHER`). PDF, DOCX, TXT, MD up to 20 MB. Text is extracted on upload. |
| DELETE | `/orgs/:orgId/documents/:documentId` | OWNER, EDITOR | `204`. |

## Review notes and approval

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/orgs/:orgId/proposals/:proposalId/comments` | member | Oldest first, with the author, the section and who resolved it. |
| POST | `/orgs/:orgId/proposals/:proposalId/comments` | member (viewers too) | `{ body, sectionId? }`. Without `sectionId` the note is about the whole proposal. |
| PATCH | `/…/comments/:commentId` | member | `{ resolved }`. Resolved notes stay on the proposal as its review history. |
| DELETE | `/…/comments/:commentId` | author or OWNER | `204`. |
| POST | `/orgs/:orgId/proposals/:proposalId/approval` | OWNER | Signs the proposal off for submission. |
| DELETE | `/orgs/:orgId/proposals/:proposalId/approval` | OWNER | Takes the approval back. |

Proposals carry `approvedAt`, `approvedByName` and `openComments`. **Any edit to a section clears the approval**, so an approval always refers to the text that was read.

## Notifications

A person's own notifications, across every organization they belong to.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/notifications` | Newest 30, each with `type`, `payload`, `readAt`. Types: `COMMENT_ADDED`, `PROPOSAL_APPROVED`, `PROPOSAL_APPROVAL_WITHDRAWN`, `MEMBER_JOINED`, `DEADLINE_REMINDER`. |
| POST | `/notifications/read` | `{ ids? }` — without `ids`, everything unread is marked read. `204`. |

Nobody is notified about their own action.

## Activity trail

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/orgs/:orgId/activity?before=<ISO>` | member | Newest first, 40 at a time. `before` continues from the oldest entry already read. Each entry carries `action`, `entity`, `entityId`, the author's name and safe metadata (titles, names, statuses — never proposal text). |

Writes are recorded automatically for proposals, sections, templates, documents, library passages, deadlines, exports, the profile and team changes. Repeated saves of the same section by the same person inside 10 minutes fold into one entry.

## Content library

Reusable passages (history, team, methods, policies) that writers insert into sections and the AI treats as organization facts.

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/orgs/:orgId/library` | member | Ordered by category, then title. |
| POST | `/orgs/:orgId/library` | OWNER, EDITOR | `{ title, body, category }`. Categories: `ORGANIZATION`, `PROGRAMS`, `IMPACT`, `TEAM`, `FINANCE`, `POLICIES`, `OTHER`. |
| PATCH | `/orgs/:orgId/library/:blockId` | OWNER, EDITOR | Any field. |
| DELETE | `/orgs/:orgId/library/:blockId` | OWNER, EDITOR | `204`. |
| POST | `/orgs/:orgId/library/:blockId/used` | OWNER, EDITOR | Counts one insertion; the most-used passages are the ones the AI sees first. `204`. |

## Funder templates

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/orgs/:orgId/templates` | member | Starter library + the organization's own. |
| GET | `/orgs/:orgId/templates/:templateId` | member | Sections, eligibility, evaluation criteria. |
| POST | `/orgs/:orgId/templates/extract` | OWNER, EDITOR | **AI** — `{ documentId }` of an uploaded RFP. Returns a draft template for review; nothing is saved. |
| POST | `/orgs/:orgId/templates` | OWNER, EDITOR | Saves the reviewed template (`sections[]` required). |
| PATCH | `/orgs/:orgId/templates/:templateId` | OWNER, EDITOR | Library templates cannot be edited. Sending `sections` replaces them all. |
| DELETE | `/orgs/:orgId/templates/:templateId` | OWNER, EDITOR | `204`. |

## Proposals

| Method | Path | Role | Notes |
|--------|------|------|-------|
| POST | `/orgs/:orgId/proposals` | OWNER, EDITOR | `{ templateId, title, requestedAmount? }`. Copies the template's sections onto the proposal. |
| GET | `/orgs/:orgId/proposals` | member | Includes progress and the next deadline. |
| GET | `/orgs/:orgId/proposals/:proposalId` | member | With all sections and their text. |
| PATCH | `/orgs/:orgId/proposals/:proposalId` | OWNER, EDITOR | `{ title?, status?, requestedAmount?, ownerId? }`. `ownerId` hands the proposal to a member (`null` unassigns) and notifies them; a non-member is refused. `SUBMITTED` stamps `submittedAt`. |
| DELETE | `/orgs/:orgId/proposals/:proposalId` | OWNER, EDITOR | `204`. |
| PATCH | `/orgs/:orgId/proposals/:proposalId/sections/:sectionId` | OWNER, EDITOR | `{ text }`. Saves a version when the text changed. |
| GET | `/orgs/:orgId/proposals/:proposalId/sections/:sectionId/versions` | member | Last 20 versions, newest first. |
| POST | `/…/sections/:sectionId/versions/:versionId/restore` | OWNER, EDITOR | Restores that version as the current text. |

### AI drafting (server-sent events)

`POST /orgs/:orgId/proposals/:proposalId/sections/:sectionId/generate` — body `{ instruction? }`
`POST /orgs/:orgId/proposals/:proposalId/sections/:sectionId/refine` — body `{ action, instruction? }` where action is `SHORTEN`, `EXPAND`, `TONE_FORMAL`, `TONE_PLAIN` or `CUSTOM`.

Both stream `text/event-stream`:

```
event: delta
data: {"text":"We request 50,000 USD "}

event: done
data: { …the saved section… }

event: error
data: {"message":"AI is not configured — ANTHROPIC_API_KEY is missing"}
```

The generated text is saved and a version recorded before `done` is sent.

### Review

| Method | Path | Notes |
|--------|------|-------|
| POST | `/orgs/:orgId/proposals/:proposalId/compliance` | OWNER, EDITOR — Word/character limits, empty sections, leftover `[NEEDS INPUT: …]` placeholders and missing deadline are checked in code; scoring against the funder's criteria is done by the AI. Without an API key the code checks still run. |
| POST | `/orgs/:orgId/proposals/:proposalId/fit-score` | OWNER, EDITOR — **AI**, 0-100 fit against the funder's eligibility, with reasons and gaps. |

## Deadlines

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/orgs/:orgId/deadlines?scope=all\|open` | member | Includes `daysRemaining` (negative when overdue). |
| POST | `/orgs/:orgId/deadlines` | OWNER, EDITOR | `{ title, type, dueAt, proposalId?, templateId?, reminderOffsetsDays? }`. Defaults to reminders 14/7/3/1 days before. |
| PATCH | `/orgs/:orgId/deadlines/:deadlineId` | OWNER, EDITOR | `{ completed: true }` marks it done. |
| DELETE | `/orgs/:orgId/deadlines/:deadlineId` | OWNER, EDITOR | `204`. |
| GET | `/orgs/:orgId/deadlines/:deadlineId/ics` | member | Calendar file for Google/Outlook/Apple. |
| POST | `/orgs/:orgId/deadlines/run-reminders` | OWNER | Runs the reminder job now instead of waiting for 08:00. Returns `{ sent }`. |

## Exports

| Method | Path | Role | Notes |
|--------|------|------|-------|
| POST | `/orgs/:orgId/proposals/:proposalId/exports` | OWNER, EDITOR | `{ format: "DOCX" \| "PDF" }`. Builds the file and stores it. |
| GET | `/orgs/:orgId/proposals/:proposalId/exports` | member | Last 20 exports. |
| GET | `/orgs/:orgId/exports/:exportId/download` | member | Returns the file as an attachment. |

## Admin (platform administrators only)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/stats` | Users, organizations, proposals by status, documents, templates. |
| GET | `/admin/ai-usage?days=30` | Calls, tokens and average latency per AI feature, plus failures. |

A user becomes an administrator by setting `platformRole = 'ADMIN'` on their row:

```sql
UPDATE users SET "platformRole" = 'ADMIN' WHERE email = 'you@example.com';
```

## Health

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | **public** — `{ status, database, ai, aiProvider, version, timestamp }`. `ai` is `configured` or `missing`; `aiProvider` names the provider and model. Use it for uptime checks. |
| POST | `/cron/reminders` | **public**, but needs header `x-cron-secret: <CRON_SECRET>`. Runs the reminder job for every organization; `{ sent }`. `404` when `CRON_SECRET` is not set. |
