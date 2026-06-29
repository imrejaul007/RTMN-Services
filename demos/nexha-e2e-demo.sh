#!/bin/bash
# =============================================================================
# Nexha Agent E2E Demo — Complete AI Commerce Flow
#
# Demonstrates: GPT Agent → Discovery → Supplier → Negotiation → Contract
#            → Payment → Shipment
#
# Prerequisites: Nexha Agent Gateway running at localhost:4443
#               (all other services gracefully fallback to in-memory)
#
# Usage: bash demos/nexha-e2e-demo.sh
# =============================================================================

set -e

GATEWAY="http://localhost:4443"
API_KEY="demo-key-1234567890"
HEADER="Authorization: NexhaKey $API_KEY"
CT="Content-Type: application/json"
TMP=$(mktemp)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[nexha]${NC} $1"; }
step() { echo -e "\n${YELLOW}━━━ $1 ━━━${NC}"; }
ok() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

# Check gateway health
check() {
  log "Checking gateway at $GATEWAY..."
  if curl -sf "$GATEWAY/health" > /dev/null 2>&1; then
    ok "Gateway is healthy"
  else
    fail "Gateway not running at $GATEWAY. Start with: cd companies/Nexha/services/nexha-agent-gateway && npm run dev"
  fi
}

# POST helper
post() {
  local path=$1
  local body=$2
  curl -sf -X POST "$GATEWAY$path" \
    -H "$HEADER" \
    -H "$CT" \
    -d "$body"
}

# GET helper
get() {
  local path=$1
  curl -sf "$GATEWAY$path" \
    -H "$HEADER"
}

# =============================================================================
# STEP 1: Discovery — Find suppliers
# =============================================================================
step "1. DISCOVERY — AI agent searches for hotel linen suppliers"

RESP=$(post "/v1/discover/suppliers" '{
  "product": "bath towels",
  "location": "Dubai",
  "country": "UAE",
  "min_trust": 85,
  "limit": 3
}')

echo "$RESP" | python3 -m json.tool 2>/dev/null || echo "$RESP"

SUPPLIER_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['results'][0]['supplier_id'])")
SUPPLIER_NAME=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['results'][0]['name'])")
TRUST=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['results'][0]['trust_score'])")

ok "Found supplier: $SUPPLIER_NAME (trust: $TRUST)"
log "Selected: $SUPPLIER_ID"

# =============================================================================
# STEP 2: Trust — Verify the supplier
# =============================================================================
step "2. TRUST — Verify supplier trust score"

TRUST_RESP=$(get "/v1/trust/$(echo $SUPPLIER_ID | python3 -c "import sys; import urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))")")

echo "$TRUST_RESP" | python3 -m json.tool 2>/dev/null || echo "$TRUST_RESP"

OVERALL=$(echo "$TRUST_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['overall'])")
VERIFIED=$(echo "$TRUST_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ Government ID' if d['data']['verified']['government_id'] else '❌')")

ok "Trust score: $OVERALL/100 — $VERIFIED"

# =============================================================================
# STEP 3: Negotiation — Start AI-to-AI price negotiation
# =============================================================================
step "3. NEGOTIATION — Start AI-to-AI negotiation for 2000 towels"

NEG_RESP=$(post "/v1/negotiate/start" "$(cat << EOF
{
  "supplier_id": "$SUPPLIER_ID",
  "product": "Bath Towels Premium",
  "quantity": 2000,
  "target_price": 4.50,
  "delivery_days": 7
}
EOF
)")

echo "$NEG_RESP" | python3 -m json.tool 2>/dev/null || echo "$NEG_RESP"

NEG_ID=$(echo "$NEG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['negotiation_id'])")
STATUS=$(echo "$NEG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['status'])")
PRICE=$(echo "$NEG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['current_offer']['unit_price'])")
TOTAL=$(echo "$NEG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['current_offer']['total'])")

ok "Negotiation ID: $NEG_ID"
log "Status: $STATUS — Initial offer: \$$PRICE/unit → Total: \$$TOTAL"

# =============================================================================
# STEP 4: Counter — AI agent counters with lower price
# =============================================================================
step "4. COUNTER — Agent counters at \$4.25/unit"

COUNTER_RESP=$(post "/v1/negotiate/counter" "$(cat << EOF
{
  "negotiation_id": "$NEG_ID",
  "target_price": 4.25,
  "message": "Happy to proceed at \$4.25/unit for this volume order."
}
EOF
)")

echo "$COUNTER_RESP" | python3 -m json.tool 2>/dev/null || echo "$COUNTER_RESP"

COUNTER_PRICE=$(echo "$COUNTER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['current_offer']['unit_price'])")
COUNTER_TOTAL=$(echo "$COUNTER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['current_offer']['total'])")

ok "Counter offer: \$$COUNTER_PRICE/unit → Total: \$$COUNTER_TOTAL"

# =============================================================================
# STEP 5: Accept — Supplier accepts terms
# =============================================================================
step "5. ACCEPT — Supplier accepts the counter offer"

ACCEPT_RESP=$(post "/v1/negotiate/accept" "$(cat << EOF
{ "negotiation_id": "$NEG_ID" }
EOF
)")

ACCEPT_STATUS=$(echo "$ACCEPT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['status'])")
ok "Negotiation status: $ACCEPT_STATUS"

# =============================================================================
# STEP 6: Contract — Generate purchase order
# =============================================================================
step "6. CONTRACT — Generate purchase order from accepted negotiation"

CONTRACT_RESP=$(post "/v1/contracts/create" "$(cat << EOF
{ "negotiation_id": "$NEG_ID" }
EOF
)")

echo "$CONTRACT_RESP" | python3 -m json.tool 2>/dev/null || echo "$CONTRACT_RESP"

CONTRACT_ID=$(echo "$CONTRACT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['contract_id'])")
CONTRACT_NUM=$(echo "$CONTRACT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['contract_number'])")
CONTRACT_STATUS=$(echo "$CONTRACT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['status'])")

ok "Contract: $CONTRACT_NUM"
log "Status: $CONTRACT_STATUS — ID: $CONTRACT_ID"

# =============================================================================
# STEP 7: Payment — Initiate escrow payment
# =============================================================================
step "7. PAYMENT — Initiate escrow payment of \$$COUNTER_TOTAL"

PAYMENT_RESP=$(post "/v1/payments/initiate" "$(cat << EOF
{
  "contract_id": "$CONTRACT_ID",
  "amount": $COUNTER_TOTAL,
  "currency": "USD",
  "escrow": true
}
EOF
)")

echo "$PAYMENT_RESP" | python3 -m json.tool 2>/dev/null || echo "$PAYMENT_RESP"

PAYMENT_ID=$(echo "$PAYMENT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['payment_id'])")
PAYMENT_STATUS=$(echo "$PAYMENT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['status'])")
ESCROW_ID=$(echo "$PAYMENT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['escrow_id'])")

ok "Payment ID: $PAYMENT_ID — Status: $PAYMENT_STATUS"
log "Escrow: $ESCROW_ID — Funds secured until delivery"

# =============================================================================
# STEP 8: Logistics — Create shipment
# =============================================================================
step "8. LOGISTICS — Create shipment for Dubai delivery"

SHIP_RESP=$(curl -sf -X POST "$GATEWAY/v1/shipments/create" \
  -H "$HEADER" \
  -H "$CT" \
  -d "$(cat << EOF
{
  "contract_id": "$CONTRACT_ID",
  "origin": "Dubai",
  "destination": "Abu Dhabi Hotel",
  "provider": "DHL",
  "goods": { "description": "Bath Towels Premium", "quantity": 2000 }
}
EOF
)")

echo "$SHIP_RESP" | python3 -m json.tool 2>/dev/null || echo "$SHIP_RESP"

SHIP_ID=$(echo "$SHIP_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['shipment_id'])")
TRACKING=$(echo "$SHIP_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tracking_number'])")
SHIP_STATUS=$(echo "$SHIP_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])")

ok "Shipment: $SHIP_ID"
log "Tracking: $TRACKING — Status: $SHIP_STATUS"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  E2E Demo Complete — Full AI Commerce Flow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Supplier:    $SUPPLIER_NAME ($SUPPLIER_ID)"
echo "  Trust:       $OVERALL/100"
echo "  Negotiation: $NEG_ID"
echo "  Contract:    $CONTRACT_NUM ($CONTRACT_ID)"
echo "  Payment:    $PAYMENT_ID — $PAYMENT_STATUS"
echo "  Escrow:     $ESCROW_ID"
echo "  Shipment:   $SHIP_ID — $TRACKING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next: Release payment when shipment is delivered."
echo "  curl -X POST $GATEWAY/v1/payments/$PAYMENT_ID/release -H \"
echo "    \"$HEADER\""

rm -f "$TMP"
