#!/usr/bin/env bash
# Nexha OS — Init Script (v1.0)
# First-run setup: directories, TLS certs, env config, Docker start.
# Usage: bash scripts/init.sh [--force] [--tier lite|standard|enterprise]

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$(dirname "$SCRIPT_DIR")"
FORCE=""
TIER="standard"

while [[ $# -gt 0 ]]; do
  case $1 in
    --force)  FORCE="yes"; shift ;;
    --tier)   TIER="$2"; shift 2 ;;
    *)        echo "Unknown: $1"; exit 1 ;;
  esac
done

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Nexha OS Runtime — Init (v1.0)      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"

# 1. Prerequisites
echo -e "${BLUE}[1/6] Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}✗ Docker not found${NC}"; exit 1; }
DC=$(command -v docker compose >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")
echo -e "  ${GREEN}✓ Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)${NC}"
echo -e "  ${GREEN}✓ Compose: $DC${NC}"

# 2. Directories
echo -e "${BLUE}[2/6] Creating runtime directories...${NC}"
for d in data logs certs config; do
  mkdir -p "$RUNTIME_DIR/$d" && chmod 755 "$RUNTIME_DIR/$d"
  echo -e "  ${GREEN}✓ $RUNTIME_DIR/$d/${NC}"
done

# 3. Environment
echo -e "${BLUE}[3/6] Configuring environment...${NC}"
ENV_FILE="$RUNTIME_DIR/.env"
if [[ ! -f "$ENV_FILE" || -n "$FORCE" ]]; then
cat > "$ENV_FILE" << 'ENV'
# Nexha OS Runtime — Environment
NODE_ENV=development
TZ=Asia/Kolkata

# Federation
FEDERATION_URL=https://federation.nexha.io
FEDERATION_OS_REQUIRE_AUTH=false

# CorpID
CORP_ID_URL=http://corp-id:4702
CORP_ID_REQUIRE_AUTH=false

# Monitoring (Enterprise)
GRAFANA_PASSWORD=nexha

# Nexha Identity (set before joining federation)
# NEXHA_NAME="My Nexha Network"
# NEXHA_REGION=IN
# NEXHA_PUBLIC_KEY="your-public-key-fingerprint"
ENV
  echo -e "  ${GREEN}✓ .env created — edit NEXHA_NAME, NEXHA_REGION, NEXHA_PUBLIC_KEY${NC}"
else
  echo -e "  ${YELLOW}  .env exists (skipping — use --force to overwrite)${NC}"
fi

# 4. TLS certs (self-signed dev)
echo -e "${BLUE}[4/6] Generating TLS certificates...${NC}"
if command -v openssl >/dev/null 2>&1; then
  if [[ ! -f "$RUNTIME_DIR/certs/nexus.crt" || -n "$FORCE" ]]; then
    openssl req -x509 -newkey rsa:2048 -nodes \
      -keyout "$RUNTIME_DIR/certs/nexus.key" \
      -out "$RUNTIME_DIR/certs/nexus.crt" \
      -days 365 \
      -subj "/CN=nexha-local/O=Nexha Network/L=Mumbai/ST=Maharashtra/C=IN" 2>/dev/null
    echo -e "  ${GREEN}✓ Self-signed TLS cert generated (365 days)${NC}"
  else
    echo -e "  ${YELLOW}  Certs exist (skipping — use --force to regenerate)${NC}"
  fi
else
  echo -e "  ${YELLOW}  openssl not found — skipping TLS (use real certs in prod)${NC}"
fi

# 5. Docker network
echo -e "${BLUE}[5/6] Verifying Docker network...${NC}"
docker network inspect nexha-internal >/dev/null 2>&1 \
  && echo -e "  ${GREEN}✓ Network 'nexha-internal' exists${NC}" \
  || echo -e "  ${YELLOW}  Network will be created by Compose${NC}"

# 6. Build & start
echo -e "${BLUE}[6/6] Building & starting Nexha OS ($TIER tier)...${NC}"
$DC --profile "$TIER" build
$DC --profile "$TIER" up -d --remove-orphans
echo -e "  ${GREEN}✓ Containers started${NC}"

sleep 3
UNHEALTHY=$($DC --profile "$TIER" ps --services --filter health-status=unhealthy 2>/dev/null || true)
[[ -z "$UNHEALTHY" ]] \
  && echo -e "  ${GREEN}✓ All services healthy${NC}" \
  || echo -e "  ${YELLOW}  Some services warming up — run health-check.sh in 30s${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Nexha OS Initialised!                ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Gateway:   http://localhost:5002         ║${NC}"
echo -e "${GREEN}║  CorpID:    http://localhost:4702         ║${NC}"
echo -e "${GREEN}║  MemoryOS:  http://localhost:4703         ║${NC}"
echo -e "${GREEN}║  TwinOS:    http://localhost:4705         ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Next:                                     ║${NC}"
echo -e "${GREEN}║  1. Edit .env with your Nexha identity     ║${NC}"
echo -e "${GREEN}║  2. bash scripts/join-federation.sh       ║${NC}"
echo -e "${GREEN}║  3. bash scripts/health-check.sh            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
