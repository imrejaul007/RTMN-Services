#!/bin/bash
# HOJAI AI - Production Deployment Script
# Version: 2.0 | Date: June 2, 2026

set -e

# ============================================
# CONFIGURATION
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# FUNCTIONS
# ============================================

log() {
    echo -e "${GREEN}[HOJAI]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[HOJAI]${NC} WARNING: $1"
}

error() {
    echo -e "${RED}[HOJAI]${NC} ERROR: $1"
}

info() {
    echo -e "${BLUE}[HOJAI]${NC} $1"
}

# ============================================
# PRE-CHECKS
# ============================================

preflight_checks() {
    log "Running preflight checks..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    log "Docker installed: $(docker --version)"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    log "Docker Compose installed"

    # Check .env file
    if [ ! -f "$ENV_FILE" ]; then
        warn ".env file not found, copying from .env.production"
        cp "$PROJECT_DIR/.env.production" "$ENV_FILE"
    fi

    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a

    log "Preflight checks passed"
}

# ============================================
# BUILD
# ============================================

build_images() {
    log "Building Docker images..."

    cd "$PROJECT_DIR"

    # Build all images
    docker compose -f "$COMPOSE_FILE" build --parallel

    log "Images built successfully"
}

# ============================================
# START
# ============================================

start_services() {
    log "Starting HOJAI services..."

    cd "$PROJECT_DIR"

    # Start infrastructure first
    docker compose -f "$COMPOSE_FILE" up -d mongodb redis

    # Wait for infrastructure
    log "Waiting for MongoDB..."
    until docker exec hojai-mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; do
        echo -n "."
        sleep 2
    done
    log "MongoDB ready"

    log "Waiting for Redis..."
    until docker exec hojai-redis redis-cli -a "${REDIS_PASSWORD:-password}" ping &> /dev/null; do
        echo -n "."
        sleep 2
    done
    log "Redis ready"

    # Start all services
    docker compose -f "$COMPOSE_FILE" up -d

    log "All services started"
}

# ============================================
# STOP
# ============================================

stop_services() {
    log "Stopping HOJAI services..."

    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" down

    log "Services stopped"
}

# ============================================
# RESTART
# ============================================

restart_services() {
    log "Restarting HOJAI services..."
    stop_services
    sleep 2
    start_services
}

# ============================================
# STATUS
# ============================================

show_status() {
    log "Checking service status..."

    cd "$PROJECT_DIR"

    echo ""
    echo -e "${BLUE}=== HOJAI AI Service Status ===${NC}"
    echo ""

    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    echo -e "${BLUE}=== Health Checks ===${NC}"
    echo ""

    check_health "API Gateway" "http://localhost:4500/health"
    check_health "Memory" "http://localhost:4520/health"
    check_health "Intelligence" "http://localhost:4530/health"
    check_health "Agents" "http://localhost:4550/health"
    check_health "Workflow" "http://localhost:4560/health"
    check_health "Communications" "http://localhost:4570/health"
}

check_health() {
    local name=$1
    local url=$2

    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}[HEALTHY]${NC} $name"
    else
        echo -e "  ${RED}[UNHEALTHY]${NC} $name"
    fi
}

# ============================================
# LOGS
# ============================================

show_logs() {
    local service=${1:-}

    cd "$PROJECT_DIR"

    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        docker compose -f "$COMPOSE_FILE" logs -f
    fi
}

# ============================================
# CLEANUP
# ============================================

cleanup() {
    warn "This will remove all containers, volumes, and images"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        cd "$PROJECT_DIR"
        docker compose -f "$COMPOSE_FILE" down -v --rmi all
        log "Cleanup complete"
    else
        log "Cleanup cancelled"
    fi
}

# ============================================
# BACKUP
# ============================================

backup() {
    local backup_dir="${BACKUP_DIR:-$PROJECT_DIR/backups}"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/hojai_backup_$timestamp.tar.gz"

    mkdir -p "$backup_dir"

    log "Creating backup..."

    # Backup MongoDB
    docker exec hojai-mongodb mongodump --archive="$backup_file" --gzip

    # Backup Redis
    docker exec hojai-redis redis-cli SAVE

    log "Backup created: $backup_file"
}

# ============================================
# UPDATE
# ============================================

update() {
    log "Updating HOJAI AI..."

    cd "$PROJECT_DIR"

    # Pull latest code
    if [ -d ".git" ]; then
        git pull
    fi

    # Rebuild and restart
    build_images
    restart_services

    log "Update complete"
}

# ============================================
# SCALE
# ============================================

scale_service() {
    local service=$1
    local replicas=${2:-2}

    cd "$PROJECT_DIR"

    log "Scaling $service to $replicas replicas..."
    docker compose -f "$COMPOSE_FILE" up -d --scale "$service=$replicas"

    log "Scaling complete"
}

# ============================================
# USAGE
# ============================================

usage() {
    echo ""
    echo -e "${GREEN}HOJAI AI - Production Deployment Script${NC}"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start           Start all services"
    echo "  stop            Stop all services"
    echo "  restart         Restart all services"
    echo "  status          Show service status"
    echo "  logs [service]  Show logs (optional: service name)"
    echo "  build           Build Docker images"
    echo "  update          Pull latest and restart"
    echo "  backup          Create database backup"
    echo "  cleanup         Remove all containers and volumes"
    echo "  scale <svc> <n> Scale a service to n replicas"
    echo "  help            Show this help message"
    echo ""
}

# ============================================
# MAIN
# ============================================

case "${1:-start}" in
    start)
        preflight_checks
        start_services
        show_status
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        show_status
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    build)
        preflight_checks
        build_images
        ;;
    update)
        update
        ;;
    backup)
        backup
        ;;
    cleanup)
        cleanup
        ;;
    scale)
        scale_service "$2" "$3"
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        error "Unknown command: $1"
        usage
        exit 1
        ;;
esac
