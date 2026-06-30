#!/bin/bash
# =============================================================================
# Human Intelligence OS - Startup Script
# =============================================================================
# Usage: ./start-human-intelligence.sh {start|stop|restart|status|test}
# =============================================================================

# Base directory (one level up from scripts)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# All Human Intelligence Services (space-separated: "path:port")
SERVICES=(
  "platform/emotion/emotion-os-gateway:4760"
  "platform/emotion/emotional-memory:4761"
  "platform/emotion/empathy-response-engine:4762"
  "platform/emotion/emotion-analytics:4763"
  "platform/emotion/emotion-alerts:4765"
  "platform/emotion/tone-analysis:4767"
  "platform/emotion/communication-dna:4722"
  "platform/behavior/habit-engine:4731"
  "platform/behavior/burnout-prediction:4732"
  "platform/behavior/trigger-intelligence:4735"
  "platform/emotion/company-emotion:4780"
  "platform/trust/trust-passport:4980"
  "platform/trust/agent-trust-economy:4985"
  "platform/simulation-os/simulation-os-gateway:4874"
  "platform/sutar-os/core/sutar-agent-emotional-context:4850"
)

# Function to parse service path and port
parse_service() {
  local input="$1"
  SERVICE_PATH="${input%:*}"
  SERVICE_PORT="${input##*:}"
  SERVICE_NAME="$(basename "$SERVICE_PATH")"
  FULL_PATH="$BASE_DIR/$SERVICE_PATH"
}

# Start a single service
start_service() {
  parse_service "$1"

  if [ ! -d "$FULL_PATH" ]; then
    echo -e "${YELLOW}⚠${NC} $SERVICE_NAME not found"
    return 1
  fi

  if lsof -i :$SERVICE_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $SERVICE_NAME already running on :$SERVICE_PORT"
    return 0
  fi

  echo -e "${BLUE}→${NC} Starting $SERVICE_NAME on :$SERVICE_PORT..."

  (cd "$FULL_PATH" && npm start > /dev/null 2>&1 &)
  sleep 0.3

  if lsof -i :$SERVICE_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $SERVICE_NAME started on :$SERVICE_PORT"
    return 0
  else
    echo -e "${RED}✗${NC} Failed to start $SERVICE_NAME"
    return 1
  fi
}

# Stop a single service
stop_service() {
  parse_service "$1"

  if lsof -i :$SERVICE_PORT > /dev/null 2>&1; then
    pid=$(lsof -t -i :$SERVICE_PORT)
    kill $pid 2>/dev/null || true
    echo -e "${RED}■${NC} $SERVICE_NAME stopped"
  fi
}

# Main command handler
CMD="${1:-status}"

case "$CMD" in
  start)
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Human Intelligence OS - Starting Services${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    started=0
    failed=0
    for svc in "${SERVICES[@]}"; do
      start_service "$svc" && ((started++)) || ((failed++))
    done

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e " Started: ${GREEN}$started${NC} | Failed: ${RED}$failed${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Waiting 3 seconds for initialization..."
    sleep 3
    $0 status
    ;;

  stop)
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  Stopping Human Intelligence OS${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    for svc in "${SERVICES[@]}"; do
      stop_service "$svc"
    done

    echo ""
    echo -e "${GREEN}✓${NC} All services stopped"
    ;;

  restart)
    $0 stop
    sleep 2
    $0 start
    ;;

  status)
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Human Intelligence Services Status${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    printf "%-50s %s\n" "Service" "Port"
    echo "──────────────────────────────────────────────────"

    total=${#SERVICES[@]}
    running=0
    for svc in "${SERVICES[@]}"; do
      parse_service "$svc"
      if lsof -i :$SERVICE_PORT > /dev/null 2>&1; then
        printf "${GREEN}✓ %-48s :%s${NC}\n" "$SERVICE_NAME" "$SERVICE_PORT"
        ((running++))
      else
        printf "${RED}✗ %-48s :%s${NC}\n" "$SERVICE_NAME" "$SERVICE_PORT"
      fi
    done

    echo "──────────────────────────────────────────────────"
    echo -e "Total: ${GREEN}$running/$total${NC} running"
    echo ""
    ;;

  test)
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Running All Tests${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    cd "$BASE_DIR"
    for svc in "${SERVICES[@]}"; do
      parse_service "$svc"
      if [ -d "$FULL_PATH" ] && [ -f "$FULL_PATH/package.json" ]; then
        echo -e "${BLUE}Testing $SERVICE_NAME...${NC}"
        npm --prefix "$FULL_PATH" test 2>&1 | grep -E "Tests|✓|✗|FAIL" || echo "  No tests configured"
        echo ""
      fi
    done
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|test}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all services"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services"
    echo "  status  - Check service status"
    echo "  test    - Run all tests"
    exit 1
    ;;
esac
