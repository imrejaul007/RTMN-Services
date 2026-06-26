#!/bin/bash

# ============================================================
# Employee Twin Ecosystem - Startup Script
# ============================================================
#
# This script starts all 4 twin services:
# 1. Twin Learning OS (4735)
# 2. Twin Feedback OS (4736)
# 3. Twin Execution OS (4737)
# 4. Employee Twin Facade (4739)
#
# Usage:
#   ./start-all.sh start   - Start all services
#   ./start-all.sh stop    - Stop all services
#   ./start-all.sh restart  - Restart all services
#   ./start-all.sh status   - Check status
#   ./start-all.sh logs     - View logs
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service definitions
SERVICES=(
  "twin-learning-os:4735"
  "twin-feedback-os:4736"
  "twin-execution-os:4737"
  "employee-twin-facade:4739"
)

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# PIDs storage
PIDS_FILE="/tmp/twin-services.pids"

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if a service is running
is_running() {
  local service_name=$1
  if [ -f "${PIDS_FILE}" ]; then
    local pid=$(grep "^${service_name}:" "${PIDS_FILE}" | cut -d: -f2)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# Get PID for a service
get_pid() {
  local service_name=$1
  if [ -f "${PIDS_FILE}" ]; then
    grep "^${service_name}:" "${PIDS_FILE}" | cut -d: -f2
  fi
}

# Save PIDs to file
save_pids() {
  echo "$1" > "${PIDS_FILE}"
}

# Start a single service
start_service() {
  local service_dir=$1
  local service_name=$2
  local port=$3

  if is_running "$service_name"; then
    log_warning "${service_name} is already running (PID: $(get_pid $service_name))"
    return 0
  fi

  log_info "Starting ${service_name} on port ${port}..."

  cd "${BASE_DIR}/${service_dir}"

  # Check if dependencies are installed
  if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies for ${service_name}..."
    npm install
  fi

  # Start the service in background
  PORT=${port} npm run dev > "/tmp/${service_name}.log" 2>&1 &
  local pid=$!

  # Save PID
  if [ -f "${PIDS_FILE}" ]; then
    sed -i '' "/^${service_name}:/d" "${PIDS_FILE}" 2>/dev/null || true
  fi
  echo "${service_name}:${pid}" >> "${PIDS_FILE}"

  # Wait for service to start
  sleep 2

  # Check if running
  if is_running "$service_name"; then
    log_success "${service_name} started (PID: ${pid})"
  else
    log_error "Failed to start ${service_name}"
    return 1
  fi
}

# Stop a single service
stop_service() {
  local service_name=$1

  if ! is_running "$service_name"; then
    log_warning "${service_name} is not running"
    return 0
  fi

  local pid=$(get_pid "$service_name")
  log_info "Stopping ${service_name} (PID: ${pid})..."

  kill "$pid" 2>/dev/null || true
  sleep 1

  # Force kill if still running
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi

  # Remove from PIDs file
  sed -i '' "/^${service_name}:/d" "${PIDS_FILE}" 2>/dev/null || true

  log_success "${service_name} stopped"
}

# Check service status
check_status() {
  local service_name=$1
  local port=$2

  if is_running "$service_name"; then
    local pid=$(get_pid "$service_name")
    local health=$(curl -s "http://localhost:${port}/health" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    echo -e "${GREEN}●${NC} ${service_name} (PID: ${pid}, Status: ${health})"
  else
    echo -e "${RED}○${NC} ${service_name} (not running)"
  fi
}

# Start all services
start_all() {
  log_info "Starting Employee Twin Ecosystem..."
  echo ""

  # Check if any service is already running
  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if is_running "$name"; then
      log_warning "${name} is already running"
    fi
  done

  echo ""
  log_info "Starting services..."

  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    start_service "$name" "$name" "$port" || true
  done

  echo ""
  log_success "All services started!"
  echo ""

  # Show status
  status_all
}

# Stop all services
stop_all() {
  log_info "Stopping Employee Twin Ecosystem..."
  echo ""

  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    stop_service "$name"
  done

  # Clean up PID file
  rm -f "${PIDS_FILE}"

  echo ""
  log_success "All services stopped!"
}

# Restart all services
restart_all() {
  log_info "Restarting Employee Twin Ecosystem..."
  stop_all
  echo ""
  sleep 2
  start_all
}

# Show status of all services
status_all() {
  echo "============================================"
  echo "       Employee Twin Ecosystem Status"
  echo "============================================"
  echo ""

  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    check_status "$name" "$port"
  done

  echo ""
  echo "============================================"
}

# Show logs
show_logs() {
  local service_name=${1:-""}

  if [ -n "$service_name" ]; then
    if [ -f "/tmp/${service_name}.log" ]; then
      tail -100 "/tmp/${service_name}.log"
    else
      log_error "No logs found for ${service_name}"
    fi
  else
    for service in "${SERVICES[@]}"; do
      IFS=':' read -r name port <<< "$service"
      echo ""
      echo "============================================"
      echo "       ${name} logs"
      echo "============================================"
      if [ -f "/tmp/${name}.log" ]; then
        tail -50 "/tmp/${name}.log"
      else
        echo "(no logs)"
      fi
    done
  fi
}

# Main command handler
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
  logs)
    show_logs "$2"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs [service-name]}"
    exit 1
    ;;
esac
