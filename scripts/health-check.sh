#!/bin/bash
# ===================================================================
# RTMN Health Check Script
# Checks all 24 deployable services are responding
# ===================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          RTMN Service Health Check                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Services: name|port (space-separated)
SERVICES="corpid-service|4702 memory-os|4703 twinos-hub|4705 decision-engine|4240 goal-os|4242 agent-economy|4251 restaurant-os|5010 healthcare-os|5020 hotel-os|5025 retail-os|5030 legal-os|5035 hospitality-os|5050 education-os|5060 automotive-os|5080 beauty-os|5090 fitness-os|5110 manufacturing-os|5150 realestate-os|5230 agent-twin|3011 area-twin|3012 buyer-twin|3013 deal-twin|3014 property-twin|3015 referral-twin|3016"

# ---- Check Services ----
UP=0
DOWN=0
DOWN_SERVICES=""

for entry in $SERVICES; do
  SERVICE=$(echo "$entry" | cut -d'|' -f1)
  PORT=$(echo "$entry" | cut -d'|' -f2)
  if curl -s -f -o /dev/null --max-time 3 "http://localhost:${PORT}/health" 2>/dev/null; then
    echo -e "${GREEN}✅ ${SERVICE}${NC} (port ${PORT})"
    UP=$((UP+1))
  else
    echo -e "${RED}❌ ${SERVICE}${NC} (port ${PORT})"
    DOWN=$((DOWN+1))
    DOWN_SERVICES="${DOWN_SERVICES}
  - ${SERVICE} (port ${PORT})"
  fi
done

echo ""
echo "─────────────────────────────────────────────────────────────"
echo "Total Services: $((UP + DOWN))"
echo -e "${GREEN}UP:   ${UP}${NC}"
echo -e "${RED}DOWN: ${DOWN}${NC}"
echo "─────────────────────────────────────────────────────────────"

if [ $DOWN -gt 0 ]; then
  echo -e "\nDown services:${DOWN_SERVICES}"
  echo ""
  echo "Start with: bash scripts/start-all.sh"
  exit 1
fi

echo -e "\n${GREEN}🎉 All services are UP!${NC}"
exit 0
