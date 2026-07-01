#!/usr/bin/env bash
# Integration test for the RTMN Hub.
# Starts Hub + Template Engine and tests HTTP flows through the proxy.
# Prerequisites: both services must be already built.
# Usage: ./scripts/integration-test.sh [--skip-start]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RTMN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TE_DIR="$RTMN_ROOT/companies/Nexha/services/template-engine"
HUB_DIR="$SCRIPT_DIR/.."
HUB_PORT=4399
TE_PORT=5670

cleanup() {
  if [ -n "$HUB_PID" ]; then kill "$HUB_PID" 2>/dev/null; fi
  if [ -n "$TE_PID" ]; then kill "$TE_PID" 2>/dev/null; fi
  lsof -ti :$HUB_PORT 2>/dev/null | xargs kill 2>/dev/null
  lsof -ti :$TE_PORT 2>/dev/null | xargs kill 2>/dev/null
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
  echo "  Hub already running"
else
  echo "  Starting Template Engine..."
  node "$TE_DIR/dist/index.js" > /tmp/te.log 2>&1 &
  TE_PID=$!
  sleep 2
  echo "  Starting Hub..."
  node "$HUB_DIR/dist/index.js" > /tmp/hub.log 2>&1 &
  HUB_PID=$!
  sleep 3
  if ! curl -sf "http://localhost:$HUB_PORT/health" -o /dev/null 2>/dev/null; then
    echo "  ❌ Hub failed to start"
    exit 1
  fi
fi

echo ""
echo "─── Hub Endpoints ───"

curl -sf "http://localhost:$HUB_PORT/health" -o /dev/null && ok "/health → 200" || fail_ "/health"

BODY=$(curl -sf "http://localhost:$HUB_PORT/api/services" 2>/dev/null)
echo "$BODY" | grep -q '"total"' && ok "/api/services → registry" || fail_ "/api/services"

echo ""
echo "─── Hub → Template Engine ───"

BODY=$(curl -sf "http://localhost:$HUB_PORT/api/templates" 2>/dev/null)
echo "$BODY" | grep -q '"total":27' && ok "/api/templates → 27 templates" || fail_ "/api/templates"

BODY=$(curl -sf "http://localhost:$HUB_PORT/api/templates/restaurant" 2>/dev/null)
echo "$BODY" | grep -q '"id":"restaurant"' && ok "/api/templates/restaurant → restaurant template" || fail_ "/api/templates/restaurant"

BODY=$(curl -sf "http://localhost:$HUB_PORT/api/templates/hotel" 2>/dev/null)
echo "$BODY" | grep -q '"id":"hotel"' && ok "/api/templates/hotel → hotel template" || fail_ "/api/templates/hotel"

CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$HUB_PORT/api/nonexistent-xyz" 2>/dev/null)
[ "$CODE" = "404" ] && ok "/api/nonexistent-xyz → 404" || fail_ "/api/nonexistent-xyz (got $CODE)"

echo ""
echo "─── Middleware ───"

HEADERS=$(curl -sf -D - "http://localhost:$HUB_PORT/api/services" 2>/dev/null)
echo "$HEADERS" | grep -qi "x-correlation-id" && ok "x-correlation-id header" || fail_ "x-correlation-id header"
echo "$HEADERS" | grep -qi "x-ratelimit" && ok "x-ratelimit headers" || fail_ "x-ratelimit headers"

echo ""
echo "═══════════════════════════════════════"
echo "Results: $pass passed, $fail failed"
echo "═══════════════════════════════════════"
[ "$fail" -gt 0 ] && exit 1
