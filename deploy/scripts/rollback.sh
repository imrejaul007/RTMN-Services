#!/bin/bash
# =============================================================================
# RTMN BrandPulse - Kubernetes Rollback Script
# =============================================================================
# Rolls back a deployment to its previous version
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
NAMESPACE="rtmn"
DEPLOYMENT_NAME=""
TIMEOUT="300s"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help message
show_help() {
    cat << 'EOF'
RTMN BrandPulse - Kubernetes Rollback Script

Usage: $0 [DEPLOYMENT_NAME] [OPTIONS]

Arguments:
    DEPLOYMENT_NAME     Name of the deployment to rollback (e.g., brandpulse-api)

Options:
    -n, --namespace NAMESPACE    Kubernetes namespace (default: rtmn)
    -t, --timeout TIMEOUT        Rollback timeout (default: 300s)
    -h, --help                   Show this help message

Examples:
    $0 brandpulse-api                           # Rollback API to previous version
    $0 brandpulse-dashboard -n rtmn             # Rollback dashboard
    $0 brandpulse-api -t 600s                   # Rollback with custom timeout
    $0                                          # Interactive mode - prompts for deployment

Rollback History:
    To see rollout history:
    kubectl rollout history deployment/<name> -n <namespace>

    To rollback to a specific revision:
    kubectl rollout undo deployment/<name> --to-revision=<revision> -n <namespace>

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
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
            if [[ -z "$DEPLOYMENT_NAME" ]]; then
                DEPLOYMENT_NAME="$1"
            fi
            shift
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    log_info "Connected to Kubernetes cluster"
    log_info "Current context: $(kubectl config current-context 2>/dev/null || echo 'unknown')"
}

# List available deployments
list_deployments() {
    log_info "Available deployments in namespace '$NAMESPACE':"
    echo ""
    kubectl get deployments -n "$NAMESPACE" \
        --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  No deployments found"
    echo ""
}

# Show deployment history
show_history() {
    local dep="$1"
    log_info "Rollout history for '$dep':"
    echo ""
    kubectl rollout history deployment/"$dep" -n "$NAMESPACE" 2>/dev/null || log_warning "No history available"
    echo ""
}

# Confirm rollback
confirm_rollback() {
    local dep="$1"
    echo ""
    log_warning "This will rollback deployment '$dep' to the previous version."
    echo ""
    read -p "Continue with rollback? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

# Perform rollback
perform_rollback() {
    local dep="$1"

    log_info "Rolling back deployment '$dep' in namespace '$NAMESPACE'..."

    # Get current revision before rollback
    local current_revision=$(kubectl rollout history deployment/"$dep" -n "$NAMESPACE" 2>/dev/null | grep -E "^[[:space:]]*[0-9]+" | tail -1 | awk '{print $1}')

    # Perform rollback
    if kubectl rollout undo deployment/"$dep" -n "$NAMESPACE"; then
        log_success "Rollback initiated"
    else
        log_error "Failed to initiate rollback"
        exit 1
    fi

    # Wait for rollback to complete
    log_info "Waiting for rollback to complete (timeout: $TIMEOUT)..."
    if kubectl rollout status deployment/"$dep" -n "$NAMESPACE" --timeout="$TIMEOUT"; then
        log_success "Rollback completed successfully"
    else
        log_error "Rollback timed out or failed"
        log_info "Check status with: kubectl get pods -n $NAMESPACE -l app=$dep"
        exit 1
    fi

    # Show new revision
    local new_revision=$(kubectl rollout history deployment/"$dep" -n "$NAMESPACE" 2>/dev/null | grep -E "^[[:space:]]*[0-9]+" | tail -1 | awk '{print $1}')
    log_info "Rolled back from revision $current_revision to revision $new_revision"
}

# Show pod status
show_pods() {
    local dep="$1"
    echo ""
    log_info "Pod status for '$dep':"
    echo ""
    kubectl get pods -n "$NAMESPACE" -l "app=$dep" \
        -o=custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.conditions[*].status,AGE:.metadata.creationTimestamp \
        2>/dev/null || kubectl get pods -n "$NAMESPACE" -l "app=$dep" --no-headers
    echo ""
}

# Verify rollback
verify_rollback() {
    local dep="$1"
    log_info "Verifying rollback..."

    # Wait for pods to be ready
    if kubectl wait \
        --for=condition=available \
        --timeout=120s \
        deployment/"$dep" \
        -n "$NAMESPACE" 2>/dev/null; then
        log_success "Deployment is healthy"
        return 0
    else
        log_warning "Deployment may not be fully healthy yet"
        return 1
    fi
}

# Main function
main() {
    echo ""
    echo "=============================================="
    echo "  RTMN BrandPulse - Kubernetes Rollback"
    echo "=============================================="
    echo ""

    check_prerequisites

    # If no deployment specified, prompt for it
    if [[ -z "$DEPLOYMENT_NAME" ]]; then
        list_deployments
        read -p "Enter deployment name to rollback: " DEPLOYMENT_NAME
    fi

    # Validate deployment exists
    if ! kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" &>/dev/null; then
        log_error "Deployment '$DEPLOYMENT_NAME' not found in namespace '$NAMESPACE'"
        list_deployments
        exit 1
    fi

    # Show history and confirm
    show_history "$DEPLOYMENT_NAME"
    confirm_rollback "$DEPLOYMENT_NAME"

    # Perform rollback
    perform_rollback "$DEPLOYMENT_NAME"

    # Show pod status
    show_pods "$DEPLOYMENT_NAME"

    # Verify
    verify_rollback "$DEPLOYMENT_NAME"

    echo ""
    log_success "=============================================="
    log_success "  Rollback complete!"
    log_success "=============================================="
    echo ""
    log_info "Commands:"
    echo "  View logs: kubectl logs -n $NAMESPACE -l app=$DEPLOYMENT_NAME -f"
    echo "  Describe: kubectl describe deployment $DEPLOYMENT_NAME -n $NAMESPACE"
    echo "  Full history: kubectl rollout history deployment/$DEPLOYMENT_NAME -n $NAMESPACE"
    echo ""
}

# Run main function
main
