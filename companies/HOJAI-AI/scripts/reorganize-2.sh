#!/bin/bash
# Reorganization script — phase 2
# Handles the 51 services not yet moved (the original script aborted on empty dir)

set -e
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI

# Function to handle empty dirs (just rmdir since they have nothing)
handle_empty() {
  local svc=$1
  if [ -d "services/$svc" ]; then
    if [ -z "$(ls -A services/$svc 2>/dev/null)" ]; then
      rmdir "services/$svc"
      echo "  REMOVED empty: $svc"
    else
      echo "  NOT EMPTY: $svc"
    fi
  fi
}

# Function: move service (handles both populated and empty dirs)
move_svc() {
  local svc=$1
  local target=$2
  if [ -d "services/$svc" ]; then
    if [ -z "$(ls -A services/$svc 2>/dev/null)" ]; then
      # Empty dir — use mv (not git mv since there's no content)
      mv "services/$svc" "$target/$svc"
      echo "  $svc (empty) → $target/"
    else
      git mv "services/$svc" "$target/$svc"
      echo "  $svc → $target/"
    fi
  else
    echo "  SKIP $svc (not in services/)"
  fi
}

# Function: delete empty dir
delete_empty() {
  local svc=$1
  if [ -d "services/$svc" ]; then
    rmdir "services/$svc" 2>/dev/null && echo "  DELETED empty: $svc" || echo "  NOT EMPTY: $svc"
  fi
}

echo "Continuing reorganization..."
echo ""

# SUTAR OS
move_svc "sutar-gateway" "sutar-os/core"
move_svc "sutar-agent-id" "sutar-os/core"
move_svc "sutar-agent-network" "sutar-os/core"
move_svc "sutar-identity" "sutar-os/core"
move_svc "sutar-twin-os" "sutar-os/core"
move_svc "sutar-memory-bridge" "sutar-os/core"
move_svc "sutar-monitoring" "sutar-os/core"

move_svc "sutar-exploration" "sutar-os/marketplace"
move_svc "sutar-multi-agent-evaluator" "sutar-os/marketplace"
move_svc "sutar-reputation-aggregator" "sutar-os/marketplace"
move_svc "sutar-founder-os" "sutar-os/marketplace"
move_svc "twin-marketplace" "sutar-os/marketplace"
move_svc "discovery-engine" "sutar-os/marketplace"

move_svc "sutar-contracts" "sutar-os/contracts"
move_svc "negotiation-ai" "sutar-os/contracts"
move_svc "dispute-resolution" "sutar-os/contracts"

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

move_svc "trust-network" "sutar-os/economy"

# PLATFORM
move_svc "api-gateway" "platform/infra"
move_svc "secrets-manager" "platform/infra"
move_svc "billing" "platform/infra"
move_svc "usage-tracker" "platform/infra"
move_svc "sla-manager" "platform/infra"
move_svc "feature-flags" "platform/infra"
move_svc "sandbox" "platform/infra"
move_svc "ai-safety" "platform/infra"
move_svc "onboarding-portal" "platform/infra"

move_svc "centralized-observability" "platform/observability"
move_svc "incident-management-service" "platform/observability"
move_svc "notification-service" "platform/observability"
move_svc "webhook-bus" "platform/observability"

move_svc "event-bus" "platform/events"
move_svc "intent-bus" "platform/events"

echo ""
echo "============================================"
echo "  Phase 2 complete!"
echo "============================================"
echo ""
echo "Remaining in services/:"
ls services/ 2>&1
