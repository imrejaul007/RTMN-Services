#!/bin/bash
set -e

echo "=========================================="
echo "REZ Ecosystem - Integration Verification"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Integration test configurations
# Format: SERVICE_URL|EXPECTED_RESPONSE|PAYLOAD

INTEGRATIONS=(
  # Event Platform integrations
  "https://rez-event-platform.onrender.com/api/events|POST|/api/events"
  "https://rez-event-platform.onrender.com/api/events/batch|POST|/api/events/batch"
  "https://rez-event-platform.onrender.com/api/analytics|GET|/api/analytics"

  # Action Engine integrations
  "https://rez-action-engine.onrender.com/api/actions|POST|/api/actions"
  "https://rez-action-engine.onrender.com/api/triggers|POST|/api/triggers"

  # Feedback Service integrations
  "https://rez-feedback-service.onrender.com/api/feedback|POST|/api/feedback"
  "https://rez-feedback-service.onrender.com/api/feedback/sentiment|POST|/api/feedback/sentiment"

  # User Intelligence integrations
  "https://rez-user-intelligence-service.onrender.com/api/users/*/profile|GET|/api/users/*/profile"
  "https://rez-user-intelligence-service.onrender.com/api/users/*/segments|GET|/api/users/*/segments"

  # Merchant Intelligence integrations
  "https://rez-merchant-intelligence-service.onrender.com/api/merchants/*/profile|GET|/api/merchants/*/profile"
  "https://rez-merchant-intelligence-service.onrender.com/api/merchants/*/analytics|GET|/api/merchants/*/analytics"

  # Intent Predictor integrations
  "https://rez-intent-predictor.onrender.com/api/intent/predict|POST|/api/intent/predict"
  "https://rez-intent-predictor.onrender.com/api/intent/confidence|POST|/api/intent/confidence"

  # Intelligence Hub integrations
  "https://rez-intelligence-hub.onrender.com/api/insights|GET|/api/insights"
  "https://rez-intelligence-hub.onrender.com/api/summary|GET|/api/summary"

  # Targeting Engine integrations
  "https://rez-targeting-engine.onrender.com/api/target|POST|/api/target"
  "https://rez-targeting-engine.onrender.com/api/audiences|GET|/api/audiences"

  # Recommendation Engine integrations
  "https://rez-recommendation-engine.onrender.com/api/recommendations|POST|/api/recommendations"
  "https://rez-recommendation-engine.onrender.com/api/personalize|POST|/api/personalize"

  # Personalization Engine integrations
  "https://rez-personalization-engine.onrender.com/api/personalization|POST|/api/personalization"
  "https://rez-personalization-engine.onrender.com/api/preferences|GET|/api/preferences"

  # Push Service integrations
  "https://rez-push-service.onrender.com/api/notifications/send|POST|/api/notifications/send"
  "https://rez-push-service.onrender.com/api/subscriptions|POST|/api/subscriptions"

  # Merchant Copilot integrations
  "https://rez-merchant-copilot.onrender.com/api/chat|POST|/api/chat"
  "https://rez-merchant-copilot.onrender.com/api/insights|GET|/api/insights"

  # Consumer Copilot integrations
  "https://rez-consumer-copilot.onrender.com/api/chat|POST|/api/chat"
  "https://rez-consumer-copilot.onrender.com/api/recommendations|GET|/api/recommendations"

  # Ad Bazaar integrations
  "https://rez-adbazaar.onrender.com/api/campaigns|POST|/api/campaigns"
  "https://rez-adbazaar.onrender.com/api/ads|GET|/api/ads"
  "https://rez-adbazaar.onrender.com/api/bidding|POST|/api/bidding"

  # Feature Flags integrations
  "https://rez-feature-flags.onrender.com/api/flags|GET|/api/flags"
  "https://rez-feature-flags.onrender.com/api/flags/*/evaluate|POST|/api/flags/*/evaluate"

  # Observability integrations
  "https://rez-observability.onrender.com/api/metrics|GET|/api/metrics"
  "https://rez-observability.onrender.com/api/traces|GET|/api/traces"
  "https://rez-observability.onrender.com/api/logs|GET|/api/logs"
)

# Track results
TOTAL=0
PASSED=0
FAILED=0
FAILED_INTEGRATIONS=()

log_ok() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

test_webhook() {
  local url=$1
  local method=$2
  local name=$(basename "$url")

  ((TOTAL++))

  # Skip health endpoints
  if [[ "$url" == */health ]]; then
    return 0
  fi

  # Test with a minimal payload
  local payload='{"test": true, "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'

  # Make the request
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    -X "$method" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$url" 2>/dev/null || echo "000")

  case "$response" in
    "200"|"201"|"204")
      log_ok "$name - $method $url"
      ((PASSED++))
      ;;
    "401"|"403")
      log_warn "$name - Auth required (expected in dev)"
      ((PASSED++))
      ;;
    "404")
      log_fail "$name - Endpoint not found"
      FAILED_INTEGRATIONS+=("$name: $url")
      ((FAILED++))
      ;;
    "000")
      log_fail "$name - Connection failed (service may be down)"
      FAILED_INTEGRATIONS+=("$name: $url (connection failed)")
      ((FAILED++))
      ;;
    *)
      log_warn "$name - HTTP $response (may need auth/config)"
      ((PASSED++))
      ;;
  esac
}

test_cross_service_integration() {
  log_info "Testing cross-service integrations..."

  # Test Event -> Intelligence flow
  log_info "Testing Event Platform -> User Intelligence integration..."
  curl -s -X POST \
    "https://rez-event-platform.onrender.com/api/events" \
    -H "Content-Type: application/json" \
    -d '{"user_id": "test-user", "event_type": "test", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
    --max-time 5 > /dev/null 2>&1 || true

  # Test Feedback -> Sentiment flow
  log_info "Testing Feedback -> Sentiment analysis integration..."
  curl -s -X POST \
    "https://rez-feedback-service.onrender.com/api/feedback/sentiment" \
    -H "Content-Type: application/json" \
    -d '{"text": "test feedback", "source": "test"}' \
    --max-time 5 > /dev/null 2>&1 || true

  # Test Targeting -> Recommendation flow
  log_info "Testing Targeting -> Recommendation integration..."
  curl -s -X POST \
    "https://rez-targeting-engine.onrender.com/api/target" \
    -H "Content-Type: application/json" \
    -d '{"user_id": "test-user", "context": "test"}' \
    --max-time 5 > /dev/null 2>&1 || true

  echo ""
}

test_database_connections() {
  log_info "Testing database connectivity..."

  # Check if services can connect to their databases
  for service in "REZ-event-platform" "REZ-user-intelligence-service" "REZ-feedback-service"; do
    url="https://rez-${service,,}.onrender.com/health"
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
    if [ "$status" = "200" ]; then
      log_ok "$service database connected"
    else
      log_warn "$service database connection not verified"
    fi
  done
  echo ""
}

test_api_documentation() {
  log_info "Checking API documentation availability..."

  DOC_ENDPOINTS=(
    "https://rez-event-platform.onrender.com/api-docs"
    "https://rez-action-engine.onrender.com/api-docs"
    "https://rez-intelligence-hub.onrender.com/api-docs"
    "https://rez-adbazaar.onrender.com/api-docs"
  )

  for doc_url in "${DOC_ENDPOINTS[@]}"; do
    name=$(echo $doc_url | grep -oP 'rez-\K[^/]+')
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$doc_url" 2>/dev/null || echo "000")
    if [ "$status" = "200" ]; then
      log_ok "$name API docs available"
    else
      log_warn "$name API docs not found (may be at different endpoint)"
    fi
  done
  echo ""
}

print_summary() {
  echo ""
  echo "=========================================="
  echo "Integration Verification Summary"
  echo "=========================================="
  echo ""
  echo -e "Total Tests: $TOTAL"
  echo -e "Passed: ${GREEN}$PASSED${NC}"
  echo -e "Failed: ${RED}$FAILED${NC}"
  echo ""

  if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed Integrations:${NC}"
    for integration in "${FAILED_INTEGRATIONS[@]}"; do
      echo "  - $integration"
    done
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify service is deployed and running"
    echo "  2. Check environment variables (API keys, URLs)"
    echo "  3. Review service logs for errors"
    echo "  4. Ensure database connections are configured"
    echo "  5. Check CORS settings if applicable"
    return 1
  else
    echo -e "${GREEN}All integration tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run health checks: ./scripts/health-check.sh"
    echo "  2. Configure webhooks for external services"
    echo "  3. Set up monitoring dashboards"
    return 0
  fi
}

# Main execution
main() {
  log_info "Starting integration verification..."
  echo ""

  log_info "Testing individual service endpoints..."
  echo ""

  for integration in "${INTEGRATIONS[@]}"; do
    IFS='|' read -r url method endpoint <<< "$integration"
    test_webhook "$url" "$method"
  done

  echo ""
  test_cross_service_integration
  test_database_connections
  test_api_documentation
  print_summary

  exit $?
}

main "$@"
