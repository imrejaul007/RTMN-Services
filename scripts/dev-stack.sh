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
TRUST_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/core/sutar-trust-engine && PORT=4291 SADA_URL=http://localhost:4190 REDIS_URL=redis://localhost:6379 npm start"
DECISION_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/core/sutar-decision-engine && PORT=4290 REDIS_URL=redis://localhost:6379 npm start"
ECONOMY_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/economy/sutar-economy-os && PORT=4294 REDIS_URL=redis://localhost:6379 npm start"

# SADA Trust (Phase F.3, 2026-06-22) — Trust + Governance + Risk + Verification
# Uses in-memory Mongo (mongodb-memory-server) when MONGODB_MEMORY=true,
# otherwise expects a real MongoDB. Auth bypass for local dev.
SADA_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/trust/sada-os && PORT=4190 SADA_REQUIRE_AUTH=false INTERNAL_SERVICE_TOKEN=sada-internal-token MONGODB_URI=mongodb://127.0.0.1:27017/sada_dev npm start"

# HOJAI AI — Foundation (Phase F.1: PolicyOS + SkillOS productionized 2026-06-22)
POLICY_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/flow/policy-os && PORT=4254 POLICYOS_REQUIRE_AUTH=false POLICYOS_EVAL_LIMIT=10000 POLICYOS_WRITE_LIMIT=10000 REDIS_URL=redis://localhost:6379 npm start"
SKILL_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/skills/skill-os && PORT=4743 SKILLOS_REQUIRE_AUTH=false REDIS_URL=redis://localhost:6379 npm start"

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

# Flow Orchestrator (Phase F.2, 2026-06-22)
FLOW_ORCHESTRATOR_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/platform/flow/flow-orchestrator && PORT=4244 FLOW_REQUIRE_AUTH=false REDIS_URL=redis://localhost:6379 npm start"

# Nexha Commerce Network — Phase C services (replaces the 3 L1 stubs)
NEXHA_SUPPLIER_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-supplier-network && PORT=4280 REDIS_URL=redis://localhost:6379 npm start"
NEXHA_DISTRIBUTION_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-distribution-network && PORT=4285 REDIS_URL=redis://localhost:6379 npm start"
NEXHA_WAREHOUSE_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-warehouse-network && PORT=4288 REDIS_URL=redis://localhost:6379 npm start"
NEXHA_TRADE_FINANCE_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-trade-finance-network && PORT=4287 REDIS_URL=redis://localhost:6379 npm start"
NEXHA_PRICING_CMD="cd $RTMN_ROOT/companies/Nexha/services/nexha-pricing-network && PORT=4286 REDIS_URL=redis://localhost:6379 npm start"

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
    "nexha-supplier-network:4280" \
    "nexha-distribution-network:4285" \
    "nexha-warehouse-network:4288" \
    "nexha-trade-finance-network:4287" \
    "nexha-pricing-network:4286"; do
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
  # SUTAR OS (HOJAI AI)
  start_service "sada-os"                  "$SADA_OS_CMD"             4190
  start_service "trust-engine"             "$TRUST_ENGINE_CMD"        4291
  start_service "decision-engine"          "$DECISION_ENGINE_CMD"     4290
  start_service "economy-os"               "$ECONOMY_OS_CMD"          4294
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
  # Nexha Commerce Network (Phase C)
  start_service "nexha-supplier-network"      "$NEXHA_SUPPLIER_CMD"      4280
  start_service "nexha-distribution-network"  "$NEXHA_DISTRIBUTION_CMD"  4285
  start_service "nexha-warehouse-network"     "$NEXHA_WAREHOUSE_CMD"     4288
  start_service "nexha-trade-finance-network" "$NEXHA_TRADE_FINANCE_CMD" 4287
  start_service "nexha-pricing-network"       "$NEXHA_PRICING_CMD"       4286
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
  stop_port 4290 "Decision Engine"
  stop_port 4294 "Economy OS"
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
  stop_port 4280 "nexha-supplier-network"
  stop_port 4285 "nexha-distribution-network"
  stop_port 4288 "nexha-warehouse-network"
  stop_port 4287 "nexha-trade-finance-network"
  stop_port 4286 "nexha-pricing-network"
}

case "${1:-start}" in
  start)  start_all ;;
  stop)   stop_all ;;
  status) status ;;
  demo)   start_all; sleep 2; bash "$RTMN_ROOT/demos/full-stack-demo.sh" ;;
  *)      echo "Usage: $0 {start|stop|status|demo}"; exit 1 ;;
esac
