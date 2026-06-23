#!/usr/bin/env bash
set -euo pipefail
PORT="${BEHAVIOR_INTELLIGENCE_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH=false
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
assert "POST event (no userId -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/behavior/event -H 'Content-Type: application/json' -d '{"event":"click"}')" "400"
assert "POST event (no event -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/behavior/event -H 'Content-Type: application/json' -d '{"userId":"u1"}')" "400"
assert "POST event (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/behavior/event -H 'Content-Type: application/json' -d '{"userId":"u'$RANDOM'","event":"click"}')" "201"
assert "GET /api/behavior/events" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/behavior/events)" "200"
assert "GET /api/behavior/user/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/behavior/user/zzz-missing)" "404"
assert "GET /api/behavior/anomalies" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/behavior/anomalies)" "200"
assert "POST funnel (no steps -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/behavior/funnel -H 'Content-Type: application/json' -d '{}')" "400"
assert "POST funnel (ok)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/behavior/funnel -H 'Content-Type: application/json' -d '{"steps":["click","purchase"]}')" "200"
assert "GET audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/behavior/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL