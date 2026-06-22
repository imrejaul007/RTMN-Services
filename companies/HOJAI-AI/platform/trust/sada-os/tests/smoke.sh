#!/bin/bash
# Smoke test for SADA OS at HOJAI-AI/platform/trust/sada-os/
# Tests all critical endpoints including the newly-wired trustRouter at /trust/v2
#
# Usage: ./tests/smoke.sh [PORT]
# Default port: 4190

set -e

PORT="${PORT:-4190}"
BASE_URL="${BASE_URL:-http://localhost:$PORT}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-sada-internal-token}"

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

echo "=== SADA OS smoke tests (port $PORT) ==="
echo ""

echo "[1] Health endpoints"
assert_status "GET /health → 200" 200 "$BASE_URL/health"
assert_status "GET /health/live → 200" 200 "$BASE_URL/health/live"
assert_status "GET /health/ready → 200" 200 "$BASE_URL/health/ready"
assert_status "GET / → 200" 200 "$BASE_URL/"

echo ""
echo "[2] Auth gating (should reject missing auth)"
assert_status "POST /trust → 401" 401 \
  -X POST -H "Content-Type: application/json" -d '{}' "$BASE_URL/trust"
assert_status "GET /trust/:id → 401" 401 "$BASE_URL/trust/foo"
assert_status "POST /governance/validate → 401" 401 \
  -X POST -H "Content-Type: application/json" -d '{}' "$BASE_URL/governance/validate"
assert_status "POST /risk/assess → 401" 401 \
  -X POST -H "Content-Type: application/json" -d '{}' "$BASE_URL/risk/assess"

echo ""
echo "[3] Auth gating (should accept valid auth)"
assert_status "POST /trust with internal token → 200" 200 \
  -X POST -H "x-internal-token: $INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"smoke-test","entityType":"HUMAN","initialScore":50}' \
  "$BASE_URL/trust"
assert_status "POST /trust with Bearer → 200" 200 \
  -X POST -H "Authorization: Bearer test-jwt" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"smoke-bearer","entityType":"HUMAN"}' \
  "$BASE_URL/trust"

echo ""
echo "[4] trustRouter at /trust/v2 (newly wired)"
assert_status "GET /trust/v2/leaderboard/all → 200" 200 \
  -H "x-internal-token: $INTERNAL_TOKEN" "$BASE_URL/trust/v2/leaderboard/all"
assert_status "POST /trust/v2 → 200" 200 \
  -X POST -H "x-internal-token: $INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"smoke-v2","entityType":"AGENT"}' \
  "$BASE_URL/trust/v2"

echo ""
echo "[5] Other modules with auth"
assert_status "GET /governance/policies → 200" 200 \
  -H "x-internal-token: $INTERNAL_TOKEN" "$BASE_URL/governance/policies"
assert_status "POST /governance/validate → 200" 200 \
  -X POST -H "x-internal-token: $INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"test","context":{}}' \
  "$BASE_URL/governance/validate"
assert_status "POST /risk/assess → 200" 200 \
  -X POST -H "x-internal-token: $INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"smoke-risk","entityType":"HUMAN","factors":[{"name":"test","contribution":10,"severity":"LOW"}]}' \
  "$BASE_URL/risk/assess"

echo ""
echo "=== All SADA OS smoke tests passed ==="
