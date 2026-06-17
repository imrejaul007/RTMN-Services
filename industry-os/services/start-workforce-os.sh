#!/bin/bash

# ============================================================
# RTMN Workforce OS - Unified Startup Script
# ============================================================
# Starts all Workforce OS services:
# - Workforce OS Core (Port 5065)
# - Talent OS (Port 5066)
# - Learning OS (Port 5068)
# - Organization OS (Port 5072)
# - Workforce Intelligence (Port 5073)
# ============================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICES_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                              ║${NC}"
echo -e "${BLUE}║              RTMN WORKFORCE OS v2.0 LAUNCHER                 ║${NC}"
echo -e "${BLUE}║                                                              ║${NC}"
echo -e "${BLUE}║  Unified HR Operations Platform                              ║${NC}"
echo -e "${BLUE}║  • Workforce OS Core  • Talent OS                          ║${NC}"
echo -e "${BLUE}║  • Learning OS       • Organization OS                     ║${NC}"
echo -e "${BLUE}║  • Workforce Intelligence                                  ║${NC}"
echo -e "${BLUE}║                                                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm not found. Please install Node.js.${NC}"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start a service
start_service() {
    local service_name=$1
    local service_dir=$2
    local port=$3
    local status=""

    if check_port $port; then
        echo -e "${YELLOW}⚠ ${service_name} (Port ${port}) - Already running${NC}"
        return 1
    fi

    if [ ! -d "$service_dir" ]; then
        echo -e "${RED}✗ ${service_name} - Directory not found: ${service_dir}${NC}"
        return 1
    fi

    if [ ! -f "$service_dir/package.json" ]; then
        echo -e "${RED}✗ ${service_name} - package.json not found${NC}"
        return 1
    fi

    # Check if node_modules exists, install if not
    if [ ! -d "$service_dir/node_modules" ]; then
        echo -e "${BLUE}  Installing dependencies for ${service_name}...${NC}"
        cd "$service_dir" && npm install --silent 2>/dev/null
    fi

    # Start the service
    cd "$service_dir"
    npm start > /dev/null 2>&1 &
    local pid=$!

    # Wait a moment for service to start
    sleep 2

    if check_port $port; then
        echo -e "${GREEN}✓ ${service_name} (Port ${port}) - Started (PID: ${pid})${NC}"
        return 0
    else
        echo -e "${RED}✗ ${service_name} - Failed to start${NC}"
        return 1
    fi
}

# Parse command line arguments
COMMAND=${1:-start}

case $COMMAND in
    start)
        echo -e "${BLUE}Starting Workforce OS services...${NC}"
        echo ""

        # Start services
        start_service "Workforce OS Core" "$SERVICES_DIR/workforce-os" 5065
        start_service "Talent OS" "$SERVICES_DIR/talent-os" 5066
        start_service "Learning OS" "$SERVICES_DIR/learning-os" 5068
        start_service "Organization OS" "$SERVICES_DIR/organization-os" 5072
        start_service "Workforce Intelligence" "$SERVICES_DIR/workforce-intelligence" 5073

        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}All services started!${NC}"
        echo ""
        echo -e "${BLUE}Service Endpoints:${NC}"
        echo -e "  ${YELLOW}Workforce OS Core:${NC}     http://localhost:5065"
        echo -e "  ${YELLOW}Talent OS:${NC}            http://localhost:5066"
        echo -e "  ${YELLOW}Learning OS:${NC}           http://localhost:5068"
        echo -e "  ${YELLOW}Organization OS:${NC}       http://localhost:5072"
        echo -e "  ${YELLOW}Workforce Intelligence:${NC} http://localhost:5073"
        echo ""
        echo -e "${BLUE}Quick Health Checks:${NC}"
        echo -e "  ${YELLOW}curl http://localhost:5065/health${NC}"
        echo -e "  ${YELLOW}curl http://localhost:5066/health${NC}"
        echo -e "  ${YELLOW}curl http://localhost:5073/health${NC}"
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
        ;;
    stop)
        echo -e "${RED}Stopping Workforce OS services...${NC}"
        echo ""

        for port in 5065 5066 5068 5072 5073; do
            if check_port $port; then
                pid=$(lsof -t -i:$port)
                kill $pid 2>/dev/null
                sleep 1
                if check_port $port; then
                    echo -e "${RED}✗ Port ${port} - Failed to stop${NC}"
                else
                    echo -e "${GREEN}✓ Port ${port} - Stopped${NC}"
                fi
            else
                echo -e "${YELLOW}⚠ Port ${port} - Not running${NC}"
            fi
        done
        echo ""
        echo -e "${GREEN}All services stopped.${NC}"
        ;;
    status)
        echo -e "${BLUE}Workforce OS Services Status:${NC}"
        echo ""

        services=(
            "Workforce OS Core:5065"
            "Talent OS:5066"
            "Learning OS:5068"
            "Organization OS:5072"
            "Workforce Intelligence:5073"
        )

        for service in "${services[@]}"; do
            name="${service%:*}"
            port="${service#*:}"
            if check_port $port; then
                echo -e "  ${GREEN}●${NC} ${name} (${port}) - Running"
            else
                echo -e "  ${RED}○${NC} ${name} (${port}) - Stopped"
            fi
        done
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    logs)
        port=${2:-5065}
        if check_port $port; then
            pid=$(lsof -t -i:$port)
            echo -e "${BLUE}Logs for PID ${pid}:${NC}"
            tail -f /proc/$pid/fd/1 2>/dev/null || echo "Logs not available"
        else
            echo -e "${RED}Service on port ${port} is not running.${NC}"
        fi
        ;;
    test)
        echo -e "${BLUE}Testing Workforce OS services...${NC}"
        echo ""

        services=(
            "Workforce OS Core:5065:http://localhost:5065/health"
            "Talent OS:5066:http://localhost:5066/health"
            "Learning OS:5068:http://localhost:5068/health"
            "Organization OS:5072:http://localhost:5072/health"
            "Workforce Intelligence:5073:http://localhost:5073/health"
        )

        for svc in "${services[@]}"; do
            name="${svc%%:*}"
            rest="${svc#*:}"
            port="${rest%%:*}"
            url="${rest#*:}"

            if check_port $port; then
                response=$(curl -s $url 2>/dev/null)
                if echo "$response" | grep -q "healthy"; then
                    echo -e "  ${GREEN}✓${NC} ${name} - Healthy"
                else
                    echo -e "  ${YELLOW}⚠${NC} ${name} - Responding but unhealthy"
                fi
            else
                echo -e "  ${RED}✗${NC} ${name} - Not running"
            fi
        done

        echo ""
        echo -e "${BLUE}API Quick Tests:${NC}"

        if check_port 5065; then
            echo -e "  ${YELLOW}GET /api/employees:${NC}"
            curl -s http://localhost:5065/api/employees | head -c 200
            echo "..."
            echo ""
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart|logs|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all Workforce OS services"
        echo "  stop    - Stop all Workforce OS services"
        echo "  status  - Check service status"
        echo "  restart - Restart all services"
        echo "  logs    - View logs (usage: $0 logs [port])"
        echo "  test    - Test service health"
        ;;
esac
