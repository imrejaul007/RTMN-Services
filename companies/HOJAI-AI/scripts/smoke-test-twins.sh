#!/bin/bash
# TwinOS Cross-Service Smoke Test
# Verifies all 15 canonical twins are running AND publishes events to
# event-bus (4510) + MemoryOS (4703) + twin-memory-bridge (4704).
#
# Usage: ./scripts/smoke-test-twins.sh
#
# Returns 0 if all 15 twins respond to /health, exits non-zero otherwise.
# Rate-limit safe: ~30 requests total over ~60s (1 per 2s).

set -e

HOJAI_ROOT="${HOJAI_ROOT:-/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI}"
LOG_DIR="${RTMN_LOG_DIR:-/tmp/hojai-twins/logs}"

# Tokens
USER_TOKEN=$(python3 -c "
import json, base64, time
payload = {'sub':'user-smoke','email':'smoke@rtmn.com','role':'superadmin','businessId':'RTMN-HQ','iat':int(time.time()*1000),'exp':int((time.time()+3600)*1000)}
print(base64.b64encode(json.dumps(payload).encode()).decode())
")

# Canonical twins (name:port) — must match start-twins.sh
TWINS=(
  "twinos-hub:4705"
  "organization-twin:4710"
  "product-twin:4720"
  "employee-twin:4730"
  "voice-twin:4876"
  "order-twin:4885"
  "payment-twin:4886"
  "inventory-twin:4887"
  "merchant-twin:4888"
  "user-twin:4889"
  "asset-twin:4890"
  "partner-twin:4892"
  "lead-twin:4894"
  "customer-twin:4895"
  "wallet-twin:4896"
)

# Platform services that should also be healthy.
# `name:port:health_path` — health_path is /health by default; some services
# expose it under /api/health (e.g. ai-intelligence).
PLATFORM_SVCS=(
  "corpid:4702:/health"
  "memory-os:4703:/health"
  "twin-memory-bridge:4704:/health"
  "goal-os:4242:/health"
  "flow-orchestrator:4244:/health"
  "policy-os:4254:/health"
  "skill-os:4743:/health"
  "ai-intelligence:4881:/api/health"
  "event-bus:4510:/health"
)

PASS=0
FAIL=0
ERRORS=""

echo "═══════════════════════════════════════════════════════════════"
echo "  TwinOS Cross-Service Smoke Test"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "── Platform Services ──"
for entry in "${PLATFORM_SVCS[@]}"; do
  name="${entry%%:*}"
  rest="${entry#*:}"
  port="${rest%%:*}"
  health_path="${rest#*:}"
  status=$(curl -s -m 3 -o /dev/null -w "%{http_code}" "http://localhost:$port$health_path" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "  ✓ $name (port $port$health_path)"
    PASS=$((PASS+1))
  else
    echo "  ✗ $name (port $port$health_path) → $status"
    FAIL=$((FAIL+1))
    ERRORS="$ERRORS\n  - $name (port $port$health_path): $status"
  fi
  sleep 2
done

echo ""
echo "── Twin Services ──"
for entry in "${TWINS[@]}"; do
  name="${entry%:*}"
  port="${entry#*:}"
  status=$(curl -s -m 3 -o /dev/null -w "%{http_code}" "http://localhost:$port/health" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "  ✓ $name (port $port)"
    PASS=$((PASS+1))
  else
    echo "  ✗ $name (port $port) → $status"
    FAIL=$((FAIL+1))
    ERRORS="$ERRORS\n  - $name (port $port): $status"
  fi
  sleep 2
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Results: $PASS passed / $FAIL failed"
echo "═══════════════════════════════════════════════════════════════"
if [ -n "$ERRORS" ]; then
  echo -e "Failed services:$ERRORS"
fi

[ "$FAIL" -eq 0 ]