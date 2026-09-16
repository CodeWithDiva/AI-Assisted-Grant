#!/usr/bin/env bash
# End-to-end smoke test against a running API.
#
#   pnpm --filter @grant/api build && node apps/api/dist/main.js   # in another terminal
#   bash scripts/smoke-test.sh [base-url]
#
# Creates a throwaway user and organization, exercises every main flow, then deletes
# what it created. AI steps are skipped automatically when ANTHROPIC_API_KEY is unset.

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

# --- cleanup --------------------------------------------------------------
curl -sf -b "$JAR" -X DELETE "$BASE/orgs/$ORG/proposals/$PROP" > /dev/null
curl -sf -b "$JAR" -X DELETE "$BASE/orgs/$ORG/deadlines/$DL" > /dev/null
curl -sf -b "$JAR" -X DELETE "$BASE/orgs/$ORG/templates/$TPL" > /dev/null
pass "cleanup"

printf '\n\033[32mAll smoke tests passed.\033[0m\n'
printf 'Note: the test user (%s) and its organization remain in the database.\n' "$EMAIL"
