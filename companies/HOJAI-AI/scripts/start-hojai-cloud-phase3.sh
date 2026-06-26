#!/bin/bash
# HOJAI Cloud Phase 3 — All Services Startup
# Includes: Phase 1 + Phase 2 + Templates + Nexha Mobility + DO Mobility
# Date: 2026-06-25

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[HOJAI]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

kill_all() {
  log "Stopping all services..."
  for port in 4380 4400 4410 4420 4430 4440 4450 4460 4470 4480 4490 4495 4255 4600; do
    lsof -ti :$port 2>/dev/null | xargs kill 2>/dev/null || true
  done
  sleep 1
}

start() {
  local name=$1
  local port=$2
  local dir=$3

  log "Starting $name on :$port..."

  cd "$ROOT_DIR/$dir" 2>/dev/null || { warn "$dir not found"; return 1; }

  nohup node src/index.js > "$LOG_DIR/$name.log" 2>&1 &
  local pid=$!

  sleep 2

  if kill -0 $pid 2>/dev/null; then
    ok "$name started (:$port, PID $pid)"
    echo "$pid" > "$LOG_DIR/$name.pid"
  else
    warn "$name failed. Check $LOG_DIR/$name.log"
  fi
}

main() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                                                          ║"
  echo "║     🚀 HOJAI Cloud Phase 3 — All Services                ║"
  echo "║     Templates + Nexha Mobility + DO Mobility               ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  kill_all

  cd "$ROOT_DIR"

  # HOJAI Cloud Phase 1
  log "Starting Phase 1 services..."
  start "hojai-cloud" 4380 "products/hojai-cloud"
  start "app-store-api" 4400 "services/app-store-api"
  start "cost-tracker" 4410 "services/cost-tracker"
  start "secrets-manager" 4420 "services/secrets-manager"
  start "voice-studio-api" 4430 "services/voice-studio-api"
  start "workflow-builder-api" 4440 "services/workflow-builder-api"

  # HOJAI Cloud Phase 2
  log "Starting Phase 2 services..."
  start "developer-portal" 4450 "services/developer-portal"
  start "billing-service" 4460 "services/billing-service"
  start "deployment-pipeline" 4470 "services/deployment-pipeline"
  start "collaboration-service" 4480 "services/collaboration-service"
  start "analytics-service" 4490 "services/analytics-service"
  start "notification-service" 4495 "services/notification-service"

  # Nexha Mobility Network
  log "Starting Nexha Mobility Network..."
  start "nexha-mobility-network" 4255 "Nexha/services/nexha-mobility-network"

  # DO Mobility
  log "Starting DO Mobility..."
  start "do-mobility-api" 4600 "do-app/services/mobility-api"

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                                                          ║"
  echo "║     ✅ ALL SERVICES STARTED                                ║"
  echo "║                                                          ║"
  echo "╠════════════════════════════════════════════════════════════╣"
  echo "║ HOJAI Cloud Phase 1 (4380-4440)                        ║"
  echo "║   4380 HOJAI Cloud  | 4400 App Store | 4410 Cost Tracker ║"
  echo "║ 4420 Secrets    | 4430 Voice    | 4440 Workflows     ║"
  echo "╠════════════════════════════════════════════════════════════╣"
  echo "║ HOJAI Cloud Phase 2 (4450-4495)                        ║"
  echo "║ 4450 Developer | 4460 Billing   | 4470 Pipeline      ║"
  echo "║ 4480 Collab   | 4490 Analytics | 4495 Notifications  ║"
  echo "╠════════════════════════════════════════════════════════════╣"
  echo "║ Nexha + DO Mobility (4255, 4600)                      ║"
  echo "║ 4255 Nexha Mobility Network | 4600 DO Mobility         ║"
  echo "╠════════════════════════════════════════════════════════════╣"
  echo "║ HOJAI Studio Templates (12 total)                      ║"
  echo "║ marketplace b2b company hotel restaurant logistics       ║"
  echo "║ mobility healthcare education finance crm erp pos        ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "RTMN Hub:    http://localhost:4399"
  echo "Studio UI:   cd products/ai-studio-ui && npm run dev"
  echo "Docs:        http://localhost:4450/docs"
  echo "DO Mobility: http://localhost:4600"
  echo "Nexha:       http://localhost:4255"
  echo ""
}

case "${1:-start}" in
  start) main ;;
  stop) kill_all; ok "All stopped" ;;
  restart) kill_all; main ;;
  *) echo "Usage: $0 {start|stop|restart}" ;;
esac
