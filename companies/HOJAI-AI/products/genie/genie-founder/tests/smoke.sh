#!/usr/bin/env bash
# genie-founder smoke test — hits a running instance on $PORT (default 4738).
set -uo pipefail

PORT="${PORT:-4738}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-founder-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-founder-tests}"

export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'user-001',businessId:'F',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# /health
status=$(curl -s -o /tmp/founder.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q '"Genie Founder OS"' /tmp/founder.out && ok "/health service" || bad "/health missing"

# /founder/get/user-001
status=$(curl -s -o /tmp/founder.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/founder/get/user-001")
[ "$status" = "200" ] && ok "/founder/get 200" || bad "/founder/get returned $status"
grep -q '"Acme AI"' /tmp/founder.out && ok "/founder/get company" || bad "/founder/get missing company"

# /founder/dashboard/user-001
status=$(curl -s -o /tmp/founder.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/founder/dashboard/user-001")
[ "$status" = "200" ] && ok "/founder/dashboard 200" || bad "/founder/dashboard returned $status"
grep -q '"kpis"' /tmp/founder.out && ok "/founder/dashboard kpis" || bad "/founder/dashboard missing kpis"
grep -q '"milestones"' /tmp/founder.out && ok "/founder/dashboard milestones" || bad "/founder/dashboard missing milestones"

# /founder/briefing/user-001
status=$(curl -s -o /tmp/founder.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/founder/briefing/user-001?type=weekly")
[ "$status" = "200" ] && ok "/founder/briefing 200" || bad "/founder/briefing returned $status"
grep -q '"next7Days"' /tmp/founder.out && ok "/founder/briefing next7Days" || bad "/founder/briefing missing next7Days"

# /founder/board/user-001
status=$(curl -s -o /tmp/founder.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/founder/board/user-001")
[ "$status" = "200" ] && ok "/founder/board 200" || bad "/founder/board returned $status"
grep -q '"Patricia' /tmp/founder.out && ok "/founder/board VC persona" || bad "/founder/board missing VC persona"
grep -q '"Marco' /tmp/founder.out && ok "/founder/board Operator persona" || bad "/founder/board missing Operator"
grep -q '"Riya' /tmp/founder.out && ok "/founder/board Customer persona" || bad "/founder/board missing Customer"
grep -q '"Eleanor' /tmp/founder.out && ok "/founder/board Mentor persona" || bad "/founder/board missing Mentor"

# /founder/milestones/user-001
status=$(curl -s -o /tmp/founder.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/founder/milestones/user-001")
[ "$status" = "200" ] && ok "/founder/milestones 200" || bad "/founder/milestones returned $status"
grep -q '"Ship MVP"' /tmp/founder.out && ok "/founder/milestones has Ship MVP" || bad "/founder/milestones missing Ship MVP"

# /founder/okrs/user-001
status=$(curl -s -o /tmp/founder.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/founder/okrs/user-001")
[ "$status" = "200" ] && ok "/founder/okrs 200" || bad "/founder/okrs returned $status"
grep -q 'Reach \$10K MRR' /tmp/founder.out && ok "/founder/okrs has seeded OKR" || bad "/founder/okrs missing seeded OKR"

# /founder/team/user-001
status=$(curl -s -o /tmp/founder.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/founder/team/user-001")
[ "$status" = "200" ] && ok "/founder/team 200" || bad "/founder/team returned $status"
grep -q '"Jamie"' /tmp/founder.out && ok "/founder/team has Jamie" || bad "/founder/team missing Jamie"

# /api/readiness
status=$(curl -s -o /tmp/founder.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/founder.out && ok "/api/readiness ready" || bad "/api/readiness not ready"

echo ""
echo "genie-founder smoke: ${pass} passed, ${fail} failed"
[ "$fail" = "0" ] && exit 0 || exit 1