#!/bin/bash
# HOJAI SiteOS — Health Check
BASE="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI"

PORTS=(5450 5451 5452 5453 5454 5455 5456 5457 5458 5459 5460 5461 5462 5463 5464 5465 5466 5467 5468 5469 5470 5471 5472 5473 5474)

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

total=0; healthy=0
for port in "${PORTS[@]}"; do
  total=$((total+1))
  if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
    healthy=$((healthy+1))
    echo -e "${GREEN}✓ :$port healthy${NC}"
  else
    echo -e "${RED}✗ :$port down${NC}"
  fi
done

echo ""
echo "──────────────────────────────────────────"
echo "Total: $healthy / $total healthy"
[ $healthy -eq $total ] && echo -e "${GREEN}All systems go!${NC}"
