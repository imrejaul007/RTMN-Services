#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         SalesOS + CustomerJourneyOS Platform             ║"
echo "║                    Build Script                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

# Services to start
SERVICES=(
  "sales-gateway:5055"
  "twin-bridges/customer-twin:5060"
  "twin-bridges/account-twin:5061"
  "twin-bridges/opportunity-twin:5062"
  "twin-bridges/journey-twin:5063"
  "event-trigger-engine:5064"
  "memory-partitions:5065"
  "conversation-intelligence:5066"
  "sales-engagement:5067"
  "command-center:5068"
  "experimentation:5069"
)

# Function to check if port is in use
check_port() {
  lsof -i :$1 > /dev/null 2>&1
}

# Function to start a service
start_service() {
  local service_path=$1
  local port=$2
  local service_name=$(basename "$service_path")

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Starting ${service_name} on port ${port}...${NC}"

  # Check if already running
  if check_port $port; then
    echo -e "${YELLOW}⚠️  Port $port already in use - skipping${NC}"
    return 0
  fi

  # Check if directory exists
  if [ ! -d "$service_path" ]; then
    echo -e "${RED}❌ Service directory not found: $service_path${NC}"
    return 1
  fi

  # Check if index.js exists
  if [ ! -f "$service_path/src/index.js" ]; then
    echo -e "${RED}❌ Service file not found: $service_path/src/index.js${NC}"
    return 1
  fi

  # Install dependencies if node_modules doesn't exist
  if [ ! -d "$service_path/node_modules" ]; then
    echo -e "  ${YELLOW}Installing dependencies...${NC}"
    (cd "$service_path" && npm install --silent 2>/dev/null || echo -e "  ${RED}npm install failed${NC}")
  fi

  # Start the service in background
  (cd "$service_path" && PORT=$port node src/index.js > /tmp/salesos-${service_name}.log 2>&1 &)

  # Wait a moment for service to start
  sleep 2

  # Check if service started
  if check_port $port; then
    echo -e "${GREEN}✅ ${service_name} started on port ${port}${NC}"
  else
    echo -e "${RED}❌ Failed to start ${service_name}${NC}"
    echo -e "${RED}Check logs: tail -f /tmp/salesos-${service_name}.log${NC}"
  fi
}

# Function to wait for all services
wait_for_services() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Waiting for all services to start...${NC}"

  local all_ready=true
  for service in "${SERVICES[@]}"; do
    local port=${service#*:}
    if ! check_port $port; then
      all_ready=false
      break
    fi
  done

  if $all_ready; then
    echo -e "${GREEN}✅ All services are running!${NC}"
  else
    sleep 5
  fi
}

# Function to test health endpoints
test_services() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Testing service health endpoints...${NC}"

  for service in "${SERVICES[@]}"; do
    local port=${service#*:}
    local service_name=$(basename ${service%:*})

    if check_port $port; then
      local health=$(curl -s http://localhost:$port/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 || echo "unknown")
      if echo "$health" | grep -q "healthy"; then
        echo -e "${GREEN}✅ $service_name: $health${NC}"
      else
        echo -e "${YELLOW}⚠️  $service_name: $health${NC}"
      fi
    fi
  done
}

# Main execution
case "${1:-start}" in
  start)
    echo -e "${GREEN}Starting SalesOS Platform...${NC}"
    echo ""

    # Start all services
    for service in "${SERVICES[@]}"; do
      start_service "${service%:*}" "${service#*:}"
    done

    # Wait and test
    wait_for_services
    test_services

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                   SalesOS Platform Started                  ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Gateway:    http://localhost:5055                      ║${NC}"
    echo -e "${GREEN}║  Dashboard:  http://localhost:5055/dashboard            ║${NC}"
    echo -e "${GREEN}║  Health:     http://localhost:5055/health               ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Services:${NC}"
    printf "${GREEN}║    Gateway              :5055                        ║${NC}\n"
    printf "${GREEN}║    CustomerTwin         :5060                        ║${NC}\n"
    printf "${GREEN}║    AccountTwin          :5061                        ║${NC}\n"
    printf "${GREEN}║    OpportunityTwin      :5062                        ║${NC}\n"
    printf "${GREEN}║    JourneyTwin          :5063                        ║${NC}\n"
    printf "${GREEN}║    Event Engine         :5064                        ║${NC}\n"
    printf "${GREEN}║    Memory               :5065                        ║${NC}\n"
    printf "${GREEN}║    Conversation Intel  :5066                        ║${NC}\n"
    printf "${GREEN}║    Engagement           :5067                        ║${NC}\n"
    printf "${GREEN}║    Command Center       :5068                        ║${NC}\n"
    printf "${GREEN}║    Experimentation      :5069                        ║${NC}\n"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    ;;

  stop)
    echo -e "${YELLOW}Stopping SalesOS Platform...${NC}"
    for service in "${SERVICES[@]}"; do
      local port=${service#*:}
      local service_name=$(basename ${service%:*})
      if check_port $port; then
        kill $(lsof -t -i:$port) 2>/dev/null || true
        echo -e "${YELLOW}Stopped $service_name${NC}"
      fi
    done
    echo -e "${GREEN}All services stopped${NC}"
    ;;

  restart)
    $0 stop
    sleep 2
    $0 start
    ;;

  status)
    echo -e "${BLUE}SalesOS Platform Status${NC}"
    echo ""
    for service in "${SERVICES[@]}"; do
      local port=${service#*:}
      local service_name=$(basename ${service%:*})
      if check_port $port; then
        echo -e "${GREEN}✅ $service_name (port $port) - Running${NC}"
      else
        echo -e "${RED}❌ $service_name (port $port) - Not running${NC}"
      fi
    done
    ;;

  logs)
    local service_name=${2:-}
    if [ -n "$service_name" ]; then
      if [ -f "/tmp/salesos-${service_name}.log" ]; then
        tail -f "/tmp/salesos-${service_name}.log"
      else
        echo "Log file not found: /tmp/salesos-${service_name}.log"
      fi
    else
      echo "Usage: $0 logs <service-name>"
      echo "Available logs:"
      ls -la /tmp/salesos-*.log 2>/dev/null || echo "No log files found"
    fi
    ;;

  test)
    echo -e "${BLUE}Testing SalesOS API endpoints...${NC}"
    echo ""

    echo "=== Gateway ==="
    curl -s http://localhost:5055/health | head -c 500
    echo ""
    echo ""

    echo "=== CustomerTwin ==="
    curl -s http://localhost:5060/health | head -c 300
    echo ""
    echo ""

    echo "=== Event Engine ==="
    curl -s http://localhost:5064/health | head -c 300
    echo ""
    echo ""

    echo "=== Command Center ==="
    curl -s http://localhost:5068/ceo | head -c 500
    echo ""
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|logs|test}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all services"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services"
    echo "  status  - Check service status"
    echo "  logs    - Show service logs"
    echo "  test    - Test API endpoints"
    exit 1
    ;;
esac
