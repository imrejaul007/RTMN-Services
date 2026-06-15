#!/bin/bash
# Test all RTMN services - starts them, checks health, kills them
# This validates that all services can deploy and run

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
PIDS=()

cleanup() {
  echo ""
  echo "Cleaning up..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  pkill -f "node src/index.js" 2>/dev/null || true
  sleep 1
  exit 0
}
trap cleanup EXIT INT TERM

echo "==============================================="
echo "RTMN Services Deployment Test"
echo "==============================================="
echo "Starting ${#SERVICES[@]} services..."
echo ""

# Start all services
for entry in "${SERVICES[@]}"; do
  IFS='|' read -r name path port <<< "$entry"
  if [ ! -d "$path" ]; then
    echo "✗ SKIP: $name (path not found: $path)"
    continue
  fi
  if [ ! -d "$path/node_modules" ]; then
    echo "✗ SKIP: $name (no node_modules - run npm install first)"
    continue
  fi
  nohup node "$path/src/index.js" > "/tmp/rtmn-logs/${name}.log" 2>&1 &
  PIDS+=($!)
  echo "→ Started $name (port $port, PID $!)"
done

echo ""
echo "Waiting for services to start..."
sleep 6

echo ""
echo "==============================================="
echo "Health Check Results"
echo "==============================================="
PASS=0
FAIL=0
FAILED_SERVICES=()

for entry in "${SERVICES[@]}"; do
  IFS='|' read -r name path port <<< "$entry"
  response=$(curl -s --max-time 3 "http://localhost:$port/health" 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$response" ]; then
    echo "✓ $name (port $port): $response"
    PASS=$((PASS + 1))
  else
    echo "✗ $name (port $port): FAILED"
    FAIL=$((FAIL + 1))
    FAILED_SERVICES+=("$name")
  fi
done

echo ""
echo "==============================================="
echo "Summary: $PASS passed, $FAIL failed (out of ${#SERVICES[@]})"
echo "==============================================="

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
  echo ""
  echo "Failed services:"
  for s in "${FAILED_SERVICES[@]}"; do
    echo "  - $s"
  done
fi

exit $FAIL
