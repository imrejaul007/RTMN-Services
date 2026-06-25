#!/usr/bin/env bash
# genie-research smoke test — hits a running instance on $PORT (default 4740).
set -uo pipefail

PORT="${PORT:-4740}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-research-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-research-tests}"
export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'user-001',businessId:'R',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# /health
status=$(curl -s -o /tmp/r.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q 'Genie Research Agent' /tmp/r.out && ok "/health service" || bad "/health missing"

# /sources
status=$(curl -s -o /tmp/r.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/sources")
[ "$status" = "200" ] && ok "/sources 200" || bad "/sources returned $status"
grep -q 'OpenAlex' /tmp/r.out && ok "/sources has OpenAlex" || bad "/sources missing OpenAlex"
grep -q 'PubMed' /tmp/r.out && ok "/sources has PubMed" || bad "/sources missing PubMed"

# POST /research/query
status=$(curl -s -o /tmp/r.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H "content-type: application/json" \
  -d '{"question":"How does meditation affect the brain according to neuroscience research?","topic":"meditation"}' \
  "$BASE/research/query/user-001")
[ "$status" = "201" ] && ok "/research/query 201" || bad "/research/query returned $status"
grep -q '"summary"' /tmp/r.out && ok "/research/query has summary" || bad "/research/query missing summary"
grep -q '"sources"' /tmp/r.out && ok "/research/query has sources" || bad "/research/query missing sources"
grep -q '"sourceDetails"' /tmp/r.out || grep -q '"keyPoints"' /tmp/r.out && ok "/research/query has key points or source details" || bad "/research/query missing key data"

# GET /research/list
status=$(curl -s -o /tmp/r.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/research/list/user-001")
[ "$status" = "200" ] && ok "/research/list 200" || bad "/research/list returned $status"
grep -q 'intermittent fasting' /tmp/r.out && ok "/research/list has seeded research" || bad "/research/list missing seeded"

# GET /research/list?topic=intermittent
status=$(curl -s -o /tmp/r.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/research/list/user-001?topic=intermittent")
[ "$status" = "200" ] && ok "/research/list?topic 200" || bad "/research/list?topic returned $status"

# GET /research/get/rs-1
status=$(curl -s -o /tmp/r.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/research/get/rs-1")
[ "$status" = "200" ] && ok "/research/get/rs-1 200" || bad "/research/get returned $status"
grep -q '"sourceDetails"' /tmp/r.out && ok "/research/get has sourceDetails" || bad "/research/get missing sourceDetails"

# GET /topics
status=$(curl -s -o /tmp/r.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/topics/user-001")
[ "$status" = "200" ] && ok "/topics 200" || bad "/topics returned $status"
grep -q '"topics"' /tmp/r.out && ok "/topics has topics" || bad "/topics missing topics"

# /api/readiness
status=$(curl -s -o /tmp/r.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/r.out && ok "/api/readiness ready" || bad "/api/readiness not ready"

echo ""
echo "genie-research smoke: ${pass} passed, ${fail} failed"
[ "$fail" = "0" ] && exit 0 || exit 1