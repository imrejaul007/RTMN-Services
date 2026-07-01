#!/usr/bin/env bash
# Integration test for the RTMN Hub — tests Hub → all Phase 0-5 commerce services.
# Prerequisites: services must be built.
# Usage: ./scripts/integration-test.sh [--skip-start]

# Don't use set -e — individual test failures are expected

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RTMN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
HUB_DIR="$SCRIPT_DIR/.."
HUB_PORT=4399

cleanup() {
  lsof -ti :$HUB_PORT 2>/dev/null | xargs kill 2>/dev/null || true
}
trap cleanup EXIT

pass=0; fail=0
ok()  { echo "  ✅ $1"; pass=$((pass+1)); }
fail_() { echo "  ❌ $1"; fail=$((fail+1)); }

echo "═══════════════════════════════════════"
echo "RTMN Hub Integration Tests"
echo "═══════════════════════════════════════"

# Check if Hub is already running
if curl -sf "http://localhost:$HUB_PORT/health" -o /dev/null 2>/dev/null; then
  echo "  Hub already running on :$HUB_PORT — using it"
else
  echo "  Hub not running. Start with: node $HUB_DIR/dist/index.js"
  echo "  (or add service startup logic as needed)"
  exit 1
fi

echo ""
echo "─── Hub Own Endpoints ───"
curl -sf "http://localhost:$HUB_PORT/health" -o /dev/null && ok "/health → 200" || fail_ "/health"
BODY=$(curl -sf "http://localhost:$HUB_PORT/api/services" 2>/dev/null || true)
echo "$BODY" | grep -q '"total"' && ok "/api/services → registry" || fail_ "/api/services"

echo ""
echo "─── Hub → Template Engine (/api/templates) ───"
BODY=$(curl -sf "http://localhost:$HUB_PORT/api/templates" 2>/dev/null)
echo "$BODY" | grep -q '"total":27' && ok "/api/templates → 27 templates" || fail_ "/api/templates"
echo "$BODY" | grep -q '"id":"restaurant"' && ok "/api/templates/restaurant → template" || fail_ "/api/templates/restaurant"
echo "$BODY" | grep -q '"id":"hotel"' && ok "/api/templates/hotel → template" || fail_ "/api/templates/hotel"
CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$HUB_PORT/api/templates/nonexistent-xyz" 2>/dev/null)
[ "$CODE" = "404" ] && ok "/api/templates/nonexistent → 404" || fail_ "/api/templates/nonexistent (got $CODE)"

echo ""
echo "─── Middleware Headers ───"
HEADERS=$(curl -sf -D - "http://localhost:$HUB_PORT/api/services" 2>/dev/null)
echo "$HEADERS" | grep -qi "x-correlation-id" && ok "x-correlation-id header" || fail_ "x-correlation-id header"
echo "$HEADERS" | grep -qi "x-ratelimit" && ok "x-ratelimit headers" || fail_ "x-ratelimit headers"

echo ""
echo "─── Hub → Vendor Pools (/api/pools) ───"
CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$HUB_PORT/api/pools" 2>/dev/null)
[ "$CODE" = "200" ] && ok "/api/pools → HTTP $CODE" || fail_ "/api/pools (got $CODE)"

echo ""
echo "─── Hub → Product Graph (/api/products) ───"
CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$HUB_PORT/api/products" 2>/dev/null)
[ "$CODE" = "200" ] && ok "/api/products → HTTP $CODE" || fail_ "/api/products (got $CODE)"

echo ""
echo "─── Hub → Trade Finance (/api/trade-finance) ───"
# Hub routes through to Trade Finance at port 5810
CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$HUB_PORT/api/health/Trade%20Finance" 2>/dev/null)
[ "$CODE" = "200" ] && ok "/api/health/Trade Finance → HTTP $CODE" || fail_ "/api/health/Trade Finance (got $CODE)"

echo ""
echo "─── Hub → Cross Border (/api/cross-border) ───"
CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$HUB_PORT/api/health/Cross-Border%20Commerce" 2>/dev/null)
[ "$CODE" = "200" ] && ok "/api/health/Cross-Border Commerce → HTTP $CODE" || fail_ "/api/health/Cross-Border Commerce (got $CODE)"

echo ""
echo "─── Hub → Universal Distribution (/api/distribution) ───"
CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$HUB_PORT/api/health/Universal%20Distribution" 2>/dev/null)
[ "$CODE" = "200" ] && ok "/api/health/Universal Distribution → HTTP $CODE" || fail_ "/api/health/Universal Distribution (got $CODE)"

echo ""
echo "─── Hub → Commerce Studio (/api/studio) ───"
CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$HUB_PORT/api/studio" 2>/dev/null)
[ "$CODE" = "200" ] && ok "/api/studio → HTTP $CODE" || fail_ "/api/studio (got $CODE)"

echo ""
echo "═══════════════════════════════════════"
echo "Results: $pass passed, $fail failed"
echo "═══════════════════════════════════════"
[ "$fail" -gt 0 ] && exit 1
