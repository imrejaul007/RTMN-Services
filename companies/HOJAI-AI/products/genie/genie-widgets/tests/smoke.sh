#!/usr/bin/env bash
# genie-widgets smoke test — hits a running instance on $PORT (default 4734).
set -uo pipefail

PORT="${PORT:-4734}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-widget-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-widgets-tests}"

export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'W-1',businessId:'W',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# --- /health ---
status=$(curl -s -o /tmp/wgt.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q '"service":"Genie Lock-Screen Widgets"' /tmp/wgt.out && ok "/health service name" || bad "/health missing service"

# --- /widgets/types ---
status=$(curl -s -o /tmp/wgt.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/widgets/types")
[ "$status" = "200" ] && ok "/widgets/types 200" || bad "/widgets/types returned $status"
total=$(grep -o '"total":[0-9]*' /tmp/wgt.out | head -1 | cut -d: -f2)
[ "$total" = "8" ] && ok "/widgets/types total=8" || bad "/widgets/types total=$total"

# --- /widgets/briefing/user-001 ---
status=$(curl -s -o /tmp/wgt.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/widgets/briefing/user-001")
[ "$status" = "200" ] && ok "/widgets/briefing 200" || bad "/widgets/briefing returned $status"
grep -q '"headline"' /tmp/wgt.out && ok "/widgets/briefing has headline" || bad "/widgets/briefing missing headline"

# --- /widgets/render ---
status=$(curl -s -o /tmp/wgt.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  "$BASE/widgets/render/user-001" -d '{}')
[ "$status" = "200" ] && ok "/widgets/render 200" || bad "/widgets/render returned $status"
grep -q '"bundle"' /tmp/wgt.out && ok "/widgets/render has bundle" || bad "/widgets/render missing bundle"

# --- /widgets/manifest ---
status=$(curl -s -o /tmp/wgt.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/widgets/manifest/user-001")
[ "$status" = "200" ] && ok "/widgets/manifest 200" || bad "/widgets/manifest returned $status"
grep -q '"platform":\["ios","android"\]' /tmp/wgt.out && ok "/widgets/manifest has ios+android" || bad "/widgets/manifest missing platforms"

# --- /config ---
status=$(curl -s -o /tmp/wgt.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/config/user-001")
[ "$status" = "200" ] && ok "/config 200" || bad "/config returned $status"
grep -q '"pinned"' /tmp/wgt.out && ok "/config has pinned" || bad "/config missing pinned"

# --- /config pin ---
status=$(curl -s -o /tmp/wgt.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" \
  "$BASE/config/user-001/pin/twin")
[ "$status" = "200" ] && ok "/config/pin 200" || bad "/config/pin returned $status"

# --- /api/readiness ---
status=$(curl -s -o /tmp/wgt.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/wgt.out && ok "/api/readiness ready=true" || bad "/api/readiness ready=false"

echo
echo "genie-widgets smoke: $pass passed, $fail failed"
[ "$fail" = "0" ]
