#!/bin/bash
# HOJAI SiteOS — Start All Services
# Usage: bash scripts/start-siteos.sh start|stop|status|restart

set -e
BASE="/Users/rejaulkarir/Documents/RTMN/companies/HOJAI-AI/products"
cd "$BASE"

SERVICES=(
  "siteos-gateway:5450"
  "business-context-wrapper:5451"
  "channel-stitcher:5452"
  "event-tracker:5453"
  "heatmap-aggregator:5454"
  "vertical-templates:5455"
  "review-scrapers:5456"
  "lookalike-generator:5457"
  "lead-scoring:5458"
  "marketing-automation:5459"
  "customer-twin-full:5460"
  "event-taxonomy:5461"
  "workflow-visual-builder:5462"
  "voice-widget:5463"
  "crm-connectors:5464"
  "knowledge-base:5465"
  "ab-testing:5466"
  "product-federation:5467"
  "agent-protocol:5468"
  "do-app-integration:5469"
  "agent-reputation:5470"
  "ai-business-advisor:5471"
  "campaign-auto-creation:5472"
  "dynamic-pricing:5473"
  "benchmark-database:5474"
)

PID_DIR="/tmp/hojai-siteos-pids"
mkdir -p "$PID_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

start_service() {
  local svc=$1
  local port=$2
  local dir="$BASE/$svc"

  if [ -d "$dir" ]; then
    # Check if already running
    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
      echo -e "${YELLOW}  :$port $svc ${YELLOW}already running${NC}"
      return 0
    fi

    cd "$dir" 2>/dev/null && npm install --silent 2>/dev/null

    if [ -f "package.json" ]; then
      # Start in background
      npm start > /dev/null 2>&1 &
      local pid=$!
      echo $pid > "$PID_DIR/$svc.pid"
      echo -e "${GREEN}✓${NC} Started :$port $svc (PID: $pid)"
    else
      echo -e "${RED}✗${NC} package.json not found: $dir"
    fi
  else
    echo -e "${YELLOW}•${NC} Skipping :$port $svc (not built)"
  fi
}

stop_service() {
  local pid_file="$PID_DIR/$1.pid"
  if [ -f "$pid_file" ]; then
    kill $(cat "$pid_file" 2>/dev/null) 2>/dev/null
    rm -f "$pid_file"
    echo -e "${RED}•${NC} Stopped :$2 $1"
  fi
}

status_service() {
  if curl -sf "http://localhost:$2/health" > /dev/null 2>&1; then
    echo -e "${GREEN}  :$2 $1 — HEALTHY"
  else
    echo -e "${RED}  :$2 $1 — DOWN"
  fi
}

case "$1" in
  start)
    echo -e "\n${GREEN}Starting HOJAI SiteOS (27 services)...${NC}\n"
    echo -e "${GREEN}────────────────────────────────────────────────────${NC}\n"
    for entry in "${SERVICES[@]}"; do
      IFS=':' read -r svc port <<< "$entry"
      start_service "$svc" "$port"
    done
    echo -e "\n${GREEN}All services started.${NC}\n"
    echo -e "Dashboard: http://localhost:5450\n"
    echo "Run 'bash scripts/start-siteos.sh status' to check health\n"
    ;;
  stop)
    echo -e "\n${RED}Stopping SiteOS...\n"
    for entry in "${SERVICES[@]}"; do IFS=':' read -r svc port <<< "$entry"; stop_service "$svc" "$port"; done
    echo -e "\n${RED}All stopped.${NC}\n"
    ;;
  status)
    echo -e "\n${GREEN}SiteOS Health Check\n${NC}"
    echo -e "────────────────────────────────────────────────────\n"
    for entry in "${SERVICES[@]}"; do IFS=':' read -r svc port <<< "$entry"; status_service "$svc" "$port"; done
    echo -e "────────────────────────────────────────────────────\n"
    ;;
  restart)
    bash "$0" stop; bash "$0" start
    ;;
  *)
    echo "Usage: bash $0 {start|stop|status|restart}"
    ;;
esac
