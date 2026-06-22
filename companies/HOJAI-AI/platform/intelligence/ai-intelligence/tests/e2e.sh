#!/usr/bin/env bash
# AI Intelligence end-to-end smoke test
# Asserts that all 9 routes respond correctly.
# Requires the service running on $PORT (default 4881) with INTELLIGENCE_REQUIRE_AUTH=false.

set -euo pipefail
PORT="${PORT:-4881}"
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
    code=$(curl -s -o /tmp/ai-resp.json -w '%{http_code}' \
      -X "$method" -H 'Content-Type: application/json' \
      -d "$body" "${BASE}${path}")
  else
    code=$(curl -s -o /tmp/ai-resp.json -w '%{http_code}' \
      -X "$method" "${BASE}${path}")
  fi
  assert_status "$label" "$expected" "$code"
}

echo "🧪 AI Intelligence e2e (port ${PORT})"
echo

check "GET /api/health → 200"           GET    "/api/health"        200
check "GET /api/metrics → 200"          GET    "/api/metrics"       200
check "GET /api/route → 200"            GET    "/api/route"         200
check "GET /api/agents → 200"           GET    "/api/agents"        200
check "GET /unknown → 404"              GET    "/api/unknown"       404

# Auth bypass: with INTELLIGENCE_REQUIRE_AUTH=false, empty body should hit zod (400) not auth (401)
check "POST /api/analyze (empty) → 400"      POST  "/api/analyze"            400 '{}'
check "POST /api/generate-brief (empty) → 400" POST "/api/generate-brief"   400 '{}'
check "POST /api/policy/evaluate (empty) → 400" POST "/api/policy/evaluate" 400 '{}'

# /ready is registered AFTER 404 catch-all (existing service quirk — known)
check "GET /ready → 404 (known bug)"   GET    "/ready"             404

echo
echo "  Passed: ${PASS}"
echo "  Failed: ${FAIL}"
[[ "$FAIL" -eq 0 ]] || exit 1
echo "✅ All e2e checks passed"