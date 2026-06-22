#!/bin/bash
# HOJAI Core Services Startup Script
# Starts all HOJAI Core services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   HOJAI CORE SERVICES STARTUP              ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Services to start
SERVICES=(
  "hojai-api-gateway:4500"
  "hojai-governance:4501"
  "hojai-event:4510"
  "hojai-memory:4520"
  "hojai-intelligence:4530"
  "hojai-agents:4550"
  "hojai-communications:4570"
  "hojai-hyperlocal:4580"
)

install_deps() {
  echo -e "${YELLOW}Installing dependencies...${NC}"
  for service in "${SERVICES[@]}"; do
    dir="${service%%:*}"
    if [ -d "$dir" ]; then
      echo "  Installing $dir..."
      (cd "$dir" && npm install 2>/dev/null || echo "  $dir: dependencies may already be installed")
    fi
  done
  echo -e "${GREEN}Dependencies ready.${NC}"
  echo ""
}

start_service() {
  local service=$1
  local port=$2

  echo -e "${YELLOW}Starting $service on port $port...${NC}"

  if lsof -i:$port >/dev/null 2>&1; then
    echo -e "  ${RED}Port $port is already in use. Skipping $service.${NC}"
    return 1
  fi

  if [ -f "$service/package.json" ]; then
    (cd "$service" && npm run dev &) 2>/dev/null
    echo -e "  ${GREEN}$service started${NC}"
    return 0
  else
    echo -e "  ${RED}$service: package.json not found${NC}"
    return 1
  fi
}

status_check() {
  echo ""
  echo -e "${GREEN}Service Status:${NC}"
  echo ""

  for service in "${SERVICES[@]}"; do
    dir="${service%%:*}"
    port="${service##*:}"

    if lsof -i:$port >/dev/null 2>&1; then
      echo -e "  ${GREEN}[RUNNING]${NC} $dir (port $port)"
    else
      echo -e "  ${RED}[STOPPED] ${NC} $dir (port $port)"
    fi
  done
}

case "${1:-start}" in
  start)
    install_deps
    echo ""
    echo -e "${GREEN}Starting services...${NC}"
    echo ""

    for svc in "${SERVICES[@]}"; do
      start_service "${svc%%:*}" "${svc##*:}" || true
    done

    echo ""
    echo -e "${GREEN}All services started!${NC}"
    echo ""
    status_check

    echo ""
    echo "Run './start-all.sh status' to check service status"
    echo "Run './start-all.sh stop' to stop all services"
    ;;

  stop)
    echo -e "${RED}Stopping all services...${NC}"
    for service in "${SERVICES[@]}"; do
      port="${service##*:}"
      pid=$(lsof -t -i:$port 2>/dev/null || true)
      if [ -n "$pid" ]; then
        kill $pid 2>/dev/null || true
        echo "  Stopped service on port $port"
      fi
    done
    echo -e "${GREEN}All services stopped.${NC}"
    ;;

  status)
    status_check
    ;;

  restart)
    $0 stop
    sleep 2
    $0 start
    ;;

  health)
    echo -e "${GREEN}Checking service health...${NC}"
    for service in "${SERVICES[@]}"; do
      port="${service##*:}"
      if lsof -i:$port >/dev/null 2>&1; then
        response=$(curl -s http://localhost:$port/health 2>/dev/null || echo '{"error":"no response"}')
        status=$(echo $response | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        if [ "$status" = "healthy" ] || [ "$status" = "ok" ]; then
          echo -e "  ${GREEN}[HEALTHY]${NC} Port $port"
        else
          echo -e "  ${YELLOW}[DEGRADED]${NC} Port $port - $status"
        fi
      else
        echo -e "  ${RED}[OFFLINE]${NC} Port $port"
      fi
    done
    ;;

  *)
    echo "Usage: $0 {start|stop|status|restart|health}"
    exit 1
    ;;
esac
