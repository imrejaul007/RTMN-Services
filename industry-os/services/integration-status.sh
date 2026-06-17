#!/bin/bash

# RTMN Workforce OS - Integration Status Check

echo "╔══════════════════════════════════════════════════════════════════════════════════════════╗"
echo "║              RTMN WORKFORCE OS - INTEGRATION STATUS DASHBOARD                        ║"
echo "╚══════════════════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
RUNNING=0
NOT_RUNNING=0

check_service() {
    TOTAL=$((TOTAL + 1))
    local port=$1
    local name=$2

    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health | grep -q "200\|healthy"; then
        echo -e "   ${GREEN}✅${NC} Port $port - $name"
        RUNNING=$((RUNNING + 1))
    else
        echo -e "   ${RED}❌${NC} Port $port - $name"
        NOT_RUNNING=$((NOT_RUNNING + 1))
    fi
}

echo "🏭 WORKFORCE OS SUITE:"
check_service 5065 "Workforce OS Core"
check_service 5066 "Talent OS"
check_service 5068 "Learning OS"
check_service 5072 "Organization OS"
check_service 5073 "Workforce Intelligence"
check_service 5085 "Cross-OS Integration Hub"

echo ""
echo "🏢 25 INDUSTRY OS SERVICES:"
check_service 5010 "Restaurant OS"
check_service 5020 "Healthcare OS"
check_service 5025 "Hotel OS"
check_service 5030 "Retail OS"
check_service 5035 "Legal OS"
check_service 5050 "Hospitality OS"
check_service 5055 "Sales OS"
check_service 5060 "Education OS"
check_service 5080 "Automotive OS"
check_service 5090 "Beauty OS"
check_service 5110 "Fitness OS"
check_service 5120 "Gaming OS"
check_service 5130 "Government OS"
check_service 5140 "HomeServices OS"
check_service 5150 "Manufacturing OS"
check_service 5160 "NonProfit OS"
check_service 5170 "Professional OS"
check_service 5180 "Sports OS"
check_service 5190 "Travel OS"
check_service 5200 "Entertainment OS"
check_service 5210 "Construction OS"
check_service 5220 "Financial OS"
check_service 5230 "RealEstate OS"
check_service 5240 "Transport OS"
check_service 5600 "Media OS"

echo ""
echo "🔧 FOUNDATION SERVICES:"
check_service 4702 "CorpID"
check_service 4703 "Memory OS"
check_service 4705 "TwinOS Hub"
check_service 4510 "Event Bus"
check_service 4242 "Goal OS"
check_service 4000 "GraphQL Federation"

echo ""
echo "💰 RABTUL SERVICES:"
check_service 4001 "API Gateway"
check_service 4002 "Auth Service"
check_service 4004 "Wallet Service"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════════════════╗"
echo "║                                 SUMMARY                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "   Total Services Checked: $TOTAL"
echo -e "   ${GREEN}Running: $RUNNING${NC}"
echo -e "   ${RED}Not Running: $NOT_RUNNING${NC}"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════════════════╗"
echo "║                            INTEGRATION TESTS                                            ║"
echo "╚══════════════════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Test Cross-OS Hub functionality
echo "🌐 Testing Cross-OS Integration Hub..."

# Test 1: Get industries
echo -n "   📋 Industries: "
if curl -s http://localhost:5085/api/industries | jq -e 'length > 0' > /dev/null 2>&1; then
    COUNT=$(curl -s http://localhost:5085/api/industries | jq -r '. | length')
    echo -e "${GREEN}✅ Connected ($COUNT industries)${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test 2: Assign employee to industry
echo -n "   👤 Employee Assignment: "
if curl -s -X POST http://localhost:5085/api/employees/TEST001/assign \
    -H "Content-Type: application/json" \
    -d '{"industries": ["hospitality"], "role": "Chef"}' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Working${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test 3: Skills gap analysis
echo -n "   📊 Skills Gap: "
if curl -s http://localhost:5085/api/industries/hospitality/skills-gap | jq -e '.industryName' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Working${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test 4: Workforce analytics
echo -n "   📈 Workforce Analytics: "
if curl -s http://localhost:5085/api/analytics/workforce | jq -e '.totalEmployees' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Working${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test 5: Industry OS sync
echo -n "   🔄 Restaurant OS Sync: "
if curl -s -X POST http://localhost:5010/api/staff \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Staff", "role": "chef"}' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Working${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════════════════╗"
echo "║                              NEXT STEPS                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "   1. To start services: cd industry-os/services && ./start-workforce-os.sh start"
echo "   2. To deploy: render blueprint apply --spec render.yaml"
echo "   3. To add AI: Set OPENAI_API_KEY and ANTHROPIC_API_KEY in .env"
echo "   4. For MongoDB: Set MONGODB_URI in .env"
echo ""
echo "   📚 Docs: industry-os/services/INTEGRATION-MATRIX.md"
echo ""
