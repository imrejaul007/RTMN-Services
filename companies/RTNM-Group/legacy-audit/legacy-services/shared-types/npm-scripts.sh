#!/bin/bash
#
# npm-scripts.sh - Helper script to publish all @rez packages to npm
#
# Usage:
#   ./npm-scripts.sh          # Publish all packages
#   ./npm-scripts.sh build   # Build all packages
#   ./npm-scripts.sh <pkg>   # Publish specific package
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Package list
PACKAGES=(
  "shared-types"
  "rez-shared"
  "rez-intent-capture-sdk"
  "rez-agent-memory"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Build a single package
build_package() {
  local pkg="$1"
  local pkg_dir="$SCRIPT_DIR/packages/$pkg"

  if [ ! -d "$pkg_dir" ]; then
    log_error "Package directory not found: $pkg_dir"
    return 1
  fi

  if [ ! -f "$pkg_dir/package.json" ]; then
    log_error "package.json not found in: $pkg_dir"
    return 1
  fi

  log_info "Building $pkg..."

  cd "$pkg_dir"

  # Run build
  if [ -f "package.json" ]; then
    npm run build

    if [ $? -eq 0 ]; then
      log_info "Successfully built $pkg"
    else
      log_error "Failed to build $pkg"
      return 1
    fi
  fi

  cd "$SCRIPT_DIR"
}

# Publish a single package
publish_package() {
  local pkg="$1"
  local pkg_dir="$SCRIPT_DIR/packages/$pkg"

  if [ ! -d "$pkg_dir" ]; then
    log_error "Package directory not found: $pkg_dir"
    return 1
  fi

  if [ ! -f "$pkg_dir/package.json" ]; then
    log_error "package.json not found in: $pkg_dir"
    return 1
  fi

  log_info "Publishing $pkg..."

  cd "$pkg_dir"

  # Run build and publish
  if [ -f "package.json" ]; then
    npm run build

    if [ $? -eq 0 ]; then
      log_info "Build successful, publishing to npm..."
      npm publish --access public

      if [ $? -eq 0 ]; then
        log_info "Successfully published $pkg"
      else
        log_error "Failed to publish $pkg"
        cd "$SCRIPT_DIR"
        return 1
      fi
    else
      log_error "Failed to build $pkg, skipping publish"
      cd "$SCRIPT_DIR"
      return 1
    fi
  fi

  cd "$SCRIPT_DIR"
}

# Main command handling
case "${1:-}" in
  "build")
    log_info "Building all packages..."
    for pkg in "${PACKAGES[@]}"; do
      build_package "$pkg" || log_warn "Failed to build $pkg"
    done
    log_info "Build complete!"
    ;;
  "")
    log_info "Publishing all packages to npm..."
    for pkg in "${PACKAGES[@]}"; do
      publish_package "$pkg" || log_warn "Failed to publish $pkg"
    done
    log_info "Publish complete!"
    ;;
  *)
    # Check if it's a valid package name
    if [[ " ${PACKAGES[@]} " =~ " ${1} " ]]; then
      log_info "Publishing $1..."
      publish_package "$1"
    else
      log_error "Unknown package: $1"
      log_info "Available packages:"
      for pkg in "${PACKAGES[@]}"; do
        echo "  - $pkg"
      done
      exit 1
    fi
    ;;
esac
