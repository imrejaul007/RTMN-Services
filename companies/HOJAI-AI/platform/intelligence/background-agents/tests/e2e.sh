#!/usr/bin/env bash
set -euo pipefail
PORT="${BACKGROUND_AGENTS_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export BACKGROUND_AGENTS_REQUIRE_AUTH=false
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
assert "POST job (no name -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/jobs -H 'Content-Type: application/json' -d '{}')" "400"
JOB_BODY=$(curl -s -X POST http://localhost:$PORT/api/jobs -H 'Content-Type: application/json' -d '{"name":"e2e-job"}')
JOB_ID=$(echo "$JOB_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST job (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/jobs -H 'Content-Type: application/json' -d '{"name":"j2"}')" "201"
assert "GET jobs" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/jobs)" "200"
assert "GET job/:id" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/jobs/$JOB_ID)" "200"
assert "GET job/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/jobs/zzz)" "404"
assert "POST run (missing -> 404)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/jobs/zzz/run -H 'Content-Type: application/json' -d '{}')" "404"
RUN_BODY=$(curl -s -X POST http://localhost:$PORT/api/jobs/$JOB_ID/run -H 'Content-Type: application/json' -d '{}')
RUN_ID=$(echo "$RUN_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST run (ok -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/jobs/$JOB_ID/run -H 'Content-Type: application/json' -d '{}')" "201"
assert "GET runs" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/runs)" "200"
assert "GET run/:id" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/runs/$RUN_ID)" "200"
assert "GET run/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/runs/zzz)" "404"
assert "POST cancel (missing -> 404)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/jobs/zzz/cancel -H 'Content-Type: application/json' -d '{}')" "404"
CANCEL_BODY=$(curl -s -X POST http://localhost:$PORT/api/jobs -H 'Content-Type: application/json' -d '{"name":"to-cancel"}')
CANCEL_ID=$(echo "$CANCEL_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST cancel (ok)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/jobs/$CANCEL_ID/cancel -H 'Content-Type: application/json' -d '{}')" "200"
assert "POST run cancelled (400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/jobs/$CANCEL_ID/run -H 'Content-Type: application/json' -d '{}')" "400"
assert "GET agents/audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/agents/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL