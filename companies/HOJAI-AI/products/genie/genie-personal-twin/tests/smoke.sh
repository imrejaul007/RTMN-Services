#!/usr/bin/env bash
# genie-personal-twin smoke test — hits a running instance on $PORT (default 4733).
set -uo pipefail

PORT="${PORT:-4733}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-twin-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-personal-twin-tests}"

export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'T-USER-1',businessId:'T-BIZ',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# --- /health ---
status=$(curl -s -o /tmp/twin.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q '"service":"Genie Personal Digital Twin"' /tmp/twin.out && ok "/health service name" || bad "/health missing service name"

# --- /twin/get/user-001 ---
status=$(curl -s -o /tmp/twin.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/twin/get/user-001")
[ "$status" = "200" ] && ok "/twin/get/user-001 200" || bad "/twin/get/user-001 returned $status"
grep -q '"name":"You"' /tmp/twin.out && ok "/twin/get has name" || bad "/twin/get missing name"
grep -q '"traits"' /tmp/twin.out && ok "/twin/get has traits" || bad "/twin/get missing traits"
grep -q '"moments"' /tmp/twin.out && ok "/twin/get has moments" || bad "/twin/get missing moments"

# --- /twin/summary/user-001 ---
status=$(curl -s -o /tmp/twin.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/twin/summary/user-001")
[ "$status" = "200" ] && ok "/twin/summary 200" || bad "/twin/summary returned $status"
grep -q '"topTraits"' /tmp/twin.out && ok "/twin/summary has topTraits" || bad "/twin/summary missing topTraits"

# --- /traits/list/user-001 ---
status=$(curl -s -o /tmp/twin.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/traits/list/user-001")
[ "$status" = "200" ] && ok "/traits/list 200" || bad "/traits/list returned $status"
total=$(grep -o '"total":[0-9]*' /tmp/twin.out | head -1 | cut -d: -f2)
[ "$total" = "8" ] && ok "/traits/list total=8" || bad "/traits/list total=$total"

# --- /moments/list/user-001 ---
status=$(curl -s -o /tmp/twin.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/moments/list/user-001")
[ "$status" = "200" ] && ok "/moments/list 200" || bad "/moments/list returned $status"
grep -q '"total":' /tmp/twin.out && ok "/moments/list has total" || bad "/moments/list missing total"

# --- /api/readiness ---
status=$(curl -s -o /tmp/twin.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/twin.out && ok "/api/readiness ready=true" || bad "/api/readiness ready=false"

echo
echo "genie-personal-twin smoke: $pass passed, $fail failed"
[ "$fail" = "0" ]
