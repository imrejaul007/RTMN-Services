#!/bin/bash
# HOJAI AI — Reorganization script
# Moves 161 services into products/platform/sutar-os using git mv
# Preserves git history

set -e
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI

echo "============================================"
echo "  HOJAI AI Reorganization"
echo "============================================"

# Create new directory structure
echo "Creating directory structure..."
mkdir -p products/genie
mkdir -p products/razo
mkdir -p products/founder-os
mkdir -p products/board-intelligence
mkdir -p products/investor-copilot
mkdir -p products/startup-studio
mkdir -p products/company-builder
mkdir -p products/bizora
mkdir -p products/hib
mkdir -p products/ai-workspace
mkdir -p products/copilots

mkdir -p platform/identity
mkdir -p platform/twins
mkdir -p platform/memory
mkdir -p platform/intelligence
mkdir -p platform/flow
mkdir -p platform/skills
mkdir -p platform/connectors
mkdir -p platform/training
mkdir -p platform/observability
mkdir -p platform/infra
mkdir -p platform/events
mkdir -p platform/auth

mkdir -p sutar-os/core
mkdir -p sutar-os/marketplace
mkdir -p sutar-os/contracts
mkdir -p sutar-os/agents
mkdir -p sutar-os/economy

# Function to git-mv a service into a target dir
move_svc() {
  local svc=$1
  local target=$2
  if [ -d "services/$svc" ]; then
    git mv "services/$svc" "$target/$svc"
    echo "  $svc → $target/"
  else
    echo "  SKIP $svc (not found)"
  fi
}

echo ""
echo "Moving Personal AI products..."

# GENIE (23 services)
for s in genie-gateway genie-wake-word-service genie-listening-modes genie-device-integration \
         genie-calendar-service genie-memory-inbox genie-briefing-service genie-universal-search \
         genie-serendipity-service genie-smart-forgetting-service genie-shopping-agent \
         genie-companion-service genie-consultant-agent genie-creation-os genie-learning-os \
         genie-life-gps genie-life-university genie-memory-graph genie-money-os genie-relationship-os \
         genie-thinking-engine genie-wellness-os genie-execution-engine; do
  move_svc "$s" "products/genie"
done

# RAZO
move_svc "razo-keyboard" "products/razo"

# FOUNDER OS
move_svc "genie-companion-service" "products/founder-os"  # skip if already moved
move_svc "pilot-onboarding" "products/founder-os"

# BOARD INTELLIGENCE
move_svc "meeting-os" "products/board-intelligence"

# INVESTOR COPILOT
# (no existing services — to be built)

# STARTUP STUDIO
# (no existing services — to be built)

# COMPANY BUILDER
# (no existing services — to be built)

# BIZORA
move_svc "reports-dashboard" "products/bizora"
move_svc "customer-intelligence" "products/bizora"

# HIB (Human-in-the-Loop)
move_svc "live-chat" "products/hib"
move_svc "live-support-os" "products/hib"
move_svc "helpdesk-ticketing-service" "products/hib"
move_svc "support-escalation-service" "products/hib"
move_svc "support-sla-service" "products/hib"

# AI WORKSPACE
move_svc "email-os" "products/ai-workspace"
move_svc "document-intelligence" "products/ai-workspace"
move_svc "context-engine" "products/ai-workspace"
move_svc "knowledge-base" "products/ai-workspace"
move_svc "knowledge-base-service" "products/ai-workspace"

# COPILOTS
for s in agent-copilot business-copilot sales-copilot marketing-copilot finance-copilot \
         executive-copilot support-copilot; do
  move_svc "$s" "products/copilots"
done

echo ""
echo "Moving Platform services..."

# IDENTITY
move_svc "corpid-service" "platform/identity"
move_svc "customer-support-service" "platform/identity"
move_svc "tenant-manager" "platform/identity"

# TWINS (twinos-hub + 21 twin services)
move_svc "twinos-hub" "platform/twins"
move_svc "twinos-shared" "platform/twins"
move_svc "twin-memory-bridge" "platform/twins"
move_svc "twin-capability-profile" "platform/twins"
move_svc "organization-twin" "platform/twins"
move_svc "employee-twin" "platform/twins"
move_svc "product-twin" "platform/twins"
move_svc "asset-twin" "platform/twins"
move_svc "partner-twin" "platform/twins"
move_svc "lead-twin" "platform/twins"
move_svc "customer-twin" "platform/twins"
move_svc "order-twin" "platform/twins"
move_svc "wallet-twin" "platform/twins"
move_svc "voice-twin" "platform/twins"
move_svc "user-twin" "platform/twins"
move_svc "area-twin" "platform/twins"
move_svc "buyer-twin" "platform/twins"
move_svc "deal-twin" "platform/twins"
move_svc "inventory-twin" "platform/twins"
move_svc "merchant-twin" "platform/twins"
move_svc "payment-twin" "platform/twins"
move_svc "property-twin" "platform/twins"
move_svc "referral-twin" "platform/twins"

# MEMORY
move_svc "memory-os" "platform/memory"
move_svc "memory-confidence" "platform/memory"

# INTELLIGENCE
move_svc "ai-intelligence" "platform/intelligence"
move_svc "reasoning-runtime" "platform/intelligence"
move_svc "rag-platform" "platform/intelligence"
move_svc "vector-db" "platform/intelligence"
move_svc "graph-database" "platform/intelligence"
move_svc "semantic-cache" "platform/intelligence"
move_svc "knowledge-extraction" "platform/intelligence"
move_svc "knowledge-marketplace" "platform/intelligence"
move_svc "knowledge-network" "platform/intelligence"
move_svc "inference-gateway" "platform/intelligence"
move_svc "micro-intelligence" "platform/intelligence"
move_svc "graphql-federation" "platform/intelligence"

# FLOW
move_svc "flow-orchestrator" "platform/flow"
move_svc "policy-os" "platform/flow"
move_svc "goal-os" "platform/flow"
move_svc "goal-conflict-engine" "platform/flow"
move_svc "simulation-os" "platform/flow"
move_svc "decision-engine" "platform/flow"
move_svc "decision-intelligence" "platform/flow"
move_svc "predictive-intelligence" "platform/flow"
move_svc "risk-intelligence" "platform/flow"
move_svc "trust-intelligence" "platform/flow"
move_svc "journey-intelligence" "platform/flow"
move_svc "industry-twin" "platform/flow"

# SKILLS
move_svc "skill-os" "platform/skills"
move_svc "skill-marketplace" "platform/skills"
move_svc "prompt-marketplace" "platform/skills"
move_svc "prompt-manager" "platform/skills"
move_svc "workflow-marketplace" "platform/skills"
move_svc "industry-packs" "platform/skills"
move_svc "translation-os" "platform/skills"

# CONNECTORS
move_svc "connector-hub" "platform/connectors"
move_svc "connector-marketplace" "platform/connectors"

# TRAINING
move_svc "fine-tuning-pipeline" "platform/training"
move_svc "rlhf-pipeline" "platform/training"
move_svc "model-registry" "platform/training"
move_svc "gpu-cluster-manager" "platform/training"
move_svc "synthetic-data-generation" "platform/training"
move_svc "evaluation-harness" "platform/training"
move_svc "feature-store" "platform/training"
move_svc "data-catalog" "platform/training"

# OBSERVABILITY
move_svc "centralized-observability" "platform/observability"
move_svc "incident-management-service" "platform/observability"
move_svc "notification-service" "platform/observability"
move_svc "webhook-bus" "platform/observability"

# EVENTS
move_svc "event-bus" "platform/events"
move_svc "intent-bus" "platform/events"

# INFRA
move_svc "api-gateway" "platform/infra"
move_svc "secrets-manager" "platform/infra"
move_svc "billing" "platform/infra"
move_svc "usage-tracker" "platform/infra"
move_svc "sla-manager" "platform/infra"
move_svc "feature-flags" "platform/infra"
move_svc "sandbox" "platform/infra"
move_svc "ai-safety" "platform/infra"
move_svc "onboarding-portal" "platform/infra"

echo ""
echo "Moving SUTAR OS services..."

# SUTAR CORE
move_svc "sutar-gateway" "sutar-os/core"
move_svc "sutar-agent-id" "sutar-os/core"
move_svc "sutar-agent-network" "sutar-os/core"
move_svc "sutar-identity" "sutar-os/core"
move_svc "sutar-twin-os" "sutar-os/core"
move_svc "sutar-memory-bridge" "sutar-os/core"
move_svc "sutar-monitoring" "sutar-os/core"

# SUTAR MARKETPLACE
move_svc "sutar-exploration" "sutar-os/marketplace"
move_svc "sutar-multi-agent-evaluator" "sutar-os/marketplace"
move_svc "sutar-reputation-aggregator" "sutar-os/marketplace"
move_svc "sutar-founder-os" "sutar-os/marketplace"
move_svc "twin-marketplace" "sutar-os/marketplace"
move_svc "discovery-engine" "sutar-os/marketplace"

# SUTAR CONTRACTS
move_svc "sutar-contracts" "sutar-os/contracts"
move_svc "negotiation-ai" "sutar-os/contracts"
move_svc "dispute-resolution" "sutar-os/contracts"

# SUTAR AGENTS
move_svc "merchant-agents" "sutar-os/agents"
move_svc "agent-twin" "sutar-os/agents"
move_svc "agent-marketplace" "sutar-os/agents"
move_svc "agent-reputation" "sutar-os/agents"
move_svc "agent-contracts" "sutar-os/agents"
move_svc "agent-wallets" "sutar-os/agents"
move_svc "agent-economy" "sutar-os/agents"
move_svc "agent-analytics" "sutar-os/agents"
move_svc "agent-learning" "sutar-os/agents"
move_svc "agent-orchestration" "sutar-os/agents"
move_svc "acp-protocol" "sutar-os/agents"
move_svc "acn-hub" "sutar-os/agents"
move_svc "acn-network" "sutar-os/agents"
move_svc "acn-integration" "sutar-os/agents"

# SUTAR ECONOMY
# (most economy services shared with platform/infra; this is for sutar-specific ones)
# trust-network is shared
move_svc "trust-network" "sutar-os/economy"

echo ""
echo "============================================"
echo "  Reorganization complete!"
echo "============================================"
echo ""
echo "Remaining in services/ (should be empty or near-empty):"
ls services/ 2>&1 | head -20
