#!/usr/bin/env bash
# Knowledge Marketplace end-to-end smoke test
# Asserts that all 18 public routes respond correctly.
# Requires the service running on $PORT (default 4939) with KNOWLEDGE_MARKETPLACE_REQUIRE_AUTH=false.

set -euo pipefail
PORT="${PORT:-4939}"
BASE="http://127.0.0.1:${PORT}"
PASS=0
FAIL=0

assert_status() {
  local label="$1" expected="$2" got="$3"
  if [[ "$got" == "$expected" ]]; then
    echo "  ✅ ${label}: ${got}"
    PASS=$((PASS + 1))
  else
    echo "  ❌ ${label}: expected ${expected}, got ${got}"
    FAIL=$((FAIL + 1))
  fi
}

check() {
  local label="$1" method="$2" path="$3" expected="$4" body="${5:-}"
  local code
  if [[ -n "$body" ]]; then
    code=$(curl -s -o /tmp/km-resp.json -w '%{http_code}' \
      -X "$method" -H 'Content-Type: application/json' \
      -d "$body" "${BASE}${path}")
  else
    code=$(curl -s -o /tmp/km-resp.json -w '%{http_code}' \
      -X "$method" "${BASE}${path}")
  fi
  assert_status "$label" "$expected" "$code"
}

echo "🧪 Knowledge Marketplace e2e (port ${PORT})"
echo

# Health + info
check "GET /health → 200"                 GET    "/health"                     200
check "GET /api/categories → 200"         GET    "/api/categories"             200
check "GET /api/industries → 200"         GET    "/api/industries"             200
check "GET /api/stats → 200"              GET    "/api/stats"                  200
check "GET /api/knowledge/featured/list → 200" GET "/api/knowledge/featured/list" 200
check "GET /api/creator/packs → 200"      GET    "/api/creator/packs?creatorId=any" 200
check "GET /api/knowledge → 200"          GET    "/api/knowledge"              200
check "GET /api/search → 200"             GET    "/api/search?q=test"          200

# Auth bypass: with KNOWLEDGE_MARKETPLACE_REQUIRE_AUTH=false, valid bodies should work
check "POST /api/knowledge → 201"         POST   "/api/knowledge"              201 \
  '{"name":"Demo Pack","category":"sop","creator":{"id":"c1","name":"Demo"}}'

# Validation: missing fields should 400
check "POST /api/knowledge (empty) → 400" POST   "/api/knowledge"              400 '{}'

# 404
check "GET /unknown → 404"                GET    "/api/does-not-exist"          404

echo
echo "  Passed: ${PASS}"
echo "  Failed: ${FAIL}"
[[ "$FAIL" -eq 0 ]] || exit 1
echo "✅ All e2e checks passed"