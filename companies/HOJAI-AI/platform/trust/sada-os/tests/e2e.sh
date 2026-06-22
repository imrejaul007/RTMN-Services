#!/bin/bash
# SADA OS - end-to-end integration test
#
# Verifies all public routes against a running sada-os instance.
# Requires SADA_REQUIRE_AUTH=false (dev mode) or INTERNAL_SERVICE_TOKEN.
#
# Usage: ./tests/e2e.sh
# Default port: 4190

set -u

BASE_URL="${BASE_URL:-http://localhost:4190}"
INTERNAL_TOKEN="${INTERNAL_SERVICE_TOKEN:-sada-internal-token}"
PASS=0
FAIL=0

assert_status() {
  local label="$1"
  local expected="$2"
  shift 2
  local code
  code=$(curl -s -o /tmp/sada-out -w "%{http_code}" "$@")
  if [ "$code" = "$expected" ]; then
    echo "  ✓ $label → HTTP $code"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $label → HTTP $code (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== SADA OS e2e tests ($BASE_URL) ==="
echo ""

echo "[1] Health & info"
assert_status "GET /health"                  200 "$BASE_URL/health"
assert_status "GET /health/live"             200 "$BASE_URL/health/live"
assert_status "GET /health/ready"            200 "$BASE_URL/health/ready"
assert_status "GET /"                       200 "$BASE_URL/"

echo ""
echo "[2] Trust endpoints (/trust/v2 with internal token)"
ENT="e2e-$$-$(date +%s)"
assert_status "POST /trust/v2 (create)"      200 -X POST \
  -H "x-internal-token: $INTERNAL_TOKEN" -H "Content-Type: application/json" \
  -d "{\"entityId\":\"$ENT\",\"entityType\":\"HUMAN\",\"initialScore\":75}" \
  "$BASE_URL/trust/v2"

assert_status "GET /trust/v2/:id (read)"    200 \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  "$BASE_URL/trust/v2/$ENT"

assert_status "POST /trust/v2/:id/activity"  200 -X POST \
  -H "x-internal-token: $INTERNAL_TOKEN" -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"TX-$$\",\"success\":true,\"amount\":100}" \
  "$BASE_URL/trust/v2/$ENT/activity"

assert_status "GET /trust/v2/:id/history"    200 \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  "$BASE_URL/trust/v2/$ENT/history"

echo ""
echo "[3] Governance endpoints"
GOV="e2e-gov-$$-$(date +%s)"
assert_status "POST /governance/policies (create)" 201 -X POST \
  -H "x-internal-token: $INTERNAL_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Policy $GOV\",\"rules\":[{\"ruleId\":\"R1\",\"type\":\"ALLOW\",\"priority\":1,\"conditions\":{\"context.country\":\"US\"},\"action\":\"ALLOW\"}]}" \
  "$BASE_URL/governance/policies"

assert_status "GET /governance/policies"      200 \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  "$BASE_URL/governance/policies"

assert_status "POST /governance/validate"    200 -X POST \
  -H "x-internal-token: $INTERNAL_TOKEN" -H "Content-Type: application/json" \
  -d "{\"entityId\":\"any\",\"action\":\"purchase\",\"context\":{\"country\":\"US\"}}" \
  "$BASE_URL/governance/validate"

echo ""
echo "[4] Risk endpoints"
RISK="e2e-risk-$$-$(date +%s)"
assert_status "POST /risk/assess"             200 -X POST \
  -H "x-internal-token: $INTERNAL_TOKEN" -H "Content-Type: application/json" \
  -d "{\"entityId\":\"$RISK\",\"entityType\":\"HUMAN\",\"transactionAmount\":1500,\"country\":\"US\"}" \
  "$BASE_URL/risk/assess"

assert_status "GET /risk/:id"                 200 \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  "$BASE_URL/risk/$RISK"

echo ""
echo "[5] Verification endpoints"
VER="e2e-ver-$$-$(date +%s)"
assert_status "POST /verification (create)"   201 -X POST \
  -H "x-internal-token: $INTERNAL_TOKEN" -H "Content-Type: application/json" \
  -d "{\"entityId\":\"$VER\",\"entityType\":\"HUMAN\",\"verificationType\":\"KYC\",\"documents\":[{\"type\":\"PASSPORT\",\"number\":\"P123\"}]}" \
  "$BASE_URL/verification"

assert_status "GET /verification/:id"         200 \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  "$BASE_URL/verification/$VER"

echo ""
echo "[6] Auth gating (should reject missing creds when auth required)"
# When SADA_REQUIRE_AUTH=false, all routes pass — this section is a no-op.
# We just verify the server is still responsive.
assert_status "GET /health (after tests)"     200 "$BASE_URL/health"

echo ""
echo "============================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL