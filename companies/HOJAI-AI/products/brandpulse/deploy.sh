#!/bin/bash
# BrandPulse Deployment Script

set -e

VERSION=${1:-latest}
ENV=${2:-production}

echo "=========================================="
echo "BrandPulse Deployment"
echo "=========================================="
echo "Version: $VERSION"
echo "Environment: $ENV"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo -e "${RED}curl is required but not installed.${NC}"; exit 1; }

echo -e "${GREEN}✓ Docker found${NC}"
echo -e "${GREEN}✓ curl found${NC}"

# Build image
echo ""
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t brandpulse:$VERSION products/brandpulse
docker tag brandpulse:$VERSION brandpulse:$VERSION

# Stop existing container
echo ""
echo -e "${YELLOW}Stopping existing container...${NC}"
docker stop brandpulse 2>/dev/null || true
docker rm brandpulse 2>/dev/null || true

# Run container
echo ""
echo -e "${YELLOW}Starting container...${NC}"
docker run -d \
  --name brandpulse \
  --restart unless-stopped \
  -p 4770:4770 \
  -e NODE_ENV=$ENV \
  -e MONGODB_URI=${MONGODB_URI:-mongodb://localhost:27017/brandpulse} \
  -e REDIS_URL=${REDIS_URL:-redis://localhost:6379} \
  -e API_KEY=${API_KEY:-dev-api-key} \
  -e INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN:-} \
  -e RTNM_GATEWAY_URL=${RTNM_GATEWAY_URL:-http://localhost:4600} \
  brandpulse:$VERSION

# Wait for health check
echo ""
echo -e "${YELLOW}Waiting for service to be healthy...${NC}"
for i in {1..30}; do
  if curl -sf http://localhost:4770/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Service is healthy${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ Service failed to start${NC}"
    docker logs brandpulse
    exit 1
  fi
  sleep 1
done

# Show status
echo ""
echo -e "${GREEN}=========================================="
echo "BrandPulse Deployed Successfully!"
echo "=========================================="
echo ""
echo "API: http://localhost:4770"
echo "Health: http://localhost:4770/health"
echo "Swagger: http://localhost:4770/api/docs/ui"
echo ""
echo "Logs: docker logs -f brandpulse"
echo "Stop: docker stop brandpulse"
echo ""
