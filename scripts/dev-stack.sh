#!/bin/bash
# RTMN dev stack — one-command spin-up
# ----------------------------------------------------------------------------
# Starts the same services docker-compose.dev.yml would start, but using the
# in-repo start scripts. Use this when Docker isn't available or you want
# hot-reload.
#
# Usage:
#   bash scripts/dev-stack.sh start     # start everything
#   bash scripts/dev-stack.sh stop      # stop everything
#   bash scripts/dev-stack.sh status    # show what's running
#   bash scripts/dev-stack.sh demo      # start + run demos/full-stack-demo.sh

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTMN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Service registry — mirrors docker-compose.dev.yml. Updated 2026-06-22
# per ADR-0009 Phase 1: the 5 Phase C network services now live in
# companies/Nexha/services/nexha-* (renamed from sutar-*). The 3 L1 stubs
# (procurement-os, distribution-os, trade-finance) were removed in
# Phase 0 — their functionality is now in nexha-supplier-network,
# nexha-distribution-network, nexha-trade-finance-network.
HUB_CMD="cd $RTMN_ROOT/companies/RABTUL-Technologies/REZ-ecosystem-connector && PORT=4399 node dist/index.js"

# SUTAR OS (HOJAI AI — intelligence layer)
# Note: TypeScript services (sutar-trust-engine, sutar-contract-os) need a build first.
# Plain-JS services use node src/index.js directly.
TRUST_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/core/sutar-trust-engine && npm run build && PORT=4291 SADA_URL=http://localhost:4190 REDIS_URL=redis://localhost:6379 npm start"
CONTRACT_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/contracts/sutar-contract-os && npm run build && PORT=4292 npm start"
NEGOTIATION_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine && npm run build && PORT=4293 npm start"
DECISION_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/core/sutar-decision-engine && PORT=4290 REDIS_URL=redis://localhost:6379 npm start"
ECONOMY_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/economy/sutar-economy-os && PORT=4294 REDIS_URL=redis://localhost:6379 npm start"

# SADA Trust (Phase F.3, 2026-06-22) — Trust + Governance + Risk + Verification
# Uses in-memory Mongo (mongodb-memory-server) when MONGODB_MEMORY=true,
# otherwise expects a real MongoDB. Auth bypass for local dev.
SADA_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/trust/sada-os && PORT=4190 SADA_REQUIRE_AUTH=false INTERNAL_SERVICE_TOKEN=sada-internal-token MONGODB_URI=mongodb://127.0.0.1:27017/sada_dev npm start"

# HOJAI AI — Foundation (Phase F.1: PolicyOS + SkillOS productionized 2026-06-22)
POLICY_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/flow/policy-os && PORT=4254 POLICYOS_REQUIRE_AUTH=false POLICYOS_EVAL_LIMIT=10000 POLICYOS_WRITE_LIMIT=10000 REDIS_URL=redis://localhost:6379 npm start"
SKILL_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/skills/skill-os && PORT=4743 SKILLOS_REQUIRE_AUTH=false REDIS_URL=redis://localhost:6379 npm start"

# HOJAI AI — Core Foundation (CorpID, MemoryOS, TwinOS, TwinMemoryBridge)
CORP_ID_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/identity/corpid-service && PORT=4702 npm start"
MEMORY_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/memory/memory-os && PORT=4703 npm start"
MEMORY_CONFIDENCE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/memory/memory-confidence && PORT=4152 npm start"
MEMORY_CONTEXT_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/memory/memory-context-engine && PORT=4793 npm start"
TWIN_MEMORY_BRIDGE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/twins/twin-memory-bridge && PORT=4704 npm start"
TWINOS_HUB_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/twins/twinos-hub && PORT=4705 npm start"

# HOJAI AI Intelligence (Phase F.4, 2026-06-22) — Multi-agent orchestration (intent, sentiment, retrieval, prediction, recommendation)
AI_INTELLIGENCE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/ai-intelligence && PORT=4881 INTELLIGENCE_REQUIRE_AUTH=false REDIS_URL=redis://localhost:6379 npm start"

# Knowledge Extraction (Phase F.5, 2026-06-22) — NER, entity linking, fact triples
KNOWLEDGE_EXTRACTION_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/knowledge-extraction && PORT=4784 KNOWLEDGE_EXTRACTION_REQUIRE_AUTH=false npm start"

# Decision Intelligence (Phase F.6, 2026-06-22) — Recommendations, NBA, multi-criteria decision
DECISION_INTELLIGENCE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/flow/decision-intelligence && PORT=4756 DECISION_INTELLIGENCE_REQUIRE_AUTH=false npm start"

# Knowledge Marketplace (Phase F.7, 2026-06-22) — SOPs, templates, documentation marketplace
KNOWLEDGE_MARKETPLACE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/knowledge-marketplace && PORT=4939 KNOWLEDGE_MARKETPLACE_PORT=4939 KNOWLEDGE_MARKETPLACE_REQUIRE_AUTH=false npm start"

# Vector DB (Phase F.8, 2026-06-22) — In-memory vector store with cosine similarity, namespaced collections
VECTOR_DB_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/vector-db && PORT=4780 VECTOR_DB_REQUIRE_AUTH=false npm start"

# Graph Database (Phase F.9, 2026-06-22) — In-memory property graph (Neo4j/Memgraph alternative) with Cypher-lite, BFS, shortest path, PageRank
GRAPH_DATABASE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/graph-database && PORT=4783 GRAPH_DATABASE_REQUIRE_AUTH=false npm start"

# Predictive Intelligence (Phase F.10, 2026-06-22) — Time-series forecasting, anomaly detection, trend, demand prediction
PREDICTIVE_INTELLIGENCE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/flow/predictive-intelligence && PORT=4754 PREDICTIVE_INTELLIGENCE_REQUIRE_AUTH=false npm start"

# Risk Intelligence (Phase F.11, 2026-06-22) — Cross-domain risk scoring (fraud, churn, credit, composite)
RISK_INTELLIGENCE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/flow/risk-intelligence && PORT=4755 RISK_INTELLIGENCE_REQUIRE_AUTH=false npm start"

# Trust Intelligence (Phase F.12, 2026-06-22) — AI agent trust scoring, risk propagation, confidence analytics
TRUST_INTELLIGENCE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/flow/trust-intelligence && PORT=4882 TRUST_INTELLIGENCE_REQUIRE_AUTH=false npm start"

# Semantic Cache (Phase F.13, 2026-06-22) — Embedding-based semantic caching for LLM responses
SEMANTIC_CACHE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/semantic-cache && PORT=4772 SEMANTIC_CACHE_REQUIRE_AUTH=false npm start"

# RAG Platform (Phase F.14, 2026-06-23) — Retrieval-augmented generation: chunk + embed + retrieve + query
RAG_PLATFORM_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/rag-platform && PORT=4781 RAG_PLATFORM_REQUIRE_AUTH=false npm start"

# Tenant Manager (Phase F.15, 2026-06-23) — Multi-tenant isolation, projects, members, API keys, usage metering
TENANT_MANAGER_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/identity/tenant-manager && PORT=4747 TENANT_MANAGER_REQUIRE_AUTH=false npm start"

# Reasoning Engine (Phase F.16, 2026-06-23) — 3 strategies (deductive/inductive/abductive), templates, audit
REASONING_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/reasoning-engine && PORT=4785 REASONING_ENGINE_REQUIRE_AUTH=false npm start"

# Intent Engine (Phase F.17, 2026-06-23) — Keyword-based intent detection with word-boundary regex
INTENT_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/intent-engine && PORT=4786 INTENT_ENGINE_REQUIRE_AUTH=false npm start"

# Reflection Engine (Phase F.18, 2026-06-23) — Quality scoring across 5 dimensions
REFLECTION_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/reflection-engine && PORT=4787 REFLECTION_ENGINE_REQUIRE_AUTH=false npm start"

# Behavior Intelligence (Phase F.19, 2026-06-23) — Event tracking, user profiles, anomalies, funnels
BEHAVIOR_INTELLIGENCE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/behavior-intelligence && PORT=4788 BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH=false npm start"

# Proactive Engine (Phase F.20, 2026-06-23) — Rule-based suggestions with condition evaluation
PROACTIVE_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/proactive-engine && PORT=4789 PROACTIVE_ENGINE_REQUIRE_AUTH=false npm start"

# Multi-Agent Runtime (Phase F.21, 2026-06-23) — Agent spawning, task assignment, status tracking
MULTI_AGENT_RUNTIME_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/multi-agent-runtime && PORT=4790 MULTI_AGENT_RUNTIME_REQUIRE_AUTH=false npm start"

# Agent Builder (Phase F.22, 2026-06-23) — Blueprint CRUD, instantiation, version tracking
AGENT_BUILDER_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/agent-builder && PORT=4791 AGENT_BUILDER_REQUIRE_AUTH=false npm start"

# Background Agents (Phase F.23, 2026-06-23) — Job scheduler, run history, cancel
BACKGROUND_AGENTS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/intelligence/background-agents && PORT=4792 BACKGROUND_AGENTS_REQUIRE_AUTH=false npm start"

# MissionOS (Phase G.1, 2026-06-23) — First-class Mission unit with sub-tasks, owners, deadlines, progress tracking
MISSION_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/mission-os && PORT=4295 MISSION_OS_REQUIRE_AUTH=false npm start"

# ExecutionOS (Phase G.2, 2026-06-23) — Execute actions/steps with retries, sequencing, status tracking
EXECUTION_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/execution-os && PORT=4296 EXECUTION_OS_REQUIRE_AUTH=false npm start"

# AgentOS — 12 services at ports 4802–4814 (Phase F audit, 2026-06-25)
# All services use MongoDB + Redis for local dev; auth disabled.
AGENT_PLATFORM_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/agent-platform-api && PORT=4802 AGENTOS_REQUIRE_AUTH=false MONGODB_URI=mongodb://127.0.0.1:27017/agent_platform npm start"
AGENT_REGISTRY_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/agent-registry && PORT=4803 AGENTOS_REQUIRE_AUTH=false MONGODB_URI=mongodb://127.0.0.1:27017/agent_registry npm start"
AGENT_CAPABILITY_STORE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/capability-store && PORT=4804 AGENTOS_REQUIRE_AUTH=false MONGODB_URI=mongodb://127.0.0.1:27017/agent_capability npm start"
AGENT_TOOL_REGISTRY_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/tool-registry && PORT=4805 AGENTOS_REQUIRE_AUTH=false MONGODB_URI=mongodb://127.0.0.1:27017/agent_tool npm start"
AGENT_SKILL_LIBRARY_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/skill-library && PORT=4806 AGENTOS_REQUIRE_AUTH=false MONGODB_URI=mongodb://127.0.0.1:27017/agent_skill npm start"
AGENT_MESSAGE_BUS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/message-bus && PORT=4807 AGENTOS_REQUIRE_AUTH=false REDIS_URL=redis://localhost:6379 MONGODB_URI=mongodb://127.0.0.1:27017/agent_message npm start"
AGENT_SCHEDULER_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/scheduler && PORT=4808 AGENTOS_REQUIRE_AUTH=false REDIS_URL=redis://localhost:6379 MONGODB_URI=mongodb://127.0.0.1:27017/agent_scheduler npm start"
AGENT_CONTEXT_STORE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/context-store && PORT=4809 AGENTOS_REQUIRE_AUTH=false MONGODB_URI=mongodb://127.0.0.1:27017/agent_context npm start"
AGENT_MEMORY_BRIDGE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/agent-memory-bridge && PORT=4811 AGENTOS_REQUIRE_AUTH=false MONGODB_URI=mongodb://127.0.0.1:27017/agent_memory npm start"
AGENT_ORCHESTRATOR_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/agent-orchestrator && PORT=4812 AGENTOS_REQUIRE_AUTH=false REDIS_URL=redis://localhost:6379 MONGODB_URI=mongodb://127.0.0.1:27017/agent_orchestrator npm start"
AGENT_EXECUTION_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/agent-execution-engine && PORT=4813 AGENTOS_REQUIRE_AUTH=false MONGODB_URI=mongodb://127.0.0.1:27017/agent_execution npm start"
AGENT_OBSERVABILITY_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/agent-os/agent-observability && PORT=4814 AGENTOS_REQUIRE_AUTH=false MONGODB_URI=mongodb://127.0.0.1:27017/agent_observability npm start"

# HOJAI Voice Gateway (Phase F, 2026-06-24) — Training-aware STT/TTS router on port 4880
VOICE_GATEWAY_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/products/voice-os/core/voice-gateway && PORT=4880 REDIS_URL=redis://localhost:6379 npm start"

# BLR AI Marketplace (BAM) — 245 catalog entries seeded at port 4255
# Moved from 4250 (conflicted with Nexha stub agent-marketplace)
MARKETPLACE_LISTINGS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/blr-ai-marketplace/services/marketplace-listings && PORT=4255 MONGODB_URI=mongodb://127.0.0.1:27017/marketplace_listings npm start"

# Flow Orchestrator (Phase F.2, 2026-06-22)
FLOW_ORCHESTRATOR_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/flow/flow-orchestrator && PORT=4244 FLOW_REQUIRE_AUTH=false REDIS_URL=redis://localhost:6379 npm start"

# Nexha Commerce Network — Phase C services (replaces the 3 L1 stubs)
NEXHA_SUPPLIER_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-supplier-network && PORT=4280 REDIS_URL=redis://localhost:6379 npm start"
NEXHA_DISTRIBUTION_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-distribution-network && PORT=4285 REDIS_URL=redis://localhost:6379 npm start"
NEXHA_WAREHOUSE_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-warehouse-network && PORT=4288 REDIS_URL=redis://localhost:6379 npm start"
NEXHA_TRADE_FINANCE_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-trade-finance-network && PORT=4287 REDIS_URL=redis://localhost:6379 npm start"
NEXHA_PRICING_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-pricing-network && PORT=4286 REDIS_URL=redis://localhost:6379 npm start"

# Nexha Federation services — Phase D (ADR-0010) + Phase 12-13 (ADR-0011)
# These previously had to be started manually; ADR-0012 brings them into the
# one-command dev stack. See docs/nexha/audit-2026-06-23.md for context.
# Auth: JWT_SECRET + INTERNAL_TOKEN shared across the federation for dev.
# Override via env: JWT_SECRET=xxx INTERNAL_TOKEN=yyy bash scripts/dev-stack.sh start
: "${JWT_SECRET:=nexha-dev-jwt-secret}"
: "${INTERNAL_TOKEN:=nexha-internal-dev-token}"
export JWT_SECRET
export INTERNAL_TOKEN

NEXHA_GATEWAY_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-gateway && PORT=5002 npx tsx src/index.ts"
NEXHA_ACP_MESSAGING_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-acp-messaging && PORT=4340 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN INTERNAL_SERVICE_TOKEN=$INTERNAL_TOKEN REDIS_URL=redis://localhost:6379 MONGODB_URI=mongodb://127.0.0.1:27017/nexha_acp_dev npm start"
NEXHA_BUSINESS_DIRECTORY_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-business-directory && PORT=4360 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_directory_dev npm start"
NEXHA_MISSION_PLANNER_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-mission-planner && MISSION_PLANNER_PORT=4362 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_mission_dev npm start"
NEXHA_PARTNER_GRAPH_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-partner-graph && PARTNER_GRAPH_PORT=4363 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_partner_dev npm start"
NEXHA_COMMERCE_RUNTIME_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-commerce-runtime && COMMERCE_RUNTIME_PORT=4364 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_commerce_dev npm start"
NEXHA_PROVISIONING_ENGINE_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-provisioning-engine && PORT=4385 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_provisioning_dev npm start"
NEXHA_HOOKS_SDK_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-hooks-sdk && PORT=4386 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_hooks_dev npm start"
NEXHA_TENANT_SUMMARY_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-tenant-summary && PORT=4387 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_summary_dev npm start"
NEXHA_PARTNER_NETWORK_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-partner-network && PORT=4297 npm start"
NEXHA_FEDERATION_OS_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-federation-os && npm run build && PORT=4273 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_federation_dev npm start"
NEXHA_GLOBAL_DIRECTORY_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-global-directory && npm run build && PORT=4276 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_global_dev npm start"

# Nexha OS Layer (Phase D) — CapabilityOS, DiscoveryOS, FederationOS, MarketOS, OpportunityOS, ReputationOS
NEXHA_CAPABILITY_OS_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-capability-os && PORT=4270 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_capability_dev npm start"
NEXHA_REPUTATION_OS_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-reputation-os && PORT=4271 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_reputation_dev npm start"
NEXHA_DISCOVERY_OS_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-discovery-os && PORT=4272 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_discovery_dev npm start"
NEXHA_OPPORTUNITY_OS_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-opportunity-os && PORT=4274 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_opportunity_dev npm start"
NEXHA_MARKET_OS_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-market-os && PORT=4275 JWT_SECRET=$JWT_SECRET INTERNAL_TOKEN=$INTERNAL_TOKEN MONGODB_URI=mongodb://127.0.0.1:27017/nexha_market_dev npm start"

LOG_DIR="/tmp/rtmn-dev"
mkdir -p "$LOG_DIR"

start_service() {
  local name="$1"
  local cmd="$2"
  local logfile="$LOG_DIR/$name.log"
  if lsof -i ":${3:-0}" >/dev/null 2>&1; then
    echo "  $name: already running on port $3"
    return 0
  fi
  echo "  $name: starting..."
  nohup bash -c "$cmd" > "$logfile" 2>&1 &
  echo "    pid=$!  log=$logfile"
}

# Pre-flight: ensure Redis is reachable before starting services that depend on
# the @rtmn/shared/event-bus Redis Streams backend (ADR-0009 Phase 2).
check_redis() {
  if ! command -v redis-cli >/dev/null 2>&1; then
    echo "  redis: SKIP (redis-cli not installed)"
    return 0
  fi
  if redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "  redis: PONG (redis://localhost:6379)"
    return 0
  fi
  echo "  redis: NOT reachable at localhost:6379"
  echo "    Start it with:  brew services start redis"
  echo "                   OR  docker compose -f docker-compose.dev.yml up -d redis"
  echo "    SUTAR services will still start but event publishing will fail until Redis is up."
  return 0
}

stop_port() {
  local port="$1"
  local name="$2"
  local pid
  pid=$(lsof -i ":$port" -t 2>/dev/null | head -1)
  if [ -n "$pid" ]; then
    echo "  $name (port $port): killing pid=$pid"
    kill "$pid" 2>/dev/null
  else
    echo "  $name (port $port): not running"
  fi
}

status() {
  echo "RTMN dev stack status:"
  for entry in \
    "Hub:4399" \
    "SADA Trust:4190" \
    "Trust Engine:4291" \
    "Decision Engine:4290" \
    "Economy OS:4294" \
    "PolicyOS:4254" \
    "SkillOS:4743" \
    "Flow Orchestrator:4244" \
    "AI Intelligence:4881" \
    "Knowledge Extraction:4784" \
    "Decision Intelligence:4756" \
    "Knowledge Marketplace:4939" \
    "Vector DB:4780" \
    "Graph Database:4783" \
    "Predictive Intelligence:4754" \
    "Risk Intelligence:4755" \
    "Trust Intelligence:4882" \
    "Semantic Cache:4772" \
    "RAG Platform:4781" \
    "Tenant Manager:4747" \
    "Reasoning Engine:4785" \
    "Intent Engine:4786" \
    "Reflection Engine:4787" \
    "Behavior Intelligence:4788" \
    "Proactive Engine:4789" \
    "Multi-Agent Runtime:4790" \
    "Agent Builder:4791" \
    "Background Agents:4792" \
    "MissionOS:4295" \
    "ExecutionOS:4296" \
    "CorpID:4702" \
    "MemoryOS:4703" \
    "Memory Confidence:4152" \
    "Memory Context Engine:4793" \
    "Twin Memory Bridge:4704" \
    "TwinOS Hub:4705" \
    "Sutar Trust Engine:4291" \
    "Contract OS:4292" \
    "Negotiation Engine:4293" \
    "nexha-supplier-network:4280" \
    "nexha-distribution-network:4285" \
    "nexha-warehouse-network:4288" \
    "nexha-trade-finance-network:4287" \
    "nexha-pricing-network:4286" \
    "nexha-gateway:5002" \
    "nexha-acp-messaging:4340" \
    "nexha-business-directory:4360" \
    "nexha-mission-planner:4362" \
    "nexha-partner-graph:4363" \
    "nexha-commerce-runtime:4364" \
    "nexha-provisioning-engine:4385" \
    "nexha-hooks-sdk:4386" \
    "nexha-tenant-summary:4387" \
    "nexha-capability-os:4270" \
    "nexha-reputation-os:4271" \
    "nexha-discovery-os:4272" \
    "nexha-opportunity-os:4274" \
    "nexha-market-os:4275" \
    "nexha-federation-os:4273" \
    "nexha-global-directory:4276" \
    "nexha-partner-network:4297" \
    "agent-platform-api:4802" \
    "agent-registry:4803" \
    "agent-capability-store:4804" \
    "agent-tool-registry:4805" \
    "agent-skill-library:4806" \
    "agent-message-bus:4807" \
    "agent-scheduler:4808" \
    "agent-context-store:4809" \
    "agent-memory-bridge:4811" \
    "agent-orchestrator:4812" \
    "agent-execution-engine:4813" \
    "agent-observability:4814" \
    "voice-gateway:4880" \
    "bam-marketplace-listings:4255"; do
    name="${entry%:*}"
    port="${entry#*:}"
    if lsof -i ":$port" >/dev/null 2>&1; then
      echo "  [UP]   $name (port $port)"
    else
      echo "  [DOWN] $name (port $port)"
    fi
  done
}

start_all() {
  echo "Starting RTMN dev stack..."
  check_redis
  # SUTAR OS (HOJAI AI) — core economic layer
  start_service "sada-os"                  "$SADA_OS_CMD"             4190
  start_service "trust-engine"             "$TRUST_ENGINE_CMD"        4291
  start_service "contract-os"             "$CONTRACT_OS_CMD"          4292
  start_service "negotiation-engine"     "$NEGOTIATION_ENGINE_CMD"   4293
  start_service "decision-engine"          "$DECISION_ENGINE_CMD"     4290
  start_service "economy-os"               "$ECONOMY_OS_CMD"          4294
  # HOJAI AI — Core Foundation (CorpID, MemoryOS, TwinOS)
  start_service "corp-id"                 "$CORP_ID_CMD"             4702
  start_service "memory-os"               "$MEMORY_OS_CMD"           4703
  start_service "memory-confidence"       "$MEMORY_CONFIDENCE_CMD"   4152
  start_service "memory-context-engine"   "$MEMORY_CONTEXT_ENGINE_CMD" 4793
  start_service "twin-memory-bridge"      "$TWIN_MEMORY_BRIDGE_CMD"  4704
  start_service "twinos-hub"              "$TWINOS_HUB_CMD"          4705
  # HOJAI AI — Foundation (Phase F.1)
  start_service "policy-os"                "$POLICY_OS_CMD"           4254
  start_service "skill-os"                 "$SKILL_OS_CMD"            4743
  # HOJAI AI — Orchestration (Phase F.2)
  start_service "flow-orchestrator"       "$FLOW_ORCHESTRATOR_CMD"   4244
  # HOJAI AI Intelligence (Phase F.4)
  start_service "ai-intelligence"         "$AI_INTELLIGENCE_CMD"     4881
  # Knowledge Extraction (Phase F.5)
  start_service "knowledge-extraction"   "$KNOWLEDGE_EXTRACTION_CMD" 4784
  # Decision Intelligence (Phase F.6)
  start_service "decision-intelligence"  "$DECISION_INTELLIGENCE_CMD" 4756
  # Knowledge Marketplace (Phase F.7)
  start_service "knowledge-marketplace"  "$KNOWLEDGE_MARKETPLACE_CMD" 4939
  # Vector DB (Phase F.8)
  start_service "vector-db"              "$VECTOR_DB_CMD"            4780
  # Graph Database (Phase F.9)
  start_service "graph-database"         "$GRAPH_DATABASE_CMD"       4783
  # Predictive Intelligence (Phase F.10)
  start_service "predictive-intelligence" "$PREDICTIVE_INTELLIGENCE_CMD" 4754
  # Risk Intelligence (Phase F.11)
  start_service "risk-intelligence"      "$RISK_INTELLIGENCE_CMD"      4755
  # Trust Intelligence (Phase F.12)
  start_service "trust-intelligence"     "$TRUST_INTELLIGENCE_CMD"     4882
  # Semantic Cache (Phase F.13)
  start_service "semantic-cache"         "$SEMANTIC_CACHE_CMD"         4772
  # RAG Platform (Phase F.14)
  start_service "rag-platform"           "$RAG_PLATFORM_CMD"           4781
  # Tenant Manager (Phase F.15)
  start_service "tenant-manager"         "$TENANT_MANAGER_CMD"         4747
  # Reasoning Engine (Phase F.16)
  start_service "reasoning-engine"       "$REASONING_ENGINE_CMD"       4785
  # Intent Engine (Phase F.17)
  start_service "intent-engine"          "$INTENT_ENGINE_CMD"          4786
  # Reflection Engine (Phase F.18)
  start_service "reflection-engine"      "$REFLECTION_ENGINE_CMD"      4787
  # Behavior Intelligence (Phase F.19)
  start_service "behavior-intelligence"  "$BEHAVIOR_INTELLIGENCE_CMD"  4788
  # Proactive Engine (Phase F.20)
  start_service "proactive-engine"       "$PROACTIVE_ENGINE_CMD"       4789
  # Multi-Agent Runtime (Phase F.21)
  start_service "multi-agent-runtime"    "$MULTI_AGENT_RUNTIME_CMD"    4790
  # Agent Builder (Phase F.22)
  start_service "agent-builder"          "$AGENT_BUILDER_CMD"          4791
  # Background Agents (Phase F.23)
  start_service "background-agents"      "$BACKGROUND_AGENTS_CMD"      4792
  # MissionOS (Phase G.1)
  start_service "mission-os"             "$MISSION_OS_CMD"             4295
  # ExecutionOS (Phase G.2)
  start_service "execution-os"           "$EXECUTION_OS_CMD"           4296
  # Nexha Commerce Network (Phase C)
  start_service "nexha-supplier-network"      "$NEXHA_SUPPLIER_CMD"      4280
  start_service "nexha-distribution-network"  "$NEXHA_DISTRIBUTION_CMD"  4285
  start_service "nexha-warehouse-network"     "$NEXHA_WAREHOUSE_CMD"     4288
  start_service "nexha-trade-finance-network" "$NEXHA_TRADE_FINANCE_CMD" 4287
  start_service "nexha-pricing-network"       "$NEXHA_PRICING_CMD"       4286
  # Nexha Federation services (Phase D + ADR-0011) — ADR-0012 brings these into dev-stack
  start_service "nexha-gateway"               "$NEXHA_GATEWAY_CMD"             5002
  start_service "nexha-acp-messaging"         "$NEXHA_ACP_MESSAGING_CMD"       4340
  start_service "nexha-business-directory"    "$NEXHA_BUSINESS_DIRECTORY_CMD"  4360
  start_service "nexha-mission-planner"       "$NEXHA_MISSION_PLANNER_CMD"     4362
  start_service "nexha-partner-graph"         "$NEXHA_PARTNER_GRAPH_CMD"       4363
  start_service "nexha-commerce-runtime"      "$NEXHA_COMMERCE_RUNTIME_CMD"    4364
  start_service "nexha-provisioning-engine"   "$NEXHA_PROVISIONING_ENGINE_CMD" 4385
  start_service "nexha-hooks-sdk"             "$NEXHA_HOOKS_SDK_CMD"           4386
  start_service "nexha-tenant-summary"        "$NEXHA_TENANT_SUMMARY_CMD"      4387
  # Nexha OS Layer (Phase D) — Global Nexha services
  start_service "nexha-capability-os"       "$NEXHA_CAPABILITY_OS_CMD"       4270
  start_service "nexha-reputation-os"       "$NEXHA_REPUTATION_OS_CMD"       4271
  start_service "nexha-discovery-os"        "$NEXHA_DISCOVERY_OS_CMD"        4272
  start_service "nexha-opportunity-os"      "$NEXHA_OPPORTUNITY_OS_CMD"      4274
  start_service "nexha-market-os"           "$NEXHA_MARKET_OS_CMD"           4275
  start_service "nexha-federation-os"       "$NEXHA_FEDERATION_OS_CMD"       4273
  start_service "nexha-global-directory"    "$NEXHA_GLOBAL_DIRECTORY_CMD"    4276
  # Nexha Phase F.3 audit (2026-06-25) — partner network + autonomous logistics
  start_service "nexha-partner-network"     "$NEXHA_PARTNER_NETWORK_CMD"     4297
  # AgentOS — 12 services (Phase F audit, 2026-06-25)
  start_service "agent-platform-api"       "$AGENT_PLATFORM_CMD"           4802
  start_service "agent-registry"          "$AGENT_REGISTRY_CMD"           4803
  start_service "agent-capability-store"  "$AGENT_CAPABILITY_STORE_CMD"  4804
  start_service "agent-tool-registry"     "$AGENT_TOOL_REGISTRY_CMD"     4805
  start_service "agent-skill-library"     "$AGENT_SKILL_LIBRARY_CMD"      4806
  start_service "agent-message-bus"       "$AGENT_MESSAGE_BUS_CMD"        4807
  start_service "agent-scheduler"         "$AGENT_SCHEDULER_CMD"          4808
  start_service "agent-context-store"     "$AGENT_CONTEXT_STORE_CMD"      4809
  start_service "agent-memory-bridge"     "$AGENT_MEMORY_BRIDGE_CMD"     4811
  start_service "agent-orchestrator"      "$AGENT_ORCHESTRATOR_CMD"       4812
  start_service "agent-execution-engine"  "$AGENT_EXECUTION_ENGINE_CMD"   4813
  start_service "agent-observability"     "$AGENT_OBSERVABILITY_CMD"      4814
  # HOJAI Voice Gateway (port 4880)
  start_service "voice-gateway"           "$VOICE_GATEWAY_CMD"           4880
  # BLR AI Marketplace — port 4255 (after BAM seed is added below)
  start_service "bam-marketplace-listings" "$MARKETPLACE_LISTINGS_CMD"   4255
  # Seed BAM catalog (245 entries) after service is up
  sleep 3
  BAM_SEED_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/blr-ai-marketplace/services/marketplace-listings && node src/seed-data.js"
  echo "  bam-seed: seeding 245 catalog entries..."
  bash -c "$BAM_SEED_CMD" && echo "  bam-seed: done" || echo "  bam-seed: skipped (mongo unavailable or seed failed)"
  # Hub (must be last so all services are up)
  start_service "hub"                      "$HUB_CMD"                 4399
  sleep 3
  status
  echo ""
  echo "Logs: $LOG_DIR/*.log"
  echo "Run the demo: bash demos/full-stack-demo.sh"
}

stop_all() {
  echo "Stopping RTMN dev stack..."
  stop_port 4399 "Hub"
  stop_port 4190 "SADA Trust"
  stop_port 4291 "Trust Engine"
  stop_port 4292 "Contract OS"
  stop_port 4293 "Negotiation Engine"
  stop_port 4290 "Decision Engine"
  stop_port 4294 "Economy OS"
  stop_port 4702 "CorpID"
  stop_port 4703 "MemoryOS"
  stop_port 4152 "Memory Confidence"
  stop_port 4793 "Memory Context Engine"
  stop_port 4704 "Twin Memory Bridge"
  stop_port 4705 "TwinOS Hub"
  stop_port 4254 "PolicyOS"
  stop_port 4743 "SkillOS"
  stop_port 4244 "Flow Orchestrator"
  stop_port 4881 "AI Intelligence"
  stop_port 4784 "Knowledge Extraction"
  stop_port 4756 "Decision Intelligence"
  stop_port 4939 "Knowledge Marketplace"
  stop_port 4780 "Vector DB"
  stop_port 4783 "Graph Database"
  stop_port 4754 "Predictive Intelligence"
  stop_port 4755 "Risk Intelligence"
  stop_port 4882 "Trust Intelligence"
  stop_port 4772 "Semantic Cache"
  stop_port 4781 "RAG Platform"
  stop_port 4747 "Tenant Manager"
  stop_port 4280 "nexha-supplier-network"
  stop_port 4285 "nexha-distribution-network"
  stop_port 4288 "nexha-warehouse-network"
  stop_port 4287 "nexha-trade-finance-network"
  stop_port 4286 "nexha-pricing-network"
  stop_port 5002 "nexha-gateway"
  stop_port 4340 "nexha-acp-messaging"
  stop_port 4360 "nexha-business-directory"
  stop_port 4362 "nexha-mission-planner"
  stop_port 4363 "nexha-partner-graph"
  stop_port 4364 "nexha-commerce-runtime"
  stop_port 4385 "nexha-provisioning-engine"
  stop_port 4386 "nexha-hooks-sdk"
  stop_port 4387 "nexha-tenant-summary"
  stop_port 4270 "nexha-capability-os"
  stop_port 4271 "nexha-reputation-os"
  stop_port 4272 "nexha-discovery-os"
  stop_port 4274 "nexha-opportunity-os"
  stop_port 4273 "nexha-federation-os"
  stop_port 4276 "nexha-global-directory"
  stop_port 4297 "nexha-partner-network"
  stop_port 4275 "nexha-market-os"
  # AgentOS — 12 services
  stop_port 4802 "agent-platform-api"
  stop_port 4803 "agent-registry"
  stop_port 4804 "agent-capability-store"
  stop_port 4805 "agent-tool-registry"
  stop_port 4806 "agent-skill-library"
  stop_port 4807 "agent-message-bus"
  stop_port 4808 "agent-scheduler"
  stop_port 4809 "agent-context-store"
  stop_port 4811 "agent-memory-bridge"
  stop_port 4812 "agent-orchestrator"
  stop_port 4813 "agent-execution-engine"
  stop_port 4814 "agent-observability"
  # HOJAI Voice Gateway
  stop_port 4880 "voice-gateway"
  # BLR AI Marketplace
  stop_port 4255 "bam-marketplace-listings"
}

case "${1:-start}" in
  start)  start_all ;;
  stop)   stop_all ;;
  status) status ;;
  demo)   start_all; sleep 2; bash "$RTMN_ROOT/demos/full-stack-demo.sh" ;;
  *)      echo "Usage: $0 {start|stop|status|demo}"; exit 1 ;;
esac
