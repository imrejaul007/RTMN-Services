#!/bin/bash
# =============================================================================
# Hojai WhatsApp AI - Deploy Script
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
SERVICE_NAME="hojai-whatsapp-ai"
PORT=4570
IMAGE_NAME="hojai/whatsapp-ai"

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Hojai WhatsApp AI - Deployment${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required but not installed.${NC}"; exit 1; }

# Check .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env with your API keys${NC}"
fi

# Build Docker image
echo -e "\n${YELLOW}Building Docker image...${NC}"
docker build -t $IMAGE_NAME ./products/hojai-whatsapp-ai

# Stop existing container if running
echo -e "\n${YELLOW}Stopping existing container...${NC}"
docker stop $SERVICE_NAME 2>/dev/null || true
docker rm $SERVICE_NAME 2>/dev/null || true

# Run container
echo -e "\n${YELLOW}Starting container...${NC}"
docker run -d \
    --name $SERVICE_NAME \
    --restart unless-stopped \
    -p $PORT:$PORT \
    --env-file .env \
    --network hojai \
    $IMAGE_NAME

# Wait for container to start
echo -e "\n${YELLOW}Waiting for service to start...${NC}"
sleep 3

# Check health
HEALTH=$(curl -s http://localhost:$PORT/health 2>/dev/null | grep -o "healthy" || echo "unhealthy")

if [ "$HEALTH" = "healthy" ]; then
    echo -e "\n${GREEN}✓ Service deployed successfully!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Health: http://localhost:$PORT/health${NC}"
    echo -e "${GREEN}  Dashboard: http://localhost:$PORT/dashboard/${NC}"
    echo -e "${GREEN}  Onboarding: http://localhost:$PORT/dashboard/onboarding.html${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "\n${RED}✗ Deployment failed. Check logs:${NC}"
    docker logs $SERVICE_NAME
    exit 1
fi

echo -e "\n${BLUE}Deployment complete!${NC}"
