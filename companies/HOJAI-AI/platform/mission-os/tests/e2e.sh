#!/usr/bin/env bash
set -euo pipefail
PORT="${MISSION_OS_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export MISSION_OS_REQUIRE_AUTH=false
unset NODE_ENV
cd "$(dirname "$0")/.."
node src/index.js &
PID=$!
trap "kill $PID 2>/dev/null || true" EXIT
for i in {1..30}; do if curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1; then break; fi; sleep 0.5; done
PASS=0; FAIL=0
assert() { if [[ "$2" == "$3" ]]; then echo "PASS  $1  ($2)"; PASS=$((PASS+1)); else echo "FAIL  $1  expected=$3 got=$2"; FAIL=$((FAIL+1)); fi; }

assert "GET /health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/health)" "200"
assert "GET /api/health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/health)" "200"
assert "GET /ready" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/ready)" "200"
assert "POST mission (no title -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/missions -H 'Content-Type: application/json' -d '{"goal":"x"}')" "400"
M_BODY=$(curl -s -X POST http://localhost:$PORT/api/missions -H 'Content-Type: application/json' -d '{"title":"e2e mission","goal":"achieve e2e"}')
M_ID=$(echo "$M_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST mission (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/missions -H 'Content-Type: application/json' -d '{"title":"m2","goal":"g2"}')" "201"
assert "GET missions" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/missions)" "200"
assert "GET mission/:id" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/missions/$M_ID)" "200"
assert "GET mission/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/missions/zzz)" "404"
assert "PUT mission/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/missions/zzz -H 'Content-Type: application/json' -d '{"title":"x"}')" "404"
assert "PUT mission (bad status -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/missions/$M_ID -H 'Content-Type: application/json' -d '{"status":"galactic"}')" "400"
assert "PUT mission (ok)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/missions/$M_ID -H 'Content-Type: application/json' -d '{"status":"active"}')" "200"
T_BODY=$(curl -s -X POST http://localhost:$PORT/api/missions/$M_ID/tasks -H 'Content-Type: application/json' -d '{"title":"first task"}')
T_ID=$(echo "$T_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST task (mission missing -> 404)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/missions/zzz/tasks -H 'Content-Type: application/json' -d '{"title":"t"}')" "404"
assert "POST task (no title -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/missions/$M_ID/tasks -H 'Content-Type: application/json' -d '{}')" "400"
assert "POST task (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/missions/$M_ID/tasks -H 'Content-Type: application/json' -d '{"title":"second task"}')" "201"
assert "PUT task/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/missions/$M_ID/tasks/zzz -H 'Content-Type: application/json' -d '{"status":"completed"}')" "404"
assert "PUT task (bad status -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/missions/$M_ID/tasks/$T_ID -H 'Content-Type: application/json' -d '{"status":"galactic"}')" "400"
assert "PUT task (ok)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/missions/$M_ID/tasks/$T_ID -H 'Content-Type: application/json' -d '{"status":"completed"}')" "200"
assert "POST complete (ok)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/missions/$M_ID/complete -H 'Content-Type: application/json' -d '{}')" "200"
assert "GET audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/missions/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL