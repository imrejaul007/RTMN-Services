#!/bin/bash

# RTMN Integration Services - Updated Start All Script
# Version 2.0.0 | Date: June 8, 2026

set -e

echo "🚀 Starting RTMN Integration Services v2.0..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Base directory
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR"

# Function to start a service
start_service() {
    local name=$1
    local dir=$2
    local port=$3

    echo -e "${GREEN}Starting ${name}...${NC}"

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
            npm start > logs/${name,,}.log 2>&1 &
            sleep 2
            echo -e "${GREEN}✓ ${name} started on port ${port}${NC}"
        fi
        cd "$BASE_DIR"
    fi
}

echo "=========================================="
echo "   RTMN INTEGRATION SERVICES v2.0"
echo "=========================================="
echo ""

# Start services in order
echo "Starting services..."
echo ""

# Core Services
start_service "Unified API Gateway" "unified-api-gateway" 3000
start_service "Help Center" "help-center" 3001
start_service "SSO Service" "sso-service" 3015
start_service "Billing Service" "billing-service" 3016
start_service "API Docs Portal" "api-docs" 3017
start_service "CorpPerks-RABTUL Integration" "integrations/corpperks-rabtul" 3010
start_service "Unified Dashboard" "unified-dashboard" 3012

echo ""
echo "=========================================="
echo "   ALL SERVICES STARTED"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  🌐 API Gateway:  http://localhost:3000"
echo "  📖 Help Center:  http://localhost:3001"
echo "  🔐 SSO Service:  http://localhost:3015"
echo "  💰 Billing:      http://localhost:3016"
echo "  📚 API Docs:      http://localhost:3017"
echo "  🔗 Integration:  http://localhost:3010"
echo "  📊 Dashboard:    http://localhost:3012"
echo ""
echo "=========================================="
echo ""
echo "Demo Credentials:"
echo "  SSO: demo@rtmn.com / demo123"
echo ""
echo "To stop all services: ./stop-all.sh"
echo "To use Docker: docker-compose up -d"
