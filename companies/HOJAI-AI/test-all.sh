#!/bin/bash
# HOJAI Studio — Test All Services
# Tests 45 services across all templates

echo "╔══════════════════════════════════════════════════════╗"
echo "║  HOJAI STUDIO — Service Test Suite               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

test_service() {
  local name=$1 port=$2
  local result=$(curl -s -m 3 http://localhost:$port/health 2>/dev/null)
  if echo "$result" | grep -q "ok"; then
    echo "✓ $name (:$port)"
    ((PASS++))
    return 0
  else
    echo "✗ $name (:$port) — Not responding"
    ((FAIL++))
    return 1
  fi
}

echo "─── Foundry Core ──"
test_service "Template Compiler" 4500
test_service "BAM" 4510
test_service "Agent Generator" 4520
test_service "Auth" 4530
test_service "Deploy Pipeline" 4540
test_service "Flows Engine" 4550
test_service "Company Mapper" 4560
test_service "Orchestrator" 4570

echo ""
echo "─── OTA Services ──"
test_service "PMS Integration" 4700
test_service "GDS Integration" 4701
test_service "Payment Gateway" 4702
test_service "Build Pipeline" 4703

echo ""
echo "─── Industry Services ──"
test_service "E-Commerce" 4710
test_service "Mobility" 4720
test_service "Healthcare" 4730
test_service "Education" 4740
test_service "Fintech" 4750
test_service "Logistics" 4760
test_service "Restaurant" 4770
test_service "Hotel" 4771
test_service "B2B" 4772
test_service "POS" 4773
test_service "CRM" 4774
test_service "ERP" 4775

echo ""
echo "─── Testing API Endpoints ──"

# Test Company Mapper
result=$(curl -s -m 3 http://localhost:4560/api/v1/companies 2>/dev/null)
if echo "$result" | grep -q "success"; then
  echo "✓ Company Mapper API"
  ((PASS++))
else
  echo "✗ Company Mapper API"
  ((FAIL++))
fi

# Test Flows Engine
result=$(curl -s -m 3 http://localhost:4550/api/v1/flows 2>/dev/null)
if echo "$result" | grep -q "success"; then
  echo "✓ Flows Engine API"
  ((PASS++))
else
  echo "✗ Flows Engine API"
  ((FAIL++))
fi

# Test Studio UI
result=$(curl -s -m 3 http://localhost:3001 2>/dev/null)
if echo "$result" | grep -q "HOJAI"; then
  echo "✓ Studio UI"
  ((PASS++))
else
  echo "✗ Studio UI"
  ((FAIL++))
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  RESULTS: $PASS passed, $FAIL failed                    ║"
echo "╚══════════════════════════════════════════════════════╝"

if [ $FAIL -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED!"
  exit 0
else
  echo "⚠️  $FAIL tests failed. Run 'bash scripts/start-hojai.sh' to start services."
  exit 1
fi
