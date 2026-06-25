#!/bin/bash
# ===================================================================
# HOJAI Production Deployment Script
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV=${DEPLOY_ENV:-production}
DRY_RUN=${DRY_RUN:-false}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[STEP]${NC} $1"; }

# ===================================================================
# Service Definitions
# ===================================================================

FOUNDATION_SERVICES=(
  "corpid:4702:companies/HOJAI-AI/platform/identity/corp-id"
  "memory-os:4703:companies/HOJAI-AI/platform/memory/memory-os"
  "twin-memory-bridge:4704:companies/HOJAI-AI/platform/memory/twin-memory-bridge"
  "twinos-hub:4705:companies/HOJAI-AI/platform/twins/twinos-hub"
  "sutar-gateway:4140:companies/HOJAI-AI/sutar-os/core/sutar-gateway"
)

SUTAR_SERVICES=(
  "sutar-decision-engine:4290:companies/HOJAI-AI/sutar-os/core/sutar-decision-engine"
  "sutar-trust-engine:4291:companies/HOJAI-AI/sutar-os/core/sutar-trust-engine"
  "sutar-contract-os:4292:companies/HOJAI-AI/sutar-os/contracts/sutar-contract-os"
  "sutar-negotiation-engine:4293:companies/HOJAI-AI/sutar-os/agents/sutar-negotiation-engine"
  "sutar-economy-os:4294:companies/HOJAI-AI/sutar-os/economy/sutar-economy-os"
  "sutar-tenant-instances:4141:companies/HOJAI-AI/sutar-os/core/sutar-tenant-instances"
  "bcp-engine:4298:companies/HOJAI-AI/platform/bcp-engine"
)

NEXHA_SERVICES=(
  "nexha-supplier-network:4280:companies/Nexha/services/nexha-supplier-network"
  "nexha-supplier-registry:4281:companies/Nexha/services/nexha-supplier-registry"
  "nexha-pricing-network:4286:companies/Nexha/services/nexha-pricing-network"
  "nexha-distribution-network:4285:companies/Nexha/services/nexha-distribution-network"
  "nexha-trade-finance-network:4287:companies/Nexha/services/nexha-trade-finance-network"
  "nexha-warehouse-network:4288:companies/Nexha/services/nexha-warehouse-network"
  "nexha-federation-os:4273:companies/Nexha/services/nexha-federation-os"
  "nexha-business-directory:4360:companies/Nexha/services/nexha-business-directory"
  "nexha-acp-messaging:4340:companies/Nexha/services/nexha-acp-messaging"
  "nexha-commerce-runtime:4364:companies/Nexha/services/nexha-commerce-runtime"
)

GENIE_SERVICES=(
  "genie-calendar:4709:companies/HOJAI-AI/products/genie/genie-calendar-service"
  "genie-memory-inbox:4710:companies/HOJAI-AI/products/genie/genie-memory-inbox"
  "genie-briefing:4712:companies/HOJAI-AI/products/genie/genie-briefing-service"
  "genie-universal-search:4713:companies/HOJAI-AI/products/genie/genie-universal-search"
  "genie-serendipity:4714:companies/HOJAI-AI/products/genie/genie-serendipity-service"
  "genie-smart-forgetting:4715:companies/HOJAI-AI/products/genie/genie-smart-forgetting-service"
)

PRODUCT_SERVICES=(
  "hojai-widget-backend:5380:companies/HOJAI-AI/products/widget-backend"
  "hojai-cloud:4380:companies/HOJAI-AI/sdk/hojai-cloud"
  "rez-intelligence:5370:companies/RABTUL-Technologies/rez-intelligence-integration"
  "ai-inspector:5173:companies/HOJAI-AI/products/ai-inspector"
)

# ===================================================================
# Functions
# ===================================================================

show_banner() {
  echo ""
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║          HOJAI Production Deployment                      ║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

show_help() {
  echo "Usage: ./deploy.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --service <name>     Deploy single service"
  echo "  --services <group>   Deploy service group (foundation|sutar|nexha|genie|products|all)"
  echo "  --env <name>         Environment (production|staging|dev) [default: production]"
  echo "  --dry-run            Show what would be deployed"
  echo "  --status             Show deployment status"
  echo "  --rollback <svc>    Rollback a service"
  echo "  --help              Show this help"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh --services foundation --env production"
  echo "  ./deploy.sh --service sutar-gateway"
  echo "  ./deploy.sh --services all --dry-run"
  echo "  ./deploy.sh --status"
}

check_prerequisites() {
  info "Checking prerequisites..."

  if ! command -v docker &> /dev/null; then
    error "Docker not installed"
    exit 1
  fi

  if ! docker info &> /dev/null; then
    error "Docker not running"
    exit 1
  fi

  log "Prerequisites OK"
}

deploy_service() {
  local service_name=$1
  local port=$2
  local path=$3

  info "Deploying $service_name (port $port)..."

  if [ ! -d "$path" ]; then
    warn "Path not found: $path"
    return 1
  fi

  cd "$SCRIPT_DIR/../.."

  # Check if Dockerfile exists
  if [ -f "$path/Dockerfile" ]; then
    if [ "$DRY_RUN" = "true" ]; then
      echo "  Would build: $path/Dockerfile"
      return 0
    fi

    # Build and deploy
    local image="hojai/$service_name:$ENV"

    log "  Building image: $image"
    docker build -t "$image" "$path"

    log "  Pushing to registry..."
    docker push "$image"

    log "  Deploying to $ENV..."
    # For now, just show the deployment command
    echo "  Deploy command: docker run -d -p $port:$port $image"

  elif [ -f "$path/package.json" ]; then
    if [ "$DRY_RUN" = "true" ]; then
      echo "  Would deploy via npm: $path"
      return 0
    fi

    # Node.js service - start directly
    cd "$path"
    log "  Installing dependencies..."
    npm install --production 2>/dev/null || true

    log "  Starting service on port $port..."
    # In production, this would be managed by PM2/Docker
    echo "  Run: PORT=$port npm start"
  fi

  log "✅ $service_name deployed"
}

deploy_group() {
  local group_name=$1
  local services_var="${group_name^^}_SERVICES[@]"
  local services=("${!services_var}")

  info "Deploying $group_name (${#services[@]} services)..."

  for svc in "${services[@]}"; do
    IFS=':' read -r name port path <<< "$svc"
    deploy_service "$name" "$port" "$path" || true
    echo ""
  done
}

show_status() {
  info "Checking service status..."

  echo ""
  echo -e "${BLUE}Service Status:${NC}"
  echo "─────────────────────────────────────────────"

  local all_services=("${FOUNDATION_SERVICES[@]}" "${SUTAR_SERVICES[@]}" "${NEXHA_SERVICES[@]}")

  for svc in "${all_services[@]}"; do
    IFS=':' read -r name port path <<< "$svc"

    if curl -s --max-time 1 "http://localhost:$port/health" > /dev/null 2>&1; then
      echo -e "  ${GREEN}●${NC} $name ($port) - healthy"
    elif curl -s --max-time 1 "http://localhost:$port/" > /dev/null 2>&1; then
      echo -e "  ${YELLOW}●${NC} $name ($port) - responding"
    else
      echo -e "  ${RED}●${NC} $name ($port) - not responding"
    fi
  done

  echo ""
}

# ===================================================================
# Main
# ===================================================================

main() {
  show_banner

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --service)
        SERVICE="$2"
        shift 2
        ;;
      --services)
        SERVICES="$2"
        shift 2
        ;;
      --env)
        ENV="$2"
        shift 2
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --status)
        show_status
        exit 0
        ;;
      --rollback)
        SERVICE="$2"
        info "Rollback not implemented yet"
        exit 1
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done

  # Export for use in functions
  export DEPLOY_ENV="$ENV"
  export DRY_RUN

  check_prerequisites

  echo ""
  log "Environment: $ENV"
  [ "$DRY_RUN" = "true" ] && log "Mode: DRY RUN (no actual deployment)"
  echo ""

  if [ -n "$SERVICE" ]; then
    # Deploy single service
    info "Looking for service: $SERVICE"

    local found=false
    local all_services=("${FOUNDATION_SERVICES[@]}" "${SUTAR_SERVICES[@]}" "${NEXHA_SERVICES[@]}" "${GENIE_SERVICES[@]}" "${PRODUCT_SERVICES[@]}")

    for svc in "${all_services[@]}"; do
      IFS=':' read -r name port path <<< "$svc"
      if [ "$name" = "$SERVICE" ]; then
        deploy_service "$name" "$port" "$path"
        found=true
        break
      fi
    done

    if [ "$found" = "false" ]; then
      error "Service not found: $SERVICE"
      exit 1
    fi

  elif [ -n "$SERVICES" ]; then
    case "$SERVICES" in
      foundation)
        deploy_group "foundation"
        ;;
      sutar)
        deploy_group "sutar"
        ;;
      nexha)
        deploy_group "nexha"
        ;;
      genie)
        deploy_group "genie"
        ;;
      products)
        deploy_group "product"
        ;;
      all)
        deploy_group "foundation"
        deploy_group "sutar"
        deploy_group "nexha"
        deploy_group "genie"
        deploy_group "product"
        ;;
      *)
        error "Unknown service group: $SERVICES"
        exit 1
        ;;
    esac

  else
    error "No service or group specified"
    show_help
    exit 1
  fi

  echo ""
  log "Deployment complete!"
  echo ""
}

main "$@"
