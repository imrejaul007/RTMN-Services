#!/usr/bin/env bash
# reasoning-engine - bash e2e tests
set -euo pipefail

PORT="${REASONING_ENGINE_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export REASONING_ENGINE_REQUIRE_AUTH=false
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
assert() {
  local label="$1"; local actual="$2"; local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS  $label  ($actual)"
    PASS=$((PASS+1))
  else
    echo "FAIL  $label  expected=$expected got=$actual"
    FAIL=$((FAIL+1))
  fi
}

# Health
assert "GET /health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/health)" "200"
assert "GET /api/health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/health)" "200"
assert "GET /ready" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/ready)" "200"

# Reason validation
assert "POST /api/reason (no query -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/reason \
  -H 'Content-Type: application/json' -d '{"strategy":"deductive"}')" "400"
assert "POST /api/reason (bad strategy -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/reason \
  -H 'Content-Type: application/json' -d '{"query":"x","strategy":"galactic"}')" "400"

# Reason happy path
RUN_BODY=$(curl -s -X POST http://localhost:$PORT/api/reason \
  -H 'Content-Type: application/json' -d '{"query":"All men are mortal. Socrates is a man. Therefore Socrates is mortal.","strategy":"deductive"}')
RUN_ID=$(echo "$RUN_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST /api/reason (create -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/reason \
  -H 'Content-Type: application/json' -d '{"query":"Two more points. The third conclusion.","strategy":"abductive"}')" "201"
assert "GET /api/reason (list)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/reason)" "200"
assert "GET /api/reason/:id" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/reason/$RUN_ID)" "200"
assert "GET /api/reason/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/reason/zzz)" "404"
assert "GET /api/reason/templates" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/reason/templates)" "200"
assert "GET /api/reason/audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/reason/audit)" "200"
assert "DELETE /api/reason/:id" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://localhost:$PORT/api/reason/$RUN_ID)" "200"
assert "DELETE /api/reason/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://localhost:$PORT/api/reason/zzz)" "404"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL