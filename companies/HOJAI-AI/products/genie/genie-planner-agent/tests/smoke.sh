#!/usr/bin/env bash
# genie-planner-agent smoke test
set -uo pipefail

PORT="${PORT:-4744}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-planner-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-planner-tests}"
export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'user-001',businessId:'P',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# /health
status=$(curl -s -o /tmp/p.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q 'Genie Planner Agent' /tmp/p.out && ok "/health service" || bad "/health missing"

# /todos/by-user/user-001 (6 seeded)
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/todos/by-user/user-001")
[ "$status" = "200" ] && ok "/todos 200" || bad "/todos returned $status"
grep -q 'td-1' /tmp/p.out && ok "/todos has td-1" || bad "/todos missing td-1"
grep -q '"high"' /tmp/p.out && ok "/todos has high priority" || bad "/todos missing high priority"

# /todos?status=pending
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/todos/by-user/user-001?status=pending")
[ "$status" = "200" ] && ok "/todos?status=pending 200" || bad "/todos?status=pending returned $status"

# POST new todo
TODAY=$(date -u +%Y-%m-%d)
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d "{\"title\":\"Smoke todo\",\"priority\":\"high\",\"due\":\"$TODAY\"}" \
  "$BASE/todos/by-user/user-001")
[ "$status" = "201" ] && ok "POST /todos 201" || bad "POST /todos returned $status"

# PATCH todo
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -X PATCH -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d '{"priority":"low"}' \
  "$BASE/todos/td-1")
[ "$status" = "200" ] && ok "PATCH /todos 200" || bad "PATCH /todos returned $status"

# POST complete
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" \
  "$BASE/todos/td-2/complete")
[ "$status" = "200" ] && ok "POST /todos/:id/complete 200" || bad "POST complete returned $status"
grep -q '"completed"' /tmp/p.out && ok "complete sets status" || bad "complete status wrong"

# /habits/by-user/user-001 (4 seeded)
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/habits/by-user/user-001")
[ "$status" = "200" ] && ok "/habits 200" || bad "/habits returned $status"
grep -q 'hb-1' /tmp/p.out && ok "/habits has hb-1" || bad "/habits missing hb-1"
grep -q 'currentStreak' /tmp/p.out && ok "/habits has currentStreak" || bad "/habits missing currentStreak"

# POST new habit
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d '{"title":"Smoke habit","icon":"🔥"}' \
  "$BASE/habits/by-user/user-001")
[ "$status" = "201" ] && ok "POST /habits 201" || bad "POST /habits returned $status"

# POST log habit (200 = already logged today, 201 = new log)
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" \
  "$BASE/habits/hb-3/log")
[ "$status" = "200" ] || [ "$status" = "201" ] && ok "POST /habits/:id/log $status" || bad "POST log returned $status"

# /blocks/by-user/user-001?date=today (4 seeded)
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/blocks/by-user/user-001?date=$TODAY")
[ "$status" = "200" ] && ok "/blocks 200" || bad "/blocks returned $status"
grep -q 'bk-1' /tmp/p.out && ok "/blocks has bk-1" || bad "/blocks missing bk-1"
grep -q 'Deep work' /tmp/p.out && ok "/blocks has Deep work" || bad "/blocks missing Deep work"

# POST new block
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d "{\"title\":\"Smoke block\",\"start\":\"${TODAY}T20:00:00.000Z\",\"end\":\"${TODAY}T21:00:00.000Z\",\"type\":\"focus\"}" \
  "$BASE/blocks/by-user/user-001")
[ "$status" = "201" ] && ok "POST /blocks 201" || bad "POST /blocks returned $status"

# /today/user-001 (snapshot)
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/today/user-001")
[ "$status" = "200" ] && ok "/today 200" || bad "/today returned $status"
grep -q '"todos"' /tmp/p.out && ok "/today has todos" || bad "/today missing todos"
grep -q '"habits"' /tmp/p.out && ok "/today has habits" || bad "/today missing habits"
grep -q '"blocks"' /tmp/p.out && ok "/today has blocks" || bad "/today missing blocks"

# /stats/user-001
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/stats/user-001")
[ "$status" = "200" ] && ok "/stats 200" || bad "/stats returned $status"
grep -q '"todosByStatus"' /tmp/p.out && ok "/stats has todosByStatus" || bad "/stats missing todosByStatus"
grep -q '"habitCompletion7d"' /tmp/p.out && ok "/stats has habitCompletion7d" || bad "/stats missing habitCompletion7d"

# /api/readiness
status=$(curl -s -o /tmp/p.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/p.out && ok "/api/readiness ready" || bad "/api/readiness not ready"

echo ""
echo "genie-planner-agent smoke: ${pass} passed, ${fail} failed"
[ "$fail" = "0" ] && exit 0 || exit 1
