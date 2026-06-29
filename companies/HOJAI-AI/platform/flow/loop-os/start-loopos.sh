#!/bin/bash
# LoopOS Startup Script
# Starts all LoopOS services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Service configurations
SERVICES=(
  "loop-scheduler:4731"
  "loop-state:4732"
  "verification-engine:4733"
  "budget-engine:4734"
  "fleet-os:4735"
  "trust-profile:4736"
  "outcome-tracker:4737"
  "knowledge-graph:4738"
  "certification-pipeline:4739"
  "twinos-integration:4740"
  "memoryos-integration:4741"
  "observability-dashboard:4742"
  "retry-engine:4743"
  "worktrees:4744"
  "agent-bus:4745"
)

show_status() {
  echo -e "${GREEN}✓${NC} $1"
}

show_error() {
  echo -e "${RED}✗${NC} $1"
}

show_info() {
  echo -e "${YELLOW}→${NC} $1"
}

# Check if a service is running
is_running() {
  local port=$1
  if command -v lsof &> /dev/null; then
    lsof -i :$port &> /dev/null
  elif command -v netstat &> /dev/null; then
    netstat -tlnp 2>/dev/null | grep -q ":$port "
  else
    nc -z localhost $port 2>/dev/null
  fi
}

# Start a service
start_service() {
  local name=$1
  local port=$2

  if is_running $port; then
    show_status "$name already running on port $port"
    return 0
  fi

  show_info "Starting $name..."

  cd "$BASE_DIR/$name"

  # Run in background
  npm start > /dev/null 2>&1 &
  local pid=$!

  # Wait a moment
  sleep 1

  if is_running $port; then
    show_status "$name started on port $port (PID: $pid)"
  else
    show_error "Failed to start $name"
    return 1
  fi
}

# Stop a service
stop_service() {
  local name=$1
  local port=$2

  if ! is_running $port; then
    show_info "$name not running"
    return 0
  fi

  show_info "Stopping $name..."

  if command -v lsof &> /dev/null; then
    pid=$(lsof -t -i :$port)
    if [ -n "$pid" ]; then
      kill $pid 2>/dev/null || true
      sleep 1
    fi
  fi

  show_status "$name stopped"
}

# Restart a service
restart_service() {
  local name=$1
  local port=$2
  stop_service $name $port
  start_service $name $port
}

# Start all services
start_all() {
  echo "=========================================="
  echo "  Starting LoopOS Services"
  echo "=========================================="
  echo ""

  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    start_service "$name" "$port"
  done

  echo ""
  echo "=========================================="
  echo "  All LoopOS Services Started"
  echo "=========================================="
  echo ""
  echo "Services:"
  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    printf "  • %-25s :%s\n" "$name" "$port"
  done
  echo ""
}

# Stop all services
stop_all() {
  echo "=========================================="
  echo "  Stopping LoopOS Services"
  echo "=========================================="
  echo ""

  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    stop_service "$name" "$port"
  done

  echo ""
  echo "=========================================="
  echo "  All LoopOS Services Stopped"
  echo "=========================================="
}

# Restart all services
restart_all() {
  stop_all
  echo ""
  start_all
}

# Status of all services
status_all() {
  echo "=========================================="
  echo "  LoopOS Service Status"
  echo "=========================================="
  echo ""

  all_running=true
  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if is_running $port; then
      show_status "$name :$port - RUNNING"
    else
      show_error "$name :$port - STOPPED"
      all_running=false
    fi
  done

  echo ""
  if $all_running; then
    echo "All services are running!"
  else
    echo "Some services are not running."
  fi
}

# Health check all services
health_all() {
  echo "=========================================="
  echo "  LoopOS Health Check"
  echo "=========================================="
  echo ""

  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if is_running $port; then
      response=$(curl -s http://localhost:$port/health 2>/dev/null || echo '{"error":"failed"}')
      status=$(echo $response | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
      if [ "$status" = "ok" ]; then
        show_status "$name :$port - HEALTHY"
      else
        show_error "$name :$port - UNHEALTHY"
      fi
    else
      show_error "$name :$port - NOT RUNNING"
    fi
  done
}

# Print usage
usage() {
  echo "LoopOS Startup Script"
  echo ""
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  start     Start all services"
  echo "  stop      Stop all services"
  echo "  restart   Restart all services"
  echo "  status    Check if services are running"
  echo "  health    Health check all services"
  echo "  [service] Start specific service (e.g., loop-scheduler)"
  echo ""
  echo "Examples:"
  echo "  $0 start           # Start all services"
  echo "  $0 stop            # Stop all services"
  echo "  $0 status          # Check status"
  echo "  $0 health          # Health check"
  echo "  $0 loop-scheduler  # Start only loop-scheduler"
}

# Main
case "${1:-start}" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  restart)
    restart_all
    ;;
  status)
    status_all
    ;;
  health)
    health_all
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    # Try to start specific service
    found=false
    for service in "${SERVICES[@]}"; do
      IFS=':' read -r name port <<< "$service"
      if [ "$1" = "$name" ]; then
        start_service "$name" "$port"
        found=true
        break
      fi
    done

    if ! $found; then
      echo "Unknown command: $1"
      usage
      exit 1
    fi
    ;;
esac
