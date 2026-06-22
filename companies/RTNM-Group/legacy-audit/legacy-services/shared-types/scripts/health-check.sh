#!/bin/bash
set -e

echo "=========================================="
echo "REZ Ecosystem - Health Check Script"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health check endpoints
HEALTH_ENDPOINTS=(
  "https://rez-event-platform.onrender.com/health"
  "https://rez-action-engine.onrender.com/health"
  "https://rez-feedback-service.onrender.com/health"
  "https://rez-user-intelligence-service.onrender.com/health"
  "https://rez-merchant-intelligence-service.onrender.com/health"
  "https://rez-intent-predictor.onrender.com/health"
  "https://rez-intelligence-hub.onrender.com/health"
  "https://rez-targeting-engine.onrender.com/health"
  "https://rez-recommendation-engine.onrender.com/health"
  "https://rez-personalization-engine.onrender.com/health"
  "https://rez-push-service.onrender.com/health"
  "https://rez-merchant-copilot.onrender.com/health"
  "https://rez-consumer-copilot.onrender.com/health"
  "https://rez-adbazaar.onrender.com/health"
  "https://rez-feature-flags.onrender.com/health"
  "https://rez-observability.onrender.com/health"
)

# Track results
TOTAL=0
PASSED=0
FAILED=0
FAILED_SERVICES=()

log_ok() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
}

log_skip() {
  echo -e "${YELLOW}[SKIP]${NC} $1"
}

check_service() {
  local url=$1
  local name=$(basename "$url" | sed 's|/health||')

  ((TOTAL++))

  # Check if service is responding
  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [ "$response" = "200" ]; then
    log_ok "$name - OK"
    ((PASSED++))
  elif [ "$response" = "000" ]; then
    log_fail "$name - CONNECTION FAILED (service may not be deployed)"
    FAILED_SERVICES+=("$name")
    ((FAILED++))
  elif [ "$response" = "401" ] || [ "$response" = "403" ]; then
    log_fail "$name - AUTH REQUIRED ($response)"
    FAILED_SERVICES+=("$name")
    ((FAILED++))
  elif [ "$response" = "404" ]; then
    log_fail "$name - ENDPOINT NOT FOUND ($response)"
    FAILED_SERVICES+=("$name")
    ((FAILED++))
  elif [ "$response" = "503" ]; then
    log_fail "$name - SERVICE UNAVAILABLE ($response)"
    FAILED_SERVICES+=("$name")
    ((FAILED++))
  else
    log_fail "$name - HTTP $response"
    FAILED_SERVICES+=("$name")
    ((FAILED++))
  fi
}

print_summary() {
  echo ""
  echo "=========================================="
  echo "Health Check Summary"
  echo "=========================================="
  echo ""
  echo -e "Total Services: $TOTAL"
  echo -e "Passed: ${GREEN}$PASSED${NC}"
  echo -e "Failed: ${RED}$FAILED${NC}"
  echo ""

  if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed Services:${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
      echo "  - $service"
    done
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check if service is deployed on Render"
    echo "  2. Verify environment variables are set"
    echo "  3. Check service logs in Render dashboard"
    echo "  4. Ensure database connections are configured"
    return 1
  else
    echo -e "${GREEN}All services are healthy!${NC}"
    return 0
  fi
}

# Main execution
echo "Checking health endpoints..."
echo ""

for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
  check_service "$endpoint"
done

print_summary
exit $?
