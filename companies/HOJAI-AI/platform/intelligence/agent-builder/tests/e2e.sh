#!/usr/bin/env bash
set -euo pipefail
PORT="${AGENT_BUILDER_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export AGENT_BUILDER_REQUIRE_AUTH=false
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
assert "POST bp (no name -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/blueprints -H 'Content-Type: application/json' -d '{"systemPrompt":"x"}')" "400"
assert "POST bp (no systemPrompt -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/blueprints -H 'Content-Type: application/json' -d '{"name":"x"}')" "400"
BP_BODY=$(curl -s -X POST http://localhost:$PORT/api/blueprints -H 'Content-Type: application/json' -d '{"name":"e2e-bp","systemPrompt":"hi"}')
BP_ID=$(echo "$BP_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST bp (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/blueprints -H 'Content-Type: application/json' -d '{"name":"bp2","systemPrompt":"hello"}')" "201"
assert "GET blueprints" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/blueprints)" "200"
assert "GET bp/:id" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/blueprints/$BP_ID)" "200"
assert "GET bp/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/blueprints/zzz)" "404"
assert "PUT bp/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/blueprints/zzz -H 'Content-Type: application/json' -d '{"name":"x"}')" "404"
assert "PUT bp (ok)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/blueprints/$BP_ID -H 'Content-Type: application/json' -d '{"name":"renamed"}')" "200"
assert "POST instantiate (missing -> 404)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/blueprints/zzz/instantiate -H 'Content-Type: application/json' -d '{}')" "404"
assert "POST instantiate (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/blueprints/$BP_ID/instantiate -H 'Content-Type: application/json' -d '{}')" "201"
assert "GET agents" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/agents)" "200"
assert "DELETE bp/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://localhost:$PORT/api/blueprints/zzz)" "404"
assert "DELETE bp (ok)" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://localhost:$PORT/api/blueprints/$BP_ID)" "200"
assert "GET audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/builder/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL