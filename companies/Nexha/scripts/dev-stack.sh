#!/usr/bin/env bash
# ============================================================================
# Nexha OS Dev Stack — Start all 22 services + RTMN Hub
# ============================================================================
#
# Starts the full Nexha OS in development mode (local services).
# Each service runs via `tsx watch` for hot-reload.
#
# Services started (22 total):
#   Hub / RTMN ecosystem connector:      localhost:4399
#   Phase C — Network (5 services):
#     nexha-supplier-network:            localhost:4280
#     nexha-distribution-network:        localhost:4285
#     nexha-pricing-network:             localhost:4286
#     nexha-trade-finance-network:      localhost:4287
#     nexha-warehouse-network:          localhost:4288
#   Phase D — Federation (5 services):
#     nexha-business-directory:          localhost:4360
#     nexha-acp-messaging:              localhost:4340
#     nexha-mission-planner:            localhost:4362
#     nexha-partner-graph:              localhost:4363
#     nexha-commerce-runtime:           localhost:4364
#   Phase 12-13 — Provisioning (3 services):
#     nexha-provisioning-engine:        localhost:4385
#     nexha-hooks-sdk:                  localhost:4386
#     nexha-tenant-summary:             localhost:4387
#   Phase D Federation OS extensions (8 services):
#     nexha-capability-os:              localhost:4270
#     nexha-reputation-os:              localhost:4271
#     nexha-discovery-os:              localhost:4272
#     nexha-federation-os:             localhost:4273
#     nexha-opportunity-os:             localhost:4274
#     nexha-market-os:                  localhost:4275
#     nexha-global-directory:           localhost:4276
#     nexha-autonomous-logistics:       localhost:4293
#
# Plus the RTMN Hub (ecosystem-connector):        localhost:4399
#
# Usage:
#   bash scripts/dev-stack.sh start    # start all services
#   bash scripts/dev-stack.sh stop    # stop all services
#   bash scripts/dev-stack.sh status   # show running services
#   bash scripts/dev-stack.sh restart # restart all
#   bash scripts/dev-stack.sh logs    # tail all logs
#   bash scripts/dev-stack.sh health   # health-check all services
#
# Environment variables:
#   LOG_DIR    — directory for log files (default: .hojai-logs)
#   SKIP_HUB   — set to skip starting the Hub (if already running)
#
# Requirements:
#   - Node.js >= 18
#   - tsx installed (npm i -g tsx)
#   - All service dependencies installed (cd each service && npm install)
#
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${LOG_DIR:-${BASE_DIR}/.hojai-logs}"
mkdir -p "$LOG_DIR"

# ─── Service definitions ─────────────────────────────────────────────────
# Each entry: "name|port|service-dir|command-args"
SERVICES=(
  # Phase C — Network (5)
  "nexha-supplier-network|4280|nexha-supplier-network|tsx watch src/index.ts"
  "nexha-distribution-network|4285|nexha-distribution-network|tsx watch src/index.ts"
  "nexha-pricing-network|4286|nexha-pricing-network|tsx watch src/index.ts"
  "nexha-trade-finance-network|4287|nexha-trade-finance-network|tsx watch src/index.ts"
  "nexha-warehouse-network|4288|nexha-warehouse-network|tsx watch src/index.ts"

  # Phase D — Federation (5)
  "nexha-business-directory|4360|nexha-business-directory|tsx watch src/index.ts"
  "nexha-acp-messaging|4340|nexha-acp-messaging|tsx watch src/index.ts"
  "nexha-mission-planner|4362|nexha-mission-planner|tsx watch src/index.ts"
  "nexha-partner-graph|4363|nexha-partner-graph|tsx watch src/index.ts"
  "nexha-commerce-runtime|4364|nexha-commerce-runtime|tsx watch src/index.ts"

  # Phase 12-13 — Provisioning (3)
  "nexha-provisioning-engine|4385|nexha-provisioning-engine|tsx watch src/index.ts"
  "nexha-hooks-sdk|4386|nexha-hooks-sdk|tsx watch src/index.ts"
  "nexha-tenant-summary|4387|nexha-tenant-summary|tsx watch src/index.ts"

  # Phase D — Federation OS extensions (8)
  "nexha-capability-os|4270|nexha-capability-os|tsx watch src/index.ts"
  "nexha-reputation-os|4271|nexha-reputation-os|tsx watch src/index.ts"
  "nexha-discovery-os|4272|nexha-discovery-os|tsx watch src/index.ts"
  "nexha-federation-os|4273|nexha-federation-os|tsx watch src/index.ts"
  "nexha-opportunity-os|4274|nexha-opportunity-os|tsx watch src/index.ts"
  "nexha-market-os|4275|nexha-market-os|tsx watch src/index.ts"
  "nexha-global-directory|4276|nexha-global-directory|tsx watch src/index.ts"
  "nexha-autonomous-logistics|4293|nexha-autonomous-logistics|tsx watch src/index.ts"
)

# Hub (separate repo — started if SKIP_HUB is not set)
HUB_SERVICE="ecosystem-connector"
HUB_DIR="${BASE_DIR}/../RABTUL-Technologies/REZ-ecosystem-connector"
HUB_PORT=4399

# ─── Logging ─────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[ OK ]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err()   { echo -e "${RED}[ ERR]${NC} $*" >&2; }

log_start() {
  local name=$1 port=$2
  echo -e "  ${CYAN}▶${NC} $name (port $port)"
}

# ─── PID management ─────────────────────────────────────────────────────

PID_DIR="${LOG_DIR}/pids"
mkdir -p "$PID_DIR"

get_pid_file() { echo "${PID_DIR}/$1.pid"; }
get_log_file() { echo "${LOG_DIR}/$1.log"; }

save_pid() {
  local name=$1 pid=$2
  echo $pid > "$(get_pid_file $name)"
}

get_pid() {
  local pid_file=$(get_pid_file $1)
  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    # Verify process is actually running
    if kill -0 "$pid" 2>/dev/null; then
      echo "$pid"
      return 0
    else
      rm -f "$pid_file"
      return 1
    fi
  fi
  return 1
}

is_running() {
  local name=$1
  if get_pid "$name" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# ─── Service operations ─────────────────────────────────────────────────

start_service() {
  local name=$1 port=$2 dir=$3 cmd=$4

  if is_running "$name"; then
    log_warn "$name already running (PID $(get_pid $name))"
    return 0
  fi

  local svc_dir="${BASE_DIR}/services/${dir}"
  if [ ! -d "$svc_dir" ]; then
    log_err "Service directory not found: $svc_dir"
    return 1
  fi

  log_start "$name" "$port"

  # Check if port is already in use (by another process)
  if lsof -ti :$port > /dev/null 2>&1; then
    log_warn "Port $port already in use — assuming $name is running"
    return 0
  fi

  # Start in background with env vars
  cd "$svc_dir"
  PORT=$port \
    NODE_ENV=development \
    nohup $cmd \
      > "$(get_log_file $name)" 2>&1 &
  local pid=$!
  save_pid "$name" $pid

  # Wait briefly and check it started
  sleep 2
  if is_running "$name"; then
    log_ok "$name started (PID $pid, port $port)"
  else
    log_err "$name failed to start — check $(get_log_file $name)"
    return 1
  fi
}

stop_service() {
  local name=$1
  if ! is_running "$name"; then
    return 0
  fi
  local pid=$(get_pid $name)
  kill "$pid" 2>/dev/null || true
  sleep 1
  if is_running "$name"; then
    kill -9 "$pid" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$(get_pid_file $name)"
  log_info "Stopped $name"
}

service_health() {
  local name=$1 port=$2
  if ! is_running "$name"; then
    echo -e "  ${RED}✗${NC} $name — not running"
    return 1
  fi
  local response
  response=$(curl -s --connect-timeout 3 "http://localhost:${port}/health" 2>/dev/null || echo "")
  if [ -n "$response" ]; then
    echo -e "  ${GREEN}✓${NC} $name (port $port) — $response"
    return 0
  else
    echo -e "  ${YELLOW}?${NC} $name (port $port) — no response"
    return 1
  fi
}

# ─── Commands ───────────────────────────────────────────────────────────

cmd_start() {
  log_info "Starting Nexha OS dev stack..."
  log_info "Base dir: $BASE_DIR"
  log_info "Log dir:  $LOG_DIR"
  echo ""

  local count=0
  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name port dir cmd <<< "$entry"
    count=$((count + 1))
    start_service "$name" "$port" "$dir" "$cmd" || true
  done

  # Start Hub if not skipped
  if [ "${SKIP_HUB:-}" != "1" ] && [ -d "$HUB_DIR" ]; then
    echo ""
    log_start "ecosystem-connector (Hub)" "$HUB_PORT"
    if lsof -ti :$HUB_PORT > /dev/null 2>&1; then
      log_warn "Hub port $HUB_PORT already in use — skipping"
    else
      cd "$HUB_DIR"
      PORT=$HUB_PORT NODE_ENV=development \
        nohup node dist/index.js \
          > "$(get_log_file $HUB_SERVICE)" 2>&1 &
      local hub_pid=$!
      save_pid "$HUB_SERVICE" $hub_pid
      sleep 3
      if is_running "$HUB_SERVICE"; then
        log_ok "ecosystem-connector (Hub) started (PID $hub_pid, port $HUB_PORT)"
      else
        log_warn "Hub failed to start — check $(get_log_file $HUB_SERVICE)"
      fi
    fi
  fi

  echo ""
  log_ok "Started $count Nexha OS services"
  echo ""
  echo "  Next steps:"
  echo "    bash scripts/dev-stack.sh health   # verify all running"
  echo "    bash scripts/dev-stack.sh logs     # tail logs"
  echo "    bash scripts/dev-stack.sh stop      # stop all"
}

cmd_stop() {
  log_info "Stopping Nexha OS dev stack..."
  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name port dir cmd <<< "$entry"
    stop_service "$name"
  done
  if [ -f "$(get_pid_file $HUB_SERVICE)" ]; then
    stop_service "$HUB_SERVICE"
  fi
  log_ok "All services stopped"
}

cmd_status() {
  echo "Nexha OS Dev Stack Status"
  echo "========================"
  local running=0 stopped=0
  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name port dir cmd <<< "$entry"
    if is_running "$name"; then
      echo -e "  ${GREEN}✓${NC} $name (port $port, PID $(get_pid $name))"
      running=$((running + 1))
    else
      echo -e "  ${RED}✗${NC} $name (port $port)"
      stopped=$((stopped + 1))
    fi
  done
  echo ""
  echo "  $running running, $stopped stopped"
}

cmd_health() {
  echo "Nexha OS Health Check"
  echo "====================="
  local healthy=0 sick=0
  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name port dir cmd <<< "$entry"
    if service_health "$name" "$port"; then
      healthy=$((healthy + 1))
    else
      sick=$((sick + 1))
    fi
  done
  echo ""
  echo "  $healthy healthy, $sick unhealthy"
}

cmd_logs() {
  local service=${1:-}
  if [ -n "$service" ]; then
    if [ -f "$(get_log_file $service)" ]; then
      tail -50 "$(get_log_file $service)"
    else
      log_err "No log for service: $service"
      echo "Available logs:"
      ls "$LOG_DIR"/*.log 2>/dev/null | xargs -I{} basename {} .log
    fi
  else
    # Tail all logs
    tail -f "$LOG_DIR"/*.log 2>/dev/null
  fi
}

cmd_restart() {
  cmd_stop
  echo ""
  sleep 2
  cmd_start
}

# ─── Main ──────────────────────────────────────────────────────────────

CMD=${1:-start}

case "$CMD" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  status)  cmd_status ;;
  health)  cmd_health ;;
  logs)    cmd_logs "${2:-}" ;;
  restart) cmd_restart ;;
  *)
    echo "Usage: $0 {start|stop|status|health|logs [service]|restart}"
    exit 1
    ;;
esac
