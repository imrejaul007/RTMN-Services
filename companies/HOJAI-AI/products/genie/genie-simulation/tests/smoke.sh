#!/usr/bin/env bash
# genie-simulation smoke test — hits a running instance on $PORT (default 4732).
# Returns non-zero on any failure.
set -uo pipefail

PORT="${PORT:-4732}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-sim-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-simulation-tests}"

export JWT_SECRET

# Mint a Bearer token (CJS path)
TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'S-USER-1',businessId:'S-BIZ',industry:'test',role:'owner'}))")

pass=0
fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# --- /health ---
status=$(curl -s -o /tmp/sim.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q '"service":"Genie Personal Simulation"' /tmp/sim.out && ok "/health service name" || bad "/health missing service name"

# --- /templates/list ---
status=$(curl -s -o /tmp/sim.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/templates/list")
[ "$status" = "200" ] && ok "/templates/list 200" || bad "/templates/list returned $status"
total=$(grep -o '"total":[0-9]*' /tmp/sim.out | head -1 | cut -d: -f2)
[ "$total" = "7" ] && ok "/templates/list total=7" || bad "/templates/list total=$total (want 7)"

# --- /templates/list?category=career ---
status=$(curl -s -o /tmp/sim.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/templates/list?category=career")
[ "$status" = "200" ] && ok "/templates/list?category=career 200" || bad "/templates/list?category=career returned $status"
career=$(grep -o '"total":[0-9]*' /tmp/sim.out | head -1 | cut -d: -f2)
[ "$career" = "3" ] && ok "/templates/list?category=career total=3" || bad "/templates/list?category=career total=$career"

# --- /scenarios/run ---
status=$(curl -s -o /tmp/sim.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  "$BASE/scenarios/run/user-001" -d '{"title":"Moving to Singapore","scenario":"move","variables":{"location":"Singapore","salary":"SGD 200k"}}')
[ "$status" = "201" ] && ok "/scenarios/run 201" || bad "/scenarios/run returned $status"
grep -q '"success":true' /tmp/sim.out && ok "/scenarios/run success=true" || bad "/scenarios/run success=false"
grep -q '"pros"' /tmp/sim.out && ok "/scenarios/run has pros" || bad "/scenarios/run missing pros"
grep -q '"recommendation"' /tmp/sim.out && ok "/scenarios/run has recommendation" || bad "/scenarios/run missing recommendation"

# --- /scenarios/list ---
status=$(curl -s -o /tmp/sim.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/scenarios/list/user-001")
[ "$status" = "200" ] && ok "/scenarios/list 200" || bad "/scenarios/list returned $status"
grep -q '"total":' /tmp/sim.out && ok "/scenarios/list has total" || bad "/scenarios/list missing total"

# --- /scenarios/get/sim-1 ---
status=$(curl -s -o /tmp/sim.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/scenarios/get/sim-1")
[ "$status" = "200" ] && ok "/scenarios/get/sim-1 200" || bad "/scenarios/get/sim-1 returned $status"
grep -q '"title":"Moving to Dubai"' /tmp/sim.out && ok "/scenarios/get/sim-1 has seeded title" || bad "/scenarios/get/sim-1 missing title"

# --- /api/readiness ---
status=$(curl -s -o /tmp/sim.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/sim.out && ok "/api/readiness ready=true" || bad "/api/readiness ready=false"

echo
echo "genie-simulation smoke: $pass passed, $fail failed"
[ "$fail" = "0" ]
