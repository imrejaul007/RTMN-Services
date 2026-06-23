#!/usr/bin/env bash
# semantic-cache - bash e2e tests
set -euo pipefail

PORT="${SEMANTIC_CACHE_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export SEMANTIC_CACHE_REQUIRE_AUTH=false
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

assert "GET /api/health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/health)" "200"
assert "POST /api/embed" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/embed \
  -H 'Content-Type: application/json' -d '{"text":"hello world"}')" "200"
assert "POST /api/embed/batch" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/embed/batch \
  -H 'Content-Type: application/json' -d '{"texts":["hello","world"]}')" "200"
assert "POST /api/similarity" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/similarity \
  -H 'Content-Type: application/json' -d '{"a":"hello","b":"hi"}')" "200"
PROMPT="e2e-unique-$RANDOM-$$"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/cache \
  -H 'Content-Type: application/json' -d '{"prompt":"'"$PROMPT"'","response":"response","model":"gpt-4"}')
if [[ "$code" == "201" || "$code" == "200" ]]; then
  echo "PASS  POST /api/cache  ($code)"; PASS=$((PASS+1))
else
  echo "FAIL  POST /api/cache  expected=200|201 got=$code"; FAIL=$((FAIL+1))
fi
assert "GET /api/cache" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/cache)" "200"
assert "POST /api/lookup" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/lookup \
  -H 'Content-Type: application/json' -d '{"prompt":"test e2e"}')" "200"
assert "POST /api/lookup/batch" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/lookup/batch \
  -H 'Content-Type: application/json' -d '{"prompts":["test","other"]}')" "200"
assert "GET /api/stats" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/stats)" "200"
assert "GET /api/audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/audit)" "200"
assert "POST /api/cache/clear" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/cache/clear \
  -H 'Content-Type: application/json' -d '{}')" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL