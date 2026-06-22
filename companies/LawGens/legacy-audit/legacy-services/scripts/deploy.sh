#!/bin/bash
# LawGens Deployment Script
# Usage: ./scripts/deploy.sh [environment] [service]

set -e

# Configuration
APP_NAME="lawgens"
APP_DIR="/opt/lawgens"
LOG_DIR="/var/log/$APP_NAME"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Parse arguments
ENVIRONMENT="${1:-production}"
SERVICE="${2:-all}"

# Validate environment
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
    error "Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [production|staging] [service]"
    exit 1
fi

log "Starting deployment to $ENVIRONMENT environment"

# Create directories
log "Creating directories..."
sudo mkdir -p "$APP_DIR" "$LOG_DIR"
sudo chown -R $USER:$USER "$APP_DIR" "$LOG_DIR"

# Build Docker images
log "Building Docker images..."
if [ "$SERVICE" == "all" ] || [ "$SERVICE" == "web" ]; then
    docker build -t "$APP_NAME-web:$ENVIRONMENT" .
    success "Built web image"
fi

if [ "$SERVICE" == "all" ] || [ "$SERVICE" == "contract-os" ]; then
    docker build -f Dockerfile.contract-os -t "$APP_NAME-contract-os:$ENVIRONMENT" .
    success "Built contract-os image"
fi

# Deploy with Docker Compose
log "Deploying services..."
if [ "$ENVIRONMENT" == "production" ]; then
    docker-compose -f docker-compose.yml up -d
else
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
fi

success "Deployment complete!"

# Health check
log "Running health checks..."
sleep 5
./scripts/health-check.sh

log "Deployment finished at $(date '+%Y-%m-%d %H:%M:%S')"