# GrantPilot — User Guide

GrantPilot drafts grant proposals against a funder's own template and keeps track of the deadlines.

## Finding your way around

| Sidebar | What it is for |
|---------|----------------|
| **Organization switcher** (top) | Change which organization you are working in, or add another |
| **Dashboard** | What to work on next, setup progress, the pipeline, upcoming deadlines |
| **Writing → Proposals** | Every application, filtered by status |
| **Writing → Deadlines** | Submission and reporting dates, with reminders |
| **Library → Funder templates** | Funders' formats: sections, word limits, scoring criteria |
| **Library → Documents** | Past proposals, reports and funder guidelines |
| **Organization → Profile** | The facts the AI writes from |
| **Organization → Team** | Members, roles and invitations |
| **Settings** | Your name, password and the organization's details |

The dot at the bottom of the sidebar shows whether AI drafting is available (**AI drafting ready**) or no AI provider is set up yet (**AI not set up**).

## 1. Create your account and organization

1. **Create an account** with a password of at least 8 characters.
2. Enter your organization's name, type and country.
3. Consultants writing for several clients can add one organization per client and switch between them from the top of the sidebar.

**Forgot your password?** On the sign-in page choose **Forgot password?** and enter your email. The link in the email works once, for 60 minutes; choosing a new password signs you in and signs you out on every other device.

## 2. Fill in the profile

**Organization → Profile.** This is the single most important screen: the AI writes proposals from these facts and nothing else.

- Mission, vision, who you serve, team
- Annual budget and currency
- Programs — one per activity, with what it does and what it achieved

The ring on the right shows how complete the profile is. Anything left out appears in drafts as `[NEEDS INPUT: …]` instead of being invented.

## 3. Upload your documents

**Library → Documents.** Upload past proposals, annual reports and funder guidelines (PDF, Word, text or Markdown, up to 20 MB). The text is read out of each file and used as source material, so drafts reuse your own wording and figures.

## 4. Get the funder's template

**Library → Funder templates.**

- **Starter library** — four common formats (foundation grant, letter of inquiry, startup innovation grant, government grant).
- **Import from RFP** — upload the funder's guidelines. The AI reads out the sections, word limits, eligibility rules and scoring criteria. **Check what it found**, fix anything wrong — especially the word limits — then save.

## 4b. Build your content library

**Content library** (sidebar, under Library) holds the paragraphs you write again and again: organization history, the team, your monitoring approach, safeguarding and financial policies.

- **New passage** — give it a title, pick a category and paste the text.
- In the editor, the **Library** button inserts a passage where the cursor is, and saves the section (or just the text you selected) as a new passage.
- The AI reads the library too, so drafts reuse your approved wording and figures instead of rephrasing them differently in every application.

Keep passages short and factual, and update them when the numbers change — every later draft picks up the new version.

## 5. Write the proposal

**New proposal** (top-right button, available everywhere): give it a title and an amount, and pick the template card. The template's sections are copied onto the proposal, so later template changes leave it alone.

In the editor:

- The left column lists every section with its word count. Grey dot = not started, green = written, red = over the limit.
- **Write with AI** drafts the selected section from your profile, documents and the funder's instructions; the text appears as it is written.
- **Shorten**, **Expand**, **More formal**, **Plainer** rewrite what is there. The instruction box passes a specific request, e.g. *"lead with the 2026 flood response"*.
- **Library** inserts an approved passage at the cursor, or saves what you have written for reuse.
- The toolbar above the text adds **bold** (Ctrl+B), *italics* (Ctrl+I), bulleted and numbered lists. **Preview** shows the section as it will look in the export, and the formatting carries into Word and PDF. Word counts ignore the formatting marks.
- The bar under the text fills as you approach the word limit and turns red past it.
- Edits save two seconds after you stop typing. **History** restores any earlier version, yours or the AI's.
- The status badge above the title (Draft, In review, Submitted, Awarded, Rejected) is a dropdown — change it as the application moves on.

### About `[NEEDS INPUT: …]`

The AI never invents statistics, dates or names. When it needs a fact you have not given it, it writes a placeholder like `[NEEDS INPUT: 2025 number of beneficiaries]`. Replace every one before submitting — the review lists any that are left.

## 6. Review before you submit

**Review draft** runs two checks:

1. **Instantly, in code**: empty sections, word and character limits, leftover placeholders, sections using far less than the allowed length, and whether a deadline is tracked.
2. **With the AI**: a score out of 5 against each of the funder's criteria, with what would raise it.

**Funder fit** scores 0–100 how well your organization matches the funder's eligibility, and lists the gaps.

## 7. Track the deadline

**Writing → Deadlines → Add deadline**, and link it to the proposal.

- Deadlines are grouped into Overdue, This week, Next 30 days and Later.
- Every owner and editor is emailed 14, 7, 3 and 1 day before.
- The calendar icon downloads an `.ics` file for Google Calendar, Outlook or Apple Calendar.
- The tick marks a deadline done once you have submitted.

## 8. Export and send

**Export → Word document** (to edit further) or **Export → PDF** (ready for a funder portal). The file follows the funder's section order, with your organization and the funder named at the top.

## 9. Work as a team

**Organization → Team.**

- Owners invite people by email and choose their role. The invitation link is also shown once, with a **Copy** button, in case the email does not arrive. It works once and expires after 7 days.
- The invited person opens the link, creates an account (or signs in) with **the same email address**, and joins.
- Owners can change a member's role or remove them. An organization always keeps at least one owner.

| Role | Can do |
|------|--------|
| **Owner** | Everything, including inviting, re-assigning and removing members |
| **Editor** | Write proposals, upload documents, manage templates and deadlines |
| **Viewer** | Read everything, change nothing |

## 10. Settings

- **Account** — change your display name.
- **Email address** — change the address you sign in with (your current password confirms it). The old address gets a notice, so nobody can take over an account silently.
- **Password** — changing it signs you out on every other device.
- **Organization** — owners can change the name, type, country and website.

## Frequently asked

**Does the AI send my data anywhere else?**
Your profile, documents and drafts are sent to the AI service your administrator chose (Google Gemini, Groq or Anthropic Claude) to produce the text you asked for, and nowhere else. On Gemini's free plan Google may use that content to improve its products; ask your administrator which plan is in use before working on confidential material.

**An AI button says the service is busy or the daily limit is used up.**
On the free plan each AI model has a daily allowance, and the app already switches to a second model when the first is busy. Try again in a few minutes, or the next day. Everything else keeps working in the meantime.

**Why did a draft come back short?**
The AI stays inside the funder's word limit and only uses facts it was given. A thin profile produces a short draft with placeholders.

**Can I write without the AI?**
Yes. Every section is an ordinary text box; the AI buttons are optional.

**What if the AI is unavailable?**
Everything else keeps working — writing, editing, deadlines, team and exports — and the limit checks in the review still run.
