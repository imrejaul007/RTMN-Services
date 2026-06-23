#!/usr/bin/env bash
# rag-platform - bash e2e tests
set -euo pipefail

PORT="${RAG_PLATFORM_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export RAG_PLATFORM_REQUIRE_AUTH=false
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
assert "GET /api/config" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/config)" "200"
assert "POST /api/config" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/config \
  -H 'Content-Type: application/json' -d '{"defaultChunkSize":600}')" "200"
assert "GET /api/documents" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/documents)" "200"
assert "POST /api/documents (missing collection -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/documents \
  -H 'Content-Type: application/json' -d '{"content":"hi"}')" "400"
assert "POST /api/documents (missing content -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/documents \
  -H 'Content-Type: application/json' -d '{"collection":"c1"}')" "400"
assert "POST /api/retrieve (missing collection -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/retrieve \
  -H 'Content-Type: application/json' -d '{"query":"foo"}')" "400"
assert "POST /api/retrieve (missing query -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/retrieve \
  -H 'Content-Type: application/json' -d '{"collection":"c1"}')" "400"
assert "POST /api/rag/query (missing collection -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/rag/query \
  -H 'Content-Type: application/json' -d '{"query":"foo"}')" "400"
assert "GET /api/stats" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/stats)" "200"
assert "GET /api/audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL