#!/bin/bash
#
# RTMN Industry OS - Unified Ecosystem Startup
# Starts all 28 Industry Operating Systems + Foundation Services
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       RTMN INDUSTRY OS - ECOSYSTEM STARTUP            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICES_DIR="$SCRIPT_DIR/services"

# Function to start a service
start_service() {
    local name=$1
    local port=$2
    local dir=$3

    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠${NC}  $name (port $port) - already running"
        return 0
    fi

    cd "$SERVICES_DIR/$dir"
    npm start >/dev/null 2>&1 &
    local pid=$!
    sleep 1

    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC}  $name (port $port) - started (PID: $pid)"
    else
        echo -e "  ${RED}✗${NC}  $name (port $port) - FAILED"
    fi
}

# Foundation Services (start first)
echo -e "${YELLOW}═══ Foundation Services ═══${NC}"
start_service "Sales OS" 5055 "sales-os"
start_service "Service Registry" 4399 "REZ-ecosystem-connector"
start_service "Event Bus" 4510 "REZ-event-bus"
start_service "GraphQL Federation" 4000 "REZ-graphql-federation"

# Core Industry OS
echo ""
echo -e "${YELLOW}═══ Core Industry OS ═══${NC}"
start_service "Restaurant OS" 5010 "restaurant-os"
start_service "Hotel OS" 5025 "hotel-os"
start_service "Healthcare OS" 5020 "healthcare-os"

# Commerce OS
echo ""
echo -e "${YELLOW}═══ Commerce OS ═══${NC}"
start_service "Retail OS" 5030 "retail-os"
start_service "Legal OS" 5035 "legal-os"
start_service "Hospitality OS" 5050 "hospitality-os"

# Specialized OS
echo ""
echo -e "${YELLOW}═══ Specialized OS ═══${NC}"
start_service "Education OS" 5060 "education-os"
start_service "Agriculture OS" 5070 "agriculture-os"
start_service "Automotive OS" 5080 "automotive-os"
start_service "Beauty OS" 5090 "beauty-os"
start_service "Fashion OS" 5095 "fashion-os"

# Technology OS
echo ""
echo -e "${YELLOW}═══ Technology & Energy OS ═══${NC}"
start_service "Energy OS" 5100 "energy-os"
start_service "Fitness OS" 5110 "fitness-os"
start_service "Gaming OS" 5120 "gaming-os"
start_service "Government OS" 5130 "government-os"
start_service "Home Services OS" 5140 "home-services-os"
start_service "Manufacturing OS" 5150 "manufacturing-os"

# Service & Media OS
echo ""
echo -e "${YELLOW}═══ Service & Media OS ═══${NC}"
start_service "Non-Profit OS" 5160 "non-profit-os"
start_service "Professional OS" 5170 "professional-os"
start_service "Sports OS" 5180 "sports-os"
start_service "Travel OS" 5190 "travel-os"
start_service "Entertainment OS" 5200 "entertainment-os"
start_service "Construction OS" 5210 "construction-os"
start_service "Financial OS" 5220 "financial-os"
start_service "Real Estate OS" 5230 "realestate-os"
start_service "Transport OS" 5240 "transport-os"
start_service "Media OS" 5600 "media-os"

# Sales Bridges (optional - requires Sales OS running)
echo ""
echo -e "${YELLOW}═══ Sales Bridges (Optional) ═══${NC}"
echo "  To start sales bridges:"
echo "  cd $SERVICES_DIR/sales-os/bridges/restaurant && npm start &"
echo ""

# Health Check
echo ""
echo -e "${YELLOW}═══ Health Check ═══${NC}"
sleep 2

services=(
    "Sales OS:5055"
    "Restaurant:5010"
    "Hotel:5025"
    "Healthcare:5020"
    "Retail:5030"
    "Legal:5035"
    "Education:5060"
    "Energy:5100"
    "Media:5600"
)

healthy=0
total=${#services[@]}

for svc in "${services[@]}"; do
    name="${svc%:*}"
    port="${svc#*:}"

    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC}  $name"
        ((healthy++))
    else
        echo -e "  ${RED}✗${NC}  $name"
    fi
done

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e " Ecosystem Status: $healthy/$total core services healthy"
echo -e "══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Access Points:"
echo "  Sales OS Dashboard:     http://localhost:5055"
echo "  Restaurant OS:          http://localhost:5010"
echo "  Hotel OS:              http://localhost:5025"
echo "  Healthcare OS:         http://localhost:5020"
echo "  Service Registry:       http://localhost:4399/api/services"
echo ""
