#!/bin/bash
# ===================================================================
# RTMN Production Deployment Script
# ===================================================================

set -e

ENV=${1:-production}
BRANCH=${2:-main}

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          RTMN Production Deployment                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Environment: ${BLUE}${ENV}${NC}"
echo -e "Branch:      ${BLUE}${BRANCH}${NC}"
echo ""

# ---- Pre-flight Checks ----
echo -e "${YELLOW}▶ Running pre-flight checks...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Docker installed${NC}"

# Check docker-compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo -e "${RED}❌ docker-compose not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ docker-compose installed${NC}"

# Check .env files
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  .env not found, copying from .env.production${NC}"
  cp .env.production .env
fi
if [ ! -f .env.production ]; then
  echo -e "${RED}❌ .env.production not found${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Environment files present${NC}"

# Check git
if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Git not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Git installed${NC}"

echo ""

# ---- Pull Latest Code ----
echo -e "${YELLOW}▶ Pulling latest code from ${BRANCH}...${NC}"
git fetch origin
git checkout ${BRANCH}
git pull origin ${BRANCH}
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# ---- Backup Database ----
echo -e "${YELLOW}▶ Creating database backup...${NC}"
mkdir -p ./backups
BACKUP_FILE="./backups/backup-$(date +%Y%m%d-%H%M%S).gz"
docker exec rtmn-mongo mongodump --archive | gzip > ${BACKUP_FILE} 2>/dev/null || echo "MongoDB not running yet, skipping backup"
if [ -f ${BACKUP_FILE} ]; then
  echo -e "${GREEN}✅ Backup created: ${BACKUP_FILE}${NC}"
fi
echo ""

# ---- Build Images ----
echo -e "${YELLOW}▶ Building Docker images...${NC}"
docker-compose -f docker-compose.master.yml build --parallel
echo -e "${GREEN}✅ Images built${NC}"
echo ""

# ---- Stop Old Containers ----
echo -e "${YELLOW}▶ Stopping old containers...${NC}"
docker-compose -f docker-compose.master.yml down --remove-orphans
echo -e "${GREEN}✅ Old containers stopped${NC}"
echo ""

# ---- Start New Containers ----
echo -e "${YELLOW}▶ Starting new containers...${NC}"
docker-compose -f docker-compose.master.yml up -d
echo -e "${GREEN}✅ Containers started${NC}"
echo ""

# ---- Wait for Services ----
echo -e "${YELLOW}▶ Waiting for services to be healthy (60s)...${NC}"
sleep 30
echo ""

# ---- Run Health Checks ----
echo -e "${YELLOW}▶ Running health checks...${NC}"
bash scripts/health-check.sh
HEALTH_STATUS=$?
echo ""

# ---- Run Smoke Tests ----
echo -e "${YELLOW}▶ Running smoke tests...${NC}"
bash scripts/smoke-tests.sh
SMOKE_STATUS=$?
echo ""

# ---- Summary ----
echo "─────────────────────────────────────────────────────────────"
if [ $HEALTH_STATUS -eq 0 ] && [ $SMOKE_STATUS -eq 0 ]; then
  echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
  echo ""
  echo "Access points:"
  echo "  - Grafana:     http://localhost:3000 (admin/admin)"
  echo "  - Prometheus:  http://localhost:9090"
  echo "  - SutAR:       http://localhost:4140"
  echo "  - Business Copilot: http://localhost:4600"
  echo "  - Command Center:   http://localhost:4801"
  echo ""
  exit 0
else
  echo -e "${RED}❌ DEPLOYMENT FAILED${NC}"
  echo "Check logs: docker-compose -f docker-compose.master.yml logs"
  exit 1
fi
