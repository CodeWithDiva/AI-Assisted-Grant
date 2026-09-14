# AI-Assisted Grant/Proposal Writing Platform — Revised Plan

This builds on the original 15-day plan by Mahnoor Gulzar. It lists the gaps in that plan, fixes them, and adds the missing pieces: MVP scope, architecture, data model, AI pipeline, repo structure, a new day-by-day plan, and questions for the client.

---

## 0. Progress Tracker

| Phase | Status |
|-------|--------|
| Day 1 — Requirements and scope freeze | 🟡 Plan ready; client questions (§12) pending |
| Day 2 — Architecture and setup | 🟡 Monorepo, web/api/shared skeletons, CI, Dockerfile done; web and api build, `/health` verified; staging deploy pending |
| Day 3 — Database, auth, RBAC | 🟡 Prisma 7 schema, client generation and template seed ready; first migration waits on local DB password; auth and RBAC pending |
| Day 4 — UI foundation and wireframes | ⚪ Not started |
| Day 5 — Org profile and AI layer | ⚪ Not started |
| Day 6 — Funder templates | ⚪ Not started |
| Day 7 — AI proposal drafting (midpoint demo) | ⚪ Not started |
| Day 8 — AI refinement and compliance | ⚪ Not started |
| Day 9 — Deadline tracking and notifications | ⚪ Not started |
| Day 10 — Document export and admin (feature freeze) | ⚪ Not started |
| Day 11 — QA and testing | ⚪ Not started |
| Day 12 — Bug fixing, performance, security | ⚪ Not started |
| Day 13 — User acceptance testing | ⚪ Not started |
| Day 14 — UAT fixes and release prep | ⚪ Not started |
| Day 15 — Deployment and handover | ⚪ Not started |

### Local development setup (no Docker)

| Service | Development | Production |
|---------|-------------|------------|
| Database | Local PostgreSQL 18 | Managed Postgres (Neon / AWS RDS) |
| Redis | Upstash free tier (URL in `.env`) | Upstash / ElastiCache |
| File storage | Local `uploads/` folder | AWS S3 |
| Email | Printed to the API console | Resend / AWS SES |
| Containers | Not needed locally | `Dockerfile` built by GitHub Actions |

---

## 1. Gaps in the Original Document

| # | Issue | Why it matters | Fix |
|---|-------|----------------|-----|
| 1 | **Day 14 is missing** (Day 13 jumps to Day 15) | Only 14 days are actually planned | Day 14 = UAT fixes, docs, production setup |
| 2 | **AI integration is on Day 9, but AI drafting is on Day 5** | You can't build AI drafting without the AI layer | AI provider layer on Day 5; Day 9 work spread across the feature days |
| 3 | **Backend not decided** ("Express/NestJS or FastAPI") | Every later day depends on this choice | Decide on Day 1 (recommendation in §4) |
| 4 | **"AI APIs / models as required" is vague** | No way to estimate cost, latency or quality | Name the provider and models, and define the pipeline (§6) |
| 5 | **"Funder template matching" is not defined** | Could mean two very different features (see §2.2) | Clarify with the client on Day 1 |
| 6 | **No organization profile / knowledge base** | The AI needs facts about the org (mission, programs, budget, impact) or it will make things up | Add an Org Profile and document upload module |
| 7 | **No editor, versioning or word-limit checks** | Funders enforce strict section limits; users need to edit AI output | Rich-text editor, section versions, compliance checker |
| 8 | **Day 4: high-fidelity Figma plus client sign-off in one day** | Unrealistic, and sign-off delays block Day 5 | Low-fi wireframes plus a ready-made component library (shadcn/ui); sign-off can happen async |
| 9 | **Day 10: payments, admin dashboard and RBAC** | Payments aren't a core feature (scope creep); RBAC belongs with auth on Day 3 | Payments moved to Phase 2; RBAC moved to Day 3 |
| 10 | **CI/CD and deployment only on Day 15** | Deployment problems show up at the very end | Deploy a staging skeleton on Day 2 |
| 11 | **Deadline reminders have no delivery mechanism** | Tracking without reminders has little value | Background jobs (BullMQ on Redis) plus email |
| 12 | **Only unit tests** | Core flows (draft, then export) can break silently | Add Playwright E2E tests and an AI evaluation set of sample RFPs |
| 13 | **Vercel for everything** | Long AI streams and background workers don't suit serverless | Frontend on Vercel; API and worker as Docker containers (AWS/Render) |
| 14 | **No AI safety or cost controls** | Hallucinated statistics in a grant proposal can hurt credibility; costs can grow unchecked | "Needs input" placeholders, usage logging, rate limits |
| 15 | **Midpoint check-in has no date** | Easy to skip | Client demo at the end of Day 7 |
| 16 | **No multi-tenancy model** | Grant writers work for several organizations | Organizations plus memberships with roles |

---

## 2. Scope

### 2.1 MVP (15 days)
1. **Auth and organizations**: sign up, log in, create an organization, invite members, roles (Owner / Editor / Viewer)
2. **Organization profile (knowledge base)**: structured profile (mission, programs, beneficiaries, budget, team, past results) plus uploads (past proposals, annual reports as PDF/DOCX)
3. **Funder templates**:
   - Template library (admin-seeded: common funder formats)
   - Upload an RFP or guidelines (PDF/DOCX), and AI extracts sections, word limits, eligibility, evaluation criteria and deadlines, which the user reviews and edits
4. **AI-drafted proposals**:
   - Create a proposal from a template; the AI drafts each section using the org profile, funder instructions and criteria
   - Streaming generation, rich-text editor, autosave, section version history
   - Actions: regenerate, shorten, expand, change tone, custom instruction
   - Missing facts appear as `[NEEDS INPUT: …]` placeholders instead of invented numbers
5. **Compliance check**: word/character limits per section, missing required sections, coverage of evaluation criteria (AI review)
6. **Deadline tracking**: deadlines per opportunity or proposal (LOI, full proposal, report), dashboard, list/calendar view, status pipeline (Draft → In Review → Submitted → Awarded/Rejected), email reminders (14/7/3/1 days before), `.ics` download
7. **Document export**: DOCX and PDF following template section order, export history

### 2.2 "Funder template matching" — two possible meanings (confirm with client)
- **A. Template conformance** (in MVP): the proposal follows a funder's structure, limits and criteria.
- **B. Funder discovery** (Phase 2): suggest suitable funders or grants for an organization. This needs a funder database or an external source (Grants.gov API, Candid), which is a separate project.
- MVP compromise: an **AI fit score** (org profile compared with a funder's eligibility and focus) for templates already in the system.

### 2.3 Out of scope (Phase 2)
Payments and subscriptions · funder discovery database · real-time collaborative editing · vector-search RAG over large document sets · budget builder · direct submission to funder portals · two-way Google/Outlook calendar sync · multi-language support · mobile app

---

## 3. User Personas and Main Flows

| Persona | Goal | Main flow |
|---------|------|-----------|
| **Nonprofit program manager** | Submit more proposals with less effort | Fill profile once → upload RFP → AI draft → edit → export |
| **Startup founder** | Apply for grants and accelerator programs quickly | Pick template → AI draft → compliance check → export |
| **Grant writer / consultant** | Manage many clients and deadlines | Switch between orgs → deadline dashboard → reminders → team review |

**Main path (must work end to end by Day 10):**
Sign up → Create org → Complete profile → Upload RFP → Review extracted template → Create proposal → Generate sections → Edit → Compliance check → Export DOCX/PDF → Deadline reminder email

---

## 4. Technology Decisions

| Layer | Choice | Reason |
|-------|--------|--------|
| Monorepo | **pnpm workspaces** | Types shared between frontend and backend |
| Frontend | **React + Vite + TypeScript + Tailwind + shadcn/ui** | Matches the original stack; ready-made components save design time |
| Frontend libraries | TanStack Query, React Router, React Hook Form + Zod, **TipTap** (editor), FullCalendar or a simple calendar | |
| Backend | **Node.js + NestJS (TypeScript)** | One language across the stack, built-in modules/guards for RBAC. *(Use Express + TS if the team doesn't know Nest; FastAPI only if the team is mainly Python.)* |
| ORM / validation | **Prisma** + Zod | Fast migrations, type safety |
| Database | **PostgreSQL** | Core data (pgvector can be added in Phase 2) |
| Cache / queue | **Redis + BullMQ** (Upstash free tier in development, no local install) | Caching, rate limiting, and background jobs (AI generation, RFP parsing, exports, reminders) |
| AI | **Claude API** — `claude-sonnet-5` for drafting and review, `claude-haiku-4-5-20251001` for extraction and small tasks | Long context fits the org profile and RFP in one prompt; structured output via tool use. Kept behind a provider interface so it can be swapped. |
| File parsing | `pdf-parse` / `unpdf` (PDF), `mammoth` (DOCX) | |
| Export | `docx` (DOCX), Puppeteer or Gotenberg (HTML → PDF) | |
| Storage | **AWS S3** (local `uploads/` folder in development, behind a storage interface) | Uploads and exports, served with signed URLs |
| Email | **Resend** or AWS SES (printed to the console in development) | Reminders, invites |
| Auth | JWT access token + httpOnly refresh cookie, optional Google OAuth *(Clerk/Auth0 can save about a day if the client accepts it)* | |
| Hosting | Frontend on **Vercel**; API and worker as **Docker containers on AWS ECS/Lightsail or Render**; managed Postgres (RDS/Neon); Redis (ElastiCache/Upstash) | |
| CI/CD | **GitHub Actions**: lint → typecheck → test → build → deploy (staging on push to `develop`, production on tag or `main`) | |
| Monitoring | Sentry (errors), pino structured logs, uptime monitor, daily DB backups | |

---

## 5. System Architecture

```
┌──────────────┐    HTTPS / SSE     ┌──────────────────────┐
│  React SPA   │ ─────────────────► │   NestJS API         │
│  (Vercel)    │ ◄───────────────── │  auth · orgs · RBAC  │
└──────────────┘                    │  templates · drafts  │
                                    │  deadlines · exports │
                                    └───┬───────┬──────┬───┘
                                        │       │      │ enqueue jobs
                               ┌────────▼┐  ┌───▼───┐ ┌▼──────────────┐
                               │Postgres │  │ Redis │ │ Worker        │
                               │(Prisma) │  │BullMQ │ │ • RFP parse   │
                               └─────────┘  └───────┘ │ • AI generate │
                                                      │ • Export PDF  │
                               ┌─────────┐            │ • Reminders   │
                               │   S3    │◄───────────┤   (cron)      │
                               └─────────┘            └──┬─────────┬──┘
                                                         │         │
                                                  ┌──────▼──┐ ┌────▼────┐
                                                  │Claude   │ │ Email   │
                                                  │API      │ │(Resend) │
                                                  └─────────┘ └─────────┘
```

- **Single-section generation** streams directly from the API over SSE, so users see text as it's written.
- **Full-proposal generation, RFP parsing and exports** run as queued jobs; the frontend polls or subscribes for status.
- **Tenant isolation**: every query is scoped by `organizationId`, enforced in a guard or Prisma middleware.

---

## 6. AI Pipeline

### 6.1 RFP → Template extraction
1. Upload file → store in S3 → extract text
2. Haiku, with a JSON schema through tool use, returns `{ funderName, programName, amountRange, eligibility[], deadlines[], sections[{ title, instructions, wordLimit, charLimit, required, order }], evaluationCriteria[{ name, weight, description }] }`
3. The user reviews and edits the result in a form, then saves it as a `FunderTemplate`
4. Uploaded text is treated as **data, not instructions** (prompt-injection guard in the system prompt)

### 6.2 Section drafting
- **Context**: org profile (structured), selected org documents (text), template section instructions and limits, evaluation criteria, previously written sections (for consistency), user's extra instruction
- **Rules in system prompt**: stay within the word limit; don't invent statistics, names or amounts, and use `[NEEDS INPUT: …]` instead; match the funder's language
- **Prompt caching** on the org profile and RFP context, since they repeat across sections, to cut cost and latency
- **Prompt versions** stored in code (`packages/ai/prompts/`) and recorded with each generation

### 6.3 Compliance and fit review
- Deterministic: word/character counts, required sections present, deadline not passed
- AI (Sonnet): score each evaluation criterion (0–5) with short improvement suggestions
- Fit score: org profile compared with eligibility and focus areas → score plus reasons

### 6.4 Controls
- `AiGeneration` log: model, tokens in/out, latency, prompt version, user, org
- Per-org daily usage limit and per-user rate limit (Redis)
- Timeouts, retries with backoff, clear error messages in the UI
- **Eval set**: 3–5 real RFPs plus 1–2 sample org profiles, reviewed manually on Days 9 and 11 against a checklist (structure followed, limits met, no invented facts)

---

## 7. Data Model (initial)

```
User(id, email, passwordHash, name, createdAt)
Organization(id, name, type[NONPROFIT|STARTUP|OTHER], country, website, createdAt)
Membership(id, userId, organizationId, role[OWNER|EDITOR|VIEWER])
Invitation(id, organizationId, email, role, token, expiresAt)

OrgProfile(id, organizationId, mission, vision, programs JSON, beneficiaries,
           annualBudget, teamSummary, pastResults JSON, updatedAt)
Document(id, organizationId, kind[PAST_PROPOSAL|REPORT|RFP|OTHER], fileKey,
         fileName, mimeType, extractedText, status, createdAt)

Funder(id, name, website, focusAreas[], geography[], isGlobal)   -- isGlobal = admin library
FunderTemplate(id, funderId?, organizationId?, name, sourceDocumentId?,
               eligibility JSON, evaluationCriteria JSON, amountMin, amountMax)
TemplateSection(id, templateId, order, title, instructions, wordLimit?, charLimit?, required)

Proposal(id, organizationId, templateId, title, status[DRAFT|IN_REVIEW|SUBMITTED|AWARDED|REJECTED],
         requestedAmount, ownerId, fitScore?, createdAt, updatedAt)
ProposalSection(id, proposalId, templateSectionId, content JSON (TipTap), wordCount, status)
SectionVersion(id, proposalSectionId, content JSON, source[AI|USER], aiGenerationId?, createdAt)

Deadline(id, organizationId, proposalId?, templateId?, type[LOI|FULL_PROPOSAL|REPORT|OTHER],
         title, dueAt, timezone, reminderOffsetsDays int[], completedAt?)
Notification(id, userId, type, payload JSON, sentAt?, readAt?)

AiGeneration(id, organizationId, userId, kind, model, promptVersion,
             inputTokens, outputTokens, latencyMs, status, createdAt)
Export(id, proposalId, format[DOCX|PDF], fileKey, status, createdBy, createdAt)
AuditLog(id, organizationId, userId, action, entity, entityId, createdAt)
```

Indexes: `organizationId` on every tenant table, `Deadline(dueAt)`, `Proposal(organizationId, status)`, unique `Membership(userId, organizationId)`.

---

## 8. API Outline (REST, `/api/v1`)

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `POST /auth/logout` `GET /auth/me` |
| Orgs | `POST /orgs` `GET /orgs` `GET/PATCH /orgs/:orgId` `POST /orgs/:orgId/invitations` `POST /invitations/:token/accept` `GET/PATCH/DELETE /orgs/:orgId/members/:id` |
| Profile | `GET/PUT /orgs/:orgId/profile` |
| Documents | `POST /orgs/:orgId/documents` (multipart) `GET /orgs/:orgId/documents` `DELETE /…/:id` |
| Templates | `GET /templates` (library + org) `POST /orgs/:orgId/templates/extract` (RFP → job) `GET /jobs/:id` `POST/GET/PATCH/DELETE /orgs/:orgId/templates/:id` |
| Proposals | `POST /orgs/:orgId/proposals` `GET /orgs/:orgId/proposals` `GET/PATCH/DELETE /proposals/:id` |
| Sections | `PATCH /proposals/:id/sections/:sectionId` `POST /…/sections/:sectionId/generate` (SSE) `POST /…/sections/:sectionId/refine` (SSE) `GET /…/sections/:sectionId/versions` `POST /…/versions/:vid/restore` |
| Review | `POST /proposals/:id/generate-all` (job) `POST /proposals/:id/compliance` `POST /proposals/:id/fit-score` |
| Deadlines | `GET/POST /orgs/:orgId/deadlines` `PATCH/DELETE /deadlines/:id` `GET /deadlines/:id/ics` |
| Exports | `POST /proposals/:id/exports` `{format}` `GET /proposals/:id/exports` `GET /exports/:id/download` |
| Admin | `GET /admin/stats` `CRUD /admin/funders` `CRUD /admin/templates` |

OpenAPI docs generated with `@nestjs/swagger` at `/api/docs`.

---

## 9. Repository Structure

```
ai-assisted-grant/
├── apps/
│   ├── web/                      # React + Vite
│   │   └── src/
│   │       ├── app/              # router, providers, layouts
│   │       ├── components/ui/    # shadcn/ui
│   │       ├── features/
│   │       │   ├── auth/
│   │       │   ├── organizations/
│   │       │   ├── profile/
│   │       │   ├── templates/
│   │       │   ├── proposals/    # editor, section panel, AI actions
│   │       │   ├── deadlines/
│   │       │   └── exports/
│   │       ├── lib/              # api client, sse helper, utils
│   │       └── tests/
│   ├── api/                      # NestJS
│   │   ├── prisma/               # schema.prisma, migrations, seed.ts
│   │   └── src/
│   │       ├── common/           # guards (auth, org, roles), filters, interceptors
│   │       ├── config/
│   │       ├── modules/
│   │       │   ├── auth/  users/  organizations/  profile/  documents/
│   │       │   ├── templates/  proposals/  ai/  compliance/
│   │       │   ├── deadlines/  notifications/  exports/  admin/
│   │       └── main.ts
│   └── worker/                   # BullMQ processors (shares api modules/packages)
│       └── src/processors/       # rfp-extract, generate-proposal, export, reminders
├── packages/
│   ├── shared/                   # Zod schemas, DTO types, enums, constants
│   ├── ai/                       # LLM provider interface, Claude client, prompts/, eval/
│   └── config/                   # eslint, tsconfig, prettier presets
├── infra/
│   └── docker/                   # Dockerfiles for api, worker (built by GitHub Actions only)
├── .github/workflows/            # ci.yml, deploy-staging.yml, deploy-prod.yml
├── docs/                         # PROJECT_PLAN.md, architecture, API, user guide
├── .env.example
└── README.md
```

**Conventions**: Conventional Commits · branches `main` (prod) / `develop` (staging) / `feature/*` · PR plus CI must pass before merge · ESLint + Prettier + Husky pre-commit · strict TypeScript.

---

## 10. Revised 15-Day Plan

| Day | Milestone | Key tasks | Done when |
|-----|-----------|-----------|-----------|
| **1** | Requirements and scope freeze | Client Q&A (§12) · finalize MVP vs Phase 2 · personas, user stories, acceptance criteria · non-functional requirements (performance, security, privacy, AI cost) · **decide stack** · collect sample RFPs and org data | Signed-off scope doc and backlog |
| **2** | Architecture and setup | Monorepo scaffold · local Postgres, Upstash Redis, local file storage · lint/format/husky · GitHub Actions CI · Sentry · **deploy "hello world" web and API to staging** · architecture doc | CI green, staging URL live |
| **3** | Database, auth, RBAC | Prisma schema and migrations and seed · register/login/refresh/logout · org creation, invites, memberships · Auth/Org/Role guards · OpenAPI · unit tests | Users can sign up, create an org, invite a member |
| **4** | UI foundation and wireframes | Low-fi wireframes for all core screens (client review async) · shadcn theme and brand colors · app shell, sidebar, org switcher · auth and onboarding screens · responsive layout | Clickable auth and onboarding flow on staging |
| **5** | Org profile and AI layer | Profile form and API · document upload (S3) and text extraction · `packages/ai` provider interface, Claude client, retries, usage logging, rate limiting · BullMQ worker setup | Profile saved; test prompt runs through the AI layer and is logged |
| **6** | Funder templates | Template library (seed 3–5 common formats) · RFP upload → extraction job → review/edit screen · template CRUD · extraction tests on sample RFPs | RFP upload produces an editable template |
| **7** | AI proposal drafting | Create proposal from template · section-wise **streaming generation (SSE)** · TipTap editor, autosave · version history and restore · **midpoint client demo** | End-to-end draft generated and edited |
| **8** | AI refinement and compliance | Regenerate/shorten/expand/tone/custom actions · "generate all sections" job · compliance checker (limits, required sections, criteria scoring) · fit score · `[NEEDS INPUT]` highlighting | Compliance panel shows issues and suggestions |
| **9** | Deadline tracking and notifications | Deadlines CRUD · dashboard (upcoming, overdue) · list and calendar views · proposal status pipeline · reminder cron job and email templates · `.ics` export · AI eval pass #1 | Reminder email arrives for a test deadline |
| **10** | Document export and admin | DOCX export (headings, section order, formatting) · PDF export · export history and signed downloads · admin: funders/templates library, usage stats · RBAC polish (viewer read-only) | Full proposal downloads as DOCX and PDF; **feature freeze** |
| **11** | QA and testing | Integration tests for each module · Playwright E2E for the main path · AI eval pass #2 (checklist) · cross-browser and mobile check · bug triage | Test report and prioritized bug list |
| **12** | Bug fixing, performance, security | Fix P0/P1 bugs · DB indexes and query checks · Redis caching · load test on generate/export endpoints (k6) · security review: tenant isolation, file upload validation (type, size), prompt-injection guard, rate limits, secrets, CORS, helmet | No P0/P1 open; security checklist passed |
| **13** | User acceptance testing | UAT with 2–3 representatives (nonprofit, founder, grant writer) using scripted tasks · collect feedback · triage | UAT feedback log |
| **14** | UAT fixes and release prep | Apply agreed refinements · copy and empty/error states · release notes and known-issues log · user guide and admin guide · production infrastructure (DB backups, monitoring, alerts, env secrets) | Release candidate on staging, approved by client |
| **15** | Deployment and handover | Production deploy through CI/CD · smoke tests · verify monitoring, logging, backups · technical docs (setup, architecture, API) · client walkthrough and handover (repo, accounts, credentials) | Live production app and handover signed off |

**Buffer**: no free day in 15 days, so Day 10's feature freeze is firm. Anything not done by Day 10 moves to Phase 2 rather than squeezing QA.

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI makes up facts or numbers | Credibility loss for applicants | Placeholder rule, human-review UI, eval checklist, no auto-submit |
| Poor PDF text extraction (scanned RFPs) | Wrong templates | User review step before saving; OCR in Phase 2; manual template builder as fallback |
| Scope creep (payments, discovery, collaboration) | Missed deadline | Written scope freeze on Day 1; change requests go to Phase 2 |
| Slow client feedback (design, UAT users) | Blocked days | Async reviews, component library instead of hi-fi Figma, UAT users booked on Day 1 |
| AI cost and latency | Budget overrun, slow UX | Haiku for small tasks, prompt caching, streaming, per-org limits |
| Sensitive org data | Privacy/legal issues | Encryption at rest (RDS/S3), signed URLs, tenant guards, no training on customer data, privacy note |
| PDF export in production (Chromium) | Deploy problems | Test the export container on staging by Day 10, or use a Gotenberg service |
| Local setup differs from production (no Docker locally) | "Works on my machine" bugs | Same Postgres major version, `.env.example`, CI builds the real Dockerfile on every push |

---

## 12. Questions for the Client (Day 1)

1. What exactly does **"Funder template matching"** mean: following a funder's format (A) or finding suitable funders (B)?
2. Will a **funder template library** be provided (which funders, how many), or will users mostly upload RFPs?
3. **AI provider** preference, monthly AI budget, and any data privacy or compliance requirements (GDPR, etc.)?
4. Are **payments/subscriptions** needed in this phase? (The original Day 10 mentions payments.)
5. Is **team collaboration** (multiple users per org, roles) required for MVP?
6. **Export**: are both DOCX and PDF needed? Any branding or letterhead on exports?
7. **Hosting**: AWS or Vercel? Who owns the cloud, domain, email and AI API accounts?
8. Are **brand guidelines** (logo, colors, fonts) available?
9. Will the client arrange **UAT users** for Day 13?
10. **Languages**: English only?
11. Is an **admin panel** needed, and for whom (internal team or each org)?

---

## 13. Deliverables Checklist

- [ ] Production app live (frontend, API, worker)
- [ ] Source code repo with README, `.env.example`, docker-compose setup
- [ ] Architecture document and OpenAPI docs
- [ ] Database schema/ERD
- [ ] User guide and admin guide
- [ ] Test reports (unit, integration, E2E, AI eval checklist)
- [ ] Release notes and known-issues log
- [ ] CI/CD pipelines, monitoring and backup setup
- [ ] Handover of credentials and accounts
