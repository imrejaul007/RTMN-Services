#!/bin/bash
# HOJAI SiteOS — Start All Services
# Usage: bash scripts/start-siteos.sh start|stop|status|restart|install

set -e

BASE="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products"
PID_DIR="/tmp/hojai-siteos-pids"
mkdir -p "$PID_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# All 27 services with ports
declare -A SERVICES=(
  ["siteos-gateway"]="5450"
  ["business-context-wrapper"]="5451"
  ["channel-stitcher"]="5452"
  ["event-tracker"]="5453"
  ["heatmap-aggregator"]="5454"
  ["vertical-templates"]="5455"
  ["review-scrapers"]="5456"
  ["lookalike-generator"]="5457"
  ["lead-scoring"]="5458"
  ["marketing-automation"]="5459"
  ["customer-twin-full"]="5460"
  ["event-taxonomy"]="5461"
  ["workflow-visual-builder"]="5462"
  ["voice-widget"]="5463"
  ["ads"]="5464"
  ["crm-connectors"]="5465"
  ["knowledge-base"]="5466"
  ["ab-testing"]="5467"
  ["product-federation"]="5468"
  ["agent-protocol"]="5469"
  ["do-app-integration"]="5470"
  ["agent-reputation"]="5471"
  ["ai-business-advisor"]="5472"
  ["campaign-auto-creation"]="5473"
  ["dynamic-pricing"]="5474"
  ["benchmark-database"]="5475"
)

install_service() {
  local svc=$1
  local dir="$BASE/$svc"
  if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
    echo -e "${BLUE}  Installing $svc...${NC}"
    npm install --silent 2>/dev/null &
  fi
}

start_service() {
  local svc=$1
  local port=$2
  local dir="$BASE/$svc"

  # Check if already running
  if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}  :$port $svc ${YELLOW}already running${NC}"
    return 0
  fi

  if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
    echo -e "${GREEN}  Starting :$port $svc...${NC}"
    (cd "$dir" && npm start > /dev/null 2>&1) &
    echo $! > "$PID_DIR/$svc.pid"
    sleep 0.3
  else
    echo -e "${YELLOW}  Skipping :$port $svc (not found)${NC}"
  fi
}

stop_service() {
  local svc=$1
  local port=$2
  local pid_file="$PID_DIR/$svc.pid"
  if [ -f "$pid_file" ]; then
    kill $(cat "$pid_file" 2>/dev/null) 2>/dev/null && echo -e "${RED}  Stopped :$port $svc${NC}"
    rm -f "$pid_file"
  fi
}

check_service() {
  local port=$1
  local name=$2
  if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ :$port $name — HEALTHY${NC}"
    return 0
  else
    echo -e "${RED}  ✗ :$port $name — DOWN${NC}"
    return 1
  fi
}

case "$1" in
  install)
    echo -e "\n${BLUE}📦 Installing all services...${NC}\n"
    for svc in "${!SERVICES[@]}"; do
      install_service "$svc"
    done
    wait
    echo -e "\n${GREEN}✅ All installed!${NC}\n"
    echo "Run 'bash scripts/start-siteos.sh start' to start them"
    ;;

  start)
    echo -e "\n${GREEN}🚀 Starting HOJAI SiteOS (${#SERVICES[@]} services)...${NC}\n"
    for svc in "${!SERVICES[@]}"; do
      start_service "$svc" "${SERVICES[$svc]}"
    done
    sleep 2
    echo -e "\n${GREEN}✅ All services started!${NC}\n"
    echo -e "Admin:   ${BLUE}http://localhost:5450/admin${NC}"
    echo -e "Gateway: ${BLUE}http://localhost:5450${NC}"
    echo ""
    echo "Run 'bash scripts/start-siteos.sh status' to check health"
    ;;

  stop)
    echo -e "\n${RED}🛑 Stopping SiteOS...${NC}\n"
    for svc in "${!SERVICES[@]}"; do
      stop_service "$svc" "${SERVICES[$svc]}"
    done
    echo -e "\n${RED}✅ All stopped${NC}\n"
    ;;

  status)
    echo -e "\n${BLUE}🏥 SiteOS Health Check${NC}\n"
    healthy=0
    total=0
    for svc in "${!SERVICES[@]}"; do
      total=$((total+1))
      check_service "${SERVICES[$svc]}" "$svc" && healthy=$((healthy+1))
    done
    echo ""
    echo "─────────────────────────────────────"
    echo -e "Total: ${GREEN}$healthy/${total} healthy${NC}"
    [ $healthy -eq $total ] && echo -e "${GREEN}🎉 All systems go!${NC}" || echo -e "${YELLOW}⚠️  Some services need attention${NC}"
    ;;

  restart)
    bash "$0" stop
    bash "$0" start
    ;;

  *)
    echo ""
    echo "HOJAI SiteOS Service Manager"
    echo ""
    echo "Usage: bash $0 {start|stop|status|restart|install}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all 27 services"
    echo "  stop    - Stop all services"
    echo "  status  - Check service health"
    echo "  restart - Stop and start all"
    echo "  install - Install dependencies (no start)"
    echo ""
    ;;
esac
