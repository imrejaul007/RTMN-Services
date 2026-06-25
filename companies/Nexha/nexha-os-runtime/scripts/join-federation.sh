#!/usr/bin/env bash
# Nexha OS — Join Federation Script (v1.0)
# Registers this Nexha with the federation at federation.nexha.io.
# Run AFTER init.sh and after editing .env with your identity.
#
# Usage: bash scripts/join-federation.sh [--dry-run]

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$(dirname "$SCRIPT_DIR")"
DRY_RUN=""
FEDERATION_URL="${FEDERATION_URL:-https://federation.nexha.io}"

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN="yes"

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Nexha OS — Join Federation (v1.0)        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"

# Load .env
if [[ -f "$RUNTIME_DIR/.env" ]]; then
  set -a; source "$RUNTIME_DIR/.env"; set +a
fi

# Validate required vars
NEXHA_NAME="${NEXHA_NAME:-}"
NEXHA_REGION="${NEXHA_REGION:-}"
NEXHA_PUBLIC_KEY="${NEXHA_PUBLIC_KEY:-}"

if [[ -z "$NEXHA_NAME" || -z "$NEXHA_REGION" || -z "$NEXHA_PUBLIC_KEY" ]]; then
  echo -e "${RED}✗ Missing required .env variables. Please set:${NC}"
  [[ -z "$NEXHA_NAME" ]]      && echo -e "  ${RED}  NEXHA_NAME${NC}"
  [[ -z "$NEXHA_REGION" ]]    && echo -e "  ${RED}  NEXHA_REGION${NC}"
  [[ -z "$NEXHA_PUBLIC_KEY" ]] && echo -e "  ${RED}  NEXHA_PUBLIC_KEY${NC}"
  echo ""
  echo -e "${YELLOW}Edit $RUNTIME_DIR/.env and try again.${NC}"
  exit 1
fi

echo -e "${BLUE}[1/3] Validating federation endpoint...${NC}"
if curl -sf --max-time 5 "$FEDERATION_URL/health" > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓ FederationOS reachable at $FEDERATION_URL${NC}"
else
  echo -e "  ${YELLOW}  FederationOS not reachable at $FEDERATION_URL${NC}"
  echo -e "  ${YELLOW}  (This is OK for --dry-run or local dev federation)${NC}"
fi

echo -e "${BLUE}[2/3] Building join payload...${NC}"
PAYLOAD=$(cat << EOF
{
  "name": "$NEXHA_NAME",
  "description": "Nexha OS runtime — auto-joined via join-federation.sh",
  "region": "$NEXHA_REGION",
  "contactEmail": "${NEXHA_CONTACT_EMAIL:-admin@nexha.local}",
  "publicKey": "$NEXHA_PUBLIC_KEY",
  "categories": ${NEXHA_CATEGORIES:-["general"]},
  "osVersion": "nexha-os-1.4.0"
}
EOF
)
echo "  Name:        $NEXHA_NAME"
echo "  Region:      $NEXHA_REGION"
echo "  Public Key:  ${NEXHA_PUBLIC_KEY:0:20}..."
echo "  Categories:  ${NEXHA_CATEGORIES:-["general"]}"
echo ""
echo "  Payload:"
echo "$PAYLOAD" | sed 's/^/    /'

if [[ -n "$DRY_RUN" ]]; then
  echo ""
  echo -e "${YELLOW}  Dry-run mode — not actually joining.${NC}"
  echo -e "${YELLOW}  Remove --dry-run to proceed with actual registration.${NC}"
  exit 0
fi

echo -e "${BLUE}[3/3] Registering with federation...${NC}"
echo "  POST $FEDERATION_URL/api/v1/nexhas/join"

RESPONSE=$(curl -sf --max-time 30 -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$FEDERATION_URL/api/v1/nexhas/join" 2>&1) || {
  echo -e "${RED}✗ Federation registration failed:${NC}"
  echo "$RESPONSE"
  exit 1
}

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success','false'))" 2>/dev/null || echo "unknown")
if [[ "$SUCCESS" == "True" || "$SUCCESS" == "true" ]]; then
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   Successfully joined the federation!       ║${NC}"
  echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║  Your Nexha ID: $(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id','N/A'))" 2>/dev/null)${NC}"
  echo -e "${GREEN}║  Status:        observer (pending upgrade)   ║${NC}"
  echo -e "${GREEN}║  Next: Browse peers, initiate handshakes    ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
else
  echo -e "${RED}✗ Registration failed. Check the response above.${NC}"
  exit 1
fi
