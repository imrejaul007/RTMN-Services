#!/usr/bin/env bash
# Simple load test for the RTMN Hub.
# Usage: ./load-test.sh [concurrent] [total]
#
# Example: ./load-test.sh 50 500  (50 concurrent, 500 total = 100/sec for 5s burst)

set -e

HUB_URL="${HUB_URL:-http://localhost:4399}"
CONCURRENT="${1:-50}"
TOTAL="${2:-500}"
ENDPOINT="/health"

echo "========================================"
echo "RTMN Hub Load Test"
echo "========================================"
echo "  URL:       $HUB_URL"
echo "  Endpoint:  $ENDPOINT"
echo "  Concurrent: $CONCURRENT"
echo "  Total:     $TOTAL"
echo "========================================"

# Warmup
echo "Warmup (5 requests)..."
for i in $(seq 1 5); do
  curl -sf "$HUB_URL$ENDPOINT" -o /dev/null || true
done

# Run load test using curl in parallel
echo "Running load test..."
START=$(date +%s.%N)

success=0
fail=0
failures=()

# Bash parallel curl using background jobs
for i in $(seq 1 $TOTAL); do
  (
    code=$(curl -sf -w "%{http_code}" -o /dev/null "$HUB_URL$ENDPOINT" 2>/dev/null || echo "000")
    echo "$code"
  ) &
  # Limit concurrency
  if (( i % CONCURRENT == 0 )); then
    wait
  fi
done
wait

END=$(date +%s.%N)
DURATION=$(echo "$END - $START" | bc)

echo ""
echo "========================================"
echo "Results (approximate)"
echo "  Duration:   ${DURATION}s"
echo "  Total:      $TOTAL"
echo "  Concurrent: $CONCURRENT"
echo "========================================"
