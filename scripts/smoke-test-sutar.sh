#!/bin/bash
# SUTAR OS Smoke Test - verify all 7 real SUTAR services respond

PASS=0
FAIL=0

# port:label
PORTS="4180:Trust_Engine 4191:Negotiation_Engine 4240:Decision_Engine 4242:Goal_OS 4251:Economy_OS 4254:Policy_Engine 4310:Flow_OS_Workflow_Executor"

echo "=== SUTAR OS Health Check ==="
echo ""
for entry in $PORTS; do
  port="${entry%%:*}"
  name="${entry##*:}"
  HEALTH=$(curl -sS --max-time 2 "http://localhost:$port/health" 2>&1)
  if [[ "$HEALTH" == *"healthy"* ]] || [[ "$HEALTH" == *"\"status\":\"healthy\""* ]]; then
    echo "  PASS  $port  $name"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $port  $name  →  $HEALTH"
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "=== Result: $PASS pass, $FAIL fail ==="

if [ $FAIL -gt 0 ]; then
  echo "Some SUTAR services are not healthy"
  exit 1
fi
echo "All 7 SUTAR OS services are running and healthy"
