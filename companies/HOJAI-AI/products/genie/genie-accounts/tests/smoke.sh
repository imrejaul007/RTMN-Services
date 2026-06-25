#!/usr/bin/env bash
# genie-accounts smoke test — hits a running instance on $PORT (default 4736).
set -uo pipefail

PORT="${PORT:-4736}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-acc-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-accounts-tests}"

export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'A-1',businessId:'A',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# --- /health ---
status=$(curl -s -o /tmp/acc.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q '"service":"Genie Connected Accounts"' /tmp/acc.out && ok "/health service name" || bad "/health missing service"

# --- /accounts/providers ---
status=$(curl -s -o /tmp/acc.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/accounts/providers")
[ "$status" = "200" ] && ok "/accounts/providers 200" || bad "/accounts/providers returned $status"
total=$(grep -o '"total":[0-9]*' /tmp/acc.out | head -1 | cut -d: -f2)
[ "$total" = "10" ] && ok "/accounts/providers total=10" || bad "/accounts/providers total=$total"

# --- /accounts/list ---
status=$(curl -s -o /tmp/acc.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/accounts/list/user-001")
[ "$status" = "200" ] && ok "/accounts/list 200" || bad "/accounts/list returned $status"
grep -q '"providerMeta"' /tmp/acc.out && ok "/accounts/list has providerMeta" || bad "/accounts/list missing providerMeta"

# --- /accounts/connect ---
status=$(curl -s -o /tmp/acc.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" \
  "$BASE/accounts/connect/user-001/github")
[ "$status" = "201" ] && ok "/accounts/connect 201" || bad "/accounts/connect returned $status"

# --- /accounts/data ---
status=$(curl -s -o /tmp/acc.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" \
  "$BASE/accounts/data/user-001/google_calendar")
[ "$status" = "200" ] && ok "/accounts/data 200" || bad "/accounts/data returned $status"
grep -q '"events"' /tmp/acc.out && ok "/accounts/data has events" || bad "/accounts/data missing events"

# --- /api/readiness ---
status=$(curl -s -o /tmp/acc.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/acc.out && ok "/api/readiness ready=true" || bad "/api/readiness ready=false"

echo
echo "genie-accounts smoke: $pass passed, $fail failed"
[ "$fail" = "0" ]
