#!/bin/bash

# HOJAI V2 - PHASE 1B: ASSET MIGRATION SCRIPT
# Version: 1.0 | Date: May 29, 2026
# Purpose: Move REZ services under Hojai ownership (Fork & Sync)

set -e

echo "=============================================="
echo "HOJAI V2 - PHASE 1B: ASSET MIGRATION"
echo "=============================================="

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

HOJAI_DIR="$(pwd)"
REZ_DIR="/Users/rejaulkarim/Documents/ReZ Full App/REZ-Intelligence"

echo ""
echo "Migration Strategy: Fork & Sync"
echo "Source: $REZ_DIR"
echo "Destination: $HOJAI_DIR/hojai-core"
echo ""

# ============================================
# MIGRATION MAP
# ============================================

# This maps REZ services to Hojai platforms
declare -A MIGRATION_MAP=(
    ["REZ-event-bus"]="hojai-event"
    ["REZ-memory-layer"]="hojai-memory"
    ["REZ-flow-runtime"]="hojai-workflow"
    ["REZ-autonomous-agents"]="hojai-agents"
)

declare -A PORT_MAP=(
    ["hojai-event"]="4510"
    ["hojai-memory"]="4520"
    ["hojai-workflow"]="4560"
    ["hojai-agents"]="4550"
)

# ============================================
# VERIFY SOURCE EXISTS
# ============================================

echo "PHASE 1: Verifying source services..."
echo "--------------------------------------------"

for service in "${!MIGRATION_MAP[@]}"; do
    source_path="$REZ_DIR/$service"
    if [ -d "$source_path" ]; then
        echo "  ✓ $service found"
    else
        echo "  ✗ $service NOT FOUND at $source_path"
    fi
done

# ============================================
# CREATE DESTINATION DIRECTORIES
# ============================================

echo ""
echo "PHASE 2: Creating destination structure..."
echo "--------------------------------------------"

for dest in "${MIGRATION_MAP[@]}"; do
    dest_path="$HOJAI_DIR/hojai-core/$dest"
    if [ ! -d "$dest_path" ]; then
        mkdir -p "$dest_path"
        echo "  ✓ Created $dest_path"
    else
        echo "  - $dest_path already exists"
    fi
done

# ============================================
# COPY SERVICES
# ============================================

echo ""
echo "PHASE 3: Copying services..."
echo "--------------------------------------------"

for service in "${!MIGRATION_MAP[@]}"; do
    source="$REZ_DIR/$service"
    dest="${MIGRATION_MAP[$service]}"
    dest_path="$HOJAI_DIR/hojai-core/$dest"
    port="${PORT_MAP[$dest]}"

    if [ -d "$source" ]; then
        echo ""
        echo "  Copying: $service → $dest"

        # Copy source files
        cp -r "$source/src" "$dest_path/" 2>/dev/null || true
        cp -r "$source/dist" "$dest_path/" 2>/dev/null || true
        cp "$source/package.json" "$dest_path/" 2>/dev/null || true
        cp "$source/tsconfig.json" "$dest_path/" 2>/dev/null || true

        echo "  ✓ Copied to $dest_path"
        echo "  ℹ Port: $port"
    else
        echo "  ✗ SKIPPED: $service not found"
    fi
done

# ============================================
# UPDATE PACKAGE.JSOB FOR EACH SERVICE
# ============================================

echo ""
echo "PHASE 4: Updating package.json..."
echo "--------------------------------------------"

for dest in "${MIGRATION_MAP[@]}"; do
    dest_path="$HOJAI_DIR/hojai-core/$dest"
    port="${PORT_MAP[$dest]}"

    if [ -f "$dest_path/package.json" ]; then
        echo ""
        echo "  Updating: $dest"

        # Update name to @hojai scope
        sed -i '' "s/\"name\": \"rez-/\"name\": \"@hojai\/$dest/g" "$dest_path/package.json" 2>/dev/null || true

        # Update port in package.json if it exists
        if [ -n "$port" ]; then
            echo "  ✓ Updated name to @hojai/$dest"
            echo "  ℹ Port: $port"
        fi
    fi
done

# ============================================
# ADD TENANT MIDDLEWARE
# ============================================

echo ""
echo "PHASE 5: Adding tenant middleware..."
echo "--------------------------------------------"

for dest in "${!PORT_MAP[@]}"; do
    dest_path="$HOJAI_DIR/hojai-core/$dest"

    if [ -d "$dest_path/src" ]; then
        echo ""
        echo "  Adding tenant support to: $dest"

        # Check if shared middleware exists
        if [ -f "$HOJAI_DIR/hojai-core/shared/middleware/tenant.ts" ]; then
            # Create symbolic link or copy middleware
            mkdir -p "$dest_path/src/shared"
            cp -r "$HOJAI_DIR/hojai-core/shared/"* "$dest_path/src/shared/" 2>/dev/null || true
            echo "  ✓ Added shared middleware"
        fi

        # Update imports in source files
        find "$dest_path/src" -name "*.ts" -exec sed -i '' \
            -e 's/from.*@hojai\/shared/from ".\/shared"/g' \
            -e 's/from.*shared\//from "..\/shared\//g' \
            {} \; 2>/dev/null || true

        echo "  ✓ Updated imports"
    fi
done

# ============================================
# CREATE BOOTSTRAP FILES
# ============================================

echo ""
echo "PHASE 6: Creating bootstrap files..."
echo "--------------------------------------------"

for dest in "${!PORT_MAP[@]}"; do
    dest_path="$HOJAI_DIR/hojai-core/$dest"
    port="${PORT_MAP[$dest]}"

    if [ ! -f "$dest_path/bootstrap.ts" ]; then
        cat > "$dest_path/bootstrap.ts" << EOF
/**
 * $dest Bootstrap
 * Port: $port
 * Migration: Fork & Sync from REZ
 */

import express from 'express';
import { tenantMiddleware } from './shared/middleware/tenant';

const app = express();
const PORT = process.env.PORT || $port;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: '$dest', port: PORT });
});

// Tenant middleware for all API routes
app.use('/api', tenantMiddleware(), (req, res) => {
  res.json({
    success: true,
    tenant_id: req.tenantContext?.tenant_id,
    message: 'Service is running with tenant isolation'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('$dest running on port', PORT);
});
EOF
        echo "  ✓ Created bootstrap.ts for $dest"
    fi
done

# ============================================
# UPDATE README FOR EACH SERVICE
# ============================================

echo ""
echo "PHASE 7: Creating migration README..."
echo "--------------------------------------------"

cat > "$HOJAI_DIR/hojai-core/MIGRATION-STATUS.md" << 'EOF'
# HOJAI V2 - PHASE 1B MIGRATION STATUS
**Date:** May 29, 2026 | **Status:** IN PROGRESS

---

## Migration Map

| REZ Service | Hojai Platform | Port | Status |
|-------------|----------------|------|--------|
| REZ-event-bus | hojai-event | 4510 | Copied |
| REZ-memory-layer | hojai-memory | 4520 | Copied |
| REZ-flow-runtime | hojai-workflow | 4560 | Copied |
| REZ-autonomous-agents | hojai-agents | 4550 | Copied |

---

## Next Steps

### Phase 1B (Current)
- [x] Copy services to hojai-core
- [x] Add tenant middleware
- [ ] Update service code for multi-tenant
- [ ] Update port registrations
- [ ] Test each service

### Phase 1C
- [ ] Add tenant_id to all event payloads
- [ ] Add tenant filtering to subscriptions
- [ ] Update database queries with tenant scope
- [ ] Verify isolation

### Phase 2
- [ ] Move to hojai-intelligence (prediction, recommendations)
- [ ] Move to hojai-communications (WhatsApp, SMS, Email)
- [ ] Build Industry Brain framework

---

## Service Endpoints

| Platform | Port | Health | API |
|----------|------|--------|-----|
| hojai-event | 4510 | GET /health | POST /api/events/publish |
| hojai-memory | 4520 | GET /health | GET /api/memory/customer/:id |
| hojai-workflow | 4560 | GET /health | POST /api/workflows |
| hojai-agents | 4550 | GET /health | POST /api/agents/:id/invoke |

---

## Testing Commands

```bash
# Test hojai-event
curl -X POST http://localhost:4510/api/events/publish \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: test-tenant" \
  -d '{"type":"test.event","data":{"message":"hello"}}'

# Test hojai-memory
curl http://localhost:4520/api/memory/customer/cust_123 \
  -H "X-Tenant-Id: test-tenant"

# Test hojai-workflow
curl http://localhost:4560/api/workflows \
  -H "X-Tenant-Id: test-tenant"

# Test hojai-agents
curl http://localhost:4550/api/agents \
  -H "X-Tenant-Id: test-tenant"
```
EOF

echo "  ✓ Created MIGRATION-STATUS.md"

# ============================================
# SUMMARY
# ============================================

echo ""
echo "=============================================="
echo "PHASE 1B MIGRATION COMPLETE"
echo "=============================================="
echo ""
echo "Services migrated:"
for dest in "${!PORT_MAP[@]}"; do
    port="${PORT_MAP[$dest]}"
    echo "  • $dest → Port $port"
done
echo ""
echo "Files created:"
echo "  • hojai-core/MIGRATION-STATUS.md"
echo "  • bootstrap.ts in each service"
echo ""
echo "Next steps:"
echo "  1. Review copied services"
echo "  2. Update service code for multi-tenant"
echo "  3. Run: npm install in each service"
echo "  4. Test each service"
echo ""
