#!/bin/bash
# RTMZ Deployment Verification Script

set -e

echo "=========================================="
echo "RTMZ Deployment Verification"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_service() {
    local name=$1
    local url=$2
    echo -n "Checking $name... "
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

echo ""
echo "=== Infrastructure ==="
check_service "MongoDB" "http://localhost:27017"
check_service "Redis" "http://localhost:6379"

echo ""
echo "=== Auth Services ==="
check_service "REZ Auth (port 4002)" "http://localhost:4002/health"
check_service "REZ SSO (port 4003)" "http://localhost:4003/health"

echo ""
echo "=== Business Services ==="
check_service "GraphQL Gateway (port 5000)" "http://localhost:5000/health"
check_service "AutoML Pipeline (port 5001)" "http://localhost:5001/health"
check_service "Invoice OCR (port 5002)" "http://localhost:5002/health"
check_service "Contract Management (port 5003)" "http://localhost:5003/health"
check_service "Legal Document AI (port 5004)" "http://localhost:5004/health"
check_service "Cosmic Twin (port 5005)" "http://localhost:5005/health"
check_service "Ranking Service (port 5006)" "http://localhost:5006/health"

echo ""
echo "=== Auth Integration Test ==="
echo "Testing JWT token generation..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:4002/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}' 2>/dev/null || echo '{}')

if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}JWT token generation: OK${NC}"
else
    echo -e "${YELLOW}JWT token generation: Could not test (no test user)${NC}"
fi

echo ""
echo "=== MCP Servers (3100-3115) ==="
check_service "MCP Analytics (port 3100)" "http://localhost:3100/health"
check_service "MCP Identity (port 3101)" "http://localhost:3101/health"
check_service "MCP Event Bus (port 3102)" "http://localhost:3102/health"
check_service "MCP Notification (port 3103)" "http://localhost:3103/health"
check_service "MCP Order (port 3104)" "http://localhost:3104/health"
check_service "MCP Payment (port 3105)" "http://localhost:3105/health"
check_service "MCP Inventory (port 3106)" "http://localhost:3106/health"
check_service "MCP Logs (port 3107)" "http://localhost:3107/health"
check_service "MCP Service Discovery (port 3108)" "http://localhost:3108/health"
check_service "MCP Agent Invoke (port 3109)" "http://localhost:3109/health"
check_service "MCP AutoML (port 3110)" "http://localhost:3110/health"
check_service "MCP Invoice (port 3111)" "http://localhost:3111/health"
check_service "MCP Contracts (port 3112)" "http://localhost:3112/health"
check_service "MCP Legal (port 3113)" "http://localhost:3113/health"
check_service "MCP Cosmic Twin (port 3114)" "http://localhost:3114/health"
check_service "MCP Ranking (port 3115)" "http://localhost:3115/health"

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Services are available at:"
echo "  - REZ Auth:     http://localhost:4002"
echo "  - REZ SSO:      http://localhost:4003"
echo "  - GraphQL:     http://localhost:5000/graphql"
echo "  - Dashboard:   http://localhost:3000"
echo "  - MCP Servers: http://localhost:3100-3115"
echo ""
echo "=== Docker Container Status ==="
docker ps --filter "name=rtmz" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "Docker not available"
