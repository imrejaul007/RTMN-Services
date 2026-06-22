#!/bin/bash
# RTMN Phase A+B+C+D dev stack — one-command spin-up
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

# Service registry — exactly mirrors docker-compose.dev.yml
HUB_CMD="cd $RTMN_ROOT/companies/RABTUL-Technologies/REZ-ecosystem-connector && PORT=4399 node dist/index.js"
TRUST_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/core/sutar-trust-engine && PORT=4291 SADA_URL=http://localhost:4190 npm start"
DECISION_ENGINE_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/core/sutar-decision-engine && PORT=4290 npm start"
ECONOMY_OS_CMD="cd $RTMN_ROOT/companies/HOJAI-AI/sutar-os/economy/sutar-economy-os && PORT=4251 npm start"

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
  for entry in "Hub:4399" "Trust Engine:4291" "Decision Engine:4290" "Economy OS:4251"; do
    name="${entry%:*}"
    port="${entry#*:}"
    if lsof -i ":$port" >/dev/null 2>&1; then
      echo "  ✓ $name (port $port)"
    else
      echo "  ✗ $name (port $port)"
    fi
  done
}

start_all() {
  echo "Starting RTMN dev stack..."
  start_service "trust-engine"      "$TRUST_ENGINE_CMD"     4291
  start_service "decision-engine"   "$DECISION_ENGINE_CMD"  4290
  start_service "economy-os"        "$ECONOMY_OS_CMD"       4251
  start_service "hub"               "$HUB_CMD"              4399
  sleep 3
  status
  echo ""
  echo "Logs: $LOG_DIR/*.log"
  echo "Run the demo: bash demos/full-stack-demo.sh"
}

stop_all() {
  echo "Stopping RTMN dev stack..."
  stop_port 4399 "Hub"
  stop_port 4291 "Trust Engine"
  stop_port 4290 "Decision Engine"
  stop_port 4251 "Economy OS"
}

case "${1:-start}" in
  start)  start_all ;;
  stop)   stop_all ;;
  status) status ;;
  demo)   start_all; sleep 2; bash "$RTMN_ROOT/demos/full-stack-demo.sh" ;;
  *)      echo "Usage: $0 {start|stop|status|demo}"; exit 1 ;;
esac
