#!/usr/bin/env bash
set -euo pipefail
PORT="${INTENT_ENGINE_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export INTENT_ENGINE_REQUIRE_AUTH=false
unset NODE_ENV
cd "$(dirname "$0")/.."
node src/index.js &
PID=$!
trap "kill $PID 2>/dev/null || true" EXIT
for i in {1..30}; do
  if curl -fsS "http://localhost:$PORT/api/health" > /dev/null 2>&1; then break; fi
  sleep 0.5
done
PASS=0; FAIL=0
assert() { if [[ "$2" == "$3" ]]; then echo "PASS  $1  ($2)"; PASS=$((PASS+1)); else echo "FAIL  $1  expected=$3 got=$2"; FAIL=$((FAIL+1)); fi; }

assert "GET /health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/health)" "200"
assert "GET /api/health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/health)" "200"
assert "GET /ready" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/ready)" "200"
assert "POST /api/intent (no text -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/intent -H 'Content-Type: application/json' -d '{}')" "400"
assert "POST /api/intent (buy -> 200)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/intent -H 'Content-Type: application/json' -d '{"text":"I want to buy a book"}')" "200"
assert "POST /api/intent (cancel -> 200)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/intent -H 'Content-Type: application/json' -d '{"text":"cancel subscription"}')" "200"
assert "POST /api/intent/batch (no texts -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/intent/batch -H 'Content-Type: application/json' -d '{}')" "400"
assert "POST /api/intent/batch (ok -> 200)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/intent/batch -H 'Content-Type: application/json' -d '{"texts":["hi","buy a phone"]}')" "200"
assert "GET /api/intent/catalog" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/intent/catalog)" "200"
assert "GET /api/intent/audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/intent/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL