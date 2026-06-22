#!/bin/bash
# RTMZ Full Deployment Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RTMZ_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  RTMZ Full Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Remove nested git repos
echo -e "${YELLOW}Step 1: Cleaning nested git repos...${NC}"
cd "$RTMZ_ROOT"

for gitdir in $(find apps/mcp apps/services apps/monitoring -name ".git" -type d 2>/dev/null); do
    rm -rf "$gitdir"
    echo "  Removed: $gitdir"
done
echo -e "${GREEN}✓ Done${NC}"
echo ""

# Step 2: Build Docker images
echo -e "${YELLOW}Step 2: Building Docker images...${NC}"
cd "$SCRIPT_DIR"

docker-compose -f docker-compose.prod.yml build --parallel
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 3: Start services
echo -e "${YELLOW}Step 3: Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 4: Wait for services
echo -e "${YELLOW}Step 4: Waiting for services to be healthy...${NC}"
sleep 10

# Check key services
SERVICES=(
    "rez-auth:4002"
    "graphql-gateway:5000"
    "automl:5001"
)

for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    echo -n "  Checking $name... "
    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}Starting...${NC}"
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Services:"
echo "  - REZ Auth:     http://localhost:4002"
echo "  - REZ SSO:      http://localhost:4003"
echo "  - GraphQL:     http://localhost:5000"
echo "  - Dashboard:   http://localhost:3000"
echo ""
echo "MCP Servers (3100-3115)"
echo ""
echo "View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "Stop:      docker-compose -f docker-compose.prod.yml down"
echo ""