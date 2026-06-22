#!/bin/bash
# Phase 5 Smoke Test - Tests lifecycle, merge, archive across all 14 data twins
# Usage: ./scripts/phase5-smoke-test.sh

set -e
TWIN_ROOT="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins"
TOKEN=$(node -e "
const jwt = require('$TWIN_ROOT/twinos-shared/node_modules/jsonwebtoken');
console.log(jwt.sign(
  { sub: 'admin', role: 'admin', businessId: 'b1', type: 'access' },
  'dev_jwt_secret_change_in_production_minimum_64_characters_required_for_security',
  { issuer: 'rtmn-corpid', expiresIn: '1h' }
));")

TWINS=(
  "organization-twin:4710:organization"
  "product-twin:4720:product"
  "employee-twin:4730:employee"
  "voice-twin:4876:voice"
  "order-twin:4885:order"
  "payment-twin:4886:payment"
  "inventory-twin:4887:inventory"
  "merchant-twin:4888:merchant"
  "user-twin:4889:user"
  "asset-twin:4890:asset"
  "partner-twin:4892:partner"
  "lead-twin:4894:lead"
  "customer-twin:4895:customer"
  "wallet-twin:4896:wallet"
)

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         RTMN TwinOS Phase 5 Smoke Test                    ║"
echo "║         14 twins × 5 endpoints = 70 probes                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

pass=0
fail=0
total=0

for entry in "${TWINS[@]}"; do
  IFS=':' read -r name port twin_type <<< "$entry"
  total=$((total+5))

  # /health (liveness)
  h_code=$(curl -s -o /dev/null -w "%{http_code}" -m 3 "http://localhost:$port/health")

  # /ready (readiness)
  r_code=$(curl -s -o /dev/null -w "%{http_code}" -m 3 "http://localhost:$port/ready")

  # /api/twins/:id/lifecycle (with non-existent ID — should return TWIN_NOT_FOUND 404 not route 404)
  lc_resp=$(curl -s -m 3 "http://localhost:$port/api/twins/probe-id-$$/lifecycle" -H "Authorization: Bearer $TOKEN")
  if echo "$lc_resp" | grep -q '"code":"TWIN_NOT_FOUND"'; then
    lc_code="ROUTE_OK"
  elif echo "$lc_resp" | grep -q '"code":"NOT_FOUND".*"Route'; then
    lc_code="ROUTE_MISSING"
  else
    lc_code="OTHER"
  fi

  # /api/twins/merge (with empty body — should return VALIDATION_ERROR 400 not route 404)
  m_resp=$(curl -s -m 3 -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' "http://localhost:$port/api/twins/merge")
  if echo "$m_resp" | grep -q '"code":"VALIDATION_ERROR"'; then
    m_code="ROUTE_OK"
  elif echo "$m_resp" | grep -q '"code":"NOT_FOUND".*"Route'; then
    m_code="ROUTE_MISSING"
  else
    m_code="OTHER"
  fi

  # /api/twins/:id/lifecycle/archive (with non-existent ID — should return TWIN_NOT_FOUND 404)
  a_resp=$(curl -s -m 3 -X POST "http://localhost:$port/api/twins/probe-id-$$/lifecycle/archive" -H "Authorization: Bearer $TOKEN")
  if echo "$a_resp" | grep -q '"code":"TWIN_NOT_FOUND"'; then
    a_code="ROUTE_OK"
  elif echo "$a_resp" | grep -q '"code":"NOT_FOUND".*"Route'; then
    a_code="ROUTE_MISSING"
  else
    a_code="OTHER"
  fi

  # Count successes (5 endpoints per twin)
  twin_pass=0
  [ "$h_code" = "200" ] && twin_pass=$((twin_pass+1))
  [ "$r_code" = "200" ] && twin_pass=$((twin_pass+1))
  [ "$lc_code" = "ROUTE_OK" ] && twin_pass=$((twin_pass+1))
  [ "$m_code" = "ROUTE_OK" ] && twin_pass=$((twin_pass+1))
  [ "$a_code" = "ROUTE_OK" ] && twin_pass=$((twin_pass+1))

  pass=$((pass+twin_pass))

  if [ "$twin_pass" -eq 5 ]; then
    printf "  ✓ %-20s port %s   health=%s ready=%s lifecycle=%s merge=%s archive=%s\n" "$name" "$port" "$h_code" "$r_code" "$lc_code" "$m_code" "$a_code"
  else
    printf "  ✗ %-20s port %s   health=%s ready=%s lifecycle=%s merge=%s archive=%s  [%d/5]\n" "$name" "$port" "$h_code" "$r_code" "$lc_code" "$m_code" "$a_code" "$twin_pass"
  fi
done

fail=$((total - pass))

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  RESULT: $pass / $total passed, $fail failed"
echo "════════════════════════════════════════════════════════════"
exit $fail