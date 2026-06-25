#!/usr/bin/env bash
# genie-learner smoke test
set -uo pipefail

PORT="${PORT:-4742}"
BASE="http://127.0.0.1:${PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-learner-test-token}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-learner-tests}"
export JWT_SECRET

TOKEN=$(node -e "const {createToken}=require('@rtmn/shared/auth');process.stdout.write(createToken({userId:'user-001',businessId:'L',industry:'test',role:'owner'}))")

pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; fail=$((fail+1)); }

H_AUTH="Authorization: Bearer ${TOKEN}"
H_INT="x-internal-token: ${INTERNAL_TOKEN}"

# /health
status=$(curl -s -o /tmp/l.out -w '%{http_code}' "$BASE/health")
[ "$status" = "200" ] && ok "/health 200" || bad "/health returned $status"
grep -q 'Genie Learner Agent' /tmp/l.out && ok "/health service" || bad "/health missing"

# /paths (3 seeded)
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/paths")
[ "$status" = "200" ] && ok "/paths 200" || bad "/paths returned $status"
grep -q 'pth-spanish' /tmp/l.out && ok "/paths has pth-spanish" || bad "/paths missing pth-spanish"
grep -q 'pth-pm' /tmp/l.out && ok "/paths has pth-pm" || bad "/paths missing pth-pm"
grep -q 'pth-mind' /tmp/l.out && ok "/paths has pth-mind" || bad "/paths missing pth-mind"

# /paths/pth-spanish detail
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/paths/pth-spanish")
[ "$status" = "200" ] && ok "/paths/pth-spanish 200" || bad "/paths/pth-spanish returned $status"
grep -q '"weeks":4' /tmp/l.out && ok "/paths/pth-spanish weeks=4" || bad "/paths/pth-spanish weeks wrong"
grep -q 'Greetings' /tmp/l.out && ok "/paths/pth-spanish has Greetings" || bad "/paths/pth-spanish missing Greetings"

# /decks/by-user/user-001 (2 seeded)
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/decks/by-user/user-001")
[ "$status" = "200" ] && ok "/decks/by-user 200" || bad "/decks/by-user returned $status"
grep -q 'dk-spanish' /tmp/l.out && ok "/decks/by-user has dk-spanish" || bad "/decks/by-user missing dk-spanish"
grep -q 'dk-pm' /tmp/l.out && ok "/decks/by-user has dk-pm" || bad "/decks/by-user missing dk-pm"

# /decks/dk-spanish (deck + cards)
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/decks/dk-spanish")
[ "$status" = "200" ] && ok "/decks/dk-spanish 200" || bad "/decks/dk-spanish returned $status"
grep -q 'Hola' /tmp/l.out && ok "/decks/dk-spanish has Hola" || bad "/decks/dk-spanish missing Hola"
grep -q 'Gracias' /tmp/l.out && ok "/decks/dk-spanish has Gracias" || bad "/decks/dk-spanish missing Gracias"

# POST new deck
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d '{"title":"Smoke deck","description":"smoke test deck"}' \
  "$BASE/decks/by-user/user-001")
[ "$status" = "201" ] && ok "POST /decks/by-user 201" || bad "POST /decks/by-user returned $status"

# POST new card
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d '{"userId":"user-001","front":"smoke-front","back":"smoke-back"}' \
  "$BASE/decks/dk-spanish/cards")
[ "$status" = "201" ] && ok "POST /cards 201" || bad "POST /cards returned $status"

# /decks/dk-spanish/review?userId=user-001 (due cards)
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/decks/dk-spanish/review?userId=user-001")
[ "$status" = "200" ] && ok "/review due 200" || bad "/review due returned $status"
grep -q '"due":' /tmp/l.out && ok "/review has due" || bad "/review missing due"

# POST review (good rating)
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d '{"userId":"user-001","rating":"good"}' \
  "$BASE/review/cd-1")
[ "$status" = "200" ] && ok "POST /review 200" || bad "POST /review returned $status"
grep -q '"interval":' /tmp/l.out && ok "/review has interval" || bad "/review missing interval"

# POST review (bad rating → 400)
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -X POST -H "$H_AUTH" -H "$H_INT" -H 'content-type: application/json' \
  -d '{"userId":"user-001","rating":"bogus"}' \
  "$BASE/review/cd-1")
[ "$status" = "400" ] && ok "POST /review bogus 400" || bad "POST /review bogus returned $status"

# /users/user-001/streak
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/users/user-001/streak")
[ "$status" = "200" ] && ok "/streak 200" || bad "/streak returned $status"
grep -q '"streakDays"' /tmp/l.out && ok "/streak has streakDays" || bad "/streak missing streakDays"
grep -q '"cardsDue"' /tmp/l.out && ok "/streak has cardsDue" || bad "/streak missing cardsDue"

# /api/readiness
status=$(curl -s -o /tmp/l.out -w '%{http_code}' -H "$H_AUTH" -H "$H_INT" "$BASE/api/readiness")
[ "$status" = "200" ] && ok "/api/readiness 200" || bad "/api/readiness returned $status"
grep -q '"ready":true' /tmp/l.out && ok "/api/readiness ready" || bad "/api/readiness not ready"

echo ""
echo "genie-learner smoke: ${pass} passed, ${fail} failed"
[ "$fail" = "0" ] && exit 0 || exit 1
