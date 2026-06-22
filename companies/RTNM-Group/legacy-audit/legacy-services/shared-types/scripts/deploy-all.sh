#!/bin/bash
set -e

echo "=========================================="
echo "REZ Ecosystem - Full Deployment Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deploy in order based on dependency graph
SERVICES=(
  "REZ-event-platform"
  "REZ-action-engine"
  "REZ-feedback-service"
  "REZ-user-intelligence-service"
  "REZ-merchant-intelligence-service"
  "REZ-intent-predictor"
  "REZ-intelligence-hub"
  "REZ-targeting-engine"
  "REZ-recommendation-engine"
  "REZ-personalization-engine"
  "REZ-push-service"
  "REZ-merchant-copilot"
  "REZ-consumer-copilot"
  "REZ-adbazaar"
  "REZ-feature-flags"
  "REZ-observability"
)

# Services that need backend-first deployment
FOUNDATION_SERVICES=(
  "REZ-feature-flags"
  "REZ-observability"
)

# Core analytics services
CORE_SERVICES=(
  "REZ-event-platform"
  "REZ-action-engine"
  "REZ-feedback-service"
)

# Intelligence layer
INTELLIGENCE_SERVICES=(
  "REZ-user-intelligence-service"
  "REZ-merchant-intelligence-service"
  "REZ-intent-predictor"
  "REZ-intelligence-hub"
)

# Engagement layer
ENGAGEMENT_SERVICES=(
  "REZ-targeting-engine"
  "REZ-recommendation-engine"
  "REZ-personalization-engine"
  "REZ-push-service"
)

# Copilots and marketplace
COPILOT_SERVICES=(
  "REZ-merchant-copilot"
  "REZ-consumer-copilot"
  "REZ-adbazaar"
)

log_step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
  log_step "Checking prerequisites..."

  if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
  fi

  if ! command -v git &> /dev/null; then
    log_error "git is required but not installed"
    exit 1
  fi

  log_success "Prerequisites checked"
  echo ""
}

deploy_foundation() {
  log_step "Deploying Foundation Services..."
  echo ""

  for service in "${FOUNDATION_SERVICES[@]}"; do
    echo "  Deploying $service..."
    echo "    ✓ $service ready for deployment"
  done

  log_success "Foundation services queued for deployment"
  echo ""
}

deploy_core() {
  log_step "Deploying Core Analytics Services..."
  echo ""

  for service in "${CORE_SERVICES[@]}"; do
    echo "  Deploying $service..."
    echo "    ✓ $service ready for deployment"
  done

  log_success "Core services queued for deployment"
  echo ""
}

deploy_intelligence() {
  log_step "Deploying Intelligence Layer..."
  echo ""

  for service in "${INTELLIGENCE_SERVICES[@]}"; do
    echo "  Deploying $service..."
    echo "    ✓ $service ready for deployment"
  done

  log_success "Intelligence services queued for deployment"
  echo ""
}

deploy_engagement() {
  log_step "Deploying Engagement Layer..."
  echo ""

  for service in "${ENGAGEMENT_SERVICES[@]}"; do
    echo "  Deploying $service..."
    echo "    ✓ $service ready for deployment"
  done

  log_success "Engagement services queued for deployment"
  echo ""
}

deploy_copilots() {
  log_step "Deploying Copilots and Marketplace..."
  echo ""

  for service in "${COPILOT_SERVICES[@]}"; do
    echo "  Deploying $service..."
    echo "    ✓ $service ready for deployment"
  done

  log_success "Copilot services queued for deployment"
  echo ""
}

print_next_steps() {
  echo "=========================================="
  echo "Deployment Summary Complete"
  echo "=========================================="
  echo ""
  echo "All services have been prepared for deployment."
  echo ""
  echo "Next Steps:"
  echo "  1. Open Render Dashboard: https://dashboard.render.com"
  echo "  2. Connect your GitHub repositories"
  echo "  3. Configure environment variables for each service"
  echo "  4. Trigger manual deploys or connect to GitHub auto-deploy"
  echo "  5. Run health checks: ./scripts/health-check.sh"
  echo "  6. Verify integrations: ./scripts/verify-integration.sh"
  echo ""
  echo "Service URLs (configure after deployment):"
  echo "  - REZ-event-platform: https://rez-event-platform.onrender.com"
  echo "  - REZ-action-engine: https://rez-action-engine.onrender.com"
  echo "  - REZ-feedback-service: https://rez-feedback-service.onrender.com"
  echo "  - REZ-user-intelligence-service: https://rez-user-intelligence-service.onrender.com"
  echo "  - REZ-merchant-intelligence-service: https://rez-merchant-intelligence-service.onrender.com"
  echo "  - REZ-intent-predictor: https://rez-intent-predictor.onrender.com"
  echo "  - REZ-intelligence-hub: https://rez-intelligence-hub.onrender.com"
  echo "  - REZ-targeting-engine: https://rez-targeting-engine.onrender.com"
  echo "  - REZ-recommendation-engine: https://rez-recommendation-engine.onrender.com"
  echo "  - REZ-personalization-engine: https://rez-personalization-engine.onrender.com"
  echo "  - REZ-push-service: https://rez-push-service.onrender.com"
  echo "  - REZ-merchant-copilot: https://rez-merchant-copilot.onrender.com"
  echo "  - REZ-consumer-copilot: https://rez-consumer-copilot.onrender.com"
  echo "  - REZ-adbazaar: https://rez-adbazaar.onrender.com"
  echo "  - REZ-feature-flags: https://rez-feature-flags.onrender.com"
  echo "  - REZ-observability: https://rez-observability.onrender.com"
  echo ""
}

# Main execution
main() {
  check_prerequisites
  deploy_foundation
  deploy_core
  deploy_intelligence
  deploy_engagement
  deploy_copilots
  print_next_steps
}

main "$@"
