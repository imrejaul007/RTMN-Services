#!/bin/zsh
# HOJAI AI Smoke Tests — all 15 platform services (June 28, 2026)

PASS=0
FAIL=0

check() {
  local name="$1"
  local port="$2"
  local expect="${3:-\"healthy\"}"

  local result=$(curl -sf "http://localhost:$port/health" 2>/dev/null)
  if echo "$result" | grep -q "$expect"; then
    echo "  ✅ $name"
    ((PASS++))
  else
    echo "  ❌ $name (port $port)"
    ((FAIL++))
  fi
}

echo "=== HOJAI AI Platform Services ==="

echo "\n--- Phase 11: Agent OS ---"
check "Agent OS" 4892

echo "\n--- Phase 21: Personalization ---"
check "Personalization" 4893

echo "\n--- Phase 22: AI Economy ---"
check "AI Economy" 4894

echo "\n--- Phase 23: Governance ---"
check "Governance" 4895

echo "\n--- Phase 14: Planning Engine ---"
check "Planning Engine" 4896

echo "\n--- Phase 27: Multi-Modal ---"
check "Multi-Modal" 4897

echo "\n--- Phase 26: AIOps ---"
check "AIOps" 4898

echo "\n--- Phase 39: Memory Lifecycle ---"
check "Memory Lifecycle" 4899

echo "\n--- Phase 36: Knowledge Registry ---"
check "Knowledge Registry" 4900

echo "\n--- Phase 37: Event Platform ---"
check "Event Platform" 4901

echo "\n--- Phase 34: Workflow Registry ---"
check "Workflow Registry" 4902

echo "\n--- Phase 35: Twin Registry ---"
check "Twin Registry" 4903

echo "\n--- Phase 24: Tenant Isolation ---"
check "Tenant Isolation" 4904

echo "\n--- Phase 30: Fine-Tuning ---"
check "Fine-Tuning" 4610

echo "\n--- Phase 31: Eval Continuous ---"
check "Eval Continuous" 4888

echo "\n--- Phase 38: AI Studio ---"
check "AI Studio" 4890

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -gt 0 ]; then
  echo "Run 'docker-compose up' to start all services"
  exit 1
fi

echo "All 15 services healthy!"
exit 0
