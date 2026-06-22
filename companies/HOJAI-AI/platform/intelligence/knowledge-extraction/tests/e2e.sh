#!/usr/bin/env bash
# Knowledge Extraction end-to-end smoke test
# Asserts that all 17 public routes respond correctly.
# Requires the service running on $PORT (default 4784) with KNOWLEDGE_EXTRACTION_REQUIRE_AUTH=false.

set -euo pipefail
PORT="${PORT:-4784}"
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
    code=$(curl -s -o /tmp/ke-resp.json -w '%{http_code}' \
      -X "$method" -H 'Content-Type: application/json' \
      -d "$body" "${BASE}${path}")
  else
    code=$(curl -s -o /tmp/ke-resp.json -w '%{http_code}' \
      -X "$method" "${BASE}${path}")
  fi
  assert_status "$label" "$expected" "$code"
}

echo "🧪 Knowledge Extraction e2e (port ${PORT})"
echo

# Health + info
check "GET /api/health → 200"             GET    "/api/health"                  200
check "GET /api/stats → 200"              GET    "/api/stats"                   200
check "GET /api/ner/types → 200"          GET    "/api/ner/types"               200
check "GET /api/kb/stats → 200"           GET    "/api/kb/stats"                200
check "GET /api/kb/entities → 200"        GET    "/api/kb/entities"             200

# Catalog
check "GET /api/catalog/tech → 200"       GET    "/api/catalog/tech"            200
check "GET /api/catalog/persons → 200"    GET    "/api/catalog/persons"         200
check "GET /api/catalog/orgs → 200"       GET    "/api/catalog/orgs"            200
check "GET /api/catalog/locations → 200"  GET    "/api/catalog/locations"       200

# Auth bypass: with KNOWLEDGE_EXTRACTION_REQUIRE_AUTH=false, valid bodies should work
check "POST /api/ner/extract → 200"       POST   "/api/ner/extract"             200 \
  '{"text":"Albert Einstein worked at Princeton University."}'
check "POST /api/facts/extract → 200"     POST   "/api/facts/extract"           200 \
  '{"text":"Einstein developed relativity."}'
check "POST /api/extract-all → 200"       POST   "/api/extract-all"             200 \
  '{"text":"Steve Jobs co-founded Apple in California."}'
check "POST /api/link → 200"              POST   "/api/link"                    200 \
  '{"entities":[{"text":"Apple","type":"ORG","offset":0,"length":5}]}'

# Validation: empty bodies should 400 (not 401, because bypass is on)
check "POST /api/ner/extract (empty) → 400"     POST "/api/ner/extract"      400 '{}'
check "POST /api/facts/extract (empty) → 400"   POST "/api/facts/extract"    400 '{}'
check "POST /api/extract-all (empty) → 400"     POST "/api/extract-all"      400 '{}'

# 404
check "GET /unknown → 404"                GET    "/api/does-not-exist"          404

echo
echo "  Passed: ${PASS}"
echo "  Failed: ${FAIL}"
[[ "$FAIL" -eq 0 ]] || exit 1
echo "✅ All e2e checks passed"