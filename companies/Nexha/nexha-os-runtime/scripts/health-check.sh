#!/usr/bin/env bash
# Nexha OS — Health Check Script (v1.0)
# Checks all running services and reports their health status.
# Usage: bash scripts/health-check.sh [--watch]

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$(dirname "$SCRIPT_DIR")"

DC=$(command -v docker compose >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

WATCH=""
[[ "${1:-}" == "--watch" ]] && WATCH="yes"

# Service definitions: name → health_endpoint
# Names match container_name in docker-compose.yml
SERVICES=(
  # Foundation (all tiers)
  "nexha-gateway:5002:/health"
  "nexha-corpid:4702:/health"
  "nexha-memory:4703:/health"
  "nexha-twinos:4705:/health"
  # Standard (SUTAR + network)
  "nexha-sutar-gateway:4140:/health"
  "nexha-trust-engine:4291:/api/v1/sada/status"
  "nexha-contract-os:4292:/health"
  "nexha-negotiation-engine:4295:/health"
  "nexha-economy-os:4294:/health"
  "nexha-business-directory:4360:/health"
  "nexha-partner-graph:4363:/health"
  "nexha-commerce-runtime:4364:/health"
  # Phase D (new network services)
  "nexha-contract-network:4289:/health"
  "nexha-compliance-network:4290:/health"
  "nexha-payment-network:4296:/health"
  "nexha-partner-network:4297:/health"
  # Enterprise
  "nexha-capability-os:4270:/health"
  "nexha-acp-messaging:4340:/health"
  "nexha-agent-marketplace:4250:/health"
  "nexha-mission-planner:4362:/health"
)

run_check() {
  echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   Nexha OS — Health Check ($(date '+%H:%M:%S'))         ║${NC}"
  echo -e "${BLUE}╠══════════════════════════════════════════════════════╣${NC}"
  echo -e "${BLUE}║  Container          Port   Status   Latency           ║${NC}"
  echo -e "${BLUE}╠══════════════════════════════════════════════════════╣${NC}"

  ALL_OK=0
  TOTAL=0

  for entry in "${SERVICES[@]}"; do
    IFS=':' read -r NAME PORT PATH <<< "$entry"
    TOTAL=$((TOTAL + 1))

    # Check if container is running
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${NAME}$"; then
      printf "  %-20s %-6s ${RED}✗ NOT RUNNING${NC}\n" "$NAME" "$PORT"
      ALL_OK=1
      continue
    fi

    # Health check via curl
    START_MS=$(python3 -c "import time; print(int(time.time()*1000))" 2>/dev/null || echo "0")
    HTTP_CODE=$(curl -sf --max-time 3 -o /dev/null -w "%{http_code}" "http://localhost:$PORT$PATH" 2>/dev/null || echo "000")
    END_MS=$(python3 -c "import time; print(int(time.time()*1000))" 2>/dev/null || echo "0")
    LATENCY=$((END_MS - START_MS))

    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "204" ]]; then
      printf "  %-20s %-6s ${GREEN}✓ HEALTHY${NC}   %sms\n" "$NAME" "$PORT" "$LATENCY"
    elif [[ "$HTTP_CODE" == "000" ]]; then
      printf "  %-20s %-6s ${RED}✗ DOWN${NC}       —\n" "$NAME" "$PORT"
      ALL_OK=1
    else
      printf "  %-20s %-6s ${YELLOW}⚠ DEGRADED${NC} %s (%s)\n" "$NAME" "$PORT" "$LATENCY" "$HTTP_CODE"
    fi
  done

  echo -e "${BLUE}╠══════════════════════════════════════════════════════╣${NC}"

  # Also show docker compose status
  echo -e "${BLUE}║  Docker Compose Status:${NC}"
  $DC ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | grep -v "NAME" | while read -r line; do
    echo -e "${BLUE}║    $line${NC}"
  done

  echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"

  if [[ $ALL_OK -eq 0 ]]; then
    echo -e "${GREEN}✓ All services healthy${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠ Some services need attention${NC}"
    return 1
  fi
}

if [[ -n "$WATCH" ]]; then
  echo -e "${YELLOW}Watch mode — press Ctrl+C to stop${NC}"
  while true; do
    clear
    run_check
    echo ""
    echo "Next check in 30s... (Ctrl+C to stop)"
    sleep 30
  done
else
  run_check
fi
