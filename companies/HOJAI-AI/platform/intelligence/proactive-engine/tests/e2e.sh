#!/usr/bin/env bash
set -euo pipefail
PORT="${PROACTIVE_ENGINE_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export PROACTIVE_ENGINE_REQUIRE_AUTH=false
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
assert "POST rule (no name -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/proactive/rule -H 'Content-Type: application/json' -d '{"action":{"type":"msg"}}')" "400"
assert "POST rule (no action -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/proactive/rule -H 'Content-Type: application/json' -d '{"name":"x"}')" "400"
assert "POST rule (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/proactive/rule -H 'Content-Type: application/json' -d '{"name":"welcome","action":{"type":"greet","text":"hi"}}')" "201"
assert "GET rules" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/proactive/rules)" "200"
assert "GET rule/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/proactive/rules/zzz)" "404"
assert "DELETE rule/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://localhost:$PORT/api/proactive/rules/zzz)" "404"
assert "POST suggest (no userId -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/proactive/suggest -H 'Content-Type: application/json' -d '{}')" "400"
assert "POST suggest (ok)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/proactive/suggest -H 'Content-Type: application/json' -d '{"userId":"u1"}')" "200"
assert "GET audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/proactive/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL