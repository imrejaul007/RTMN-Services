#!/bin/bash
# LawGens Setup Script
# Usage: ./scripts/setup.sh

set -e

# Configuration
APP_NAME="lawgens"
APP_DIR="/opt/lawgens"

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

# Check prerequisites
log "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { error "Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { error "npm is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { error "Docker is required but not installed."; exit 1; }

success "Prerequisites check passed"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 18+ is required. Current version: $NODE_VERSION"
    exit 1
fi

success "Node.js version check passed"

# Create environment file
log "Setting up environment..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        success "Created .env from .env.example"
        warn "Please edit .env and configure your secrets!"
    else
        error ".env.example not found"
        exit 1
    fi
else
    success ".env already exists"
fi

# Install dependencies
log "Installing dependencies..."
npm install

success "Dependencies installed"

# Build applications
log "Building applications..."
npm run build

success "Build complete"

# Make scripts executable
chmod +x scripts/*.sh

success "Setup complete!"
log "Next steps:"
log "  1. Edit .env and configure your secrets"
log "  2. Run: docker-compose up -d"
log "  3. Access LawGens at http://localhost:3001"