#!/bin/bash
# RTMN Customer Operations OS - Setup All Services
# Run: chmod +x setup-all-services.sh && ./setup-all-services.sh

set -e

echo "=========================================="
echo "RTMN Customer Operations OS - Setup"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter
TOTAL=0
SUCCESS=0
FAILED=0

# Services to setup
SERVICES=(
    "services/customer-intelligence"
    "services/ai-intelligence"
    "services/knowledge-base"
    "services/ticket-engine"
    "services/workflow-engine"
    "services/support-copilot"
    "services/organization-twin"
    "services/product-twin"
    "services/asset-twin"
    "services/employee-twin"
    "services/partner-twin"
    "services/industry-twin"
    "services/order-twin"
    "services/payment-twin"
    "services/subscription-twin"
    "services/shipment-twin"
    "services/invoice-twin"
    "services/warranty-twin"
    "services/lead-twin"
    "services/campaign-twin"
    "services/root-cause-engine"
    "services/decision-engine"
    "services/simulation-engine"
    "services/trust-intelligence"
    "services/journey-intelligence"
    "services/sales-copilot"
    "services/marketing-copilot"
    "services/finance-copilot"
    "services/executive-copilot"
    "services/workflow-marketplace"
    "services/knowledge-marketplace"
    "services/outcome-intelligence"
    "services/universal-graph"
    "services/voice-twin"
    "services/voice-ai-runtime"
    "services/refund-engine"
    "services/resolution-engine"
    "services/auto-approve-engine"
    "services/crowd-intelligence"
    "services/action-registry"
    "services/reports-engine"
    "services/notification-hub"
    "services/hojai-ai-integration"
    "services/rez-integration"
    "services/adbazaar-integration"
    "services/rabtul-integration"
    "services/hospitality-integration"
    "services/healthcare-integration"
    "services/nexha-integration"
    "services/khairmove-integration"
    "services/corpperks-integration"
    "services/assetmind-integration"
    "services/lawgens-integration"
    "services/risnaestate-integration"
    "services/ridza-integration"
    "services/axom-integration"
    "services/crm-engine"
    "services/executive-dashboard"
    "services/ai-briefing"
    "services/cross-ecosystem-bridge"
    "services/live-chat"
    "services/social-hub"
    "services/bpo-manager"
)

echo "Found ${#SERVICES[@]} services"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}Node.js version: $(node --version)${NC}"
echo ""

# Create .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env 2>/dev/null || true
fi

# Setup each service
for service in "${SERVICES[@]}"; do
    TOTAL=$((TOTAL + 1))

    if [ ! -d "$service" ]; then
        echo -e "${YELLOW}Skipping $service (not found)${NC}"
        continue
    fi

    if [ ! -f "$service/package.json" ]; then
        echo -e "${YELLOW}Skipping $service (no package.json)${NC}"
        continue
    fi

    echo -n "Setting up $service... "

    cd "$service"

    # Create .env if not exists
    if [ -f ".env.example" ] && [ ! -f ".env" ]; then
        cp .env.example .env
    fi

    # Install dependencies
    if npm install --legacy-peer-deps > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}✗${NC}"
        FAILED=$((FAILED + 1))
    fi

    cd - > /dev/null
done

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo -e "Total services: $TOTAL"
echo -e "${GREEN}Successful: $SUCCESS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""
echo "Next steps:"
echo "1. Configure .env files with your API keys"
echo "2. Set up MongoDB Atlas and add MONGODB_URI to each service"
echo "3. Run: render blueprint apply render.yaml"
echo ""
