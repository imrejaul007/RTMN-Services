#!/usr/bin/env bash
# genie-household smoke test — hits a running instance on $PORT (default 4737).
set -uo pipefail

PORT="${PORT:-4737}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-hh-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-household-tests}"

export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'H-1',businessId:'H',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# --- /health ---
status=$(curl -s -o /tmp/hh.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q '"service":"Genie Household OS"' /tmp/hh.out && ok "/health service" || bad "/health missing"

# --- /household/get/hh-shared-001 ---
status=$(curl -s -o /tmp/hh.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/household/get/hh-shared-001")
[ "$status" = "200" ] && ok "/household/get 200" || bad "/household/get returned $status"
grep -q '"members"' /tmp/hh.out && ok "/household/get has members" || bad "/household/get missing members"
grep -q '"counts"' /tmp/hh.out && ok "/household/get has counts" || bad "/household/get missing counts"

# --- /household/hh-shared-001/lists/list ---
status=$(curl -s -o /tmp/hh.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/household/hh-shared-001/lists/list")
[ "$status" = "200" ] && ok "/lists/list 200" || bad "/lists/list returned $status"
grep -q '"grouped"' /tmp/hh.out && ok "/lists/list has grouped" || bad "/lists/list missing grouped"

# --- /household/hh-shared-001/meals/week ---
status=$(curl -s -o /tmp/hh.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/household/hh-shared-001/meals/week")
[ "$status" = "200" ] && ok "/meals/week 200" || bad "/meals/week returned $status"
grep -q '"week"' /tmp/hh.out && ok "/meals/week has week" || bad "/meals/week missing week"

# --- /household/hh-shared-001/events/list ---
status=$(curl -s -o /tmp/hh.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/household/hh-shared-001/events/list")
[ "$status" = "200" ] && ok "/events/list 200" || bad "/events/list returned $status"
grep -q '"events"' /tmp/hh.out && ok "/events/list has events" || bad "/events/list missing events"

# --- /api/readiness ---
status=$(curl -s -o /tmp/hh.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/hh.out && ok "/api/readiness ready=true" || bad "/api/readiness ready=false"

echo
echo "genie-household smoke: $pass passed, $fail failed"
[ "$fail" = "0" ]