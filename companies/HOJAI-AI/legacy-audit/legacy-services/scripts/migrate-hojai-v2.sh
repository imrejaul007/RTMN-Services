#!/bin/bash

# HOJAI V2 REPOSITORY RESTRUCTURE SCRIPT
# Version: 1.0 | Date: May 29, 2026
# Purpose: Restructure hojai-ai repo for Hojai v2 architecture

set -e

echo "=============================================="
echo "HOJAI V2 REPOSITORY RESTRUCTURE"
echo "=============================================="

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo ""
echo "Current directory: $(pwd)"
echo ""

# ============================================
# PHASE 1: Create hojai-core structure
# ============================================

echo "PHASE 1: Creating hojai-core structure..."
echo "--------------------------------------------"

mkdir -p hojai-core/{hojai-governance,hojai-event,hojai-memory,hojai-intelligence,hojai-agents,hojai-workflow,hojai-communications,hojai-hyperlocal,hojai-analytics,hojai-data}
mkdir -p hojai-core/shared/{utils,types,middleware}

echo "  ✓ hojai-core directory structure created"

# ============================================
# PHASE 2: Create rez-intelligence structure
# ============================================

echo ""
echo "PHASE 2: Creating rez-intelligence structure..."
echo "--------------------------------------------"

mkdir -p rez-intelligence/{rez-identity-graph,rez-commerce-graph,rez-mobility-graph,rez-loyalty-graph,rez-trust-graph,rez-behavioral-graph,rez-hyperlocal-graph,rez-intent-graph,rez-ecosystem-knowledge,rez-recommendations,rez-predictions,shared}

echo "  ✓ rez-intelligence directory structure created"

# ============================================
# PHASE 3: Create hojai-industry structure
# ============================================

echo ""
echo "PHASE 3: Creating hojai-industry structure..."
echo "--------------------------------------------"

mkdir -p hojai-industry/{jewellery-brain,healthcare-brain,hospitality-brain,retail-brain,education-brain,finance-brain,real-estate-brain}

echo "  ✓ hojai-industry directory structure created"

# ============================================
# PHASE 4: Create hojai-clients structure
# ============================================

echo ""
echo "PHASE 4: Creating hojai-clients structure..."
echo "--------------------------------------------"

mkdir -p hojai-clients/{template,xyz-retail,abc-hospital,hotel-client,clinic-client}

mkdir -p hojai-clients/template/{client-identity,client-memory,client-recommendations,client-agents,client-workflows,client-analytics}

echo "  ✓ hojai-clients directory structure created"

# ============================================
# PHASE 5: Move hojai-governance to hojai-core
# ============================================

echo ""
echo "PHASE 5: Moving hojai-governance to hojai-core..."
echo "--------------------------------------------"

if [ -d "packages/hojai-governance" ]; then
    cp -r packages/hojai-governance hojai-core/hojai-governance
    echo "  ✓ hojai-governance moved to hojai-core"
else
    echo "  ⚠ hojai-governance not found in packages/"
fi

# ============================================
# PHASE 6: Copy REZ services to hojai-core
# ============================================

echo ""
echo "PHASE 6: Copying REZ services to hojai-core..."
echo "--------------------------------------------"

# Check if REZ-Intelligence exists
if [ -d "../REZ-Intelligence" ]; then
    cd ../REZ-Intelligence

    # Copy Event Bus to hojai-event
    if [ -d "REZ-event-bus" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-event"
        cp -r REZ-event-bus/* "../../hojai-ai/hojai-core/hojai-event/"
        echo "  ✓ REZ-event-bus → hojai-core/hojai-event"
    fi

    # Copy Memory Layer to hojai-memory
    if [ -d "REZ-memory-layer" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-memory"
        cp -r REZ-memory-layer/* "../../hojai-ai/hojai-core/hojai-memory/"
        echo "  ✓ REZ-memory-layer → hojai-core/hojai-memory"
    fi

    # Copy Flow Runtime to hojai-workflow
    if [ -d "REZ-flow-runtime" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-workflow"
        cp -r REZ-flow-runtime/* "../../hojai-ai/hojai-core/hojai-workflow/"
        echo "  ✓ REZ-flow-runtime → hojai-core/hojai-workflow"
    fi

    # Copy Workflow Builder
    if [ -d "REZ-workflow-builder" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-workflow"
        cp -r REZ-workflow-builder/* "../../hojai-ai/hojai-core/hojai-workflow/"
        echo "  ✓ REZ-workflow-builder → hojai-core/hojai-workflow"
    fi

    # Copy Autonomous Agents to hojai-agents
    if [ -d "REZ-autonomous-agents" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-agents"
        cp -r REZ-autonomous-agents/* "../../hojai-ai/hojai-core/hojai-agents/"
        echo "  ✓ REZ-autonomous-agents → hojai-core/hojai-agents"
    fi

    # Copy Predictive Engine to hojai-intelligence
    if [ -d "REZ-predictive-engine" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-intelligence"
        cp -r REZ-predictive-engine/* "../../hojai-ai/hojai-core/hojai-intelligence/"
        echo "  ✓ REZ-predictive-engine → hojai-core/hojai-intelligence"
    fi

    # Copy Recommendation Engine
    if [ -d "REZ-recommendation-engine" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-intelligence"
        cp -r REZ-recommendation-engine/* "../../hojai-ai/hojai-core/hojai-intelligence/"
        echo "  ✓ REZ-recommendation-engine → hojai-core/hojai-intelligence"
    fi

    # Copy WhatsApp to hojai-communications
    if [ -d "REZ-whatsapp" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-communications"
        cp -r REZ-whatsapp/* "../../hojai-ai/hojai-core/hojai-communications/"
        echo "  ✓ REZ-whatsapp → hojai-core/hojai-communications"
    fi

    # Copy Geo Intelligence to hojai-hyperlocal
    if [ -d "REZ-geo-intelligence" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-hyperlocal"
        cp -r REZ-geo-intelligence/* "../../hojai-ai/hojai-core/hojai-hyperlocal/"
        echo "  ✓ REZ-geo-intelligence → hojai-core/hojai-hyperlocal"
    fi

    # Copy Insights to hojai-analytics
    if [ -d "REZ-insights-service" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-analytics"
        cp -r REZ-insights-service/* "../../hojai-ai/hojai-core/hojai-analytics/"
        echo "  ✓ REZ-insights-service → hojai-core/hojai-analytics"
    fi

    # Copy Feature Store to hojai-data
    if [ -d "REZ-feature-store" ]; then
        mkdir -p "../../hojai-ai/hojai-core/hojai-data"
        cp -r REZ-feature-store/* "../../hojai-ai/hojai-core/hojai-data/"
        echo "  ✓ REZ-feature-store → hojai-core/hojai-data"
    fi

    cd "../../hojai-ai"
else
    echo "  ⚠ REZ-Intelligence directory not found"
fi

# ============================================
# PHASE 7: Copy REZ graphs to rez-intelligence
# ============================================

echo ""
echo "PHASE 7: Copying REZ graphs to rez-intelligence..."
echo "--------------------------------------------"

if [ -d "../REZ-Intelligence" ]; then
    cd ../REZ-Intelligence

    # Copy Identity Graph
    if [ -d "REZ-identity-graph" ]; then
        cp -r REZ-identity-graph/* "../../hojai-ai/rez-intelligence/rez-identity-graph/"
        echo "  ✓ REZ-identity-graph → rez-intelligence/rez-identity-graph"
    fi

    # Copy Commerce Graph
    if [ -d "REZ-commerce-graph" ]; then
        cp -r REZ-commerce-graph/* "../../hojai-ai/rez-intelligence/rez-commerce-graph/"
        echo "  ✓ REZ-commerce-graph → rez-intelligence/rez-commerce-graph"
    fi

    # Copy Signal Aggregator (Behavioral)
    if [ -d "REZ-signal-aggregator" ]; then
        cp -r REZ-signal-aggregator/* "../../hojai-ai/rez-intelligence/rez-behavioral-graph/"
        echo "  ✓ REZ-signal-aggregator → rez-intelligence/rez-behavioral-graph"
    fi

    # Copy Intent Graph
    if [ -d "rez-intent-predictor" ]; then
        cp -r rez-intent-predictor/* "../../hojai-ai/rez-intelligence/rez-intent-graph/"
        echo "  ✓ rez-intent-predictor → rez-intelligence/rez-intent-graph"
    fi

    cd "../../hojai-ai"
fi

# ============================================
# PHASE 8: Create shared tenant middleware
# ============================================

echo ""
echo "PHASE 8: Creating shared tenant middleware..."
echo "--------------------------------------------"

# Create tenant types
cat > hojai-core/shared/types/tenant.ts << 'EOF'
// Tenant Types for Hojai v2
// Version: 1.0 | Date: May 29, 2026

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  tenant_type: 'internal' | 'commercial' | 'industry';
  organization_id?: string;
  user_id?: string;
  roles: string[];
  permissions: string[];
  plan?: 'starter' | 'professional' | 'enterprise';
  limits?: TenantLimits;
}

export interface TenantLimits {
  max_users: number;
  max_api_calls: number;
  max_storage: number;
  rate_limit: number;
}

export interface TenantIdentifier {
  tenant_id: string;
  organization_id: string;
  namespace: string;
  display_name: string;
  type: 'internal' | 'commercial' | 'industry';
  industry?: string;
}
EOF

echo "  ✓ Tenant types created"

# Create tenant middleware
cat > hojai-core/shared/middleware/tenant.ts << 'EOF'
// Tenant Middleware for Hojai v2
// Version: 1.0 | Date: May 29, 2026

import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../types/tenant';

export const tenantMiddleware = () => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const tenant_id = req.headers['x-tenant-id'] as string;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'X-Tenant-Id header is required'
        }
      });
    }

    // TODO: Validate tenant exists
    const tenant = await validateTenant(tenant_id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant not found'
        }
      });
    }

    req.tenantContext = {
      tenant_id: tenant.id,
      namespace: `tenant_${tenant.id}`,
      tenant_type: tenant.type,
      organization_id: req.headers['x-organization-id'] as string,
      user_id: req.headers['x-user-id'] as string,
      roles: parseHeaderList(req.headers['x-roles']),
      permissions: [], // TODO: Load from PermissionService
      plan: tenant.plan,
      limits: tenant.limits
    };

    next();
  };
};

async function validateTenant(tenant_id: string) {
  // TODO: Implement tenant validation
  return { id: tenant_id, type: 'internal', plan: 'enterprise' };
}

function parseHeaderList(header: string | string[] | undefined): string[] {
  if (!header) return [];
  if (Array.isArray(header)) return header;
  try {
    return JSON.parse(header);
  } catch {
    return [header];
  }
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}
EOF

echo "  ✓ Tenant middleware created"

# ============================================
# PHASE 9: Create API response types
# ============================================

echo ""
echo "PHASE 9: Creating shared API types..."
echo "--------------------------------------------"

cat > hojai-core/shared/types/api.ts << 'EOF'
// API Response Types for Hojai v2
// Version: 1.0 | Date: May 29, 2026

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
    latencyMs?: number;
  };
}

export interface HojaiEvent {
  id: string;
  tenant_id: string;
  type: string;
  source: string;
  timestamp: string;
  correlationId?: string;
  causationId?: string;
  data: Record<string, any>;
}

export function createResponse<T>(
  data: T,
  options?: { tenantId?: string; requestId?: string }
): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options?.requestId || generateRequestId(),
      tenantId: options?.tenantId
    }
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: any
): APIResponse<null> {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
EOF

echo "  ✓ API types created"

# ============================================
# PHASE 10: Update README
# ============================================

echo ""
echo "PHASE 10: Updating README..."
echo "--------------------------------------------"

cat > README.md << 'EOF'
# HOJAI AI v2
**AI Infrastructure for Modern Businesses**

---

## Architecture

```
HOJAI AI
│
├── Hojai Core Infrastructure (4500-4599)
│   ├── Governance (4500)
│   ├── Event (4510)
│   ├── Memory (4520)
│   ├── Intelligence (4530)
│   ├── Agents (4550)
│   ├── Workflow (4560)
│   ├── Communications (4570)
│   ├── Hyperlocal (4580)
│   └── Data (4590)
│
├── REZ Intelligence (4100-4299)
│   ├── Identity Graph (4100)
│   ├── Commerce Graph (4110)
│   ├── Mobility Graph (4120)
│   └── ...
│
├── Hojai Industry (4700-4799)
│   ├── Jewellery Brain (4700)
│   ├── Healthcare Brain (4710)
│   └── ...
│
└── Hojai Clients (4600-4699)
    ├── XYZ Retail (4600)
    └── ABC Hospital (4610)
```

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/HOJAI-V2-ARCHITECTURE.md](docs/HOJAI-V2-ARCHITECTURE.md) | Official architecture |
| [docs/MIGRATION-GUIDE.md](docs/MIGRATION-GUIDE.md) | Migration steps |
| [docs/PORT-REGISTRY.md](docs/PORT-REGISTRY.md) | Port allocations |
| [docs/MULTI-TENANT.md](docs/MULTI-TENANT.md) | Multi-tenant design |
| [docs/LEARNING-LAYER.md](docs/LEARNING-LAYER.md) | Learning architecture |

## Quick Start

```bash
# Install dependencies
npm install

# Start hojai-core services
cd hojai-core/hojai-governance && npm install && npm run dev
cd hojai-core/hojai-event && npm install && npm run dev

# Or use Docker
docker-compose up
```

## Port Registry

| Range | Owner | Purpose |
|-------|-------|---------|
| 3000-3999 | REZ Domain | REZ ecosystem |
| 4000-4499 | RABTUL | Shared platform |
| 4500-4599 | Hojai Core | Core infrastructure |
| 4600-4699 | Hojai Clients | Commercial clients |
| 4700-4799 | Hojai Industry | Industry brains |
EOF

echo "  ✓ README updated"

# ============================================
# PHASE 11: Create client template files
# ============================================

echo ""
echo "PHASE 11: Creating client template..."
echo "--------------------------------------------"

# Create client index
cat > hojai-clients/template/index.ts << 'EOF'
// Hojai Client Template
// Version: 1.0 | Date: May 29, 2026

export interface ClientIntelligence {
  tenant_id: string;
  identity_graph: any;     // ClientIdentityGraph
  customer_graph: any;     // ClientCustomerGraph
  product_graph: any;      // ClientProductGraph
  commerce_graph: any;     // ClientCommerceGraph
  recommendations: any;    // ClientRecommendations
  agents: any;             // ClientAgents
  workflows: any;          // ClientWorkflows
  analytics: any;          // ClientAnalytics
  memory: any;              // ClientMemory
}
EOF

echo "  ✓ Client template created"

# ============================================
# SUMMARY
# ============================================

echo ""
echo "=============================================="
echo "RESTRUCTURE COMPLETE"
echo "=============================================="
echo ""
echo "Directory structure created:"
echo ""
echo "hojai-ai/"
echo "├── hojai-core/           # Core infrastructure"
echo "│   ├── hojai-governance/"
echo "│   ├── hojai-event/"
echo "│   ├── hojai-memory/"
echo "│   ├── hojai-intelligence/"
echo "│   ├── hojai-agents/"
echo "│   ├── hojai-workflow/"
echo "│   ├── hojai-communications/"
echo "│   ├── hojai-hyperlocal/"
echo "│   ├── hojai-analytics/"
echo "│   ├── hojai-data/"
echo "│   └── shared/"
echo "│       ├── types/"
echo "│       └── middleware/"
echo "│"
echo "├── rez-intelligence/      # REZ ecosystem (privileged tenant)"
echo "│   ├── rez-identity-graph/"
echo "│   ├── rez-commerce-graph/"
echo "│   ├── rez-mobility-graph/"
echo "│   └── ..."
echo "│"
echo "├── hojai-industry/        # Industry brains"
echo "│   ├── jewellery-brain/"
echo "│   ├── healthcare-brain/"
echo "│   └── ..."
echo "│"
echo "├── hojai-clients/         # Commercial clients"
echo "│   ├── template/"
echo "│   ├── xyz-retail/"
echo "│   └── abc-hospital/"
echo "│"
echo "└── docs/                  # Documentation"
echo "    ├── HOJAI-V2-ARCHITECTURE.md"
echo "    ├── MIGRATION-GUIDE.md"
echo "    ├── PORT-REGISTRY.md"
echo "    ├── MULTI-TENANT.md"
echo "    └── LEARNING-LAYER.md"
echo ""
echo "Next steps:"
echo "1. Review migrated services"
echo "2. Add multi-tenant support to each service"
echo "3. Update ports according to PORT-REGISTRY.md"
echo "4. Update package.json names to @hojai/*"
echo "5. Run npm install in each service"
echo ""
