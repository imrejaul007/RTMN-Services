#!/bin/bash
# LoopOS Startup Script
# Starts all 22 LoopOS services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# All 22 services
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
  "event-bus:4752"
  "retry-engine:4743"
  "worktrees:4744"
  "agent-bus:4745"
  "mcp-connectors:4746"
  "simulation-os:4747"
  "learning-distribution:4748"
  "escalation-manager:4749"
  "budget-alerts:4750"
  "trust-graph:4751"
)

show_status() { echo -e "${GREEN}✓${NC} $1"; }
show_error() { echo -e "${RED}✗${NC} $1"; }
show_info() { echo -e "${BLUE}→${NC} $1"; }

is_running() {
  lsof -ti :$1 &>/dev/null || nc -z localhost $1 2>/dev/null
}

start_service() {
  local name=$1
  local port=$2

  if is_running $port; then
    show_status "$name already running on :$port"
    return 0
  fi

  local dir="$BASE_DIR/$name"
  if [ ! -d "$dir" ]; then
    show_error "$name not found at $dir"
    return 1
  fi

  show_info "Starting $name..."
  cd "$dir"

  # Install deps if needed
  if [ ! -d "node_modules" ]; then
    npm install --silent 2>/dev/null
  fi

  # Start in background
  npm start > /dev/null 2>&1 &
  local pid=$!

  # Wait and verify
  sleep 2
  if is_running $port; then
    show_status "$name started on :$port (PID: $pid)"
  else
    show_error "Failed to start $name"
    return 1
  fi
}

stop_service() {
  local port=$1
  if is_running $port; then
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
      kill $pid 2>/dev/null
      sleep 1
    fi
    show_info "Stopped service on :$port"
  fi
}

start_all() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  LoopOS - 21 Services Starting...${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""

  local success=0
  local failed=0

  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if start_service "$name" "$port"; then
      ((success++))
    else
      ((failed++))
    fi
  done

  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  Started: $success | Failed: $failed${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""

  if [ $failed -eq 0 ]; then
    echo -e "${GREEN}Dashboard: http://localhost:3000${NC}"
    echo -e "${GREEN}SDK: import LoopOS from '@hojai/loopos-sdk'${NC}"
  fi
}

stop_all() {
  echo "Stopping all LoopOS services..."
  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    stop_service "$port"
  done
  show_status "All services stopped"
}

status_all() {
  echo ""
  echo -e "${BLUE}LoopOS Service Status${NC}"
  echo ""

  local all_running=true
  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if is_running $port; then
      echo -e "  ${GREEN}✓${NC} $name :$port"
    else
      echo -e "  ${RED}✗${NC} $name :$port"
      all_running=false
    fi
  done

  echo ""
  if $all_running; then
    echo -e "${GREEN}All 21 services running!${NC}"
  else
    echo -e "${YELLOW}Some services not running. Run 'start' to start all.${NC}"
  fi
}

health_all() {
  echo ""
  echo -e "${BLUE}LoopOS Health Check${NC}"
  echo ""

  for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if is_running $port; then
      local health=$(curl -s "http://localhost:$port/health" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
      if [ "$health" = "ok" ]; then
        echo -e "  ${GREEN}✓${NC} $name :$port - HEALTHY"
      else
        echo -e "  ${YELLOW}⚠${NC} $name :$port - DEGRADED"
      fi
    else
      echo -e "  ${RED}✗${NC} $name :$port - NOT RUNNING"
    fi
  done
}

usage() {
  echo "LoopOS Startup Script"
  echo ""
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  start    Start all 21 services"
  echo "  stop     Stop all services"
  echo "  status   Check if services are running"
  echo "  health   Health check all services"
  echo "  restart  Restart all services"
  echo ""
  echo "Services:"
  echo "  Core: Scheduler, State, Verification, Budget, Fleet"
  echo "  Intelligence: Trust, Outcomes, Knowledge, Certification"
  echo "  Integration: TwinOS, MemoryOS, Observability, Retry, Worktrees, Agent Bus"
  echo "  Tools: MCP Connectors"
  echo "  Simulation: SimulationOS, Learning Distribution"
  echo "  Operations: Escalation, Budget Alerts, Trust Graph"
  echo ""
  echo "Dashboard: http://localhost:3000"
}

case "${1:-start}" in
  start) start_all ;;
  stop) stop_all ;;
  status) status_all ;;
  health) health_all ;;
  restart) stop_all; start_all ;;
  -h|--help|help) usage ;;
  *) usage ;;
esac
