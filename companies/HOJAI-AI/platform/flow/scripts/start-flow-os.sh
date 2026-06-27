#!/bin/bash
# FlowOS Startup Script
# Starts all FlowOS services in the background
# Usage: ./start-flow-os.sh [start|stop|restart|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLOW_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$FLOW_DIR/logs"
PID_DIR="$FLOW_DIR/pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[FlowOS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[FlowOS]${NC} $1"
}

error() {
    echo -e "${RED}[FlowOS]${NC} $1"
}

# Service definitions: name port directory
SERVICES=(
    "flow-orchestrator:4244:flow-orchestrator"
    "goal-os:4242:goal-os"
    "policy-os:4254:policy-os"
    "decision-engine:4240:decision-engine"
    "decision-intelligence:4756:decision-intelligence"
    "predictive-intelligence:4754:predictive-intelligence"
    "risk-intelligence:4755:risk-intelligence"
    "trust-intelligence:4882:trust-intelligence"
    "journey-intelligence:4758:journey-intelligence"
    "goal-conflict-engine:4151:goal-conflict-engine"
    "simulation-os:4241:simulation-os"
    "compliance-engine:4759:compliance-engine"
    "consent-engine:4760:consent-engine"
    "dependency-graph:4152:dependency-graph"
    "execution-engine:4153:execution-engine"
    "retry-planner:4154:retry-planner"
    "recovery-planner:4155:recovery-planner"
    "task-decomposer:4156:task-decomposer"
    "dynamic-replanner:4157:dynamic-replanner"
    "industry-twin:4893:industry-twin"
)

start_service() {
    local name=$1
    local port=$2
    local dir=$3

    local pid_file="$PID_DIR/${name}.pid"
    local log_file="$LOG_DIR/${name}.log"

    # Check if already running
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            warn "$name is already running (PID: $pid, Port: $port)"
            return 0
        fi
    fi

    # Check if port is in use
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        warn "Port $port is already in use, $name may be running"
        return 1
    fi

    # Start the service
    log "Starting $name on port $port..."
    cd "$FLOW_DIR/$dir"

    # Check for package.json
    if [ ! -f "package.json" ]; then
        error "No package.json found for $name"
        return 1
    fi

    # Start in background with npm start or node
    nohup node src/index.js > "$log_file" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"

    # Wait briefly and check if started
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        log "$name started successfully (PID: $pid)"
    else
        error "$name failed to start. Check $log_file"
        rm -f "$pid_file"
        return 1
    fi
}

stop_service() {
    local name=$1
    local pid_file="$PID_DIR/${name}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log "Stopping $name (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 1
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
    fi
}

status_service() {
    local name=$1
    local port=$2
    local pid_file="$PID_DIR/${name}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} $name (PID: $pid, Port: $port) - Healthy"
            else
                echo -e "${YELLOW}⚠${NC} $name (PID: $pid, Port: $port) - Not responding"
            fi
            return 0
        fi
    fi

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC} $name (Port: $port) - Running but not managed by this script"
        return 0
    fi

    echo -e "${RED}✗${NC} $name (Port: $port) - Stopped"
    return 1
}

case "${1:-start}" in
    start)
        log "Starting FlowOS services..."
        echo ""

        local started=0
        local failed=0

        for service in "${SERVICES[@]}"; do
            IFS=':' read -r name port dir <<< "$service"
            if start_service "$name" "$port" "$dir"; then
                ((started++)) || true
            else
                ((failed++)) || true
            fi
        done

        echo ""
        log "FlowOS startup complete: $started started, $failed failed"
        log "Logs: $LOG_DIR"
        log "PIDs: $PID_DIR"
        ;;

    stop)
        log "Stopping FlowOS services..."
        for service in "${SERVICES[@]}"; do
            IFS=':' read -r name port dir <<< "$service"
            stop_service "$name"
        done
        log "All FlowOS services stopped"
        ;;

    status)
        echo "FlowOS Service Status"
        echo "===================="
        local total=0
        local running=0
        for service in "${SERVICES[@]}"; do
            IFS=':' read -r name port dir <<< "$service"
            ((total++)) || true
            if status_service "$name" "$port"; then
                ((running++)) || true
            fi
        done
        echo ""
        echo "Total: $running/$total running"
        ;;

    restart)
        $0 stop
        sleep 2
        $0 start
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
