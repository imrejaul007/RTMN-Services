#!/usr/bin/env bash
# genie-teacher smoke test — hits a running instance on $PORT (default 4739).
set -uo pipefail

PORT="${PORT:-4739}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-teacher-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-teacher-tests}"
export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'user-001',businessId:'T',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# /health
status=$(curl -s -o /tmp/t.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q 'Genie Teacher Agent' /tmp/t.out && ok "/health service" || bad "/health missing"

# /courses
status=$(curl -s -o /tmp/t.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/courses")
[ "$status" = "200" ] && ok "/courses 200" || bad "/courses returned $status"
grep -q 'cr-spanish-101' /tmp/t.out && ok "/courses has Spanish" || bad "/courses missing Spanish"
grep -q 'cr-negotiation' /tmp/t.out && ok "/courses has Negotiation" || bad "/courses missing Negotiation"
grep -q 'cr-python-intro' /tmp/t.out && ok "/courses has Python" || bad "/courses missing Python"

# /courses?category=language
status=$(curl -s -o /tmp/t.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/courses?category=language")
[ "$status" = "200" ] && ok "/courses?category=language 200" || bad "/courses?category=language returned $status"
grep -q '"total":1' /tmp/t.out && ok "/courses?category=language total=1" || bad "/courses?category=language total wrong"

# /courses/cr-spanish-101 (with lessons)
status=$(curl -s -o /tmp/t.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/courses/cr-spanish-101")
[ "$status" = "200" ] && ok "/courses/cr-spanish-101 200" || bad "/courses returned $status"
grep -q '"lessons"' /tmp/t.out && ok "/courses has lessons" || bad "/courses missing lessons"
grep -q 'Greetings & basics' /tmp/t.out && ok "/courses lessons include Greetings" || bad "/courses missing Greetings"

# /lessons/ls-sp-1
status=$(curl -s -o /tmp/t.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/lessons/ls-sp-1")
[ "$status" = "200" ] && ok "/lessons/ls-sp-1 200" || bad "/lessons returned $status"
grep -q '"quiz"' /tmp/t.out && ok "/lessons has quiz" || bad "/lessons missing quiz"

# /courses/cr-python-intro/lessons
status=$(curl -s -o /tmp/t.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/courses/cr-python-intro/lessons")
[ "$status" = "200" ] && ok "/courses/cr-python-intro/lessons 200" || bad "/lessons list returned $status"
grep -q '"lessons"' /tmp/t.out && ok "/lessons list has lessons" || bad "/lessons list missing"

# /users/user-001/learning
status=$(curl -s -o /tmp/t.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/users/user-001/learning")
[ "$status" = "200" ] && ok "/users/user-001/learning 200" || bad "/users learning returned $status"
grep -q '"progressPercent"' /tmp/t.out && ok "/users learning has progressPercent" || bad "/users learning missing progressPercent"

# /courses/cr-spanish-101/enroll/user-001 (idempotent)
status=$(curl -s -o /tmp/t.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" "$BASE/courses/cr-spanish-101/enroll/user-001")
[ "$status" = "200" ] || [ "$status" = "201" ] && ok "/enroll 200/201" || bad "/enroll returned $status"

# /api/readiness
status=$(curl -s -o /tmp/t.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/t.out && ok "/api/readiness ready" || bad "/api/readiness not ready"

echo ""
echo "genie-teacher smoke: ${pass} passed, ${fail} failed"
[ "$fail" = "0" ] && exit 0 || exit 1