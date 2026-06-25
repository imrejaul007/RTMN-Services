#!/usr/bin/env bash
# genie-ai-team smoke test — hits a running instance on $PORT (default 4735).
set -uo pipefail

PORT="${PORT:-4735}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-team-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-ai-team-tests}"

export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'T-1',businessId:'T',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# --- /health ---
status=$(curl -s -o /tmp/team.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q '"service":"Genie Personal AI Team"' /tmp/team.out && ok "/health service name" || bad "/health missing service"

# --- /team/list ---
status=$(curl -s -o /tmp/team.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/team/list/user-001")
[ "$status" = "200" ] && ok "/team/list 200" || bad "/team/list returned $status"
total=$(grep -o '"total":[0-9]*' /tmp/team.out | head -1 | cut -d: -f2)
[ "$total" = "5" ] && ok "/team/list total=5" || bad "/team/list total=$total"

# --- /team/get/mem-coach-001 ---
status=$(curl -s -o /tmp/team.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/team/get/mem-coach-001")
[ "$status" = "200" ] && ok "/team/get 200" || bad "/team/get returned $status"
grep -q '"name":"Maya the Coach"' /tmp/team.out && ok "/team/get has Maya" || bad "/team/get missing Maya"

# --- /team/chat ---
status=$(curl -s -o /tmp/team.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  "$BASE/team/chat/user-001/mem-coach-001" -d '{"message":"Help me think about my career."}')
[ "$status" = "201" ] && ok "/team/chat 201" || bad "/team/chat returned $status"
grep -q '"reply"' /tmp/team.out && ok "/team/chat has reply" || bad "/team/chat missing reply"

# --- /team/history ---
status=$(curl -s -o /tmp/team.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/team/history/user-001/mem-coach-001")
[ "$status" = "200" ] && ok "/team/history 200" || bad "/team/history returned $status"
grep -q '"messages"' /tmp/team.out && ok "/team/history has messages" || bad "/team/history missing messages"

# --- /team/recommend ---
status=$(curl -s -o /tmp/team.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/team/recommend/user-001?message=anxiety%20sleep")
[ "$status" = "200" ] && ok "/team/recommend 200" || bad "/team/recommend returned $status"
grep -q '"recommendations"' /tmp/team.out && ok "/team/recommend has recommendations" || bad "/team/recommend missing recommendations"

# --- /api/readiness ---
status=$(curl -s -o /tmp/team.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/team.out && ok "/api/readiness ready=true" || bad "/api/readiness ready=false"

echo
echo "genie-ai-team smoke: $pass passed, $fail failed"
[ "$fail" = "0" ]
