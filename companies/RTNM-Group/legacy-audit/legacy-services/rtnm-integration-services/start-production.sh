#!/bin/bash

# RTMN Production Start Script
# Version 2.0.0 | Date: June 8, 2026

set -e

echo "🚀 RTMN Integration Services v2.0"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Base directory
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR"

# Parse arguments
MODE="${1:-development}"
DOCKER="${2:-docker}"

echo "Mode: $MODE"
echo "Docker: $DOCKER"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Function to start a service
start_service() {
    local name=$1
    local dir=$2
    local port=$3

    echo -n "Starting ${name}... "

    if check_port $port; then
        echo -e "${YELLOW}Already running${NC} (port $port)"
        return 0
    fi

    cd "$dir"
    if [ -f ".env.example" ] && [ ! -f ".env" ]; then
        cp .env.example .env
    fi

    if [ -f "package.json" ]; then
        if [ ! -d "node_modules" ]; then
            echo -n "Installing... "
            npm install > /dev/null 2>&1
        fi
        mkdir -p logs
        nohup npm start > logs/${name,,}.log 2>&1 &
        sleep 2

        if check_port $port; then
            echo -e "${GREEN}✓ Running${NC} (port $port)"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
    fi

    cd "$BASE_DIR"
}

echo "================================"
echo "Starting RTMN Services"
echo "================================"
echo ""

# Development Mode
if [ "$MODE" = "development" ] || [ "$MODE" = "dev" ]; then
    echo "📦 Development Mode"
    echo ""

    # Start all services
    start_service "API Gateway" "unified-api-gateway" 3000
    start_service "Help Center" "help-center" 3001
    start_service "SSO Service" "sso-service" 3015
    start_service "Billing Service" "billing-service" 3016
    start_service "API Docs" "api-docs" 3017
    start_service "Integration Service" "integrations/corpperks-rabtul" 3010
    start_service "Connect Service" "integrations/connect-all" 3018
    start_service "Dashboard" "unified-dashboard" 3012

# Docker Mode
elif [ "$MODE" = "docker" ] || [ "$MODE" = "production" ]; then
    echo "🐳 Docker Mode"
    echo ""

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker not found!${NC}"
        echo "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Docker Compose not found!${NC}"
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi

    # Create env file if not exists
    if [ ! -f ".env" ]; then
        cat > .env << 'EOF'
# RTMN Environment Configuration
JWT_SECRET=rtmn-production-secret-change-this
DB_PASSWORD=rtmn123
GRAFANA_PASSWORD=admin
EOF
        echo -e "${YELLOW}Created .env file${NC}"
    fi

    # Start with docker-compose
    docker-compose up -d

    echo ""
    echo -e "${GREEN}Docker services started!${NC}"

# Status Mode
elif [ "$MODE" = "status" ]; then
    echo "📊 Service Status"
    echo ""

    services=(
        "3000:API Gateway"
        "3001:Help Center"
        "3015:SSO Service"
        "3016:Billing Service"
        "3017:API Docs"
        "3010:Integration"
        "3018:Connect Service"
        "3012:Dashboard"
    )

    for item in "${services[@]}"; do
        port="${item%%:*}"
        name="${item##*:}"
        if check_port $port; then
            echo -e "${GREEN}✓${NC} $name (port $port)"
        else
            echo -e "${RED}✗${NC} $name (port $port)"
        fi
    done

# Stop Mode
elif [ "$MODE" = "stop" ]; then
    echo "🛑 Stopping Services"
    echo ""

    pkill -f "unified-api-gateway" 2>/dev/null && echo "✓ API Gateway stopped" || true
    pkill -f "help-center" 2>/dev/null && echo "✓ Help Center stopped" || true
    pkill -f "sso-service" 2>/dev/null && echo "✓ SSO Service stopped" || true
    pkill -f "billing-service" 2>/dev/null && echo "✓ Billing stopped" || true
    pkill -f "api-docs" 2>/dev/null && echo "✓ API Docs stopped" || true
    pkill -f "corpperks-rabtul" 2>/dev/null && echo "✓ Integration stopped" || true
    pkill -f "connect-all" 2>/dev/null && echo "✓ Connect stopped" || true
    pkill -f "unified-dashboard" 2>/dev/null && echo "✓ Dashboard stopped" || true

# Logs Mode
elif [ "$MODE" = "logs" ]; then
    service="${3:-all}"

    if [ "$service" = "all" ]; then
        for dir in unified-api-gateway help-center sso-service billing-service api-docs integrations/* unified-dashboard; do
            if [ -d "$dir" ] && [ -f "$dir/logs/${dir,,}.log" ]; then
                echo "=== $dir ==="
                tail -20 "$dir/logs/${dir,,}.log"
                echo ""
            fi
        done
    else
        tail -50 "logs/${service,,}.log"
    fi

# Docker Compose Mode
elif [ "$DOCKER" = "compose" ]; then
    case $MODE in
        up)
            docker-compose up -d
            echo -e "${GREEN}Services started!${NC}"
            ;;
        down)
            docker-compose down
            echo -e "${YELLOW}Services stopped${NC}"
            ;;
        restart)
            docker-compose restart
            echo -e "${GREEN}Services restarted!${NC}"
            ;;
        logs)
            docker-compose logs -f
            ;;
        ps)
            docker-compose ps
            ;;
    esac

else
    echo "Usage: $0 [mode] [docker]"
    echo ""
    echo "Modes:"
    echo "  development, dev  - Start all services (Node.js)"
    echo "  docker, production - Start with Docker Compose"
    echo "  status            - Check service status"
    echo "  stop              - Stop all services"
    echo "  logs [service]    - View logs"
    echo ""
    echo "Docker Compose:"
    echo "  compose up        - Start with docker-compose"
    echo "  compose down      - Stop docker-compose"
    echo "  compose restart   - Restart docker-compose"
    echo "  compose logs      - View docker-compose logs"
    echo "  compose ps        - Show docker-compose status"
    exit 1
fi

echo ""
echo "================================"
echo ""

# Show summary for development mode
if [ "$MODE" = "development" ] || [ "$MODE" = "dev" ]; then
    echo "🌐 Service URLs:"
    echo ""
    echo "  API Gateway:    http://localhost:3000"
    echo "  Help Center:   http://localhost:3001"
    echo "  SSO Service:    http://localhost:3015"
    echo "  Billing:       http://localhost:3016"
    echo "  API Docs:      http://localhost:3017"
    echo "  Integration:   http://localhost:3010"
    echo "  Connect:       http://localhost:3018"
    echo "  Dashboard:     http://localhost:3012"
    echo ""
    echo "  Demo Login:    demo@rtmn.com / demo123"
    echo ""

    echo "📖 Documentation:"
    echo "  API Docs:      http://localhost:3017"
    echo "  README:        RTMN/README.md"
    echo ""

    echo "🛑 To stop:     $0 stop"
    echo "📊 To check:    $0 status"
fi