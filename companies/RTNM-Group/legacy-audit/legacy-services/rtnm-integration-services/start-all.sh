#!/bin/bash

# RTMN Integration Services - Start All Script
# Version 1.0.0 | Date: June 8, 2026

set -e

echo "🚀 Starting RTMN Integration Services..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR"

# Function to start a service
start_service() {
    local name=$1
    local dir=$2
    local port=$3
    local color=$4

    echo -e "${color}Starting ${name}...${NC}"

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}${name} already running on port ${port}${NC}"
    else
        cd "$dir"
        if [ -f ".env.example" ] && [ ! -f ".env" ]; then
            cp .env.example .env
        fi
        if [ -f "package.json" ]; then
            if [ ! -d "node_modules" ]; then
                echo "Installing dependencies..."
                npm install > /dev/null 2>&1
            fi
            npm start > /dev/null 2>&1 &
            sleep 2
            echo -e "${GREEN}✓ ${name} started on port ${port}${NC}"
        fi
        cd "$BASE_DIR"
    fi
}

# Check if services are already running
check_service() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "✓ Port $port is in use"
        return 0
    else
        return 1
    fi
}

echo "=========================================="
echo "   RTMN INTEGRATION SERVICES"
echo "=========================================="
echo ""

# Start services in order
echo "Checking ports..."
echo ""

# Unified API Gateway
start_service "Unified API Gateway" "unified-api-gateway" 3000 "$GREEN"

# Help Center
start_service "Help Center" "help-center" 3001 "$GREEN"

# CorpPerks-RABTUL Integration
start_service "CorpPerks-RABTUL Integration" "integrations/corpperks-rabtul" 3010 "$GREEN"

# Unified Dashboard
start_service "Unified Dashboard" "unified-dashboard" 3012 "$GREEN"

echo ""
echo "=========================================="
echo "   ALL SERVICES STARTED"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  🌐 API Gateway:  http://localhost:3000"
echo "  📖 Help Center:  http://localhost:3001"
echo "  🔗 Integration: http://localhost:3010"
echo "  📊 Dashboard:   http://localhost:3012"
echo ""
echo "Health Checks:"
echo "  curl http://localhost:3000/health"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3010/health"
echo "  curl http://localhost:3012/health"
echo ""
echo "=========================================="
echo ""

# Show running services
echo "Running services:"
for port in 3000 3001 3010 3012; do
    if check_service $port; then
        service=$(lsof -ti:$port -a -c node 2>/dev/null | head -1)
        echo "  ✓ Port $port ($service)"
    fi
done
echo ""

# Function to stop all services
stop_services() {
    echo ""
    echo "Stopping all services..."
    pkill -f "node.*unified-api-gateway" 2>/dev/null || true
    pkill -f "node.*help-center" 2>/dev/null || true
    pkill -f "node.*corpperks-rabtul" 2>/dev/null || true
    pkill -f "node.*unified-dashboard" 2>/dev/null || true
    echo "✓ All services stopped"
}

# Export function for use in terminal
export -f stop_services 2>/dev/null || true

echo "To stop all services, run: killall node"
echo "Or: ./stop-all.sh"
