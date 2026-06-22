#!/bin/zsh
# Smoke test for all HOJAI AI new services (built June 20, 2026)
# Tests 9 services end-to-end via direct port + Hub proxy

PASS=0
FAIL=0
FAILED_LIST=""

check() {
  local name="$1"
  local cmd="$2"
  local expect="$3"
  local result=$(eval "$cmd" 2>/dev/null)
  if echo "$result" | grep -q "$expect"; then
    echo "  ✅ $name"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name — got: ${result:0:120}"
    FAIL=$((FAIL+1))
    FAILED_LIST="$FAILED_LIST $name"
  fi
}

echo "=== Phase 2: Training Platform (Division 7) ==="
check "fine-tuning health"     "curl -s http://localhost:4776/health"              '"status":"healthy"'
check "fine-tuning methods"    "curl -s http://localhost:4776/api/methods"          '"lora"'
check "synthetic-data health"  "curl -s http://localhost:4777/health"              '"status":"healthy"'
check "synthetic-data domains" "curl -s http://localhost:4777/api/domains"          '"customer_support"'
check "gpu-cluster health"     "curl -s http://localhost:4778/health"              '"status":"healthy"'
check "gpu-cluster stats"      "curl -s http://localhost:4778/api/cluster/stats"    '"totalNodes"'

echo
echo "=== Phase 3: SUTAR Intent Bus (4154) ==="
check "intent-bus health"      "curl -s http://localhost:4154/health"              '"status":"ok"'
check "intent-bus topics"      "curl -s http://localhost:4154/api/topics"           '"topics"'

echo
echo "=== Phase 3: SUTAR Usage Tracker (4252) ==="
check "usage-tracker health"   "curl -s http://localhost:4252/health"              '"status":"ok"'
check "usage-tracker plans"    "curl -s http://localhost:4252/api/plans"           '"llm_tokens"'

echo
echo "=== Phase 4: SUTAR Simulation OS (4241) ==="
check "simulation health"      "curl -s http://localhost:4241/health"              '"status":"ok"'
check "simulation templates"   "curl -s http://localhost:4241/api/templates"       '"pricing-change"'

echo
echo "=== Phase 4: SUTAR Discovery Engine (4256) ==="
check "discovery health"       "curl -s http://localhost:4256/health"              '"status":"ok"'
check "discovery indexes"      "curl -s http://localhost:4256/api/indexes"         '"counts"'

echo
echo "=== Phase 4: SUTAR ROI Calculator (4259) ==="
check "roi health"             "curl -s http://localhost:4259/health"              '"status":"ok"'
check "roi templates"          "curl -s http://localhost:4259/api/templates"       '"agent-purchase"'

echo
echo "=== Phase 4: SUTAR Monitoring (3100) ==="
check "monitoring health"      "curl -s http://localhost:3100/health"              '"status":"ok"'
check "monitoring services"    "curl -s http://localhost:3100/api/services"        '"SUTAR Intent Bus"'

echo
echo "=== Phase 1 fix: agent-economy (4251) ==="
check "agent-economy health"   "curl -s http://localhost:4251/health"              '"service":"agent-economy"'

echo
echo "=== Hub (4399) routing ==="
check "hub health"             "curl -s http://localhost:4399/health"              '"RTMN Unified Hub"'
check "hub /api/services/ai count" "curl -s http://localhost:4399/api/services/category/ai | python3 -c 'import sys,json; print(len(json.load(sys.stdin)[\"services\"]))'" "12"
check "ai-intelligence agents" "curl -s http://localhost:4881/api/agents | python3 -c 'import sys,json; print(len(json.load(sys.stdin)[\"agents\"]))'" "29"

echo
echo "=== Summary ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
[ -n "$FAILED_LIST" ] && echo "Failed:$FAILED_LIST"
echo
[ "$FAIL" -eq 0 ] && echo "🎉 All smoke tests passed." || echo "⚠️  Some smoke tests failed."