#!/bin/bash

# RTMN TwinOS Services - Startup Script
# Starts all twin services in the correct order

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_DIR="${RTMN_LOG_DIR:-./logs}"
PORT_START=4705

# Create log directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           RTMN TwinOS Services - Startup Script            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a port is in use
port_in_use() {
    lsof -i:$1 >/dev/null 2>&1
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url/health" >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} $name is ready"
            return 0
        fi
        sleep 0.5
        attempt=$((attempt + 1))
    done

    echo -e "  ${RED}✗${NC} $name failed to start"
    return 1
}

# Kill existing processes on twin ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
for port in 4705 4730 4710 4720 4876 4880 4885 4886 4887 4888 4889 4890 4892 4894 4895 4896; do
    if port_in_use $port; then
        pid=$(lsof -ti:$port)
        kill $pid 2>/dev/null || true
        echo "  Killed process on port $port"
    fi
done
sleep 1

echo ""
echo -e "${BLUE}Starting TwinOS Services...${NC}"
echo ""

# Track started services
declare -a started_services
failed=0

# 1. Start TwinOS Hub (Foundation - must start first)
echo -e "${YELLOW}[1/15] TwinOS Hub (4705)${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/twinos-hub
npm start > "$LOG_DIR/twinos-hub.log" 2>&1 &
started_services+=("twinos-hub")
sleep 2
if wait_for_service "http://localhost:4705" "TwinOS Hub"; then
    echo -e "  ${GREEN}✓ TwinOS Hub running on port 4705${NC}"
else
    echo -e "  ${RED}✗ TwinOS Hub failed to start${NC}"
    failed=1
fi

# 2. Employee Twin
echo -e "${YELLOW}[2/15] Employee Twin (4730)${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/employee-twin
npm start > "$LOG_DIR/employee-twin.log" 2>&1 &
started_services+=("employee-twin")
sleep 1
if wait_for_service "http://localhost:4730" "Employee Twin"; then
    echo -e "  ${GREEN}✓ Employee Twin running on port 4730${NC}"
else
    echo -e "  ${RED}✗ Employee Twin failed to start${NC}"
fi

# 3. Organization Twin
echo -e "${YELLOW}[3/15] Organization Twin (4710)${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/organization-twin
npm start > "$LOG_DIR/organization-twin.log" 2>&1 &
started_services+=("organization-twin")
sleep 1
if wait_for_service "http://localhost:4710" "Organization Twin"; then
    echo -e "  ${GREEN}✓ Organization Twin running on port 4710${NC}"
else
    echo -e "  ${RED}✗ Organization Twin failed to start${NC}"
fi

# 4. Product Twin
echo -e "${YELLOW}[4/15] Product Twin (4720)${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/product-twin
npm start > "$LOG_DIR/product-twin.log" 2>&1 &
started_services+=("product-twin")
sleep 1
if wait_for_service "http://localhost:4720" "Product Twin"; then
    echo -e "  ${GREEN}✓ Product Twin running on port 4720${NC}"
else
    echo -e "  ${RED}✗ Product Twin failed to start${NC}"
fi

# 5. Voice Twin
echo -e "${YELLOW}[5/15] Voice Twin (4876)${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/voice-twin
npm start > "$LOG_DIR/voice-twin.log" 2>&1 &
started_services+=("voice-twin")
sleep 1
if wait_for_service "http://localhost:4876" "Voice Twin"; then
    echo -e "  ${GREEN}✓ Voice Twin running on port 4876${NC}"
else
    echo -e "  ${RED}✗ Voice Twin failed to start${NC}"
fi

# 6. Asset Twin
echo -e "${YELLOW}[6/15] Asset Twin (4890)${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/asset-twin
npm start > "$LOG_DIR/asset-twin.log" 2>&1 &
started_services+=("asset-twin")
sleep 1
if wait_for_service "http://localhost:4890" "Asset Twin"; then
    echo -e "  ${GREEN}✓ Asset Twin running on port 4890${NC}"
else
    echo -e "  ${RED}✗ Asset Twin failed to start${NC}"
fi

# 7. Partner Twin
echo -e "${YELLOW}[7/15] Partner Twin (4892)${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/partner-twin
npm start > "$LOG_DIR/partner-twin.log" 2>&1 &
started_services+=("partner-twin")
sleep 1
if wait_for_service "http://localhost:4892" "Partner Twin"; then
    echo -e "  ${GREEN}✓ Partner Twin running on port 4892${NC}"
else
    echo -e "  ${RED}✗ Partner Twin failed to start${NC}"
fi

# 8. Lead Twin
echo -e "${YELLOW}[8/15] Lead Twin (4894)${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/lead-twin
npm start > "$LOG_DIR/lead-twin.log" 2>&1 &
started_services+=("lead-twin")
sleep 1
if wait_for_service "http://localhost:4894" "Lead Twin"; then
    echo -e "  ${GREEN}✓ Lead Twin running on port 4894${NC}"
else
    echo -e "  ${RED}✗ Lead Twin failed to start${NC}"
fi

# 9. Order Twin (Commerce)
echo -e "${YELLOW}[9/15] Order Twin (4885) - Commerce${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/order-twin
npm start > "$LOG_DIR/order-twin.log" 2>&1 &
started_services+=("order-twin")
sleep 1
if wait_for_service "http://localhost:4885" "Order Twin"; then
    echo -e "  ${GREEN}✓ Order Twin running on port 4885${NC}"
else
    echo -e "  ${RED}✗ Order Twin failed to start${NC}"
fi

# 10. Customer Twin
echo -e "${YELLOW}[10/15] Customer Twin (4895) - Commerce${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/customer-twin
npm start > "$LOG_DIR/customer-twin.log" 2>&1 &
started_services+=("customer-twin")
sleep 1
if wait_for_service "http://localhost:4895" "Customer Twin"; then
    echo -e "  ${GREEN}✓ Customer Twin running on port 4895${NC}"
else
    echo -e "  ${RED}✗ Customer Twin failed to start${NC}"
fi

# 11. Wallet Twin
echo -e "${YELLOW}[11/15] Wallet Twin (4896) - Commerce${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/wallet-twin
npm start > "$LOG_DIR/wallet-twin.log" 2>&1 &
started_services+=("wallet-twin")
sleep 1
if wait_for_service "http://localhost:4896" "Wallet Twin"; then
    echo -e "  ${GREEN}✓ Wallet Twin running on port 4896${NC}"
else
    echo -e "  ${RED}✗ Wallet Twin failed to start${NC}"
fi

# 12. Payment Twin
echo -e "${YELLOW}[12/15] Payment Twin (4886) - Commerce${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/payment-twin
npm start > "$LOG_DIR/payment-twin.log" 2>&1 &
started_services+=("payment-twin")
sleep 1
if wait_for_service "http://localhost:4886" "Payment Twin"; then
    echo -e "  ${GREEN}✓ Payment Twin running on port 4886${NC}"
else
    echo -e "  ${RED}✗ Payment Twin failed to start${NC}"
fi

# 13. Inventory Twin
echo -e "${YELLOW}[13/15] Inventory Twin (4887) - Commerce${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/inventory-twin
npm start > "$LOG_DIR/inventory-twin.log" 2>&1 &
started_services+=("inventory-twin")
sleep 1
if wait_for_service "http://localhost:4887" "Inventory Twin"; then
    echo -e "  ${GREEN}✓ Inventory Twin running on port 4887${NC}"
else
    echo -e "  ${RED}✗ Inventory Twin failed to start${NC}"
fi

# 14. Merchant Twin
echo -e "${YELLOW}[14/15] Merchant Twin (4888) - Commerce${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/merchant-twin
npm start > "$LOG_DIR/merchant-twin.log" 2>&1 &
started_services+=("merchant-twin")
sleep 1
if wait_for_service "http://localhost:4888" "Merchant Twin"; then
    echo -e "  ${GREEN}✓ Merchant Twin running on port 4888${NC}"
else
    echo -e "  ${RED}✗ Merchant Twin failed to start${NC}"
fi

# 15. User Twin
echo -e "${YELLOW}[15/15] User Twin (4889) - People${NC}"
cd /Users/rejaulkarim/Documents/RTMN/services/user-twin
npm start > "$LOG_DIR/user-twin.log" 2>&1 &
started_services+=("user-twin")
sleep 1
if wait_for_service "http://localhost:4889" "User Twin"; then
    echo -e "  ${GREEN}✓ User Twin running on port 4889${NC}"
else
    echo -e "  ${RED}✗ User Twin failed to start${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    STARTUP COMPLETE                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Summary
echo -e "${YELLOW}Service Status:${NC}"
for port in 4705 4730 4710 4720 4876 4885 4886 4887 4888 4889 4890 4892 4894 4895 4896; do
    if port_in_use $port; then
        echo -e "  ${GREEN}✓${NC} Port $port - $(lsof -ti:$port | xargs ps -o comm= 2>/dev/null | head -1)"
    else
        echo -e "  ${RED}✗${NC} Port $port - Not running"
    fi
done

echo ""
echo -e "${YELLOW}Log files:${NC} $LOG_DIR/*.log"
echo ""
echo -e "${BLUE}TwinOS Hub API:${NC} http://localhost:4705"
echo -e "${BLUE}Twin Registry:${NC} http://localhost:4705/api/twins"
echo -e "${BLUE}Health Check:${NC} http://localhost:4705/health"
echo ""

# Keep script running
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${YELLOW}Or run './stop-twins.sh' to stop gracefully${NC}"

# Wait for interrupt
wait
