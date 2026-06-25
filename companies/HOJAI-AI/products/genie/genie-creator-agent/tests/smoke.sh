#!/usr/bin/env bash
# genie-creator-agent smoke test
set -uo pipefail

PORT="${PORT:-4743}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-creator-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-creator-tests}"
export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'user-001',businessId:'C',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# /health
status=$(curl -s -o /tmp/c.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q 'Genie Creator Agent' /tmp/c.out && ok "/health service" || bad "/health missing"

# /templates (6 seeded)
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/templates")
[ "$status" = "200" ] && ok "/templates 200" || bad "/templates returned $status"
grep -q 'tpl-blog' /tmp/c.out && ok "/templates has tpl-blog" || bad "/templates missing tpl-blog"
grep -q 'tpl-twitter' /tmp/c.out && ok "/templates has tpl-twitter" || bad "/templates missing tpl-twitter"
grep -q 'tpl-newsletter' /tmp/c.out && ok "/templates has tpl-newsletter" || bad "/templates missing tpl-newsletter"

# /templates/tpl-blog detail
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/templates/tpl-blog")
[ "$status" = "200" ] && ok "/templates/tpl-blog 200" || bad "/templates/tpl-blog returned $status"
grep -q 'Hook' /tmp/c.out && ok "/templates/tpl-blog has Hook" || bad "/templates/tpl-blog missing Hook"

# /drafts/by-user/user-001 (4 seeded)
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/drafts/by-user/user-001")
[ "$status" = "200" ] && ok "/drafts 200" || bad "/drafts returned $status"
grep -q 'dr-1' /tmp/c.out && ok "/drafts has dr-1" || bad "/drafts missing dr-1"
grep -q 'dr-4' /tmp/c.out && ok "/drafts has dr-4" || bad "/drafts missing dr-4"

# /drafts/dr-1 detail
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/drafts/dr-1")
[ "$status" = "200" ] && ok "/drafts/dr-1 200" || bad "/drafts/dr-1 returned $status"
grep -q 'founders' /tmp/c.out && ok "/drafts/dr-1 has founders" || bad "/drafts/dr-1 missing founders"

# POST new draft
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d '{"title":"Smoke test draft","body":"Some test content here","templateId":"tpl-blog"}' \
  "$BASE/drafts/by-user/user-001")
[ "$status" = "201" ] && ok "POST /drafts 201" || bad "POST /drafts returned $status"

# PATCH draft
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -X PATCH -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d '{"status":"in-review"}' \
  "$BASE/drafts/dr-1")
[ "$status" = "200" ] && ok "PATCH /drafts 200" || bad "PATCH /drafts returned $status"
grep -q '"in-review"' /tmp/c.out && ok "PATCH status in-review" || bad "PATCH status wrong"

# POST publish
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" \
  "$BASE/drafts/dr-2/publish")
[ "$status" = "200" ] && ok "POST /publish 200" || bad "POST /publish returned $status"
grep -q '"published"' /tmp/c.out && ok "publish sets status" || bad "publish status wrong"

# /calendar/by-user/user-001 (3 seeded)
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/calendar/by-user/user-001")
[ "$status" = "200" ] && ok "/calendar 200" || bad "/calendar returned $status"
grep -q 'cal-1' /tmp/c.out && ok "/calendar has cal-1" || bad "/calendar missing cal-1"

# POST calendar
FUTURE=$(date -u -v+7d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '+7 days' +%Y-%m-%dT%H:%M:%SZ)
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d "{\"title\":\"Smoke schedule\",\"channel\":\"blog\",\"date\":\"$FUTURE\"}" \
  "$BASE/calendar/by-user/user-001")
[ "$status" = "201" ] && ok "POST /calendar 201" || bad "POST /calendar returned $status"

# /stats/user-001
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/stats/user-001")
[ "$status" = "200" ] && ok "/stats 200" || bad "/stats returned $status"
grep -q '"byStatus"' /tmp/c.out && ok "/stats has byStatus" || bad "/stats missing byStatus"
grep -q '"byChannel"' /tmp/c.out && ok "/stats has byChannel" || bad "/stats missing byChannel"
grep -q '"totalWords"' /tmp/c.out && ok "/stats has totalWords" || bad "/stats missing totalWords"

# /api/readiness
status=$(curl -s -o /tmp/c.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/c.out && ok "/api/readiness ready" || bad "/api/readiness not ready"

echo ""
echo "genie-creator-agent smoke: ${pass} passed, ${fail} failed"
[ "$fail" = "0" ] && exit 0 || exit 1
