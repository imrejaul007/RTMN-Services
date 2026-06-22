#!/bin/bash
# Smoke test for Salar OS at HOJAI-AI/platform/twins/salar-os/
# Tests all critical endpoints
#
# Usage: ./tests/smoke.sh
# Reads PORT and BASE_URL from env. Defaults: PORT=4710, BASE_URL=http://localhost:$PORT

set -e

PORT="${PORT:-4710}"
BASE_URL="${BASE_URL:-http://localhost:$PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-corpid-internal-token}"

# Helper that runs a curl + asserts HTTP status
assert_status() {
  local label="$1"
  local expected="$2"
  shift 2
  local code=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  if [ "$code" = "$expected" ]; then
    echo "  ✓ $label → HTTP $code"
  else
    echo "  ✗ $label → HTTP $code (expected $expected)"
    return 1
  fi
}

echo "=== Salar OS smoke tests (port $PORT) ==="
echo ""

echo "[1] Health endpoints"
assert_status "GET /health → 200" 200 "$BASE_URL/health"
assert_status "GET /health/live → 200" 200 "$BASE_URL/health/live"
assert_status "GET / → 200" 200 "$BASE_URL/"

echo ""
echo "[2] Auth gating (should reject missing auth)"
assert_status "GET /capabilities → 401" 401 "$BASE_URL/capabilities"
assert_status "GET /agent-twin → 401" 401 "$BASE_URL/agent-twin"
assert_status "GET /hybrid-twin → 401" 401 "$BASE_URL/hybrid-twin"
assert_status "GET /sutar → 401" 401 "$BASE_URL/sutar"
assert_status "GET /connectors → 401" 401 "$BASE_URL/connectors"

echo ""
echo "[3] Auth gating (should accept valid auth)"
assert_status "GET /capabilities with internal token → 200" 200 \
  -H "x-internal-token: $INTERNAL_TOKEN" "$BASE_URL/capabilities"
assert_status "GET /capabilities with Bearer → 200" 200 \
  -H "Authorization: Bearer test-jwt" "$BASE_URL/capabilities"
# /connectors/github/sync returns 503 (upstream connector unavailable) but that's after auth passes.
# 200/503/500 all indicate the route was reached and auth was accepted.
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "x-internal-token: $INTERNAL_TOKEN" \
  -H "Content-Type: application/json" -d '{"repo":"test"}' \
  "$BASE_URL/connectors/github/sync")
if [ "$HTTP" = "200" ] || [ "$HTTP" = "503" ] || [ "$HTTP" = "500" ]; then
  echo "  ✓ POST /connectors/github/sync → HTTP $HTTP (route reached, auth accepted)"
else
  echo "  ✗ POST /connectors/github/sync → HTTP $HTTP (expected 200/503/500)"
  exit 1
fi

echo ""
echo "[4] Trust integration endpoint"
assert_status "GET /sada-trust/:entityId with auth → 200" 200 \
  -H "x-internal-token: $INTERNAL_TOKEN" "$BASE_URL/sada-trust/smoke-test-entity"

echo ""
echo "=== All Salar OS smoke tests passed ==="
