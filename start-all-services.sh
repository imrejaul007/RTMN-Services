#!/bin/bash
# Start all remaining RTMN services
# This script is idempotent and skips already-running services

LOG_DIR=/tmp/rtmn-logs
mkdir -p $LOG_DIR

cd /Users/rejaulkarim/Documents/RTMN

start_service() {
  local dir=$1
  local name=$(basename "$dir")

  if [ ! -f "$dir/src/index.js" ] && [ ! -f "$dir/src/index.ts" ]; then
    return
  fi

  # Find the port
  local port=""
  local entry="src/index.js"
  [ -f "$dir/src/index.ts" ] && entry="src/index.ts"

  if [ -f "$dir/package.json" ]; then
    port=$(grep -oP '"PORT"\s*:\s*"\K[0-9]+|"port"\s*:\s*\K[0-9]+' "$dir/package.json" 2>/dev/null | head -1)
  fi

  # Check if already running
  local pid=$(lsof -ti:$(grep -oE 'PORT.*=.*[0-9]{4}' "$dir/$entry" 2>/dev/null | grep -oE '[0-9]{4}' | head -1) 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "  ✓ $name already running (pid=$pid)"
    return
  fi

  # Start the service
  (cd "$dir" && nohup node $entry > "$LOG_DIR/$name.log" 2>&1 &)
  echo "  → Started $name"
}

echo "Starting TwinOS services..."
for s in services/customer-twin services/order-twin services/wallet-twin services/product-twin services/asset-twin services/employee-twin services/organization-twin services/partner-twin services/payment-twin services/user-twin services/inventory-twin services/merchant-twin services/voice-twin services/lead-twin; do
  start_service "$s"
done

echo ""
echo "Starting ACN services..."
for s in services/acn-network services/acp-protocol services/agent-contracts services/agent-learning services/agent-marketplace services/agent-reputation services/agent-wallets services/merchant-agents services/genie-shopping-agent; do
  start_service "$s"
done

echo ""
echo "Starting Genie services..."
for s in services/genie-companion-service services/genie-consultant-agent services/genie-creation-os services/genie-execution-engine services/genie-learning-os services/genie-life-gps services/genie-life-university services/genie-memory-graph services/genie-money-os services/genie-relationship-os services/genie-shopping-agent services/genie-thinking-engine services/genie-wellness-os; do
  start_service "$s"
done

echo ""
echo "Starting Customer Operations services..."
for s in services/customer-success-os services/business-copilot services/journey-intelligence services/incident-management-service services/shift-handover-service services/family-support-service services/memory-intelligence-service services/risk-detection-service services/onboarding-portal services/trust-intelligence services/billing services/customer-twin services/payment-twin; do
  start_service "$s"
done

echo ""
echo "Starting other services..."
for s in services/api-gateway services/graphql-federation services/event-bus services/bpo-manager services/live-chat services/social-hub services/notification-service services/dispute-resolution services/genie-shopping-agent; do
  start_service "$s"
done

echo ""
echo "Waiting 15 seconds for services to initialize..."
sleep 15

echo ""
echo "=== Final Hub Health ==="
curl -s http://localhost:4399/health