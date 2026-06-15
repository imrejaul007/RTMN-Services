#!/bin/bash
# =============================================================================
# RTMN BrandPulse - Kubernetes Deployment Script
# =============================================================================
# Deploys BrandPulse API and Dashboard to Kubernetes cluster
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$DEPLOY_DIR/kubernetes"

# Default values
NAMESPACE="rtmn"
TIMEOUT="300s"
BACKUP_YAML=true

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
RTMN BrandPulse - Kubernetes Deployment Script

Usage: $0 [OPTIONS]

Options:
    -n, --namespace NAMESPACE    Kubernetes namespace (default: rtmn)
    -c, --cluster CONTEXT        kubectl context to use
    -t, --timeout TIMEOUT        Deployment timeout (default: 300s)
    --no-backup                  Skip YAML backup before deployment
    -h, --help                   Show this help message

Examples:
    $0                                    # Deploy to default namespace
    $0 -n production                      # Deploy to production namespace
    $0 -c gke-project-12345               # Deploy to specific cluster
    $0 -n staging -t 600s                 # Deploy to staging with 10min timeout

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -c|--cluster)
            CLUSTER_CONTEXT="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --no-backup)
            BACKUP_YAML=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    log_success "kubectl found: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    log_success "Connected to Kubernetes cluster"

    # Switch context if specified
    if [[ -n "${CLUSTER_CONTEXT:-}" ]]; then
        log_info "Switching to context: $CLUSTER_CONTEXT"
        kubectl config use-context "$CLUSTER_CONTEXT"
    fi

    # Get current context
    CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "unknown")
    CURRENT_CLUSTER=$(kubectl config view --minify -o jsonpath='{.contexts[0].context.cluster}' 2>/dev/null || echo "unknown")
    log_info "Current context: $CURRENT_CONTEXT"
    log_info "Current cluster: $CURRENT_CLUSTER"

    # Check namespace exists or create it
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace '$NAMESPACE' does not exist. It will be created."
    fi
}

# Backup existing YAML files
backup_yaml() {
    if [[ "$BACKUP_YAML" == "true" ]]; then
        local backup_dir="$DEPLOY_DIR/backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"

        log_info "Backing up existing Kubernetes YAML files to: $backup_dir"

        # Backup all YAML files
        for yaml_file in "$K8S_DIR"/*.yaml; do
            if [[ -f "$yaml_file" ]]; then
                cp "$yaml_file" "$backup_dir/"
                log_info "Backed up: $(basename "$yaml_file")"
            fi
        done

        log_success "Backup complete"
    fi
}

# Apply secrets with replacements
apply_secrets() {
    log_info "Applying secrets..."

    # Check if secrets file exists
    local secrets_file="$K8S_DIR/brandpulse-api.yaml"

    if [[ -f "$secrets_file" ]]; then
        # Prompt for secret values if placeholders detected
        if grep -q "cGxhY2Vob2xkZXIt" "$secrets_file"; then
            log_warning "Placeholder secrets detected. You may need to update them."
        fi
    fi

    kubectl apply -f "$secrets_file" -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - -n "$NAMESPACE" || true
    log_success "Secrets applied"
}

# Deploy namespace
deploy_namespace() {
    log_info "Deploying namespace: $NAMESPACE"

    kubectl apply -f "$K8S_DIR/namespace.yaml"

    # Wait for namespace to be ready
    kubectl wait --for=jsonpath='{.status.phase}'=Active namespace/"$NAMESPACE" --timeout=30s || true

    log_success "Namespace deployed"
}

# Deploy monitoring stack
deploy_monitoring() {
    log_info "Deploying monitoring stack..."

    # Apply monitoring YAML
    kubectl apply -f "$K8S_DIR/monitoring.yaml" -n "$NAMESPACE"

    # Wait for DaemonSet to be ready
    log_info "Waiting for Datadog agent to be ready..."
    kubectl wait --for=condition=available --timeout=120s daemonset/datadog-agent -n "$NAMESPACE" || true

    log_success "Monitoring stack deployed"
}

# Deploy API
deploy_api() {
    log_info "Deploying BrandPulse API..."

    # Apply API YAML
    kubectl apply -f "$K8S_DIR/brandpulse-api.yaml" -n "$NAMESPACE"

    # Wait for deployment to be ready
    log_info "Waiting for BrandPulse API deployment..."
    kubectl wait \
        --for=condition=available \
        --timeout="$TIMEOUT" \
        deployment/brandpulse-api \
        -n "$NAMESPACE"

    # Check rollout status
    log_info "Checking rollout status..."
    kubectl rollout status deployment/brandpulse-api -n "$NAMESPACE" --timeout="$TIMEOUT"

    log_success "BrandPulse API deployed"
}

# Deploy dashboard
deploy_dashboard() {
    log_info "Deploying BrandPulse Dashboard..."

    # Apply dashboard YAML
    kubectl apply -f "$K8S_DIR/brandpulse-dashboard.yaml" -n "$NAMESPACE"

    # Wait for deployment to be ready
    log_info "Waiting for BrandPulse Dashboard deployment..."
    kubectl wait \
        --for=condition=available \
        --timeout="$TIMEOUT" \
        deployment/brandpulse-dashboard \
        -n "$NAMESPACE"

    # Check rollout status
    log_info "Checking rollout status..."
    kubectl rollout status deployment/brandpulse-dashboard -n "$NAMESPACE" --timeout="$TIMEOUT"

    log_success "BrandPulse Dashboard deployed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."

    echo ""
    echo "=============================================="
    echo "           DEPLOYMENT STATUS"
    echo "=============================================="
    echo ""

    # Pods status
    echo -e "${BLUE}Pods:${NC}"
    kubectl get pods -n "$NAMESPACE" -l "app=brandpulse-api OR app=brandpulse-dashboard" \
        --no-headers 2>/dev/null || echo "No pods found"

    echo ""

    # Services
    echo -e "${BLUE}Services:${NC}"
    kubectl get svc -n "$NAMESPACE" -l "app=brandpulse-api OR app=brandpulse-dashboard" \
        --no-headers 2>/dev/null || echo "No services found"

    echo ""

    # Ingress
    echo -e "${BLUE}Ingress:${NC}"
    kubectl get ingress -n "$NAMESPACE" \
        --no-headers 2>/dev/null || echo "No ingress found"

    echo ""

    # HPA
    echo -e "${BLUE}Horizontal Pod Autoscalers:${NC}"
    kubectl get hpa -n "$NAMESPACE" \
        --no-headers 2>/dev/null || echo "No HPA found"

    echo ""

    # PVC
    echo -e "${BLUE}Persistent Volume Claims:${NC}"
    kubectl get pvc -n "$NAMESPACE" \
        --no-headers 2>/dev/null || echo "No PVCs found"

    echo ""

    # ConfigMaps and Secrets
    echo -e "${BLUE}ConfigMaps:${NC}"
    kubectl get configmap -n "$NAMESPACE" -l "app=brandpulse" \
        --no-headers 2>/dev/null || echo "No ConfigMaps found"

    echo ""
    echo -e "${BLUE}Secrets:${NC}"
    kubectl get secret -n "$NAMESPACE" -l "app=brandpulse" \
        --no-headers 2>/dev/null || echo "No Secrets found"

    echo ""

    # Monitoring (if deployed)
    if kubectl get daemonset datadog-agent -n "$NAMESPACE" &>/dev/null; then
        echo -e "${BLUE}Datadog Agent:${NC}"
        kubectl get daemonset datadog-agent -n "$NAMESPACE" \
            --no-headers 2>/dev/null || echo "Datadog agent not ready"
    fi

    echo ""
    echo "=============================================="
}

# Show endpoints
show_endpoints() {
    log_info "Service Endpoints:"

    echo ""
    echo "API Service:"
    kubectl get svc brandpulse-api -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}' 2>/dev/null && echo " (ClusterIP)" || echo "Not found"

    echo ""
    echo "Dashboard Service:"
    kubectl get svc brandpulse-dashboard -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}' 2>/dev/null && echo " (ClusterIP)" || echo "Not found"

    echo ""
    echo "External URLs:"
    echo "  API: https://api.rtmn.io"
    echo "  Dashboard: https://dashboard.rtmn.io"

    echo ""
    echo "To port-forward for local testing:"
    echo "  API: kubectl port-forward -n $NAMESPACE svc/brandpulse-api 4770:80"
    echo "  Dashboard: kubectl port-forward -n $NAMESPACE svc/brandpulse-dashboard 4780:80"
}

# Health check
health_check() {
    log_info "Running health checks..."

    local api_ready=false
    local dashboard_ready=false

    # Check API pods
    local api_pods=$(kubectl get pods -n "$NAMESPACE" -l app=brandpulse-api \
        -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)

    if [[ "$api_pods" == *"True"* ]]; then
        log_success "BrandPulse API pods are healthy"
        api_ready=true
    else
        log_error "BrandPulse API pods are not healthy"
    fi

    # Check dashboard pods
    local dashboard_pods=$(kubectl get pods -n "$NAMESPACE" -l app=brandpulse-dashboard \
        -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)

    if [[ "$dashboard_pods" == *"True"* ]]; then
        log_success "BrandPulse Dashboard pods are healthy"
        dashboard_ready=true
    else
        log_error "BrandPulse Dashboard pods are not healthy"
    fi

    if [[ "$api_ready" == "true" && "$dashboard_ready" == "true" ]]; then
        return 0
    else
        return 1
    fi
}

# Main deployment function
main() {
    echo ""
    echo "=============================================="
    echo "  RTMN BrandPulse - Kubernetes Deployment"
    echo "=============================================="
    echo ""
    echo "Namespace: $NAMESPACE"
    echo "Timeout: $TIMEOUT"
    echo "Timestamp: $(date)"
    echo ""

    # Run deployment steps
    check_prerequisites

    if [[ "$BACKUP_YAML" == "true" ]]; then
        backup_yaml
    fi

    deploy_namespace

    apply_secrets

    deploy_monitoring

    deploy_api

    deploy_dashboard

    # Final verification
    if health_check; then
        verify_deployment
        show_endpoints

        echo ""
        log_success "=============================================="
        log_success "  Deployment complete!"
        log_success "=============================================="
        echo ""
        log_info "Next steps:"
        echo "  1. Check the deployment status: kubectl get pods -n $NAMESPACE"
        echo "  2. View logs: kubectl logs -n $NAMESPACE -l app=brandpulse-api"
        echo "  3. Scale up: kubectl scale deployment/brandpulse-api -n $NAMESPACE --replicas=5"
        echo ""
    else
        log_error "Deployment verification failed!"
        echo ""
        log_info "Troubleshooting:"
        echo "  1. Check pod status: kubectl get pods -n $NAMESPACE"
        echo "  2. View pod logs: kubectl logs -n $NAMESPACE <pod-name>"
        echo "  3. Describe pod: kubectl describe pod -n $NAMESPACE <pod-name>"
        echo "  4. Check events: kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'"
        echo ""
        exit 1
    fi
}

# Run main function
main
