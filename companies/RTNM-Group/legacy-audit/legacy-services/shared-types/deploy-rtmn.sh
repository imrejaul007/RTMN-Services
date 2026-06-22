#!/bin/bash
# ReZ Ecosystem - RTMN Commerce Memory Deployment Script
# Run this script to pull and push all services

set -e

echo "=========================================="
echo "ReZ RTMN Commerce Memory - Deploy Script"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Services to deploy
SERVICES=(
  "rez-intent-graph"
  "rez-search-service"
  "rez-order-service"
  "rez-ads-service"
  "rez-gamification-service"
  "rez-marketing-service"
  "rez-finance-service"
  "Hotel OTA"
  "rez-now"
  "nextabizz"
)

echo -e "${YELLOW}This script will pull and push all RTMN services.${NC}"
echo ""

# Check for uncommitted changes
echo "Checking for uncommitted changes..."
for service in "${SERVICES[@]}"; do
  if [ -d "$service" ]; then
    cd "$service"
    if git diff --quiet 2>/dev/null; then
      : # No changes
    else
      echo -e "${RED}WARNING: $service has uncommitted changes${NC}"
    fi
    cd "$SCRIPT_DIR"
  fi
done

echo ""
echo -e "${GREEN}Starting deployment...${NC}"
echo ""

# Deploy each service
for service in "${SERVICES[@]}"; do
  echo "----------------------------------------"
  echo -e "${YELLOW}Deploying: $service${NC}"

  if [ ! -d "$service" ]; then
    echo -e "${RED}SKIP: Directory not found${NC}"
    continue
  fi

  cd "$service"

  # Pull latest
  echo "Pulling latest..."
  if git pull origin main 2>&1; then
    echo -e "${GREEN}Pull successful${NC}"
  else
    echo -e "${RED}Pull failed - skipping push${NC}"
    cd "$SCRIPT_DIR"
    continue
  fi

  # Push to trigger deploy
  echo "Pushing to trigger deploy..."
  if git push origin main 2>&1; then
    echo -e "${GREEN}Push successful - deploy triggered${NC}"
  else
    echo -e "${RED}Push failed${NC}"
  fi

  cd "$SCRIPT_DIR"
  echo ""
done

echo "=========================================="
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Check deployment status at:"
echo "https://dashboard.render.com"
echo ""
echo "Verify with:"
echo "curl https://rez-intent-graph.onrender.com/health"
echo "=========================================="
