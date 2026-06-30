#!/bin/bash
# =============================================================================
# RTMN Unified Civilization Stack - Startup Script
# =============================================================================
# Starts all services in the correct order:
# 1. Foundation (CorpID, MemoryOS, TwinOS)
# 2. Trust & Governance (SADA OS)
# 3. Workforce Registry (Salar OS)
# 4. Agent Runtime (AgentOS + Identity Bridge)
# 5. SUTAR OS (Agent Operation)
# 6. BLR AI Marketplace (BAM)
# 7. CompanyOS (Control Plane)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
export INTERNAL_SERVICE_TOKEN="${INTERNAL_SERVICE_TOKEN:-internal-dev-token-123}"
export JWT_SECRET="${JWT_SECRET:-dev-jwt-secret-change-in-prod}"
export NODE_ENV="${NODE_ENV:-development}"

# Service URLs
export CORPID_URL="${CORPID_URL:-http://localhost:4702}"
export MEMORY_OS_URL="${MEMORY_OS_URL:-http://localhost:4703}"
export TWINOS_URL="${TWINOS_URL:-http://localhost:4705}"
export SADA_URL="${SADA_URL:-http://localhost:4190}"
export SALAR_URL="${SALAR_URL:-http://localhost:4710}"
export AGENT_OS_URL="${AGENT_OS_URL:-http://localhost:4802}"
export AGENT_IDENTITY_URL="${AGENT_IDENTITY_URL:-http://localhost:4810}"
export SUTAR_DECISION_URL="${SUTAR_DECISION_URL:-http://localhost:4240}"
export SUTAR_INTENT_BUS_URL="${SUTAR_INTENT_BUS_URL:-http://localhost:4154}"
export SUTAR_ECONOMY_URL="${SUTAR_ECONOMY_URL:-http://localhost:4294}"
export SUTAR_TRUST_URL="${SUTAR_TRUST_URL:-http://localhost:4291}"
export BLR_DISCOVERY_URL="${BLR_DISCOVERY_URL:-http://localhost:4256}"
export BLR_MARKETPLACE_URL="${BLR_MARKETPLACE_URL:-http://localhost:4255}"

# Directories
RTMN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOJAI_DIR="$RTMN_ROOT/companies/HOJAI-AI"
NEXHA_DIR="$RTMN_ROOT/companies/Nexha"

# PID file for cleanup
PID_FILE="/tmp/rtmn-unified-stack.pids"

# =============================================================================
# FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_info "Cleaning up..."
    if [ -f "$PID_FILE" ]; then
        while read pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    log_success "Cleanup complete"
}

start_service() {
    local name=$1
    local dir=$2
    local cmd=$3
    local port=$4

    log_info "Starting $name (port $port)..."

    cd "$dir"

    if [ -d "node_modules" ]; then
        $cmd &
    else
        npm install --silent 2>/dev/null || true
        $cmd &
    fi

    local pid=$!
    echo "$pid" >> "$PID_FILE"

    # Wait for service to be ready
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$PORT_VARIABLE" >/dev/null 2>&1; then
            log_success "$name started (PID: $pid)"
            return 0
        fi
        sleep 0.5
        attempt=$((attempt + 1))
    done

    log_warn "$name may not be ready (PID: $pid)"
    return 1
}

wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=${3:-30}
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s --max-time 2 "$url/health" 2>/dev/null | grep -q "ok\|healthy"; then
            log_success "$name is ready"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    log_warn "$name may not be ready"
    return 1
}

# =============================================================================
# STARTUP
# =============================================================================

main() {
    local action="${1:-start}"

    case "$action" in
        start)
            log_info "Starting RTMN Unified Civilization Stack..."
            trap cleanup EXIT

            # Create PID file
            > "$PID_FILE"

            # =================================================================
            # PHASE 1: FOUNDATION
            # =================================================================
            log_info ""
            log_info "=========================================="
            log_info "PHASE 1: Foundation Services"
            log_info "=========================================="

            # CorpID
            if [ -d "$HOJAI_DIR/platform/identity/corp-id-service" ]; then
                cd "$HOJAI_DIR/platform/identity/corp-id-service"
                log_info "Starting CorpID (port 4702)..."
                PORT=4702 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            # MemoryOS
            if [ -d "$HOJAI_DIR/platform/memory/memory-os" ]; then
                cd "$HOJAI_DIR/platform/memory/memory-os"
                log_info "Starting MemoryOS (port 4703)..."
                PORT=4703 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            # TwinOS Hub
            if [ -d "$HOJAI_DIR/platform/twins/twinos-hub" ]; then
                cd "$HOJAI_DIR/platform/twins/twinos-hub"
                log_info "Starting TwinOS Hub (port 4705)..."
                PORT=4705 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            sleep 2
            wait_for_service "$CORPID_URL" "CorpID" || true
            wait_for_service "$MEMORY_OS_URL" "MemoryOS" || true
            wait_for_service "$TWINOS_URL" "TwinOS" || true

            # =================================================================
            # PHASE 2: TRUST & GOVERNANCE
            # =================================================================
            log_info ""
            log_info "=========================================="
            log_info "PHASE 2: Trust & Governance (SADA OS)"
            log_info "=========================================="

            # SADA OS
            if [ -d "$HOJAI_DIR/platform/trust/sada-os" ]; then
                cd "$HOJAI_DIR/platform/trust/sada-os"
                log_info "Starting SADA OS (port 4190)..."
                PORT=4190 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            sleep 2
            wait_for_service "$SADA_URL" "SADA OS" || true

            # =================================================================
            # PHASE 3: WORKFORCE REGISTRY
            # =================================================================
            log_info ""
            log_info "=========================================="
            log_info "PHASE 3: Workforce Registry (Salar OS)"
            log_info "=========================================="

            # Salar OS
            if [ -d "$HOJAI_DIR/platform/twins/salar-os" ]; then
                cd "$HOJAI_DIR/platform/twins/salar-os"
                log_info "Starting Salar OS (port 4710)..."
                PORT=4710 npm start &
                echo $! >> "$PID_FILE"
            fi

            sleep 2
            wait_for_service "$SALAR_URL" "Salar OS" || true

            # =================================================================
            # PHASE 4: AGENT RUNTIME
            # =================================================================
            log_info ""
            log_info "=========================================="
            log_info "PHASE 4: Agent Runtime (AgentOS)"
            log_info "=========================================="

            # AgentOS Gateway
            if [ -d "$HOJAI_DIR/platform/agent-os/agent-platform-api" ]; then
                cd "$HOJAI_DIR/platform/agent-os/agent-platform-api"
                log_info "Starting AgentOS Gateway (port 4802)..."
                PORT=4802 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            # Agent Registry
            if [ -d "$HOJAI_DIR/platform/agent-os/agent-registry" ]; then
                cd "$HOJAI_DIR/platform/agent-os/agent-registry"
                log_info "Starting Agent Registry (port 4803)..."
                PORT=4803 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            # Agent Identity Bridge
            if [ -d "$HOJAI_DIR/platform/agent-os/identity-bridge" ]; then
                cd "$HOJAI_DIR/platform/agent-os/identity-bridge"
                log_info "Starting Agent Identity Bridge (port 4810)..."
                PORT=4810 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            sleep 3
            wait_for_service "$AGENT_OS_URL" "AgentOS Gateway" || true

            # =================================================================
            # PHASE 5: SUTAR OS
            # =================================================================
            log_info ""
            log_info "=========================================="
            log_info "PHASE 5: Agent Operation (SUTAR OS)"
            log_info "=========================================="

            # SUTAR Decision Engine
            if [ -d "$HOJAI_DIR/sutar-os/core/sutar-decision-engine" ]; then
                cd "$HOJAI_DIR/sutar-os/core/sutar-decision-engine"
                log_info "Starting SUTAR Decision Engine (port 4240)..."
                PORT=4240 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            # SUTAR Intent Bus
            if [ -d "$HOJAI_DIR/sutar-os/core/sutar-intent-bus" ]; then
                cd "$HOJAI_DIR/sutar-os/core/sutar-intent-bus"
                log_info "Starting SUTAR Intent Bus (port 4154)..."
                PORT=4154 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            # SUTAR Economy
            if [ -d "$HOJAI_DIR/sutar-os/core/sutar-economy-os" ]; then
                cd "$HOJAI_DIR/sutar-os/core/sutar-economy-os"
                log_info "Starting SUTAR Economy OS (port 4294)..."
                PORT=4294 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            # SUTAR Trust
            if [ -d "$HOJAI_DIR/sutar-os/core/sutar-trust-engine" ]; then
                cd "$HOJAI_DIR/sutar-os/core/sutar-trust-engine"
                log_info "Starting SUTAR Trust Engine (port 4291)..."
                PORT=4291 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            sleep 3

            # =================================================================
            # PHASE 6: BLR AI MARKETPLACE
            # =================================================================
            log_info ""
            log_info "=========================================="
            log_info "PHASE 6: BLR AI Marketplace (BAM)"
            log_info "=========================================="

            # BLR Discovery Engine
            if [ -d "$HOJAI_DIR/blr-ai-marketplace/services/discovery-engine" ]; then
                cd "$HOJAI_DIR/blr-ai-marketplace/services/discovery-engine"
                log_info "Starting BLR Discovery Engine (port 4256)..."
                PORT=4256 node src/index.js &
                echo $! >> "$PID_FILE"
            fi

            # BLR Marketplace Listings
            if [ -d "$HOJAI_DIR/blr-ai-marketplace/services/marketplace-listings" ]; then
                cd "$HOJAI_DIR/blr-ai-marketplace/services/marketplace-listings"
                log_info "Starting BLR Marketplace (port 4255)..."
                PORT=4255 npm start &
                echo $! >> "$PID_FILE"
            fi

            sleep 3
            wait_for_service "$BLR_DISCOVERY_URL" "BLR Discovery" || true
            wait_for_service "$BLR_MARKETPLACE_URL" "BLR Marketplace" || true

            # =================================================================
            # PHASE 7: COMPANY OS
            # =================================================================
            log_info ""
            log_info "=========================================="
            log_info "PHASE 7: CompanyOS (Control Plane)"
            log_info "=========================================="

            # CompanyOS Control Plane
            if [ -d "$HOJAI_DIR/platform/company-os/control-plane" ]; then
                cd "$HOJAI_DIR/platform/company-os/control-plane"
                log_info "Starting CompanyOS Control Plane (port 4010)..."
                PORT=4010 npm start &
                echo $! >> "$PID_FILE"
            fi

            sleep 2

            # =================================================================
            # COMPLETE
            # =================================================================
            log_info ""
            log_info "=========================================="
            log_info "RTMN Unified Civilization Stack Started"
            log_info "=========================================="
            log_info ""
            log_info "Service Endpoints:"
            log_info "  CorpID:          $CORPID_URL"
            log_info "  MemoryOS:        $MEMORY_OS_URL"
            log_info "  TwinOS:          $TWINOS_URL"
            log_info "  SADA OS:         $SADA_URL"
            log_info "  Salar OS:        $SALAR_URL"
            log_info "  AgentOS Gateway: $AGENT_OS_URL"
            log_info "  Agent Identity:  $AGENT_IDENTITY_URL"
            log_info "  SUTAR Decision:  $SUTAR_DECISION_URL"
            log_info "  SUTAR Intent Bus: $SUTAR_INTENT_BUS_URL"
            log_info "  SUTAR Economy:   $SUTAR_ECONOMY_URL"
            log_info "  SUTAR Trust:     $SUTAR_TRUST_URL"
            log_info "  BLR Discovery:    $BLR_DISCOVERY_URL"
            log_info "  BLR Marketplace: $BLR_MARKETPLACE_URL"
            log_info ""
            log_info "Bridge Verification:"
            log_info "  curl $SALAR_URL/salar-bridge/blr/health"
            log_info "  curl $SALAR_URL/sutar/bridge/health"
            log_info "  curl $AGENT_IDENTITY_URL/identity/health"
            log_info "  curl $SADA_URL/trust/push/health"
            log_info ""
            log_info "Press Ctrl+C to stop all services"
            log_info ""

            # Wait for all background jobs
            wait
            ;;

        stop)
            log_info "Stopping RTMN Unified Civilization Stack..."
            cleanup
            log_success "All services stopped"
            ;;

        status)
            log_info "Checking service status..."

            services=(
                "CorpID:$CORPID_URL"
                "MemoryOS:$MEMORY_OS_URL"
                "TwinOS:$TWINOS_URL"
                "SADA OS:$SADA_URL"
                "Salar OS:$SALAR_URL"
                "AgentOS Gateway:$AGENT_OS_URL"
                "Agent Identity:$AGENT_IDENTITY_URL"
                "SUTAR Decision:$SUTAR_DECISION_URL"
                "BLR Discovery:$BLR_DISCOVERY_URL"
                "BLR Marketplace:$BLR_MARKETPLACE_URL"
            )

            healthy=0
            total=${#services[@]}

            for svc in "${services[@]}"; do
                IFS=':' read -r name url <<< "$svc"
                if curl -s --max-time 2 "$url/health" 2>/dev/null | grep -q "ok\|healthy\|ok"; then
                    log_success "$name: healthy"
                    healthy=$((healthy + 1))
                else
                    log_error "$name: not responding"
                fi
            done

            log_info ""
            log_info "Health: $healthy/$total services"
            ;;

        *)
            echo "Usage: $0 {start|stop|status}"
            exit 1
            ;;
    esac
}

main "$@"
