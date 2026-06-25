#!/usr/bin/env bash
# Nexha OS — Auto-Provision Script (v1.0)
# Runs on first boot: creates Nexha identity, seeds agents, initializes CapabilityOS.
# Safe to re-run (idempotent — checks if already provisioned).
#
# Usage: bash scripts/provision.sh [--force]
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

FORCE=""
[[ "${1:-}" == "--force" ]] && FORCE="yes"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env
if [[ -f "$RUNTIME_DIR/.env" ]]; then
  set -a; source "$RUNTIME_DIR/.env"; set +a
fi

CORPID_URL="${CORP_ID_URL:-http://corp-id:4702}"
CAPABILITY_URL="${CAPABILITY_OS_URL:-http://capability-os:4270}"

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Nexha OS — Auto-Provision (v1.0)       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"

# ── 1. Wait for CorpID ────────────────────────────────────────────────
echo -e "${BLUE}[1/5] Waiting for CorpID...${NC}"
MAX_WAIT=60
WAITED=0
until curl -sf --max-time 3 "$CORPID_URL/health" > /dev/null 2>&1; do
  sleep 2
  WAITED=$((WAITED + 2))
  if [[ $WAITED -ge $MAX_WAIT ]]; then
    echo -e "  ${RED}✗ CorpID not reachable after ${MAX_WAIT}s${NC}"
    exit 1
  fi
  echo -e "  ${YELLOW}  waiting...${NC}"
done
echo -e "  ${GREEN}✓ CorpID is healthy${NC}"

# ── 2. Check if already provisioned ──────────────────────────────────
PROVISION_FILE="$RUNTIME_DIR/.nexha-provisioned"
if [[ -f "$PROVISION_FILE" && -z "$FORCE" ]]; then
  echo -e "${BLUE}[2/5] Already provisioned — skipping${NC}"
  echo -e "${GREEN}✓ Provisioning complete (skip)${NC}"
  exit 0
fi

# ── 3. Create Nexha identity in CorpID ────────────────────────────────
echo -e "${BLUE}[2/5] Creating Nexha identity in CorpID...${NC}"

# Generate a stable Nexha ID from the name (deterministic, not random)
NEXHA_ID=$(echo "${NEXHA_NAME:-My Nexha}" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9' | head -c 16)
TIMESTAMP=$(date +%s%3N)

PAYLOAD=$(cat << EOF
{
  "type": "nexha",
  "name": "${NEXHA_NAME:-My Nexha Network}",
  "region": "${NEXHA_REGION:-IN}",
  "contactEmail": "${NEXHA_CONTACT_EMAIL:-admin@nexha.local}",
  "publicKey": "${NEXHA_PUBLIC_KEY:-fp:local-dev-key}",
  "metadata": {
    "osVersion": "nexha-os-1.5.0",
    "provisionedAt": $TIMESTAMP,
    "tier": "${NEXHA_TIER:-standard}"
  }
}
EOF
)

NEXHA_ID_RESULT=$(curl -sf --max-time 10 -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$CORPID_URL/api/v1/identities" 2>&1) || {
  echo -e "  ${YELLOW}  CorpID identity create failed (may already exist): ${NEXHA_ID_RESULT}${NC}"
}

# Save NEXHA_ID to .env
if [[ -n "$NEXHA_ID_RESULT" ]]; then
  ASSIGNED=$(echo "$NEXHA_ID_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null || echo "")
  if [[ -n "$ASSIGNED" ]]; then
    NEXHA_ID="$ASSIGNED"
    if grep -q "^NEXHA_ID=" "$RUNTIME_DIR/.env" 2>/dev/null; then
      sed -i.bak "s/^NEXHA_ID=.*/NEXHA_ID=$NEXHA_ID/" "$RUNTIME_DIR/.env"
    else
      echo "NEXHA_ID=$NEXHA_ID" >> "$RUNTIME_DIR/.env"
    fi
    echo -e "  ${GREEN}✓ Nexha identity created: $NEXHA_ID${NC}"
  else
    echo -e "  ${YELLOW}  Could not parse Nexha ID from CorpID response${NC}"
  fi
fi

# ── 4. Seed 8 foundational agents ─────────────────────────────────────
echo -e "${BLUE}[3/5] Seeding 8 foundational agents...${NC}"

AGENTS=(
  "orchestrator:Orchestrator Agent:coordinates all other agents"
  "matchmaker:Matchmaker Agent:matches capabilities with federation peers"
  "negotiator:Negotiator Agent:handles contract and deal negotiations"
  "monitor:Monitor Agent:tracks health and performance of all services"
  "security:Security Agent:manages trust scores and compliance"
  "discovery:Discovery Agent:finds new opportunities and peers"
  "analytics:Analytics Agent:generates business intelligence reports"
  "comms:Communications Agent:manages ACP messaging and notifications"
)

for agent_spec in "${AGENTS[@]}"; do
  IFS=':' read -r agent_id agent_name agent_desc <<< "$agent_spec"

  AGENT_PAYLOAD=$(cat << EOF
{
  "id": "$agent_id",
  "name": "$agent_name",
  "type": "nexha-foundational",
  "description": "$agent_desc",
  "capabilities": ["$agent_id"],
  "status": "active",
  "nexhaId": "${NEXHA_ID:-local}",
  "metadata": { "layer": "foundational", "tier": "system" }
}
EOF
)

  RESULT=$(curl -sf --max-time 5 -X POST \
    -H "Content-Type: application/json" \
    -d "$AGENT_PAYLOAD" \
    "$CORPID_URL/api/v1/agents" 2>&1) || true

  echo -e "  ${GREEN}✓${NC} $agent_name"
done

# ── 5. Initialize CapabilityOS (if running) ──────────────────────────
echo -e "${BLUE}[4/5] Initializing CapabilityOS...${NC}"
if curl -sf --max-time 3 "$CAPABILITY_URL/health" > /dev/null 2>&1; then
  CAP_PAYLOAD=$(cat << EOF
{
  "name": "${NEXHA_NAME:-My Nexha}",
  "nexhaId": "${NEXHA_ID:-local}",
  "capabilities": ["orchestration", "matching", "negotiation", "monitoring", "security", "discovery", "analytics", "communications"],
  "region": "${NEXHA_REGION:-IN}"
}
EOF
)
  curl -sf --max-time 10 -X POST \
    -H "Content-Type: application/json" \
    -d "$CAP_PAYLOAD" \
    "$CAPABILITY_URL/api/v1/capabilities/init" > /dev/null 2>&1 || true
  echo -e "  ${GREEN}✓ CapabilityOS initialized${NC}"
else
  echo -e "  ${YELLOW}  CapabilityOS not running (normal for non-enterprise tiers)${NC}"
fi

# ── 6. Mark as provisioned ────────────────────────────────────────────
echo -e "${BLUE}[5/5] Marking as provisioned...${NC}"
cat > "$PROVISION_FILE" << EOF
{
  "version": "nexha-os-1.5.0",
  "nexhaId": "${NEXHA_ID:-unknown}",
  "nexhaName": "${NEXHA_NAME:-My Nexha Network}",
  "region": "${NEXHA_REGION:-IN}",
  "provisionedAt": $(date +%s%3N),
  "tier": "${NEXHA_TIER:-standard}"
}
EOF
echo -e "  ${GREEN}✓ .nexha-provisioned written${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Provisioning complete!                  ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Nexha ID: ${NEXHA_ID:-unknown                        }║${NC}"
echo -e "${GREEN}║  Tier:     ${NEXHA_TIER:-standard}                          ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Next: nexha register                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
