#!/usr/bin/env bash
# genie-wellness-agent smoke test
set -uo pipefail

PORT="${PORT:-4741}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-wellness-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-wellness-tests}"
export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'user-001',businessId:'W',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# /health
status=$(curl -s -o /tmp/w.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q 'Genie Wellness Agent' /tmp/w.out && ok "/health service" || bad "/health missing"

# /metrics/user-001 (42 seeded)
status=$(curl -s -o /tmp/w.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/metrics/user-001")
[ "$status" = "200" ] && ok "/metrics 200" || bad "/metrics returned $status"
grep -q '"total":42' /tmp/w.out && ok "/metrics has 42 entries" || bad "/metrics total wrong"

# /metrics?type=sleep
status=$(curl -s -o /tmp/w.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/metrics/user-001?type=sleep")
[ "$status" = "200" ] && ok "/metrics?type=sleep 200" || bad "/metrics?type=sleep returned $status"
grep -q '"total":7' /tmp/w.out && ok "/metrics?type=sleep has 7" || bad "/metrics?type=sleep total wrong"

# /workouts/user-001 (3 seeded)
status=$(curl -s -o /tmp/w.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/workouts/user-001")
[ "$status" = "200" ] && ok "/workouts 200" || bad "/workouts returned $status"
grep -q 'Morning run' /tmp/w.out && ok "/workouts has Morning run" || bad "/workouts missing Morning run"

# /meals/user-001 (5 seeded)
status=$(curl -s -o /tmp/w.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/meals/user-001")
[ "$status" = "200" ] && ok "/meals 200" || bad "/meals returned $status"
grep -q 'Oatmeal' /tmp/w.out && ok "/meals has Oatmeal" || bad "/meals missing Oatmeal"

# /goals/user-001 (4 seeded)
status=$(curl -s -o /tmp/w.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/goals/user-001")
[ "$status" = "200" ] && ok "/goals 200" || bad "/goals returned $status"
grep -q 'Sleep 8h/night' /tmp/w.out && ok "/goals has Sleep 8h" || bad "/goals missing Sleep 8h"
grep -q '10K steps' /tmp/w.out && ok "/goals has 10K steps" || bad "/goals missing 10K steps"

# /insights/user-001
status=$(curl -s -o /tmp/w.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/insights/user-001")
[ "$status" = "200" ] && ok "/insights 200" || bad "/insights returned $status"
grep -q '"tips"' /tmp/w.out && ok "/insights has tips" || bad "/insights missing tips"
grep -q '"workoutsCount"' /tmp/w.out && ok "/insights has workoutsCount" || bad "/insights missing workoutsCount"

# /dashboard/user-001
status=$(curl -s -o /tmp/w.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/dashboard/user-001")
[ "$status" = "200" ] && ok "/dashboard 200" || bad "/dashboard returned $status"
grep -q '"netCalories"' /tmp/w.out && ok "/dashboard has netCalories" || bad "/dashboard missing netCalories"

# /api/readiness
status=$(curl -s -o /tmp/w.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/w.out && ok "/api/readiness ready" || bad "/api/readiness not ready"

echo ""
echo "genie-wellness-agent smoke: ${pass} passed, ${fail} failed"
[ "$fail" = "0" ] && exit 0 || exit 1