#!/bin/bash
# Start all services that were missing from dev-stack.sh (added 2026-06-25)
set -e
RTMN="/Users/rejaulkarim/Documents/RTMN"
LOG="/tmp/rtmn-dev"

mkdir -p "$LOG"

start() {
  local name="$1"; shift
  local port="$1"; shift
  local dir="$1"; shift
  if lsof -i ":$port" >/dev/null 2>&1; then
    echo "SKIP  $name (port $port) — already running"
    return
  fi
  echo "START $name (port $port)..."
  cd "$RTMN/$dir"
  nohup node src/index.js > "$LOG/$name.log" 2>&1 &
  sleep 1
}

start_ts() {
  local name="$1"; shift
  local port="$1"; shift
  local dir="$1"; shift
  if lsof -i ":$port" >/dev/null 2>&1; then
    echo "SKIP  $name (port $port) — already running"
    return
  fi
  echo "BUILD+START $name (port $port)..."
  cd "$RTMN/$dir"
  npm run build > "$LOG/${name}_build.log" 2>&1 || true
  nohup node dist/index.js > "$LOG/$name.log" 2>&1 &
  sleep 1
}

# SUTAR OS core
start "sada-os"          4190 "companies/HOJAI-AI/platform/trust/sada-os"
start_ts "trust-engine"  4291 "companies/HOJAI-AI/sutar-os/core/sutar-trust-engine"
start_ts "contract-os"   4292 "companies/HOJAI-AI/sutar-os/contracts/sutar-contract-os"
start_ts "negotiation"   4293 "companies/HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine"

# Core foundation
start "corp-id"           4702 "companies/HOJAI-AI/platform/identity/corpid-service"
start "memory-os"         4703 "companies/HOJAI-AI/platform/memory/memory-os"
start "memory-confidence" 4152 "companies/HOJAI-AI/platform/memory/memory-confidence"
start "mem-context-eng"  4793 "companies/HOJAI-AI/platform/memory/memory-context-engine"
start "twin-mem-bridge"  4704 "companies/HOJAI-AI/platform/twins/twin-memory-bridge"
start "twinos-hub"       4705 "companies/HOJAI-AI/platform/twins/twinos-hub"

# Nexha Phase D federation
start_ts "nexha-fed-os"   4273 "companies/Nexha/services/nexha-federation-os"
start_ts "nexha-global"   4276 "companies/Nexha/services/nexha-global-directory"

# Nexha partner network
start "nexha-partner"    4297 "companies/Nexha/services/nexha-partner-network"

echo ""
echo "Waiting for services to bind..."
sleep 5
echo ""
echo "Results:"
for port in 4190 4291 4292 4293 4702 4703 4152 4793 4704 4705 4273 4276 4297; do
  if lsof -i ":$port" >/dev/null 2>&1; then
    echo "  UP   :$port"
  else
    echo "  DOWN :$port"
  fi
done
