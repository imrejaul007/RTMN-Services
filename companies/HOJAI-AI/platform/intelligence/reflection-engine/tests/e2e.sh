#!/usr/bin/env bash
set -euo pipefail
PORT="${REFLECTION_ENGINE_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export REFLECTION_ENGINE_REQUIRE_AUTH=false
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
assert "POST /api/reflect (no text -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/reflect -H 'Content-Type: application/json' -d '{}')" "400"
assert "POST /api/reflect (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/reflect -H 'Content-Type: application/json' -d '{"text":"A clear and complete response"}')" "201"
assert "POST /api/reflect (with dims)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/reflect -H 'Content-Type: application/json' -d '{"text":"hi","dimensions":["clarity"]}')" "201"
assert "POST /api/reflect/compare (no items -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/reflect/compare -H 'Content-Type: application/json' -d '{}')" "400"
assert "POST /api/reflect/compare (ok)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/reflect/compare -H 'Content-Type: application/json' -d '{"items":[{"text":"short"},{"text":"A clear complete accurate response"}]}')" "200"
assert "GET /api/reflect/dimensions" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/reflect/dimensions)" "200"
assert "GET /api/reflect" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/reflect)" "200"
assert "GET /api/reflect/audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/reflect/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL