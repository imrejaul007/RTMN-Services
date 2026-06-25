#!/bin/bash
# Start all services that were missing from dev-stack.sh (added 2026-06-25)
set +e
RTMN="/Users/rejaulkarim/Documents/RTMN"
LOG="/tmp/rtmn-dev"

mkdir -p "$LOG"

# Plain node.js — runs dist/ (already built) or src/ with type:module
start_node() {
  local name="$1"; shift
  local port="$1"; shift
  local dir="$1"; shift
  local entry="${1:-src/index.js}"; shift
  if lsof -i ":$port" >/dev/null 2>&1; then
    echo "SKIP  $name (port $port) — already running"
    return
  fi
  echo "START $name (port $port)..."
  cd "$RTMN/$dir"
  nohup node "$entry" > "$LOG/$name.log" 2>&1 &
  sleep 2
}

# TypeScript via tsx (run directly without build)
start_tsx() {
  local name="$1"; shift
  local port="$1"; shift
  local dir="$1"; shift
  local entry="${1:-src/index.ts}"; shift
  if lsof -i ":$port" >/dev/null 2>&1; then
    echo "SKIP  $name (port $port) — already running"
    return
  fi
  echo "START $name (port $port) via tsx..."
  cd "$RTMN/$dir"
  nohup npx tsx "$entry" > "$LOG/$name.log" 2>&1 &
  sleep 3
}

# TypeScript — run directly via tsx (no build step needed)
start_ts_run() {
  local name="$1"; shift
  local port="$1"; shift
  local dir="$1"; shift
  if lsof -i ":$port" >/dev/null 2>&1; then
    echo "SKIP  $name (port $port) — already running"
    return
  fi
  echo "START $name (port $port) via tsx..."
  cd "$RTMN/$dir"
  nohup npx tsx src/index.ts > "$LOG/$name.log" 2>&1 &
  sleep 3
}

# Install deps then start
start_with_install() {
  local name="$1"; shift
  local port="$1"; shift
  local dir="$1"; shift
  if lsof -i ":$port" >/dev/null 2>&1; then
    echo "SKIP  $name (port $port) — already running"
    return
  fi
  echo "INSTALL+START $name (port $port)..."
  cd "$RTMN/$dir"
  npm install > "$LOG/${name}_install.log" 2>&1 || true
  nohup node src/index.js > "$LOG/$name.log" 2>&1 &
  sleep 2
}

# ── SUTAR OS core ───────────────────────────────────────────────────────────
# sada-os: TypeScript, runs via tsx
start_tsx "sada-os"          4190 "companies/HOJAI-AI/platform/trust/sada-os"
# trust-engine: TypeScript, needs build
start_ts_build "trust-engine" 4291 "companies/HOJAI-AI/sutar-os/core/sutar-trust-engine"
# contract-os: TypeScript, needs build
start_ts_build "contract-os"   4292 "companies/HOJAI-AI/sutar-os/contracts/sutar-contract-os"
# negotiation-engine: TypeScript, needs build
start_ts_build "negotiation"   4293 "companies/HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine"

# ── Core Foundation ──────────────────────────────────────────────────────────
# corp-id: index.persistent.js (uses CommonJS)
start_node "corp-id" 4702 "companies/HOJAI-AI/platform/identity/corpid-service" "src/index.persistent.js"
# memory-os: ESM (fixed 2026-06-25 — added "type": "module")
start_node "memory-os"         4703 "companies/HOJAI-AI/platform/memory/memory-os" "src/index.js"
# memory-confidence: ESM
start_node "memory-confidence" 4152 "companies/HOJAI-AI/platform/memory/memory-confidence" "src/index.js"
# memory-context-engine: ESM (port 4793)
start_node "mem-context-eng"  4793 "companies/HOJAI-AI/platform/memory/memory-context-engine" "src/index.js"
# twin-memory-bridge: ESM
start_node "twin-mem-bridge"  4704 "companies/HOJAI-AI/platform/twins/twin-memory-bridge" "src/index.js"
# twinos-hub: ESM
start_node "twinos-hub"       4705 "companies/HOJAI-AI/platform/twins/twinos-hub" "src/index.js"

# ── Nexha Phase D federation ───────────────────────────────────────────────
# nexha-federation-os: TypeScript, needs build
start_ts_build "nexha-fed-os" 4273 "companies/Nexha/services/nexha-federation-os"
# nexha-global-directory: TypeScript, needs build
start_ts_build "nexha-global" 4276 "companies/Nexha/services/nexha-global-directory"

# ── Nexha partner network ──────────────────────────────────────────────────
# nexha-partner-network: needs npm install (express-rate-limit missing)
start_with_install "nexha-partner" 4297 "companies/Nexha/services/nexha-partner-network"

echo ""
echo "Waiting for startup..."
sleep 3
echo ""
echo "Results:"
for port in 4190 4291 4292 4293 4702 4703 4152 4793 4704 4705 4273 4276 4297; do
  if lsof -i ":$port" >/dev/null 2>&1; then
    echo "  UP   :$port"
  else
    echo "  DOWN :$port"
  fi
done
echo ""
echo "Logs: $LOG/*.log"
