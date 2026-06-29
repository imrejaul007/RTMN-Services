#!/bin/bash
# CompanyOS Startup Script
# Starts all CompanyOS components in the correct order

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="$(dirname "$SCRIPT_DIR")"

# Ports
COMPANY_OS_PORT="${COMPANY_OS_PORT:-4010}"
FINANCE_PORT="${FINANCE_PORT:-4801}"
HEALTHCHECK_INTERVAL=2

# ============================================
# HELP
# ============================================

show_help() {
  echo -e "${BLUE}CompanyOS Startup${NC}"
  echo ""
  echo "Usage: $0 [command] [options]"
  echo ""
  echo "Commands:"
  echo "  start         - Start all services (default)"
  echo "  start-core    - Start only core (Control Plane + Composition Engine)"
  echo "  start-full    - Start everything (core + REZ services)"
  echo "  stop          - Stop all services"
  echo "  status        - Show status of all services"
  echo "  restart       - Restart all services"
  echo "  logs          - Show logs"
  echo "  health        - Run health checks"
  echo ""
  echo "Options:"
  echo "  --port        - CompanyOS port (default: 4010)"
  echo "  --skip-health - Skip health checks"
  echo ""
}

# ============================================
# UTILITY FUNCTIONS
# ============================================

log() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"
}

log_error() {
  echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"
}

wait_for_port() {
  local port=$1
  local service=$2
  local max_attempts=${3:-30}
  local attempt=0

  echo -n "  Waiting for $service on port $port..."
  while [ $attempt -lt $max_attempts ]; do
    if nc -z localhost $port 2>/dev/null; then
      echo -e " ${GREEN}✓${NC}"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  echo -e " ${RED}✗ Timeout${NC}"
  return 1
}

check_service() {
  local port=$1
  if nc -z localhost $port 2>/dev/null; then
    echo -e "  Port $port: ${GREEN}✓ Running${NC}"
    return 0
  else
    echo -e "  Port $port: ${RED}✗ Not running${NC}"
    return 1
  fi
}

# ============================================
# START FUNCTIONS
# ============================================

start_control_plane() {
  log "Starting CompanyOS Control Plane..."

  cd "$PLATFORM_DIR/control-plane"

  if nc -z localhost $COMPANY_OS_PORT 2>/dev/null; then
    log_warning "Control Plane already running on port $COMPANY_OS_PORT"
    return 0
  fi

  PORT=$COMPANY_OS_PORT npm start &
  CONTROL_PID=$!

  wait_for_port $COMPANY_OS_PORT "Control Plane" || {
    log_error "Control Plane failed to start"
    return 1
  }

  log_success "Control Plane started (PID: $CONTROL_PID)"
}

start_finance_pack() {
  log "Starting Finance Department Pack..."

  cd "$PLATFORM_DIR/department-packs/finance"

  if nc -z localhost $FINANCE_PORT 2>/dev/null; then
    log_warning "Finance Pack already running on port $FINANCE_PORT"
    return 0
  fi

  PORT=$FINANCE_PORT npm start &
  FINANCE_PID=$!

  wait_for_port $FINANCE_PORT "Finance Pack" || {
    log_error "Finance Pack failed to start"
    return 1
  }

  log_success "Finance Pack started (PID: $FINANCE_PID)"
}

start_restaurant_extension() {
  log "Starting Restaurant Extension..."

  cd "$PLATFORM_DIR/industry-extensions/restaurant"

  if nc -z localhost 5010 2>/dev/null; then
    log_warning "Restaurant Extension already running on port 5010"
    return 0
  fi

  PORT=5010 npm start &
  RESTAURANT_PID=$!

  wait_for_port 5010 "Restaurant Extension" || {
    log_warning "Restaurant Extension not available (REZ services not running)"
  }
}

start_composition_engine() {
  log "Starting Composition Engine..."
  # The composition engine is part of the control plane
  log_success "Composition Engine bundled with Control Plane"
}

start_react_frontend() {
  log "Starting CompanyOS Studio UI..."

  cd "$PLATFORM_DIR/studio" 2>/dev/null || {
    log_warning "Studio UI not found, skipping"
    return 0
  }

  if nc -z localhost 3001 2>/dev/null; then
    log_warning "Studio UI already running on port 3001"
    return 0
  fi

  npm run dev &
  STUDIO_PID=$!

  wait_for_port 3001 "Studio UI" 60 || {
    log_warning "Studio UI may still be starting"
  }

  log_success "Studio UI started (PID: $STUDIO_PID)"
}

# ============================================
# STOP FUNCTIONS
# ============================================

stop_all() {
  log "Stopping all CompanyOS services..."

  # Kill processes on our ports
  for port in $COMPANY_OS_PORT $FINANCE_PORT 3001; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
      echo "  Stopping process on port $port (PID: $pid)"
      kill $pid 2>/dev/null || true
    fi
  done

  log_success "All services stopped"
}

# ============================================
# STATUS FUNCTIONS
# ============================================

show_status() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  CompanyOS Service Status${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo ""

  local running=0
  local total=0

  # Core services
  echo -e "${CYAN}Core Services:${NC}"
  total=$((total + 1))
  check_service $COMPANY_OS_PORT && running=$((running + 1))

  echo ""
  echo -e "${CYAN}Department Packs:${NC}"

  total=$((total + 1))
  check_service $FINANCE_PORT && running=$((running + 1))

  echo ""
  echo -e "${CYAN}Industry Extensions:${NC}"

  total=$((total + 1))
  check_service 5010 && running=$((running + 1))

  echo ""
  echo -e "${CYAN}Studio UI:${NC}"

  total=$((total + 1))
  check_service 3001 && running=$((running + 1))

  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "  Running: ${GREEN}$running${NC} / $total services"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo ""
}

# ============================================
# HEALTH CHECK
# ============================================

health_check() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  CompanyOS Health Check${NC}"
  echo -e "${BLUE}═════════════════════════════════════════════════���═════${NC}"
  echo ""

  # Control Plane
  echo -n "Control Plane: "
  if curl -s http://localhost:$COMPANY_OS_PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Healthy${NC}"
  else
    echo -e "${RED}✗ Unhealthy${NC}"
  fi

  # API endpoints
  echo -n "Packs API: "
  if curl -s http://localhost:$COMPANY_OS_PORT/api/packs > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Responding${NC}"
  else
    echo -e "${RED}✗ Not responding${NC}"
  fi

  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

# ============================================
# MAIN
# ============================================

COMMAND="${1:-start}"

# Parse options
while [[ $# -gt 0 ]]; do
  case $1 in
    --port)
      COMPANY_OS_PORT="$2"
      shift 2
      ;;
    --skip-health)
      SKIP_HEALTH=true
      shift
      ;;
    help|-h|--help)
      show_help
      exit 0
      ;;
    *)
      COMMAND="$1"
      shift
      ;;
  esac
done

case "$COMMAND" in
  start)
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Starting CompanyOS${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""

    start_composition_engine
    start_control_plane
    start_finance_pack
    start_restaurant_extension

    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  CompanyOS Started${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Control Plane: http://localhost:$COMPANY_OS_PORT"
    echo "  API Base: http://localhost:$COMPANY_OS_PORT/api"
    echo ""
    echo "  Useful commands:"
    echo "    $0 status    - Check service status"
    echo "    $0 health    - Run health checks"
    echo "    $0 stop      - Stop all services"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    ;;

  start-core)
    echo -e "${BLUE}Starting CompanyOS Core...${NC}"
    start_composition_engine
    start_control_plane
    log_success "Core services started"
    ;;

  start-full)
    echo -e "${BLUE}Starting CompanyOS Full Stack...${NC}"
    start_composition_engine
    start_control_plane
    start_finance_pack
    start_restaurant_extension
    start_react_frontend
    log_success "Full stack started"
    ;;

  stop)
    stop_all
    ;;

  status)
    show_status
    ;;

  restart)
    stop_all
    sleep 2
    $0 start
    ;;

  health)
    health_check
    ;;

  logs)
    echo -e "${BLUE}Showing recent logs...${NC}"
    echo "(Ctrl+C to exit)"
    tail -f "$PLATFORM_DIR/logs/company-os.log" 2>/dev/null || \
      echo "No log file found"
    ;;

  *)
    log_error "Unknown command: $COMMAND"
    show_help
    exit 1
    ;;
esac
