#!/bin/bash
# Global Nexha + AgentFin Combined Startup Script
# Starts all financial infrastructure services
# Usage: bash scripts/start-global-nexha.sh [start|stop|restart|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTMN_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
log_info "=========================================="
log_info "   Global Nexha + AgentFin Startup"
log_info "=========================================="
echo ""

case "${1:-start}" in
    start)
        log_info "Starting Global Nexha Hub..."
        bash "$RTMN_ROOT/companies/Nexha/services/start-nexha-global.sh" start

        echo ""
        log_info "Starting AgentFin (14 services)..."
        bash "$RTMN_ROOT/companies/RABTUL-Technologies/agentfin/scripts/start-all.sh" status

        echo ""
        log_info "=========================================="
        log_info "   All Services Running"
        log_info "=========================================="
        echo ""
        echo "  Global Nexha Hub:  http://localhost:4380"
        echo "  Payment Network:   http://localhost:4296"
        echo "  AgentFin Gateway:  http://localhost:5510"
        echo "  Nexha Settlement:  http://localhost:5524"
        echo ""
        echo "  Run './scripts/start-global-nexha.sh status' to check all services"
        echo ""
        ;;

    stop)
        log_info "Stopping all services..."
        bash "$RTMN_ROOT/companies/Nexha/services/start-nexha-global.sh" stop 2>/dev/null || true
        bash "$RTMN_ROOT/companies/RABTUL-Technologies/agentfin/scripts/start-all.sh" stop 2>/dev/null || true
        log_info "Done"
        ;;

    restart)
        $0 stop; sleep 1; $0 start
        ;;

    status)
        bash "$RTMN_ROOT/companies/Nexha/services/start-nexha-global.sh" status
        echo ""
        bash "$RTMN_ROOT/companies/RABTUL-Technologies/agentfin/scripts/start-all.sh" status
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|status}"
        ;;
esac
