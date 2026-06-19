#!/bin/zsh
# Start all HOJAI AI services in dependency order
# Usage: ./start-all.sh

LOG_DIR=/tmp/hojai-start/logs
mkdir -p "$LOG_DIR"
cd "$(dirname "$0")/services"

STARTED=0
FAILED=0
FAILED_LIST=""
SKIPPED=0
ALREADY=0

# Service list in dependency order (foundation → infrastructure → intelligence → agents → products)
SERVICES=(
  # Foundation (no deps)
  corpid-service api-gateway event-bus secrets-manager feature-flags context-engine
  tenant-manager unified-os-hub graphql-federation
  # SkillOS
  skill-os
  # Infrastructure - TwinOS, MemoryOS, Twins
  memory-os twinos-hub twinos-shared
  voice-twin organization-twin product-twin customer-twin order-twin
  asset-twin employee-twin inventory-twin lead-twin partner-twin
  payment-twin merchant-twin user-twin wallet-twin industry-twin
  agent-twin area-twin buyer-twin deal-twin property-twin referral-twin
  # Intelligence
  ai-intelligence customer-intelligence sales-intelligence journey-intelligence
  predictive-intelligence risk-intelligence decision-intelligence
  micro-intelligence
  # Copilots
  business-copilot marketing-copilot sales-copilot finance-copilot
  support-copilot executive-copilot agent-copilot
  # Data & Knowledge
  vector-db rag-platform document-intelligence graph-database knowledge-extraction
  knowledge-base knowledge-marketplace
  # Agent Cloud + ACN + SUTAR
  acp-protocol acn-hub acn-network acn-integration
  agent-analytics agent-contracts agent-learning agent-marketplace
  agent-orchestration agent-reputation agent-wallets
  dispute-resolution negotiation-ai merchant-agents genie-shopping-agent
  agent-economy decision-engine goal-os
  # SUTAR OS — Usage Tracker, Intent Bus (built June 20, 2026)
  usage-tracker intent-bus
  # Communication
  razo-keyboard live-chat genie-wake-word-service
  genie-listening-modes genie-device-integration
  # Training & Model
  inference-gateway prompt-manager semantic-cache model-registry ai-safety evaluation-harness fine-tuning-pipeline synthetic-data-generation gpu-cluster-manager
  # Genie Products
  genie-gateway genie-companion-service genie-thinking-engine
  genie-creation-os genie-execution-engine genie-money-os genie-wellness-os
  genie-life-university genie-life-gps
  genie-briefing-service genie-calendar-service genie-memory-graph
  genie-serendipity-service genie-smart-forgetting-service genie-universal-search
  genie-learning-os genie-consultant-agent genie-relationship-os
  # Cross-cutting
  workflow-marketplace trust-intelligence sla-manager notification-service
  onboarding-portal pilot-onboarding
)

for svc in $SERVICES; do
  if [ ! -d "$svc" ]; then
    continue
  fi
  
  if [ ! -f "$svc/package.json" ]; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi
  
  # Detect port
  PORT=""
  for src in src/index.js src/index.ts src/server.js src/app.js; do
    if [ -f "$svc/$src" ]; then
      PORT=$(grep -oE "PORT[^a-zA-Z0-9]*\|\|[^0-9]*[0-9]{4}" "$svc/$src" 2>/dev/null | grep -oE "[0-9]{4}" | head -1)
      [ -n "$PORT" ] && break
    fi
  done
  
  # Check if already running
  if [ -n "$PORT" ] && lsof -ti :$PORT > /dev/null 2>&1; then
    ALREADY=$((ALREADY+1))
    continue
  fi
  
  # Try to start
  if [ ! -d "$svc/node_modules" ]; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi
  
  cd "/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/services/$svc"
  
  # TypeScript services need ts-node with --transpile-only (skip type errors)
  ENTRY="src/index.js"
  [ -f "dist/index.js" ] && ENTRY="dist/index.js"
  [ -f "src/index.ts" ] && [ ! -f "dist/index.js" ] && nohup npx ts-node --transpile-only src/index.ts > "$LOG_DIR/$svc.log" 2>&1 &
  
  if [ -f "src/index.js" ] && [ ! -f "src/index.ts" ]; then
    nohup node src/index.js > "$LOG_DIR/$svc.log" 2>&1 &
  elif [ -f "src/index.ts" ] && [ ! -f "dist/index.js" ]; then
    # Already started above
    :
  elif [ -f "dist/index.js" ]; then
    nohup node dist/index.js > "$LOG_DIR/$svc.log" 2>&1 &
  fi
  
  PID=$!
  sleep 0.4
  if kill -0 $PID 2>/dev/null; then
    echo "STARTED: $svc (pid $PID${PORT:+ :$PORT})"
    STARTED=$((STARTED+1))
  else
    FAILED=$((FAILED+1))
    FAILED_LIST="$FAILED_LIST $svc"
  fi
  cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/services
done

echo ""
echo "=== Summary ==="
echo "Started fresh: $STARTED"
echo "Already running: $ALREADY"
echo "Failed: $FAILED"
echo "Skipped: $SKIPPED"
[ -n "$FAILED_LIST" ] && echo "Failed: $FAILED_LIST"
