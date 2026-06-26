#!/bin/bash
# HOJAI Complete Platform — Start All Services
# 17 services across HOJAI Cloud + Foundry + Nexha + DO Mobility

set -e
RED='\033[0;31m' GREEN='\033[0;32m' BLUE='\033[0;34m' YELLOW='\033[1;33m' NC='\033[0m'
log() { echo -e "${BLUE}[HOJAI]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

ROOT="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

kill_all() {
  log "Stopping all services..."
  for p in 4380 4390 4391 4400 4410 4420 4430 4440 4450 4460 4470 4480 4490 4495 4500 4510 4610 4611 4612; do
    lsof -ti :$p 2>/dev/null | xargs kill 2>/dev/null || true
  done
  sleep 1
}

start() {
  local name=$1
  local port=$2
  local dir=$3
  local svc=$4

  log "Starting $name (:$port)..."
  cd "$ROOT/$dir/$svc" 2>/dev/null || { warn "$dir/$svc not found"; return 1; }

  nohup node src/index.js > "$LOG_DIR/$name.log" 2>&1 &
  local pid=$!
  sleep 2

  if kill -0 $pid 2>/dev/null; then
    ok "$name (:$port) ✓"
    echo "$pid" > "$LOG_DIR/$name.pid"
  else
    warn "$name failed. Check $LOG_DIR/$name.log"
  fi
}

main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🚀 HOJAI COMPLETE PLATFORM — 17 Services                  ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  kill_all

  # RTMN Hub
  log "RTMN Hub..."
  # (starts from RTMN root)

  # HOJAI Foundation (ports 4390-4391)
  start "AI Architect" 4390 "services" "ai-architect"
  start "Blueprint Compiler" 4391 "services" "ai-architect"

  # HOJAI Cloud Phase 1 (ports 4400-4440)
  start "App Store API" 4400 "services" "app-store-api"
  start "Cost Tracker" 4410 "services" "cost-tracker"
  start "Secrets Manager" 4420 "services" "secrets-manager"
  start "Voice Studio" 4430 "services" "voice-studio-api"
  start "Workflow Builder" 4440 "services" "workflow-builder-api"

  # HOJAI Cloud Phase 2 (ports 4450-4495)
  start "Developer Portal" 4450 "services" "developer-portal"
  start "Billing Service" 4460 "services" "billing-service"
  start "Deployment Pipeline" 4470 "services" "deployment-pipeline"
  start "Collaboration" 4480 "services" "collaboration-service"
  start "Analytics" 4490 "services" "analytics-service"
  start "Notifications" 4495 "services" "notification-service"

  # Foundry (ports 4500-4510)
  start "Template Compiler" 4500 "foundry/services" "template-compiler"
  start "BAM Integration" 4510 "foundry/services" "bam-integration"

  # DO Mobility (ports 4610-4612)
  start "DO Passenger" 4610 "foundry/services/do-mobility-app" "passenger"
  start "DO Driver" 4611 "foundry/services/do-mobility-app" "driver"
  start "DO Admin" 4612 "foundry/services/do-mobility-app" "admin"

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ✅ ALL SERVICES STARTED                                    ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  HOJAI Foundation (4390-4391)                             ║"
  echo "║    4390 AI Architect    | 4391 Blueprint Compiler            ║"
  echo "║  HOJAI Cloud Phase 1 (4400-4440)                            ║"
  echo "║    4400 App Store | 4410 Cost | 4420 Secrets               ║"
  echo "║    4430 Voice    | 4440 Workflows                         ║"
  echo "║  HOJAI Cloud Phase 2 (4450-4495)                            ║"
  echo "║    4450 Dev Portal | 4460 Billing | 4470 Pipeline           ║"
  echo "║    4480 Collab | 4490 Analytics | 4495 Notifications         ║"
  echo "║  Foundry (4500-4510)                                        ║"
  echo "║    4500 Template Compiler | 4510 BAM Integration             ║"
  echo "║  DO Mobility (4610-4612)                                   ║"
  echo "║    4610 Passenger | 4611 Driver | 4612 Admin                  ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Templates: 13 (mobility, healthcare, education, finance + 9 more)"
  echo "RTMN Hub: http://localhost:4399"
  echo ""
}

case "${1:-start}" in
  start) main ;;
  stop) kill_all; ok "All stopped" ;;
  restart) kill_all; main ;;
  *) echo "Usage: $0 {start|stop|restart}" ;;
esac
