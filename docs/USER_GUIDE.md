# GrantPilot — User Guide

GrantPilot drafts grant proposals against a funder's own template and keeps track of the deadlines.

## 1. Create your account

1. Open the app and choose **Create an account**.
2. Use a password of at least 8 characters.
3. You are taken straight to the **Organization** screen.

## 2. Create your organization

Every proposal belongs to an organization — your nonprofit, your startup, or a client you write for.

1. **Organization → Create an organization**: name, type and country.
2. You become its **Owner**.
3. Consultants working for several clients can create one organization per client and switch between them with the selector at the top of the sidebar.

### Inviting colleagues

Owners can invite people from the API today (`POST /orgs/:orgId/invitations`); the invitation link is shared manually. Roles:

| Role | Can do |
|------|--------|
| **Owner** | Everything, including inviting and removing members |
| **Editor** | Write proposals, upload documents, edit templates and deadlines |
| **Viewer** | Read only |

## 3. Fill in the organization profile

**Organization → your organization → Profile.**

This is the single most important screen: the AI writes proposals from these facts and nothing else.

- **Mission**, **vision**, **who you serve**, **team**
- **Annual budget** and currency
- **Programs** — add one per activity, with a sentence on what it does and what it achieves

Anything you leave out will appear in drafts as `[NEEDS INPUT: …]` instead of being invented.

## 4. Upload your documents

**Organization → your organization → Documents.**

Upload past proposals, annual reports and funder guidelines (PDF, Word, text or Markdown, up to 20 MB). The text is read out of each file and used as source material, so drafts reuse your own wording.

Mark funder guidelines as **Funder guidelines / RFP** — those are the ones the template importer reads.

## 5. Get the funder's template

**Funder Templates.**

Two ways to start:

- **Starter library** — four common formats (foundation grant, letter of inquiry, startup innovation grant, government grant) with typical sections and word limits.
- **Import from RFP** — upload the funder's guidelines. The AI reads out the sections, word limits, eligibility rules and scoring criteria. **Check what it found**, fix anything wrong, then save. Nothing is stored until you save.

## 6. Write the proposal

**Proposals → New proposal**: give it a title and pick the template. The template's sections are copied onto your proposal, so later template changes cannot disturb it.

In the editor:

- The left column lists every section with its word count. Grey = not started, green = written, red = over the funder's limit.
- **Write with AI** drafts the selected section from your profile, your documents and the funder's instructions. The text appears as it is written.
- **Make shorter**, **Expand**, **More formal**, **Plainer language** rewrite what is there.
- The instruction box above the editor passes a specific request to the AI, e.g. *"focus on the 2026 flood response"*.
- Your edits save automatically two seconds after you stop typing, and **History** restores any earlier version — yours or the AI's.

### About `[NEEDS INPUT: …]`

The AI never invents statistics, dates or names. When it needs a fact you have not given it, it writes a placeholder like `[NEEDS INPUT: 2025 number of beneficiaries]`. Replace every one before submitting — the review flags any that are left.

## 7. Review before you submit

**Review draft** in the proposal header runs two checks:

1. **In code, instantly**: empty sections, word and character limits, leftover placeholders, sections using far less than the allowed length, and whether a deadline is being tracked.
2. **With the AI**: a score out of 5 against each of the funder's evaluation criteria, with what would raise it.

**Check funder fit** scores 0-100 how well your organization matches the funder's eligibility, and lists the gaps.

## 8. Track the deadline

**Deadlines → add** the date, and link it to the proposal.

- The dashboard and the proposal list show what is due next.
- Email reminders go out 14, 7, 3 and 1 day before, to every owner and editor.
- **Calendar** downloads an `.ics` file for Google Calendar, Outlook or Apple Calendar.
- Tick a deadline off when you have submitted.

## 9. Export and send

**Export DOCX** or **Export PDF** in the proposal header. The file follows the funder's section order, with your organization and the funder named at the top. Send it to the funder through their own portal or by email.

Set the proposal's status as it moves: Draft → In review → Submitted → Awarded or Rejected.

## Frequently asked

**Does the AI send my data anywhere else?**
Your profile, documents and drafts are sent to the Claude API to produce the text you asked for, and nowhere else.

**Why did a draft come back short?**
The AI stays inside the funder's word limit and only uses facts it was given. A thin organization profile produces a short draft with placeholders.

**Can I write without the AI?**
Yes. Every section is an ordinary text box; the AI buttons are optional.

**What if the AI is unavailable?**
The app keeps working — writing, editing, deadlines and exports are unaffected, and the limit checks in the review still run.
