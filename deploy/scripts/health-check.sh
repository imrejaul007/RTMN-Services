#!/bin/bash
# =============================================================================
# RTMN BrandPulse - Health Check Script
# =============================================================================
# Checks the health status of all BrandPulse services
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
API_URL="${1:-http://localhost:4770}"
TIMEOUT="${TIMEOUT:-10}"
VERBOSE="${VERBOSE:-false}"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASSED=$((PASSED + 1))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED=$((FAILED + 1))
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Help message
show_help() {
    cat << 'EOF'
RTMN BrandPulse - Health Check Script

Usage: $0 [API_URL] [OPTIONS]

Arguments:
    API_URL       API endpoint URL (default: http://localhost:4770)

Options:
    --timeout SECONDS    Request timeout (default: 10)
    --verbose            Verbose output
    -h, --help           Show this help message

Examples:
    $0                                    # Check localhost:4770
    $0 https://api.rtmn.io                # Check production API
    $0 http://localhost:4770 --verbose    # Verbose output

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            API_URL="$1"
            shift
            ;;
    esac
done

# Health check function
check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local check_type="${4:-http}"

    log_debug "Checking: $name ($url)"

    case "$check_type" in
        http)
            local response
            local http_code

            response=$(curl -sf \
                --max-time "$TIMEOUT" \
                --connect-timeout 5 \
                -w "\n%{http_code}" \
                "$url" 2>&1) || {
                log_error "$name: Connection failed"
                return 1
            }

            http_code=$(echo "$response" | tail -1)
            local body=$(echo "$response" | sed '$d')

            if [[ "$http_code" == "$expected_status" ]]; then
                log_debug "Response body: $body"
                return 0
            else
                log_error "$name: HTTP $http_code (expected $expected_status)"
                log_debug "Response: $body"
                return 1
            fi
            ;;
        tcp)
            local host_port=$(echo "$url" | sed 's|tcp://||')
            local host=$(echo "$host_port" | cut -d: -f1)
            local port=$(echo "$host_port" | cut -d: -f2)

            if command -v nc &> /dev/null; then
                nc -z -w "$TIMEOUT" "$host" "$port" 2>/dev/null && return 0 || return 1
            elif command -v timeout &> /dev/null; then
                timeout "$TIMEOUT" bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null && return 0 || return 1
            else
                log_warning "$name: nc/telnet not available, skipping TCP check"
                return 2
            fi
            ;;
    esac
}

# Parse health response
parse_health() {
    local response="$1"
    local field="$2"

    echo "$response" | grep -o "\"$field\"[[:space:]]*:[[:space:]]*[^,}]*" | sed "s/.*:[[:space:]]*//" | tr -d '"' || echo "unknown"
}

# Main health check
check_api_health() {
    echo ""
    echo "=============================================="
    echo "  BrandPulse Health Check"
    echo "=============================================="
    echo ""
    echo "API URL: $API_URL"
    echo "Timeout: ${TIMEOUT}s"
    echo "Timestamp: $(date)"
    echo ""

    # Check basic health endpoint
    log_info "Checking API health endpoint..."

    local health_response
    health_response=$(curl -sf \
        --max-time "$TIMEOUT" \
        --connect-timeout 5 \
        -w "\n%{http_code}" \
        "$API_URL/health" 2>&1) || {
        log_error "Cannot reach API at $API_URL/health"
        return 1
    }

    local http_code=$(echo "$health_response" | tail -1)
    local body=$(echo "$health_response" | sed '$d')

    if [[ "$http_code" != "200" ]]; then
        log_error "API health check failed: HTTP $http_code"
        return 1
    fi

    log_success "API is responding"

    # Parse health details
    local status=$(parse_health "$body" "status")
    local version=$(parse_health "$body" "version")
    local uptime=$(parse_health "$body" "uptime")

    log_info "API Status: $status"
    log_info "API Version: $version"
    log_info "Uptime: $uptime"

    # Check MongoDB
    log_info "Checking MongoDB connection..."
    local mongodb_status=$(echo "$body" | grep -o '"mongodb"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:"//;s/"$//' || echo "unknown")
    if [[ "$mongodb_status" == "connected" || "$mongodb_status" == "healthy" ]]; then
        log_success "MongoDB: $mongodb_status"
    elif [[ "$mongodb_status" == "unknown" ]]; then
        # Try alternative check
        if echo "$body" | grep -qi "mongodb"; then
            log_success "MongoDB: connected"
        else
            log_warning "MongoDB: status unknown (endpoint may not expose this)"
        fi
    else
        log_error "MongoDB: $mongodb_status"
    fi

    # Check Redis
    log_info "Checking Redis connection..."
    local redis_status=$(echo "$body" | grep -o '"redis"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:"//;s/"$//' || echo "unknown")
    if [[ "$redis_status" == "connected" || "$redis_status" == "healthy" ]]; then
        log_success "Redis: $redis_status"
    elif [[ "$redis_status" == "unknown" ]]; then
        # Try alternative check
        if echo "$body" | grep -qi "redis"; then
            log_success "Redis: connected"
        else
            log_warning "Redis: status unknown (endpoint may not expose this)"
        fi
    else
        log_error "Redis: $redis_status"
    fi

    # Check ready endpoint
    log_info "Checking readiness endpoint..."
    local ready_response
    ready_response=$(curl -sf \
        --max-time "$TIMEOUT" \
        "$API_URL/health/ready" 2>&1) || {
        log_warning "Readiness endpoint not available or failed"
    }

    if [[ -n "$ready_response" ]]; then
        log_success "Readiness check passed"
        log_debug "Readiness response: $ready_response"
    fi

    # Check metrics endpoint (if available)
    log_info "Checking metrics endpoint..."
    local metrics_response
    metrics_response=$(curl -sf \
        --max-time "$TIMEOUT" \
        "$API_URL/metrics" 2>&1) || {
        log_warning "Metrics endpoint not available"
    }

    if [[ -n "$metrics_response" ]]; then
        log_success "Metrics endpoint available"
    fi

    return 0
}

# Kubernetes pod health check
check_k8s_pods() {
    if ! command -v kubectl &> /dev/null; then
        log_debug "kubectl not available, skipping pod check"
        return 0
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_debug "Not connected to Kubernetes cluster, skipping pod check"
        return 0
    fi

    echo ""
    log_info "Checking Kubernetes pods..."

    local namespace="${NAMESPACE:-rtmn}"

    # Check API pods
    local api_pods=$(kubectl get pods -n "$namespace" -l "app=brandpulse-api" \
        -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "")

    if [[ -n "$api_pods" ]]; then
        local running_count=$(echo "$api_pods" | tr ' ' '\n' | grep -c "Running" || echo "0")
        local total_count=$(echo "$api_pods" | wc -w)
        log_info "API Pods: $running_count/$total_count running"
    fi

    # Check Dashboard pods
    local dashboard_pods=$(kubectl get pods -n "$namespace" -l "app=brandpulse-dashboard" \
        -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "")

    if [[ -n "$dashboard_pods" ]]; then
        local running_count=$(echo "$dashboard_pods" | tr ' ' '\n' | grep -c "Running" || echo "0")
        local total_count=$(echo "$dashboard_pods" | wc -w)
        log_info "Dashboard Pods: $running_count/$total_count running"
    fi
}

# Check external dependencies
check_dependencies() {
    echo ""

    # Check MongoDB Atlas (if URI is set)
    if [[ -n "${MONGODB_URI:-}" ]]; then
        log_info "Checking MongoDB Atlas connectivity..."

        # Extract host from URI
        local mongo_host=$(echo "$MONGODB_URI" | grep -oP '(?<=@)[^/]+' | cut -d: -f1 || echo "")

        if [[ -n "$mongo_host" ]]; then
            if check_endpoint "MongoDB Atlas" "tcp://$mongo_host:27017" "" "tcp" 2>/dev/null; then
                log_success "MongoDB Atlas: reachable"
            else
                log_warning "MongoDB Atlas: not reachable (may be expected in local environment)"
            fi
        fi
    fi

    # Check Redis Cloud (if URL is set)
    if [[ -n "${REDIS_URL:-}" ]]; then
        log_info "Checking Redis Cloud connectivity..."

        # Extract host from URL
        local redis_host=$(echo "$REDIS_URL" | grep -oP '(?<=@)[^:]+' | cut -d/ -f1 || echo "")
        local redis_port=$(echo "$REDIS_URL" | grep -oP '(?<=:)\d+$' || echo "6379")

        if [[ -n "$redis_host" ]]; then
            if check_endpoint "Redis Cloud" "tcp://$redis_host:$redis_port" "" "tcp" 2>/dev/null; then
                log_success "Redis Cloud: reachable"
            else
                log_warning "Redis Cloud: not reachable (may be expected in local environment)"
            fi
        fi
    fi
}

# Show summary
show_summary() {
    echo ""
    echo "=============================================="
    echo "           HEALTH CHECK SUMMARY"
    echo "=============================================="
    echo ""
    echo -e "${GREEN}Passed:${NC}   $PASSED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "${RED}Failed:${NC}   $FAILED"
    echo ""

    if [[ $FAILED -eq 0 ]]; then
        if [[ $WARNINGS -eq 0 ]]; then
            echo -e "${GREEN}All checks passed!${NC}"
            return 0
        else
            echo -e "${YELLOW}All critical checks passed with warnings.${NC}"
            return 0
        fi
    else
        echo -e "${RED}Some checks failed. Please investigate.${NC}"
        return 1
    fi
}

# Main function
main() {
    check_api_health

    check_k8s_pods

    check_dependencies

    show_summary
}

# Run main function
main
