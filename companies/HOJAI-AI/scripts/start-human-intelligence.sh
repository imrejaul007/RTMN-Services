#!/bin/bash
# =============================================================================
# Human Intelligence OS - Startup Script
# =============================================================================
# Starts all EmotionOS, BehaviorOS, TrustOS, SimulationOS services
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Services to start
EMOTION_SERVICES=(
  "platform/emotion/emotion-os-gateway:4760"
  "platform/emotion/emotional-memory:4761"
  "platform/emotion/empathy-response-engine:4762"
  "platform/emotion/emotion-analytics:4763"
  "platform/emotion/emotional-journey:4764"
  "platform/emotion/emotion-alerts:4765"
  "platform/emotion/cross-modal-emotion:4766"
  "platform/emotion/tone-analysis:4767"
  "platform/emotion/communication-dna:4722"
)

BEHAVIOR_SERVICES=(
  "platform/behavior/habit-engine:4731"
  "platform/behavior/burnout-prediction:4732"
  "platform/behavior/trigger-intelligence:4735"
)

COMPANY_SERVICE=(
  "platform/emotion/company-emotion:4780"
)

TRUST_SERVICES=(
  "platform/trust/trust-passport:4980"
  "platform/trust/agent-trust-economy:4985"
)

SIMULATION_SERVICE=(
  "platform/simulation-os/simulation-os-gateway:4874"
)

AGENT_SERVICE=(
  "platform/sutar-os/core/sutar-agent-emotional-context:4850"
)

start_service() {
  local service_path=$1
  local port=$2
  local service_name=$(basename "$service_path")
  local dir="$service_path"

  if [ -d "$dir" ]; then
    echo -e "${BLUE}Starting${NC} $service_name on port $port..."
    (cd "$dir" && npm start > /dev/null 2>&1 &)
    echo -e "${GREEN}✓${NC} $service_name started"
  else
    echo -e "${YELLOW}⚠${NC} $service_name not found at $dir"
  fi
}

stop_all() {
  echo -e "\n${YELLOW}Stopping all Human Intelligence services...${NC}"
  pkill -f "emotion-os-gateway" 2>/dev/null || true
  pkill -f "emotional-memory" 2>/dev/null || true
  pkill -f "empathy-response-engine" 2>/dev/null || true
  pkill -f "emotion-analytics" 2>/dev/null || true
  pkill -f "emotion-alerts" 2>/dev/null || true
  pkill -f "tone-analysis" 2>/dev/null || true
  pkill -f "communication-dna" 2>/dev/null || true
  pkill -f "habit-engine" 2>/dev/null || true
  pkill -f "burnout-prediction" 2>/dev/null || true
  pkill -f "trigger-intelligence" 2>/dev/null || true
  pkill -f "company-emotion" 2>/dev/null || true
  pkill -f "trust-passport" 2>/dev/null || true
  pkill -f "agent-trust-economy" 2>/dev/null || true
  pkill -f "simulation-os-gateway" 2>/dev/null || true
  pkill -f "sutar-agent-emotional-context" 2>/dev/null || true
  echo -e "${GREEN}✓${NC} All services stopped"
}

status() {
  echo -e "\n${BLUE}Human Intelligence Services Status${NC}"
  echo "================================"

  local total=0
  local running=0

  for service in "${EMOTION_SERVICES[@]}" "${BEHAVIOR_SERVICES[@]}" "${TRUST_SERVICES[@]}" "${SIMULATION_SERVICE[@]}" "${AGENT_SERVICE[@]}"; do
    port="${service##*:}"
    total=$((total + 1))

    if lsof -i :$port > /dev/null 2>&1; then
      echo -e "${GREEN}✓${NC} Port $port - running"
      running=$((running + 1))
    else
      echo -e "${RED}✗${NC} Port $port - stopped"
    fi
  done

  echo ""
  echo "Total: $running/$total services running"
}

case "$1" in
  start)
    echo -e "\n${GREEN}Starting Human Intelligence OS...${NC}\n"

    echo -e "${BLUE}EmotionOS${NC} (8 services)"
    for service in "${EMOTION_SERVICES[@]}"; do
      start_service "${service%:*}" "${service##*:}"
    done

    echo -e "\n${BLUE}BehaviorOS${NC} (3 services)"
    for service in "${BEHAVIOR_SERVICES[@]}"; do
      start_service "${service%:*}" "${service##*:}"
    done

    echo -e "\n${BLUE}Company Emotion${NC} (1 service)"
    for service in "${COMPANY_SERVICE[@]}"; do
      start_service "${service%:*}" "${service##*:}"
    done

    echo -e "\n${BLUE}TrustOS${NC} (2 services)"
    for service in "${TRUST_SERVICES[@]}"; do
      start_service "${service%:*}" "${service##*:}"
    done

    echo -e "\n${BLUE}SimulationOS${NC} (1 service)"
    for service in "${SIMULATION_SERVICE[@]}"; do
      start_service "${service%:*}" "${service##*:}"
    done

    echo -e "\n${BLUE}Agent Emotional Context${NC} (1 service)"
    for service in "${AGENT_SERVICE[@]}"; do
      start_service "${service%:*}" "${service##*:}"
    done

    echo -e "\n${GREEN}================================${NC}"
    echo -e "${GREEN}All services started!${NC}"
    echo ""
    echo "Waiting 3 seconds for services to initialize..."
    sleep 3
    status
    ;;

  stop)
    stop_all
    ;;

  restart)
    stop_all
    sleep 2
    $0 start
    ;;

  status)
    status
    ;;

  test)
    echo -e "\n${BLUE}Running Human Intelligence tests...${NC}\n"

    echo "EmotionOS Tests:"
    npm --prefix platform/emotion/emotion-os-gateway test 2>&1 | grep -E "Tests|passed"
    npm --prefix platform/emotion/emotional-memory test 2>&1 | grep -E "Tests|passed"
    npm --prefix platform/emotion/emotion-analytics test 2>&1 | grep -E "Tests|passed"
    npm --prefix platform/emotion/tone-analysis test 2>&1 | grep -E "Tests|passed"

    echo ""
    echo "BehaviorOS Tests:"
    npm --prefix platform/behavior/habit-engine test 2>&1 | grep -E "Tests|passed"
    npm --prefix platform/behavior/burnout-prediction test 2>&1 | grep -E "Tests|passed"
    npm --prefix platform/behavior/trigger-intelligence test 2>&1 | grep -E "Tests|passed"

    echo ""
    echo "TrustOS Tests:"
    npm --prefix platform/trust/trust-passport test 2>&1 | grep -E "Tests|passed"
    npm --prefix platform/trust/agent-trust-economy test 2>&1 | grep -E "Tests|passed"

    echo ""
    echo "SimulationOS Tests:"
    npm --prefix platform/simulation-os/simulation-os-gateway test 2>&1 | grep -E "Tests|passed"

    echo ""
    echo "SDK Tests:"
    npm --prefix sdk/hojai-human-intelligence-sdk test 2>&1 | grep -E "Tests|passed"
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|test}"
    echo ""
    echo "  start   - Start all Human Intelligence services"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services"
    echo "  status  - Check service status"
    echo "  test    - Run all tests"
    exit 1
    ;;
esac
