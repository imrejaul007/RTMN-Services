#!/bin/bash
# HOJAI Studio - 32 Services Startup Script
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

SERVICES=(
  "4600:Visual Builder:visual-builder"
  "4610:Code Generator:code-generator"
  "4620:Template Marketplace:template-marketplace"
  "4630:Self-Evolving:self-evolving"
  "4640:Agency Mode:agency-mode"
  "4650:App Store Deployer:app-store-deployer"
  "4660:Analytics Dashboard:analytics-dashboard"
  "4670:Web App Generator:web-app-generator"
  "4680:Workflow Builder:workflow-builder"
  "4690:Payment Gateway:payment-gateway"
  "4700:Enterprise SSO:enterprise-sso"
  "4710:AI Copilot:ai-copilot"
  "4720:Collaboration:collaboration"
  "4722:Version Control:version-control"
  "4724:i18n:i18n"
  "4730:Testing:testing"
  "4732:Monitoring:monitoring"
  "4734:Notification:notification"
  "4740:API Client:api-client"
  "4742:Feature Flags:feature-flags"
  "4744:Preview Deploys:preview-deploys"
  "4746:A11y Checker:a11y-checker"
  "4748:Security Scan:security-scan"
  "4750:DB Schema:db-schema"
  "4752:Social Auth:social-auth"
  "4754:Storage:storage"
  "4756:Realtime:realtime"
  "4758:Edge Functions:edge-functions"
  "4760:AI Product Manager:ai-product-manager"
  "4762:AI Code Reviewer:ai-code-reviewer"
  "4764:AI UX Researcher:ai-ux-researcher"
)

check_port() { lsof -Pi ":$1" -sTCP:LISTEN -t >/dev/null 2>&1; }

start_all() {
  log "Starting HOJAI Studio - 32 services..."
  BASE="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/foundry/services"
  for item in "${SERVICES[@]}"; do
    IFS=':' read -r port name dir <<< "$item"
    if ! check_port $port && [ -d "$BASE/$dir" ]; then
      cd "$BASE/$dir"
      [ ! -d "node_modules" ] && npm install --silent 2>/dev/null
      npm start > /dev/null 2>&1 &
      log "Started $name ($port)"
      sleep 1
    else
      log_warn "$name already running or not found"
    fi
  done
  echo ""
  log_ok "All services started!"
}

status() {
  echo -e "${BLUE}═══════════════════════════════════════════${NC}"
  echo -e "${BLUE}     HOJAI STUDIO - 32 SERVICES STATUS      ${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════${NC}"
  printf "%-25s %-8s %-10s\n" "Service" "Port" "Status"
  echo "─────────────────────────────────────────────"
  for item in "${SERVICES[@]}"; do
    IFS=':' read -r port name dir <<< "$item"
    if check_port $port; then
      printf "%-25s %-8s ${GREEN}%-10s${NC}\n" "$name" "$port" "RUNNING"
    else
      printf "%-25s %-8s ${RED}%-10s${NC}\n" "$name" "$port" "STOPPED"
    fi
  done
}

stop_all() {
  log "Stopping all services..."
  for item in "${SERVICES[@]}"; do
    IFS=':' read -r port name <<< "$item"
    if check_port $port; then
      kill $(lsof -ti:$port) 2>/dev/null
      echo "  Stopped $name"
    fi
  done
  log_ok "All stopped"
}

case "${1:-status}" in
  start|all) start_all ;;
  status) status ;;
  stop) stop_all ;;
  *) echo "Usage: $0 {start|status|stop}" ;;
esac
