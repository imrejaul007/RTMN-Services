#!/bin/zsh
# Load test for HOJAI AI platform services

SERVICES=(
  "4892:agent-os"
  "4893:personalization"
  "4894:ai-economy"
  "4895:governance"
  "4896:planning-engine"
  "4897:multi-modal"
  "4898:aiops"
  "4899:memory-lifecycle"
  "4900:knowledge-registry"
  "4901:event-platform"
  "4902:workflow-registry"
  "4903:twin-registry"
  "4904:tenant-isolation"
  "4610:fine-tuning"
  "4888:eval-continuous"
  "4890:ai-studio"
)

CONCURRENT=${1:-10}
DURATION=${2:-10s}

echo "=== HOJAI AI Load Test ==="
echo "Concurrent users: $CONCURRENT"
echo "Duration: $DURATION"
echo ""

PASS=0
FAIL=0

for svc in $SERVICES; do
  port="${svc%%:*}"
  name="${svc##*:}"

  printf "%-20s (:%s)... " "$name" "$port"

  # Quick health check with timing
  start=$(date +%s%N)
  result=$(curl -sf "http://localhost:$port/health" 2>/dev/null)
  end=$(date +%s%N)
  latency=$(( (end - start) / 1000000 ))

  if [ -n "$result" ]; then
    printf "\033[0;32m✓\033[0m (${latency}ms)\n"
    ((PASS++))
  else
    printf "\033[0;31m✗\033[0m\n"
    ((FAIL++))
  fi
done

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
echo ""
echo "For full load test, run:"
echo "  ab -n 1000 -c $CONCURRENT http://localhost:4892/health"
