#!/bin/bash
###############################################################################
# Global Nexha Commerce Stack Startup Script
# Starts all 13 services in the correct order
# Date: June 30, 2026
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Service definitions: name|path|port
SERVICES=(
    "RTMN Hub|services/rtmn-unified-hub|4399"
    "CommerceOS Gateway|companies/HOJAI-AI/platform/commerce-os/commerce-os-gateway|5400"
    "BAM Gateway|companies/HOJAI-AI/platform/bam/bam-gateway|5550"
    "Vendor Acquisition Worker|companies/HOJAI-AI/platform/bam/vendor-acquisition-worker|5551"
    "Catalog Normalization Worker|companies/HOJAI-AI/platform/bam/catalog-normalization-worker|5552"
    "Recommendation Worker|companies/HOJAI-AI/platform/bam/recommendation-worker|5553"
    "Template Engine|companies/Nexha/services/template-engine|5670"
    "Vendor Liquidity Pools|companies/Nexha/services/vendor-liquidity-pools|5680"
    "Commerce Studio Backend|companies/HOJAI-AI/products/commerce-studio/studio-backend|5750"
    "Product Graph|companies/Nexha/services/product-graph|5800"
    "Trade Finance|companies/Nexha/services/trade-finance|5810"
    "Cross-Border Commerce|companies/Nexha/services/cross-border|5820"
    "Universal Distribution|companies/Nexha/services/universal-distribution|5830"
)

# Service log directories
mkdir -p "$ROOT_DIR/logs"

###############################################################################
# Helper functions
###############################################################################
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

build_service() {
    local service_path=$1
    local service_name=$2

    if [ ! -d "$ROOT_DIR/$service_path" ]; then
        log_error "Path not found: $service_path"
        return 1
    fi

    cd "$ROOT_DIR/$service_path"

    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies for $service_name..."
        npm install --silent 2>&1 | tail -3
    fi

    if [ ! -d "dist" ]; then
        log_info "Building $service_name..."
        npm run build --silent 2>&1 | tail -3
    fi
}

start_service() {
    local service_path=$1
    local service_name=$2
    local port=$3
    local log_file="$ROOT_DIR/logs/${service_name// /-}.log"

    if check_port $port; then
        log_warn "$service_name already running on port $port"
        return 0
    fi

    cd "$ROOT_DIR/$service_path"

    log_info "Starting $service_name on port $port..."
    nohup npm start > "$log_file" 2>&1 &
    local pid=$!

    sleep 2

    if check_port $port; then
        log_success "$service_name started (PID: $pid, port: $port)"
    else
        log_error "$service_name failed to start. Check $log_file"
        return 1
    fi
}

###############################################################################
# Main
###############################################################################
show_banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║      GLOBAL NEXHA COMMERCE STACK v3.2                          ║"
    echo "║      13 Services - 50 Weeks of Architecture                   ║"
    echo "║      Phase 0-5: Foundation → Advanced Commerce                 ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

start_all() {
    log_info "Building all services..."
    for entry in "${SERVICES[@]}"; do
        IFS='|' read -r name path port <<< "$entry"
        build_service "$path" "$name" || true
    done

    echo ""
    log_info "Starting all services in order..."

    for entry in "${SERVICES[@]}"; do
        IFS='|' read -r name path port <<< "$entry"
        start_service "$path" "$name" "$port" || true
        sleep 1
    done

    echo ""
    log_success "All services started!"
    echo ""
    echo -e "${BLUE}Service Endpoints:${NC}"
    echo "  • RTMN Hub:                  http://localhost:4399"
    echo "  • CommerceOS Gateway:        http://localhost:5400"
    echo "  • BAM Gateway:               http://localhost:5550"
    echo "  • Vendor Acquisition:        http://localhost:5551"
    echo "  • Catalog Normalization:     http://localhost:5552"
    echo "  • Recommendation:             http://localhost:5553"
    echo "  • Template Engine:           http://localhost:5670"
    echo "  • Vendor Pools:              http://localhost:5680"
    echo "  • Commerce Studio Backend:   http://localhost:5750"
    echo "  • Commerce Studio Web:       http://localhost:3001"
    echo "  • Product Graph:             http://localhost:5800"
    echo "  • Trade Finance:             http://localhost:5810"
    echo "  • Cross-Border Commerce:     http://localhost:5820"
    echo "  • Universal Distribution:    http://localhost:5830"
    echo ""
}

stop_all() {
    log_info "Stopping all services..."
    for entry in "${SERVICES[@]}"; do
        IFS='|' read -r name path port <<< "$entry"
        if check_port $port; then
            pid=$(lsof -ti:$port 2>/dev/null)
            if [ -n "$pid" ]; then
                kill $pid 2>/dev/null && log_success "$name stopped (PID: $pid)" || log_warn "$name stop failed"
            fi
        fi
    done
}

status() {
    echo ""
    echo -e "${BLUE}Service Status:${NC}"
    for entry in "${SERVICES[@]}"; do
        IFS='|' read -r name path port <<< "$entry"
        if check_port $port; then
            echo -e "  ${GREEN}●${NC} $name (port $port) - RUNNING"
        else
            echo -e "  ${RED}○${NC} $name (port $port) - STOPPED"
        fi
    done
    echo ""
}

health_check() {
    log_info "Running health checks..."
    echo ""
    local healthy=0
    local total=${#SERVICES[@]}

    for entry in "${SERVICES[@]}"; do
        IFS='|' read -r name path port <<< "$entry"
        if check_port $port; then
            response=$(curl -s --max-time 2 "http://localhost:$port/health" 2>/dev/null || echo "")
            if [ -n "$response" ]; then
                echo -e "  ${GREEN}✓${NC} $name (port $port) - HEALTHY"
                healthy=$((healthy + 1))
            else
                echo -e "  ${YELLOW}⚠${NC} $name (port $port) - RUNNING BUT NOT RESPONDING"
            fi
        else
            echo -e "  ${RED}✗${NC} $name (port $port) - NOT RUNNING"
        fi
    done

    echo ""
    log_info "Health: $healthy/$total services healthy"
}

show_banner

case "${1:-start}" in
    start)
        start_all
        echo ""
        health_check
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        start_all
        echo ""
        health_check
        ;;
    status)
        status
        ;;
    health)
        health_check
        ;;
    logs)
        if [ -n "$2" ]; then
            service_name=$(echo "$2" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
            tail -f "$ROOT_DIR/logs/${service_name}.log"
        else
            ls -la "$ROOT_DIR/logs/"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|health|logs [service-name]}"
        echo ""
        echo "Services:"
        for entry in "${SERVICES[@]}"; do
            IFS='|' read -r name path port <<< "$entry"
            echo "  - $name (port $port)"
        done
        exit 1
        ;;
esac

exit 0