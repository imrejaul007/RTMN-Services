#!/bin/bash
# HOJAI Cloud Phase 1 — Start All Services
# Date: 2026-06-25
# Purpose: Start all 6 new HOJAI Cloud services + AI Studio UI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}[HOJAI]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Kill existing processes
kill_services() {
  log "Stopping existing services..."
  pkill -f "hojai-cloud" 2>/dev/null || true
  pkill -f "app-store-api" 2>/dev/null || true
  pkill -f "cost-tracker" 2>/dev/null || true
  pkill -f "secrets-manager" 2>/dev/null || true
  pkill -f "voice-studio-api" 2>/dev/null || true
  pkill -f "workflow-builder-api" 2>/dev/null || true
  sleep 1
}

# Start a service
start_service() {
  local name=$1
  local port=$2
  local dir=$3
  local cmd=$4

  log "Starting $name on port $port..."

  cd "$dir" 2>/dev/null || { error "$name directory not found: $dir"; return 1; }

  # Start in background
  nohup node $cmd > "$LOG_DIR/$name.log" 2>&1 &
  local pid=$!

  # Wait for it to start
  sleep 2

  # Check if running
  if kill -0 $pid 2>/dev/null; then
    success "$name started (PID: $pid)"
    echo "$pid" > "$LOG_DIR/$name.pid"
  else
    error "$name failed to start. Check $LOG_DIR/$name.log"
    return 1
  fi
}

# Check port is free
check_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    warn "Port $port is already in use"
    return 1
  fi
  return 0
}

# Main
main() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                                                                ║"
  echo "║     🚀 HOJAI Cloud Phase 1 — Starting All Services             ║"
  echo "║                                                                ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  # Kill existing
  kill_services

  # Change to HOJAI-AI directory
  cd "$ROOT_DIR" || { error "Failed to change to $ROOT_DIR"; exit 1; }

  # Start services
  log "Starting HOJAI Cloud Phase 1 services..."
  echo ""

  # 1. HOJAI Cloud v1.2
  check_port 4380 && start_service "hojai-cloud" 4380 "products/hojai-cloud" "src/index.js"

  # 2. App Store API
  check_port 4400 && start_service "app-store-api" 4400 "services/app-store-api" "src/index.js"

  # 3. Cost Tracker
  check_port 4410 && start_service "cost-tracker" 4410 "services/cost-tracker" "src/index.js"

  # 4. Secrets Manager
  check_port 4420 && start_service "secrets-manager" 4420 "services/secrets-manager" "src/index.js"

  # 5. Voice Studio API
  check_port 4430 && start_service "voice-studio-api" 4430 "services/voice-studio-api" "src/index.js"

  # 6. Workflow Builder API
  check_port 4440 && start_service "workflow-builder-api" 4440 "services/workflow-builder-api" "src/index.js"

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                                                                ║"
  echo "║     ✅ All Phase 1 Services Started                             ║"
  echo "║                                                                ║"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║                                                                ║"
  echo "║     Ports:                                                    ║"
  echo "║       🔥 HOJAI Cloud v1.2     — http://localhost:4380          ║"
  echo "║       🏪 App Store API        — http://localhost:4400          ║"
  echo "║       💰 Cost Tracker         — http://localhost:4410          ║"
  echo "║       🔐 Secrets Manager     — http://localhost:4420          ║"
  echo "║       🎙️  Voice Studio API    — http://localhost:4430          ║"
  echo "║       🔄 Workflow Builder     — http://localhost:4440          ║"
  echo "║                                                                ║"
  echo "║     RTMN Hub: http://localhost:4399                           ║"
  echo "║     Studio UI:  cd products/ai-studio-ui && npm run dev     ║"
  echo "║                                                                ║"
  echo "║     Logs: $LOG_DIR/*.log                                   ║"
  echo "║                                                                ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  # Verify services
  echo "Verifying services..."
  sleep 2

  for port in 4380 4400 4410 4420 4430 4440; do
    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
      success "Port $port: OK"
    else
      warn "Port $port: Not responding (may still be starting)"
    fi
  done

  echo ""
  log "Startup complete!"
  echo ""
}

# Stop function
stop() {
  echo ""
  log "Stopping all Phase 1 services..."
  kill_services
  success "All services stopped"
}

# Status function
status() {
  echo ""
  echo "HOJAI Cloud Phase 1 Status:"
  echo ""

  for port in 4380 4400 4410 4420 4430 4440; do
    local name=""
    case $port in
      4380) name="HOJAI Cloud" ;;
      4400) name="App Store" ;;
      4410) name="Cost Tracker" ;;
      4420) name="Secrets Manager" ;;
      4430) name="Voice Studio" ;;
      4440) name="Workflow Builder" ;;
    esac

    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
      echo -e "  ✅ $name ($port): Running"
    else
      echo -e "  ❌ $name ($port): Not running"
    fi
  done
  echo ""
}

# Parse arguments
case "${1:-start}" in
  start)
    main
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    main
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
