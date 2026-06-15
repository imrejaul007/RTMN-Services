#!/bin/bash
# Start all RTMN services in the background
# Logs go to /tmp/rtmn-logs/

set -e

cd "$(dirname "$0")/.."

# Service definitions: name|path|port
SERVICES=(
  "corpid-service|corpid-service|4702"
  "memory-os|memory-os|4703"
  "goal-os|goal-os|4242"
  "decision-engine|decision-engine|4240"
  "agent-economy|agent-economy|4251"
  "twinos-hub|twinos-hub|4705"
  "restaurant-os|restaurant-os|5010"
  "hotel-os|hotel-os|5025"
  "healthcare-os|healthcare-os|5020"
  "retail-os|retail-os|5030"
  "legal-os|legal-os|5035"
  "education-os|education-os|5060"
  "automotive-os|automotive-os|5080"
  "beauty-os|beauty-os|5090"
  "fitness-os|fitness-os|5110"
  "manufacturing-os|manufacturing-os|5150"
  "hospitality-os|hospitality-os|5050"
  "realestate-os|realestate-os|5230"
  "agent-twin|agent-twin|3011"
  "area-twin|area-twin|3012"
  "buyer-twin|buyer-twin|3013"
  "deal-twin|deal-twin|3014"
  "property-twin|property-twin|3015"
  "referral-twin|referral-twin|3016"
)

mkdir -p /tmp/rtmn-logs

echo "Starting ${#SERVICES[@]} RTMN services..."
echo "Logs: /tmp/rtmn-logs/"
echo ""

# Kill any existing instances
pkill -f "node.*src/index.js" 2>/dev/null || true
sleep 1

# Start all services
for entry in "${SERVICES[@]}"; do
  IFS='|' read -r name path port <<< "$entry"
  if [ -d "$path" ] && [ -d "$path/node_modules" ]; then
    nohup node "$path/src/index.js" > "/tmp/rtmn-logs/${name}.log" 2>&1 &
    echo "→ $name (port $port) PID $!"
  else
    echo "✗ SKIP $name (missing path or node_modules)"
  fi
done

echo ""
echo "All services started. Waiting 5s for health..."
sleep 5

echo ""
echo "Health summary:"
HEALTHY=0
TOTAL=0
for entry in "${SERVICES[@]}"; do
  IFS='|' read -r name path port <<< "$entry"
  TOTAL=$((TOTAL + 1))
  if curl -s --max-time 2 "http://localhost:$port/health" > /dev/null 2>&1; then
    HEALTHY=$((HEALTHY + 1))
    echo "  ✓ $name (port $port)"
  else
    echo "  ✗ $name (port $port) - check /tmp/rtmn-logs/${name}.log"
  fi
done

echo ""
echo "$HEALTHY/$TOTAL services healthy"
echo "Stop with: pkill -f 'node.*src/index.js'"
