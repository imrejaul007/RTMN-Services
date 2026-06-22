#!/bin/bash

# =============================================================================
# HOJAI AI - Start All Services
# =============================================================================
# Usage: ./deploy/start-all.sh [command] [options]
#
# Commands:
#   start         Start all services (default)
#   stop          Stop all services
#   restart       Restart all services
#   status        Show status of all services
#   health        Run health checks on all services
#   logs [svc]    Show logs (all or specific service)
#   help          Show this help message
#
# Examples:
#   ./deploy/start-all.sh start          # Start all services
#   ./deploy/start-all.sh status         # Check status
#   ./deploy/start-all.sh health          # Health check
#   ./deploy/start-all.sh logs memory     # View memory service logs
#   ./deploy/start-all.sh stop           # Stop all services
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/.pids"

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# =============================================================================
# SERVICE DEFINITIONS
# =============================================================================

# HOJAI Core Services (4500-4610)
declare -A HOJAI_CORE_SERVICES=(
    ["hojai-api-gateway"]="4500:packages/hojai-api-gateway"
    ["hojai-governance"]="4501:packages/hojai-governance"
    ["hojai-event"]="4510:packages/hojai-event"
    ["hojai-memory"]="4520:packages/hojai-memory"
    ["hojai-intelligence"]="4530:packages/hojai-intelligence"
    ["hojai-agents"]="4550:packages/hojai-agents"
    ["hojai-workflow"]="4560:packages/hojai-workflow"
    ["hojai-communications"]="4570:packages/hojai-communications"
    ["hojai-hyperlocal"]="4580:hojai-core/hojai-hyperlocal"
    ["hojai-data"]="4590:hojai-core/hojai-data"
    ["hojai-identity"]="4600:hojai-core/hojai-identity"
    ["hojai-analytics"]="4610:hojai-core/hojai-analytics"
)

# ML Platform Services (4710-4742)
declare -A ML_PLATFORM_SERVICES=(
    ["feature-store"]="4710:hojai-mlops/feature-store"
    ["model-registry"]="4711:hojai-mlops/model-registry"
    ["model-router"]="4712:hojai-mlops/model-router"
    ["embedding-service"]="4720:hojai-vector/embedding-service"
    ["pgvector-service"]="4721:hojai-vector/pgvector-service"
    ["llm-providers"]="4730:hojai-llm/providers"
    ["rag"]="4731:hojai-llm/rag"
    ["churn-model"]="4740:models/churn-model"
    ["ltv-model"]="4741:models/ltv-model"
    ["recommendation-engine"]="4742:models/recommendation-engine"
)

# GENIE Services
declare -A GENIE_SERVICES=(
    ["hojai-flow-service"]="4561:hojai-flow-service"
    ["genie-relationship-service"]="4702:genie-relationship-service"
    ["genie-briefing-service"]="4704:genie-briefing-service"
    ["genie-privacy-service"]="4706:genie-privacy-service"
    ["genie-sync-service"]="4707:genie-sync-service"
)

# Combine all services
declare -A ALL_SERVICES=()
for key in "${!HOJAI_CORE_SERVICES[@]}"; do ALL_SERVICES["$key"]=${HOJAI_CORE_SERVICES[$key]}; done
for key in "${!ML_PLATFORM_SERVICES[@]}"; do ALL_SERVICES["$key"]=${ML_PLATFORM_SERVICES[$key]}; done
for key in "${!GENIE_SERVICES[@]}"; do ALL_SERVICES["$key"]=${GENIE_SERVICES[$key]}; done

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════════╗"
    echo "║                     HOJAI AI - Service Manager                         ║"
    echo "║           AI Infrastructure for Modern Businesses                      ║"
    echo "╚══════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    local title="$1"
    local color="${2:-$BLUE}"
    echo ""
    echo -e "${color}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${color}${BOLD}  $title${NC}"
    echo -e "${color}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_status() {
    local name="$1"
    local port="$2"
    local status="$3"
    local elapsed="$4"

    if [ "$status" = "running" ]; then
        echo -e "  ${GREEN}✓${NC} ${BOLD}$name${NC} (Port $port)"
        if [ -n "$elapsed" ]; then
            echo -e "      ${CYAN}Started in ${elapsed}s${NC}"
        fi
    elif [ "$status" = "already" ]; then
        echo -e "  ${YELLOW}⚠${NC} $name (Port $port) - ${YELLOW}already running${NC}"
    elif [ "$status" = "failed" ]; then
        echo -e "  ${RED}✗${NC} ${RED}$name${NC} (Port $port) - ${RED}failed${NC}"
        echo -e "      ${RED}Check logs: $LOG_DIR/$name.log${NC}"
    else
        echo -e "  ${YELLOW}○${NC} $name (Port $port) - ${YELLOW}stopped${NC}"
    fi
}

log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message"
}

# =============================================================================
# SERVICE CHECKS
# =============================================================================

check_dependencies() {
    print_section "Checking Dependencies" "$YELLOW"

    local missing=()

    if ! command -v node &> /dev/null; then
        missing+=("Node.js")
    fi

    if ! command -v npm &> /dev/null; then
        missing+=("npm")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "  ${RED}✗ Missing dependencies: ${missing[*]}${NC}"
        exit 1
    fi

    echo -e "  ${GREEN}✓${NC} Node.js $(node --version)"
    echo -e "  ${GREEN}✓${NC} npm $(npm --version)"
    echo ""
}

is_service_running() {
    local port="$1"
    if command -v lsof &> /dev/null; then
        lsof -i:$port &> /dev/null
    elif command -v netstat &> /dev/null; then
        netstat -tuln 2>/dev/null | grep -q ":$port "
    else
        curl -s --connect-timeout 1 http://localhost:$port/health > /dev/null 2>&1
    fi
}

health_check() {
    local port="$1"
    local name="$2"
    local response
    response=$(curl -s --connect-timeout 3 "http://localhost:$port/health" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "$response" | head -c 100
        return 0
    fi
    return 1
}

# =============================================================================
# SERVICE MANAGEMENT
# =============================================================================

start_service() {
    local name="$1"
    local port="${2%%:*}"
    local dir="${2##*:}"
    local full_path="$PROJECT_DIR/$dir"
    local pid_file="$PID_DIR/$name.pid"

    # Check if service directory exists
    if [ ! -d "$full_path" ]; then
        echo -e "  ${RED}✗${NC} $name - ${RED}directory not found: $dir${NC}"
        return 1
    fi

    # Check if package.json exists
    if [ ! -f "$full_path/package.json" ]; then
        echo -e "  ${RED}✗${NC} $name - ${RED}no package.json found${NC}"
        return 1
    fi

    # Check if already running
    if is_service_running $port; then
        print_status "$name" "$port" "already"
        return 0
    fi

    # Change to service directory
    cd "$full_path"

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo -e "  ${YELLOW}Installing dependencies for $name...${NC}"
        npm install --silent 2>/dev/null || npm install 2>&1 | tail -5
    fi

    # Start the service
    echo -e "  ${CYAN}→${NC} Starting $name on port $port..."

    # Set PORT environment variable
    export PORT="$port"

    # Start in background with log
    nohup npm run dev > "$LOG_DIR/$name.log" 2>&1 &
    local pid=$!

    # Save PID
    echo "$pid" > "$pid_file"

    # Wait and verify startup
    local max_wait=10
    local waited=0
    local started=false

    while [ $waited -lt $max_wait ]; do
        sleep 1
        if is_service_running $port; then
            started=true
            break
        fi
        waited=$((waited + 1))
    done

    if [ "$started" = true ]; then
        print_status "$name" "$port" "running" "$waited"
        return 0
    else
        print_status "$name" "$port" "failed"
        echo -e "      ${RED}Check logs: $LOG_DIR/$name.log${NC}"
        rm -f "$pid_file"
        return 1
    fi
}

stop_service() {
    local name="$1"
    local port="${2%%:*}"
    local pid_file="$PID_DIR/$name.pid"

    if ! is_service_running $port; then
        echo -e "  ${YELLOW}○${NC} $name - not running"
        return 0
    fi

    # Kill by PID file first
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            sleep 1
        fi
        rm -f "$pid_file"
    fi

    # Fallback: kill by port
    if command -v lsof &> /dev/null; then
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill 2>/dev/null || true
            sleep 1
        fi
    fi

    if ! is_service_running $port; then
        echo -e "  ${GREEN}✓${NC} $name - stopped"
        return 0
    else
        echo -e "  ${RED}✗${NC} $name - failed to stop"
        return 1
    fi
}

# =============================================================================
# COMMANDS
# =============================================================================

cmd_start() {
    print_banner
    echo -e "${GREEN}${BOLD}Starting all HOJAI AI services...${NC}"
    echo ""

    check_dependencies

    local total=0
    local started=0
    local failed=0
    local start_time=$(date +%s)

    # Start HOJAI Core
    print_section "HOJAI Core (4500-4610)" "$BLUE"
    for service in "${!HOJAI_CORE_SERVICES[@]}"; do
        total=$((total + 1))
        if start_service "$service" "${HOJAI_CORE_SERVICES[$service]}"; then
            started=$((started + 1))
        else
            failed=$((failed + 1))
        fi
    done

    # Start ML Platform
    print_section "ML Platform (4710-4742)" "$MAGENTA"
    for service in "${!ML_PLATFORM_SERVICES[@]}"; do
        total=$((total + 1))
        if start_service "$service" "${ML_PLATFORM_SERVICES[$service]}"; then
            started=$((started + 1))
        else
            failed=$((failed + 1))
        fi
    done

    # Start GENIE
    print_section "GENIE Services" "$CYAN"
    for service in "${!GENIE_SERVICES[@]}"; do
        total=$((total + 1))
        if start_service "$service" "${GENIE_SERVICES[$service]}"; then
            started=$((started + 1))
        else
            failed=$((failed + 1))
        fi
    done

    local elapsed=$(($(date +%s) - start_time))

    echo ""
    print_section "Startup Summary" "$GREEN"
    echo -e "  ${GREEN}${BOLD}Started:${NC} $started / $total"
    if [ $failed -gt 0 ]; then
        echo -e "  ${RED}${BOLD}Failed:${NC} $failed / $total"
    fi
    echo -e "  ${CYAN}Total time:${NC} ${elapsed}s"
    echo ""

    if [ $started -gt 0 ]; then
        echo -e "${GREEN}✓ Services started successfully!${NC}"
        echo ""
        echo -e "${CYAN}View logs:${NC} ./deploy/start-all.sh logs"
        echo -e "${CYAN}Check status:${NC} ./deploy/start-all.sh status"
    fi
}

cmd_stop() {
    print_banner
    echo -e "${RED}${BOLD}Stopping all HOJAI AI services...${NC}"
    echo ""

    local stopped=0
    local failed=0

    # Stop in reverse order (GENIE, ML, Core)
    for service in "${!GENIE_SERVICES[@]}"; do
        if stop_service "$service" "${GENIE_SERVICES[$service]}"; then
            stopped=$((stopped + 1))
        else
            failed=$((failed + 1))
        fi
    done

    for service in "${!ML_PLATFORM_SERVICES[@]}"; do
        if stop_service "$service" "${ML_PLATFORM_SERVICES[$service]}"; then
            stopped=$((stopped + 1))
        else
            failed=$((failed + 1))
        fi
    done

    for service in "${!HOJAI_CORE_SERVICES[@]}"; do
        if stop_service "$service" "${HOJAI_CORE_SERVICES[$service]}"; then
            stopped=$((stopped + 1))
        else
            failed=$((failed + 1))
        fi
    done

    echo ""
    print_section "Shutdown Summary" "$GREEN"
    echo -e "  ${GREEN}${BOLD}Stopped:${NC} $stopped services"
    if [ $failed -gt 0 ]; then
        echo -e "  ${YELLOW}${BOLD}Failed to stop:${NC} $failed services"
    fi
    echo ""

    # Cleanup PID files
    rm -f "$PID_DIR"/*.pid

    echo -e "${GREEN}✓ All services stopped${NC}"
}

cmd_status() {
    print_banner
    echo -e "${BLUE}${BOLD}Service Status${NC}"
    echo ""

    local running=0
    local stopped=0
    local total=0

    # HOJAI Core
    print_section "HOJAI Core (4500-4610)" "$BLUE"
    for service in $(printf '%s\n' "${!HOJAI_CORE_SERVICES[@]}" | sort); do
        port="${HOJAI_CORE_SERVICES[$service]%%:*}"
        total=$((total + 1))
        if is_service_running $port; then
            print_status "$service" "$port" "running"
            running=$((running + 1))
        else
            print_status "$service" "$port" "stopped"
            stopped=$((stopped + 1))
        fi
    done

    # ML Platform
    print_section "ML Platform (4710-4742)" "$MAGENTA"
    for service in $(printf '%s\n' "${!ML_PLATFORM_SERVICES[@]}" | sort); do
        port="${ML_PLATFORM_SERVICES[$service]%%:*}"
        total=$((total + 1))
        if is_service_running $port; then
            print_status "$service" "$port" "running"
            running=$((running + 1))
        else
            print_status "$service" "$port" "stopped"
            stopped=$((stopped + 1))
        fi
    done

    # GENIE
    print_section "GENIE Services" "$CYAN"
    for service in $(printf '%s\n' "${!GENIE_SERVICES[@]}" | sort); do
        port="${GENIE_SERVICES[$service]%%:*}"
        total=$((total + 1))
        if is_service_running $port; then
            print_status "$service" "$port" "running"
            running=$((running + 1))
        else
            print_status "$service" "$port" "stopped"
            stopped=$((stopped + 1))
        fi
    done

    echo ""
    print_section "Summary" "$GREEN"
    echo -e "  ${GREEN}${BOLD}Running:${NC} $running / $total"
    echo -e "  ${YELLOW}${BOLD}Stopped:${NC} $stopped / $total"
    echo ""
}

cmd_health() {
    print_banner
    echo -e "${GREEN}${BOLD}Running Health Checks...${NC}"
    echo ""

    local healthy=0
    local unhealthy=0
    local total=0

    print_section "HOJAI Core Health" "$BLUE"
    for service in $(printf '%s\n' "${!HOJAI_CORE_SERVICES[@]}" | sort); do
        port="${HOJAI_CORE_SERVICES[$service]%%:*}"
        total=$((total + 1))
        printf "  %-25s " "$service"
        if is_service_running $port; then
            if health_check $port "$service" > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Healthy${NC}"
                healthy=$((healthy + 1))
            else
                echo -e "${YELLOW}⚠ Running (no /health endpoint)${NC}"
                healthy=$((healthy + 1))
            fi
        else
            echo -e "${RED}✗ Not running${NC}"
            unhealthy=$((unhealthy + 1))
        fi
    done

    print_section "ML Platform Health" "$MAGENTA"
    for service in $(printf '%s\n' "${!ML_PLATFORM_SERVICES[@]}" | sort); do
        port="${ML_PLATFORM_SERVICES[$service]%%:*}"
        total=$((total + 1))
        printf "  %-25s " "$service"
        if is_service_running $port; then
            if health_check $port "$service" > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Healthy${NC}"
                healthy=$((healthy + 1))
            else
                echo -e "${YELLOW}⚠ Running (no /health endpoint)${NC}"
                healthy=$((healthy + 1))
            fi
        else
            echo -e "${RED}✗ Not running${NC}"
            unhealthy=$((unhealthy + 1))
        fi
    done

    print_section "GENIE Health" "$CYAN"
    for service in $(printf '%s\n' "${!GENIE_SERVICES[@]}" | sort); do
        port="${GENIE_SERVICES[$service]%%:*}"
        total=$((total + 1))
        printf "  %-25s " "$service"
        if is_service_running $port; then
            if health_check $port "$service" > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Healthy${NC}"
                healthy=$((healthy + 1))
            else
                echo -e "${YELLOW}⚠ Running (no /health endpoint)${NC}"
                healthy=$((healthy + 1))
            fi
        else
            echo -e "${RED}✗ Not running${NC}"
            unhealthy=$((unhealthy + 1))
        fi
    done

    echo ""
    print_section "Health Summary" "$GREEN"
    echo -e "  ${GREEN}${BOLD}Healthy:${NC} $healthy / $total"
    if [ $unhealthy -gt 0 ]; then
        echo -e "  ${RED}${BOLD}Unhealthy:${NC} $unhealthy / $total"
    fi
    echo ""

    if [ $unhealthy -eq 0 ]; then
        echo -e "${GREEN}✓ All services are healthy!${NC}"
    else
        echo -e "${RED}✗ Some services need attention${NC}"
    fi
}

cmd_logs() {
    local service="$1"

    if [ -z "$service" ]; then
        echo -e "${YELLOW}Showing logs for all services (Ctrl+C to exit)${NC}"
        echo ""
        tail -f "$LOG_DIR"/*.log 2>/dev/null || echo "No logs found"
    else
        if [ -f "$LOG_DIR/$service.log" ]; then
            echo -e "${CYAN}Logs for $service (Ctrl+C to exit):${NC}"
            tail -f "$LOG_DIR/$service.log"
        else
            echo -e "${RED}No logs found for $service${NC}"
            echo ""
            echo "Available logs:"
            ls -1 "$LOG_DIR"/*.log 2>/dev/null | xargs -I{} basename {} .log | sed 's/^/  /'
        fi
    fi
}

cmd_restart() {
    echo -e "${YELLOW}Restarting services...${NC}"
    cmd_stop
    sleep 2
    cmd_start
}

cmd_help() {
    print_banner
    echo -e "${BOLD}Usage:${NC}"
    echo -e "  $0 ${GREEN}<command>${NC} [options]"
    echo ""
    echo -e "${BOLD}Commands:${NC}"
    echo -e "  ${GREEN}start${NC}         Start all services"
    echo -e "  ${GREEN}stop${NC}          Stop all services"
    echo -e "  ${GREEN}restart${NC}       Restart all services"
    echo -e "  ${GREEN}status${NC}         Show service status"
    echo -e "  ${GREEN}health${NC}         Run health checks"
    echo -e "  ${GREEN}logs [svc]${NC}     Show logs (all or specific service)"
    echo -e "  ${GREEN}help${NC}          Show this help message"
    echo ""
    echo -e "${BOLD}Services:${NC}"
    echo -e "  ${CYAN}HOJAI Core${NC}      12 services (ports 4500-4610)"
    echo -e "  ${MAGENTA}ML Platform${NC}    10 services (ports 4710-4742)"
    echo -e "  ${CYAN}GENIE${NC}           5 services (ports 4561, 4702-4707)"
    echo ""
    echo -e "${BOLD}Examples:${NC}"
    echo -e "  $0 start           # Start all services"
    echo -e "  $0 status          # Check status"
    echo -e "  $0 health          # Health check"
    echo -e "  $0 logs memory     # View memory logs"
    echo -e "  $0 logs            # View all logs"
    echo ""
}

# =============================================================================
# MAIN
# =============================================================================

case "${1:-help}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    health)
        cmd_health
        ;;
    logs)
        cmd_logs "$2"
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        cmd_help
        exit 1
        ;;
esac
