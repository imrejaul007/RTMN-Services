#!/bin/bash
# LawGens Health Check Script
# Usage: ./scripts/health-check.sh [service] [port]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
SERVICE="${1:-all}"
PORT="${2:-}"

# Services configuration
declare -A SERVICES=(
    ["web"]="3001"
    ["contract-os"]="4190"
    ["api"]="5099"
)

check_service() {
    local name=$1
    local port=$2

    echo -n "Checking $name (port $port)... "

    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    elif curl -sf "http://localhost:$port/health/live" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

check_mongodb() {
    echo -n "Checking MongoDB... "
    if mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${YELLOW}⚠ UNKNOWN${NC}"
    fi
}

check_redis() {
    echo -n "Checking Redis... "
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${YELLOW}⚠ UNKNOWN${NC}"
    fi
}

# Main
echo "=========================================="
echo "LawGens Health Check"
echo "=========================================="
echo ""

if [ "$SERVICE" == "all" ]; then
    for svc in "${!SERVICES[@]}"; do
        check_service "$svc" "${SERVICES[$svc]}"
    done
    check_mongodb
    check_redis
elif [ "$SERVICE" == "mongodb" ]; then
    check_mongodb
elif [ "$SERVICE" == "redis" ]; then
    check_redis
else
    if [ -n "$PORT" ]; then
        check_service "$SERVICE" "$PORT"
    elif [ -n "${SERVICES[$SERVICE]}" ]; then
        check_service "$SERVICE" "${SERVICES[$SERVICE]}"
    else
        echo -e "${RED}Unknown service: $SERVICE${NC}"
        exit 1
    fi
fi

echo ""
echo "=========================================="