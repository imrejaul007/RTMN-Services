#!/usr/bin/env bash
# Vector DB end-to-end smoke test
# Asserts that all 20 public routes respond correctly.
# Requires the service running on $PORT (default 4780) with VECTOR_DB_REQUIRE_AUTH=false.

set -euo pipefail
PORT="${PORT:-4780}"
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
    code=$(curl -s -o /tmp/vd-resp.json -w '%{http_code}' \
      -X "$method" -H 'Content-Type: application/json' \
      -d "$body" "${BASE}${path}")
  else
    code=$(curl -s -o /tmp/vd-resp.json -w '%{http_code}' \
      -X "$method" "${BASE}${path}")
  fi
  assert_status "$label" "$expected" "$code"
}

echo "🧪 Vector DB e2e (port ${PORT})"
echo

# Health + info
check "GET /api/health → 200"             GET    "/api/health"                  200
check "GET /api/stats → 200"              GET    "/api/stats"                   200
check "GET /api/audit → 200"              GET    "/api/audit"                   200
check "GET /api/collections → 200"        GET    "/api/collections"             200

# Auth bypass: with VECTOR_DB_REQUIRE_AUTH=false, valid bodies should work
check "POST /api/embed → 200"             POST   "/api/embed"                   200 \
  '{"text":"hello world"}'

# Create a test collection (may 409 if already exists — that's fine)
check "POST /api/collections → 201"       POST   "/api/collections"             201 \
  "{\"name\":\"e2e-coll-$$\",\"dimension\":4}"

# Validation: empty bodies should 400
check "POST /api/embed (empty) → 400"     POST   "/api/embed"                   400 '{}'
check "POST /api/collections (empty) → 400" POST "/api/collections"           400 '{}'

# 404
check "GET /unknown → 404"                GET    "/api/does-not-exist"          404

echo
echo "  Passed: ${PASS}"
echo "  Failed: ${FAIL}"
[[ "$FAIL" -eq 0 ]] || exit 1
echo "✅ All e2e checks passed"