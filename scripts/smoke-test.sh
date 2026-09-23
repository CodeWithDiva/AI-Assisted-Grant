#!/usr/bin/env bash
# End-to-end smoke test against a running API.
#
#   pnpm --filter @grant/api build && node apps/api/dist/main.js   # in another terminal
#   bash scripts/smoke-test.sh [base-url]
#
# Creates a throwaway user and organization, exercises every main flow, then deletes
# what it created. AI steps are skipped automatically when no AI provider is set up.

set -euo pipefail

BASE="${1:-http://localhost:4000/api/v1}"
JAR="$(mktemp)"
WORK="$(mktemp -d)"
trap 'rm -rf "$JAR" "$WORK"' EXIT

pass() { printf '  \033[32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; exit 1; }
json() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);console.log(eval('o'+process.argv[1]))})" "$1"; }

echo "Smoke testing $BASE"

# --- health ---------------------------------------------------------------
curl -sf "$BASE/health" | grep -q '"status"' || fail "health endpoint"
pass "health"

# --- auth -----------------------------------------------------------------
EMAIL="smoke$RANDOM$RANDOM@example.com"
curl -sf -c "$JAR" -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"Secret12345\"}" > /dev/null
pass "register"

[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/auth/me")" = "401" ] || fail "unauthenticated request was allowed"
pass "unauthenticated requests rejected"

# --- organization, profile, documents -------------------------------------
ORG=$(curl -sf -b "$JAR" -c "$JAR" -X POST "$BASE/orgs" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Test Org","type":"NONPROFIT"}' | json .id)
pass "organization created"

curl -sf -b "$JAR" -X PUT "$BASE/orgs/$ORG/profile" -H 'Content-Type: application/json' \
  -d '{"mission":"Educate girls in rural areas","annualBudget":85000,"currency":"USD"}' > /dev/null
pass "profile saved"

printf 'Annual report 2025. We educated 1,200 girls in 14 villages.\n' > "$WORK/report.txt"
( cd "$WORK" && curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/documents" -F 'kind=REPORT' -F 'file=@report.txt' ) \
  | grep -q '"status":"READY"' || fail "document upload/extraction"
pass "document uploaded and text extracted"

# --- templates and proposal ----------------------------------------------
TPL=$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/templates" -H 'Content-Type: application/json' -d '{
  "name":"Smoke Template","funderName":"Smoke Foundation",
  "eligibility":["Registered nonprofit"],
  "evaluationCriteria":[{"name":"Impact","weight":100}],
  "sections":[{"title":"Executive Summary","instructions":"Summarize","wordLimit":100,"required":true}]
}' | json .id)
pass "template created"

PROP=$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/proposals" -H 'Content-Type: application/json' \
  -d "{\"templateId\":\"$TPL\",\"title\":\"Smoke Proposal\"}" | json .id)
SEC=$(curl -sf -b "$JAR" "$BASE/orgs/$ORG/proposals/$PROP" | json '.sections[0].id')
pass "proposal created from template"

curl -sf -b "$JAR" -X PATCH "$BASE/orgs/$ORG/proposals/$PROP/sections/$SEC" \
  -H 'Content-Type: application/json' \
  -d '{"text":"We request 50,000 USD to educate 1,200 girls. [NEEDS INPUT: 2025 figures]"}' > /dev/null
[ "$(curl -sf -b "$JAR" "$BASE/orgs/$ORG/proposals/$PROP/sections/$SEC/versions" | json .length)" -ge 1 ] \
  || fail "section version was not recorded"
pass "section saved with version history"

curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/proposals/$PROP/compliance" \
  | grep -q 'unfilled placeholder' || fail "compliance check missed the placeholder"
pass "compliance check"

# --- deadlines ------------------------------------------------------------
DUE=$(node -e "const d=new Date(Date.now()+3*864e5);console.log(d.toISOString().slice(0,10))")
DL=$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/deadlines" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Smoke deadline\",\"type\":\"FULL_PROPOSAL\",\"dueAt\":\"$DUE\",\"proposalId\":\"$PROP\"}" | json .id)
curl -sf -b "$JAR" "$BASE/orgs/$ORG/deadlines/$DL/ics" | grep -q 'BEGIN:VCALENDAR' || fail "ics export"
pass "deadline created and calendar file generated"

[ "$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/deadlines/run-reminders" | json .sent)" -ge 1 ] \
  || fail "reminder was not sent"
[ "$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/deadlines/run-reminders" | json .sent)" = "0" ] \
  || fail "reminder sent twice"
pass "reminders sent once, not twice"

# --- exports --------------------------------------------------------------
for FORMAT in DOCX PDF; do
  EXPORT=$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/proposals/$PROP/exports" \
    -H 'Content-Type: application/json' -d "{\"format\":\"$FORMAT\"}" | json .id)
  curl -sf -b "$JAR" -o "$WORK/out.$FORMAT" "$BASE/orgs/$ORG/exports/$EXPORT/download"
  [ -s "$WORK/out.$FORMAT" ] || fail "$FORMAT download was empty"
  pass "$FORMAT exported and downloaded"
done

# --- access control -------------------------------------------------------
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$BASE/admin/stats")" = "403" ] \
  || fail "admin endpoint reachable by a normal user"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$BASE/orgs/not-my-org/proposals")" = "403" ] \
  || fail "another organization's data was reachable"
pass "access control"

# --- team -----------------------------------------------------------------
INVITE=$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/invitations" -H 'Content-Type: application/json' \
  -d '{"email":"colleague@example.com","role":"EDITOR"}')
INVITE_ID=$(echo "$INVITE" | json .id)
INVITE_TOKEN=$(echo "$INVITE" | json .token)
[ "$(curl -sf -b "$JAR" "$BASE/orgs/$ORG/invitations" | json .length)" = "1" ] || fail "pending invitation not listed"
# The preview is public: no cookie jar here on purpose.
curl -sf "$BASE/invitations/$INVITE_TOKEN" | grep -q '"status":"PENDING"' || fail "invitation preview"
curl -sf -b "$JAR" -X DELETE "$BASE/orgs/$ORG/invitations/$INVITE_ID" > /dev/null
[ "$(curl -sf -b "$JAR" "$BASE/orgs/$ORG/invitations" | json .length)" = "0" ] || fail "invitation not revoked"
pass "invite, preview and revoke a team member"

INVITEE_EMAIL="invitee$RANDOM$RANDOM@example.com"
INVITEE_JAR="$(mktemp)"
INVITE_TOKEN=$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/invitations" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$INVITEE_EMAIL\",\"role\":\"VIEWER\"}" | json .token)
curl -sf -c "$INVITEE_JAR" -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Invited Viewer\",\"email\":\"$INVITEE_EMAIL\",\"password\":\"Secret12345\"}" > /dev/null
curl -sf -b "$INVITEE_JAR" -X POST "$BASE/invitations/$INVITE_TOKEN/accept" | grep -q '"role":"VIEWER"' \
  || fail "invitation could not be accepted"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$INVITEE_JAR" -X POST "$BASE/orgs/$ORG/deadlines" \
  -H 'Content-Type: application/json' -d '{"title":"Nope","type":"OTHER","dueAt":"2030-01-01"}')" = "403" ] \
  || fail "a viewer was allowed to write"
[ "$(curl -sf -b "$JAR" "$BASE/orgs/$ORG/members" | json .length)" = "2" ] || fail "new member not listed"
pass "invitee accepts, joins as viewer, and cannot write"

# --- content library ------------------------------------------------------
BLOCK=$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/library" -H 'Content-Type: application/json'   -d '{"title":"Organization history","category":"ORGANIZATION","body":"Founded in 2012 in Thatta."}' | json .id)
[ -n "$BLOCK" ] || fail "library passage not created"
curl -sf -b "$JAR" -X PATCH "$BASE/orgs/$ORG/library/$BLOCK" -H 'Content-Type: application/json'   -d '{"body":"Founded in 2012 in Thatta, Sindh."}' | grep -q 'Sindh' || fail "library passage not updated"
curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/library/$BLOCK/used" > /dev/null || fail "library use not counted"
[ "$(curl -sf -b "$INVITEE_JAR" "$BASE/orgs/$ORG/library" | json '[0].usageCount')" = "1" ]   || fail "a viewer could not read the library"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$INVITEE_JAR" -X POST "$BASE/orgs/$ORG/library"   -H 'Content-Type: application/json' -d '{"title":"Nope","body":"x"}')" = "403" ]   || fail "a viewer was allowed to add to the library"
curl -sf -b "$JAR" -X DELETE "$BASE/orgs/$ORG/library/$BLOCK" > /dev/null || fail "library passage not deleted"
pass "content library: add, edit, count use, viewer reads only, delete"

# --- review notes and approval --------------------------------------------
NOTE=$(curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/proposals/$PROP/comments" -H 'Content-Type: application/json' \
  -d "{\"sectionId\":\"$SEC\",\"body\":\"Add the 2025 figure here.\"}" | json .id)
[ -n "$NOTE" ] || fail "review note not created"
[ "$(curl -sf -b "$JAR" "$BASE/orgs/$ORG/proposals" | json '.find(p=>p.id==="'"$PROP"'").openComments')" = "1" ] \
  || fail "open note not counted"
# A viewer may review but not sign off.
curl -sf -b "$INVITEE_JAR" -X POST "$BASE/orgs/$ORG/proposals/$PROP/comments" -H 'Content-Type: application/json' \
  -d '{"body":"A viewer note."}' > /dev/null || fail "a viewer could not leave a note"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$INVITEE_JAR" -X POST "$BASE/orgs/$ORG/proposals/$PROP/approval")" = "403" ] \
  || fail "a viewer was allowed to approve"

curl -sf -b "$JAR" -X POST "$BASE/orgs/$ORG/proposals/$PROP/approval" | grep -q '"approvedAt":"' \
  || fail "proposal not approved"
# Editing withdraws the approval.
curl -sf -b "$JAR" -X PATCH "$BASE/orgs/$ORG/proposals/$PROP/sections/$SEC" -H 'Content-Type: application/json' \
  -d '{"text":"Edited after the approval."}' > /dev/null
curl -sf -b "$JAR" "$BASE/orgs/$ORG/proposals/$PROP" | grep -q '"approvedAt":null' \
  || fail "editing did not withdraw the approval"
curl -sf -b "$JAR" -X PATCH "$BASE/orgs/$ORG/proposals/$PROP/comments/$NOTE" -H 'Content-Type: application/json' \
  -d '{"resolved":true}' | grep -q '"resolvedAt":"' || fail "note not resolved"
pass "review notes, viewer limits and owner approval"

# --- notifications --------------------------------------------------------
NOTIFS=$(curl -sf -b "$JAR" "$BASE/notifications")
echo "$NOTIFS" | grep -q '"type":"COMMENT_ADDED"' || fail "no notification for the viewer's note"
echo "$NOTIFS" | grep -q '"type":"MEMBER_JOINED"' || fail "no notification for the new member"
[ "$(echo "$NOTIFS" | json '.filter(n=>!n.readAt).length')" -ge 2 ] || fail "notifications already read"
# The author is never told about their own note.
curl -sf -b "$INVITEE_JAR" "$BASE/notifications" | grep -q '"type":"COMMENT_ADDED"'   && fail "the author was notified about their own note"
curl -sf -b "$JAR" -X POST "$BASE/notifications/read" -H 'Content-Type: application/json' -d '{}' > /dev/null
[ "$(curl -sf -b "$JAR" "$BASE/notifications" | json '.filter(n=>!n.readAt).length')" = "0" ]   || fail "notifications not marked read"
rm -f "$INVITEE_JAR"
pass "notifications reach the right people and can be marked read"

# --- activity trail -------------------------------------------------------
ACTIVITY=$(curl -sf -b "$JAR" "$BASE/orgs/$ORG/activity")
echo "$ACTIVITY" | grep -q '"action":"proposal.created"' || fail "proposal creation not recorded"
echo "$ACTIVITY" | grep -q '"action":"member.invited"' || fail "invitation not recorded"
echo "$ACTIVITY" | grep -q '"userName"' || fail "activity entries have no author"
echo "$ACTIVITY" | grep -q 'Smoke Proposal' || fail "activity entry has no title"
pass "activity trail records who changed what"

# --- account --------------------------------------------------------------
curl -sf -b "$JAR" -X PATCH "$BASE/auth/me" -H 'Content-Type: application/json' -d '{"name":"Smoke Renamed"}' \
  | grep -q '"name":"Smoke Renamed"' || fail "account rename"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/auth/password" -H 'Content-Type: application/json' \
  -d '{"currentPassword":"wrong-password","newPassword":"NewSecret12345"}')" = "401" ] || fail "wrong current password accepted"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -c "$JAR" -X POST "$BASE/auth/password" -H 'Content-Type: application/json' \
  -d '{"currentPassword":"Secret12345","newPassword":"NewSecret12345"}')" = "204" ] || fail "password change"
[ "$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"NewSecret12345\"}")" = "200" ] || fail "sign-in with the new password"
pass "rename account and change password"

# --- cleanup --------------------------------------------------------------
curl -sf -b "$JAR" -X DELETE "$BASE/orgs/$ORG/proposals/$PROP" > /dev/null
curl -sf -b "$JAR" -X DELETE "$BASE/orgs/$ORG/deadlines/$DL" > /dev/null
curl -sf -b "$JAR" -X DELETE "$BASE/orgs/$ORG/templates/$TPL" > /dev/null
pass "cleanup"

printf '\n\033[32mAll smoke tests passed.\033[0m\n'
printf 'Note: the test user (%s) and its organization remain in the database.\n' "$EMAIL"
