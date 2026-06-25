#!/bin/bash
# HOJAI Cloud Phase 2 — Start All Services
# Date: 2026-06-25
# Purpose: Start all 12 HOJAI Cloud services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[HOJAI]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

kill_services() {
  log "Stopping existing services..."
  for port in 4380 4400 4410 4420 4430 4440 4450 4460 4470 4480 4490 4495; do
    lsof -ti :$port 2>/dev/null | xargs kill 2>/dev/null || true
  done
  sleep 1
}

start_service() {
  local name=$1
  local port=$2
  local dir=$3

  log "Starting $name on port $port..."

  cd "$ROOT_DIR/$dir" 2>/dev/null || { error "$dir not found"; return 1; }

  nohup node src/index.js > "$LOG_DIR/$name.log" 2>&1 &
  local pid=$!

  sleep 2

  if kill -0 $pid 2>/dev/null; then
    success "$name started (PID: $pid, port: $port)"
  else
    error "$name failed to start. Check $LOG_DIR/$name.log"
  fi
}

main() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                                                                ║"
  echo "║     🚀 HOJAI Cloud Phase 2 — Starting All 12 Services         ║"
  echo "║                                                                ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  kill_services

  # Phase 1 Services
  log "Starting Phase 1 services..."
  start_service "hojai-cloud" 4380 "products/hojai-cloud"
  start_service "app-store-api" 4400 "services/app-store-api"
  start_service "cost-tracker" 4410 "services/cost-tracker"
  start_service "secrets-manager" 4420 "services/secrets-manager"
  start_service "voice-studio-api" 4430 "services/voice-studio-api"
  start_service "workflow-builder-api" 4440 "services/workflow-builder-api"

  # Phase 2 Services
  log "Starting Phase 2 services..."
  start_service "developer-portal" 4450 "services/developer-portal"
  start_service "billing-service" 4460 "services/billing-service"
  start_service "deployment-pipeline" 4470 "services/deployment-pipeline"
  start_service "collaboration-service" 4480 "services/collaboration-service"
  start_service "analytics-service" 4490 "services/analytics-service"
  start_service "notification-service" 4495 "services/notification-service"

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                                                                ║"
  echo "║     ✅ All 12 Services Started                             ║"
  echo "║                                                                ║"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║                                                                ║"
  echo "║     Phase 1 (4380-4440):                                  ║"
  echo "║       🔥 HOJAI Cloud v1.2     — http://localhost:4380       ║"
  echo "║       🏪 App Store            — http://localhost:4400       ║"
  echo "║       💰 Cost Tracker         — http://localhost:4410       ║"
  echo "║       🔐 Secrets Manager     — http://localhost:4420       ║"
  echo "║       🎙️  Voice Studio        — http://localhost:4430       ║"
  echo "║       🔄 Workflow Builder     — http://localhost:4440       ║"
  echo "║                                                                ║"
  echo "║     Phase 2 (4450-4495):                                  ║"
  echo "║       📚 Developer Portal     — http://localhost:4450       ║"
  echo "║       💳 Billing Service      — http://localhost:4460       ║"
  echo "║       🚀 Deployment Pipeline  — http://localhost:4470       ║"
  echo "║       👥 Collaboration       — http://localhost:4480       ║"
  echo "║       📊 Analytics Service   — http://localhost:4490       ║"
  echo "║       🔔 Notification Svc   — http://localhost:4495       ║"
  echo "║                                                                ║"
  echo "║     RTMN Hub: http://localhost:4399                          ║"
  echo "║     Studio UI: cd products/ai-studio-ui && npm run dev  ║"
  echo "║                                                                ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  # Verify
  sleep 2
  echo "Verifying services..."
  for port in 4380 4400 4410 4420 4430 4440 4450 4460 4470 4480 4490 4495; do
    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
      success "Port $port: OK"
    else
      warn "Port $port: Not responding"
    fi
  done
  echo ""
}

stop() {
  echo "Stopping all services..."
  kill_services
  success "All services stopped"
}

status() {
  echo ""
  echo "HOJAI Cloud Phase 2 Status:"
  echo ""
  for port in 4380 4400 4410 4420 4430 4440 4450 4460 4470 4480 4490 4495; do
    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
      echo -e "  ✅ Port $port: Running"
    else
      echo -e "  ❌ Port $port: Not running"
    fi
  done
  echo ""
}

case "${1:-start}" in
  start) main ;;
  stop) stop ;;
  restart) stop; main ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|restart|status}" ;;
esac
