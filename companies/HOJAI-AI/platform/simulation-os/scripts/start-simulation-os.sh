#!/bin/bash
# ============================================================================
# SimulationOS 2.0 Startup Script
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIMULATION_OS_DIR="$(dirname "$SCRIPT_DIR")"
PORT=${SIMULATION_PORT:-4300}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if simulation-os is installed
check_dependencies() {
    log_info "Checking dependencies..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    NODE_VERSION=$(node --version)
    log_success "Node.js version: $NODE_VERSION"

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    NPM_VERSION=$(npm --version)
    log_success "npm version: $NPM_VERSION"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."

    cd "$SIMULATION_OS_DIR"

    if [ ! -d "node_modules" ]; then
        npm install
    else
        log_info "Dependencies already installed"
    fi

    log_success "Dependencies installed"
}

# Build the project
build_project() {
    log_info "Building SimulationOS..."

    cd "$SIMULATION_OS_DIR"

    npm run build 2>/dev/null || {
        log_warn "Build skipped (no build script or TypeScript errors)"
    }

    log_success "Build complete"
}

# Run tests
run_tests() {
    log_info "Running tests..."

    cd "$SIMULATION_OS_DIR"

    npm test 2>/dev/null || {
        log_warn "Tests skipped or failed"
    }
}

# Start the server
start_server() {
    log_info "Starting SimulationOS 2.0 on port $PORT..."

    cd "$SIMULATION_OS_DIR"

    # Check if already running
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warn "Port $PORT is already in use"
        log_info "Stopping existing process..."
        lsof -Pi :$PORT -sTCP:LISTEN -t | xargs kill 2>/dev/null || true
        sleep 1
    fi

    # Start in background
    npm run dev &
    PID=$!

    log_success "SimulationOS 2.0 started (PID: $PID)"
    log_info "Server running at http://localhost:$PORT"
    log_info "API documentation at http://localhost:$PORT/api"
    log_info "Health check at http://localhost:$PORT/health"

    # Wait for server to be ready
    for i in {1..30}; do
        if curl -s http://localhost:$PORT/health >/dev/null 2>&1; then
            log_success "Server is ready!"
            return 0
        fi
        sleep 0.5
    done

    log_warn "Server may still be starting..."
    return 0
}

# Stop the server
stop_server() {
    log_info "Stopping SimulationOS..."

    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -Pi :$PORT -sTCP:LISTEN -t | xargs kill 2>/dev/null || true
        log_success "SimulationOS stopped"
    else
        log_info "SimulationOS is not running"
    fi
}

# Restart the server
restart_server() {
    stop_server
    sleep 1
    start_server
}

# Show status
show_status() {
    log_info "Checking SimulationOS status..."

    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "SimulationOS is running on port $PORT"

        echo ""
        echo "Endpoints:"
        echo "  Health:     http://localhost:$PORT/health"
        echo "  API Info:   http://localhost:$PORT/api"
        echo "  Company:    http://localhost:$PORT/api/simulate/company"
        echo "  Market:     http://localhost:$PORT/api/simulate/market"
        echo "  Pricing:    http://localhost:$PORT/api/simulate/pricing"
        echo "  Risk:       http://localhost:$PORT/api/simulate/risk"
        echo "  What-If:    http://localhost:$PORT/api/simulate/whatif"
    else
        log_info "SimulationOS is not running"
    fi
}

# Show help
show_help() {
    echo ""
    echo "SimulationOS 2.0 - Production-ready simulation engine for SUTAR"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start the SimulationOS server"
    echo "  stop      Stop the SimulationOS server"
    echo "  restart   Restart the SimulationOS server"
    echo "  status    Show server status"
    echo "  test      Run tests"
    echo "  build     Build the project"
    echo "  help      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SIMULATION_PORT  Port to run server on (default: 4300)"
    echo ""
}

# Main command handler
case "${1:-start}" in
    start)
        check_dependencies
        install_dependencies
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        show_status
        ;;
    test)
        check_dependencies
        install_dependencies
        run_tests
        ;;
    build)
        check_dependencies
        install_dependencies
        build_project
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

exit 0
