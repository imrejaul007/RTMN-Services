#!/bin/bash
# Start TwinOS services from HOJAI-AI's canonical location
# After the preventPrototypePollution polymorphic fix

set -e
TWIN_ROOT="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins"
LOG_DIR="${RTMN_LOG_DIR:-/tmp/hojai-twins/logs}"
mkdir -p "$LOG_DIR"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  RTMN TwinOS — HOJAI-AI Twin + Graph Services Startup     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Order: hub first, then graph services, then foundation twins, then commerce, then people
SERVICES=(
  "twinos-hub:4705"
  "twinos-graph-engine:4883"
  "twinos-query-engine:4884"
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

started=0
failed=0
for entry in "${SERVICES[@]}"; do
  name="${entry%:*}"
  port="${entry#*:}"
  echo -n "[$name] starting on port $port ... "
  cd "$TWIN_ROOT/$name"
  # Use shared JWT_SECRET + rtmn-corpid issuer so tokens issued by CorpID
  # (port 4702) are accepted by the twin services. Without this, the twins
  # use a dev fallback secret and reject real auth tokens.
  PORT=$port \
    JWT_SECRET="${JWT_SECRET:-dev_jwt_secret_change_in_production_minimum_64_characters_required_for_security}" \
    JWT_ISSUER="${JWT_ISSUER:-rtmn-corpid}" \
    SERVICE_NAME="$name" \
    nohup node src/index.js > "$LOG_DIR/$name.log" 2>&1 &
  pid=$!
  sleep 1.5
  if kill -0 $pid 2>/dev/null; then
    if curl -s -m 2 -f "http://localhost:$port/health" >/dev/null 2>&1; then
      echo "✓ (PID $pid, healthy)"
      started=$((started+1))
    else
      echo "⚠ (PID $pid running but health check failed)"
      tail -5 "$LOG_DIR/$name.log" | sed 's/^/    /'
      started=$((started+1))
    fi
  else
    echo "✗ FAILED"
    tail -5 "$LOG_DIR/$name.log" | sed 's/^/    /'
    failed=$((failed+1))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Started: $started / Failed: $failed"
echo "Logs:    $LOG_DIR"
echo "═══════════════════════════════════════════════════════════"
