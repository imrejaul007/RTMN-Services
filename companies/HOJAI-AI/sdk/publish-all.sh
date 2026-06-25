#!/bin/bash
# Publish All HOJAI SDKs to npm
# Usage: ./publish-all.sh [version]
# Requires: npm login (npm adduser) with @hojai scope access

set -e

SCOPE="@hojai"
SDK_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SDK_DIR/publish-log.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
    echo "[$(date)] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "[$(date)] WARN: $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date)] ERROR: $1" >> "$LOG_FILE"
}

# Check npm login
check_npm_login() {
    log "Checking npm login..."
    if ! npm whoami &>/dev/null; then
        error "Not logged in to npm. Run: npm login"
        error "Then: npm adduser --access public (for @hojai scope)"
        exit 1
    fi
    log "Logged in as: $(npm whoami)"
}

# Get version bump type
get_version() {
    local current="$1"
    local bump="${2:-patch}"
    local parts=($(echo "$current" | tr '.' '\n'))
    local major="${parts[0]}"
    local minor="${parts[1]}"
    local patch="${parts[2]}"

    case "$bump" in
        major) echo "$((major + 1)).0.0" ;;
        minor) echo "$major.$((minor + 1)).0" ;;
        patch) echo "$major.$minor.$((patch + 1))" ;;
        *) echo "$current" ;;
    esac
}

# Publish one SDK
publish_sdk() {
    local sdk_path="$1"
    local sdk_name=$(basename "$sdk_path")
    local pkg_name="@hojai/${sdk_name#hojai-}"

    # Skip if no package.json
    if [ ! -f "$sdk_path/package.json" ]; then
        warn "Skipping $sdk_name - no package.json"
        return 1
    fi

    # Skip if no dist
    if [ ! -d "$sdk_path/dist" ]; then
        warn "Skipping $sdk_name - no dist folder (run build first)"
        return 1
    fi

    cd "$sdk_path"

    local current_version=$(node -p "require('./package.json').version")
    local new_version="${2:-$current_version}"

    log "Publishing $pkg_name@$new_version..."

    # Update version
    npm version "$new_version" --no-git-tag-version 2>/dev/null || true

    # Publish
    if npm publish --access public 2>&1; then
        log "✅ $pkg_name@$new_version published!"
        echo "$pkg_name: SUCCESS" >> "$LOG_FILE"
        return 0
    else
        error "Failed to publish $pkg_name"
        echo "$pkg_name: FAILED" >> "$LOG_FILE"
        return 1
    fi
}

# Main
main() {
    local bump="${1:-patch}"

    echo "=========================================="
    echo "  HOJAI SDK Publisher"
    echo "=========================================="
    echo ""

    # Initialize log
    echo "# Publish Log - $(date)" > "$LOG_FILE"

    # Check login
    check_npm_login

    # Check for @hojai scope access
    log "Checking @hojai scope access..."
    if ! npm info "@hojai/foundation" &>/dev/null; then
        warn "Scope @hojai may not exist. You may need to request it from npm."
        warn "Or publish to your own scope first, then transfer."
    fi

    echo ""
    log "Publishing SDKs with version bump: $bump"
    echo ""

    local success=0
    local failed=0

    # Publish each SDK
    for sdk in "$SDK_DIR"/hojai-*/; do
        local sdk_name=$(basename "$sdk")
        local current_ver=$(node -p "require('$sdk/package.json').version" 2>/dev/null || echo "0.0.0")

        if publish_sdk "$sdk" "$bump"; then
            ((success++))
        else
            ((failed++))
        fi
    done

    echo ""
    echo "=========================================="
    log "Done! Success: $success, Failed: $failed"
    echo "=========================================="
    log "Full log: $LOG_FILE"
}

# Help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "HOJAI SDK Publisher"
    echo ""
    echo "Usage: ./publish-all.sh [version-bump]"
    echo ""
    echo "Version bump options:"
    echo "  patch  - Bug fixes (default)"
    echo "  minor  - New features"
    echo "  major  - Breaking changes"
    echo "  x.x.x  - Specific version"
    echo ""
    echo "Prerequisites:"
    echo "  1. npm login"
    echo "  2. npm adduser --access public (for @hojai scope)"
    echo "  3. Build SDKs: npm run build (in each SDK dir)"
    echo ""
    exit 0
fi

main "$@"
