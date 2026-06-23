#!/usr/bin/env bash
set -euo pipefail
PORT="${MULTI_AGENT_RUNTIME_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export MULTI_AGENT_RUNTIME_REQUIRE_AUTH=false
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
assert "POST agent (no name -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/agents -H 'Content-Type: application/json' -d '{}')" "400"
AGENT_BODY=$(curl -s -X POST http://localhost:$PORT/api/agents -H 'Content-Type: application/json' -d '{"name":"e2e-agent"}')
AGENT_ID=$(echo "$AGENT_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST agent (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/agents -H 'Content-Type: application/json' -d '{"name":"a2"}')" "201"
assert "GET agents" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/agents)" "200"
assert "GET agent/:id" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/agents/$AGENT_ID)" "200"
assert "GET agent/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/agents/zzz)" "404"
assert "POST assign (no task -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/agents/$AGENT_ID/assign -H 'Content-Type: application/json' -d '{}')" "400"
ASSIGN_BODY=$(curl -s -X POST http://localhost:$PORT/api/agents/$AGENT_ID/assign -H 'Content-Type: application/json' -d '{"task":"process"}')
ASSIGN_ID=$(echo "$ASSIGN_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST assign (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/agents/$AGENT_ID/assign -H 'Content-Type: application/json' -d '{"task":"another"}')" "201"
assert "GET agent/tasks" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/agents/$AGENT_ID/tasks)" "200"
assert "POST complete (bad status -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/assignments/$ASSIGN_ID/complete -H 'Content-Type: application/json' -d '{"status":"galactic"}')" "400"
assert "POST complete (missing -> 404)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/assignments/zzz/complete -H 'Content-Type: application/json' -d '{"result":"x"}')" "404"
assert "POST complete (ok -> 200)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/assignments/$ASSIGN_ID/complete -H 'Content-Type: application/json' -d '{"result":"done"}')" "200"
assert "GET assignments" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/assignments)" "200"
assert "GET runtime/audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/runtime/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL