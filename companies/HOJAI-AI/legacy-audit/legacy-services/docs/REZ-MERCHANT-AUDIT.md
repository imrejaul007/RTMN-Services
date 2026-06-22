# REZ MERCHANT AUDIT - GAP ANALYSIS
**Date:** May 30, 2026 | **Status:** AUDIT COMPLETE

---

# EXECUTIVE SUMMARY

## REZ Merchant Services: 24

| Category | Count | Maps to Hojai |
|----------|-------|----------------|
| Core Services | 8 | ✅ Hojai Data Platform |
| Intelligence | 4 | ✅ Hojai Intelligence |
| Mobile Apps | 4 | ⏳ Pending |
| Integrations | 3 | ✅ Hojai Workflows |
| Dashboards | 3 | ⏳ Pending |
| Franchise | 1 | ⏳ Pending |
| B2B | 1 | ⏳ Pending |

---

# PART 1: REZ MERCHANT SERVICES INVENTORY

## 1. Core Services (8)

| Service | Purpose | Maps To | Gap |
|---------|---------|---------|-----|
| rez-merchant-service | Core merchant API | Hojai Data Platform | None - use Customer/Merchant entity |
| rez-merchant-intelligence-service | Merchant analytics | Hojai Intelligence | Enhance |
| rez-merchant-loans-service | Merchant loans | External (RABTUL Finance) | Keep separate |
| rez-merchant-copilot | Merchant AI assistant | Hojai Agents | None - use Agent Platform |
| rez-merchant-integrations | Integration hub | Hojai Workflows | None - use Workflows |
| rez-merchant-intelligence-aggregator | Analytics agg | Hojai Analytics | Build Analytics Platform |
| rez-merchant-trust-bridge | Trust scoring | Hojai Identity | None - use Identity |
| rez-merchant-corpperks-bridge | CorpPerks integration | Hojai Communications | None - use Communications |

## 2. Intelligence Services (4)

| Service | Purpose | Maps To | Gap |
|---------|---------|---------|-----|
| REZ-competitive-intelligence | Competitor analysis | Hojai Industry | None - use Industry Platform |
| REZ-franchise-management | Franchise ops | Hojai Workflows | Enhance |
| REZ-multi-warehouse | Warehouse mgmt | Hojai Data Platform | None - use Location entity |
| REZ-b2b-integration | B2B connections | Hojai Workflows | None |

## 3. Mobile Apps (4)

| Service | Purpose | Maps To | Gap |
|---------|---------|---------|-----|
| rez-merchant-app | Merchant mobile | Merchant AI OS | Build Merchant AI OS |
| rez-app-merchant | Another merchant app | Merchant AI OS | Build Merchant AI OS |
| REZ-kds-mobile | Kitchen Display | Industry-specific | Keep separate |
| REZ-purchase-order-mobile | PO mobile | Industry-specific | Keep separate |

## 4. Dashboards (3)

| Service | Purpose | Maps To | Gap |
|---------|---------|---------|-----|
| REZ-dashboard | Main dashboard | Hojai Analytics | Build Analytics Platform |
| rez-unified-dashboard | Unified view | Hojai Analytics | Build Analytics Platform |
| REZ-unified-dashboard | Same as above | Hojai Analytics | Duplicate - consolidate |

## 5. Other Services (5)

| Service | Purpose | Maps To | Gap |
|---------|---------|---------|-----|
| NexTaBizz | B2B procurement | Industry-specific | Keep separate |
| industry-os | Industry OS | Hojai Industry | Use Industry Platform |
| verify-qr-admin | QR verification | Hojai Communications | Use Communications |
| rez-barcode-scanner-ui | Barcode scanner | Industry-specific | Keep separate |
| NexTaBizz | B2B procurement | Industry-specific | Keep separate |

---

# PART 2: PLATFORM MAPPING

## Correct Framework

```
REZ Merchant Service
↓
Hojai Platform Capability
↓
Does it belong to:
- Data Platform?
- Identity Platform?
- Memory Platform?
- Intelligence Platform?
- Workflows Platform?
- Agents Platform?
- Communications Platform?
```

## Corrected Mapping

| REZ Service | Hojai Platform | Feature |
|-------------|---------------|---------|
| rez-merchant-service | Data Platform | Merchant entity |
| rez-merchant-intelligence | Intelligence Platform | Merchant analytics |
| rez-merchant-copilot | Agents Platform | Support Agent |
| rez-merchant-integrations | Workflows Platform | Integration workflows |
| rez-merchant-trust-bridge | Identity Platform | Trust scoring |
| REZ-dashboard | Analytics Platform | Dashboards |
| REZ-competitive-intelligence | Industry Platform | Industry patterns |

---

# PART 3: WHAT IS NOT A GAP

## These are FEATURES, not services:

| REZ Service | Is Actually | Belongs To |
|-------------|-------------|-------------|
| rez-merchant-service | Merchant CRUD | Data Platform |
| rez-merchant-intelligence | Merchant analytics | Intelligence Platform |
| rez-merchant-copilot | Support AI Agent | Agents Platform |
| rez-merchant-integrations | Integration workflows | Workflows Platform |
| REZ-dashboard | Analytics dashboards | Analytics Platform |

---

# PART 4: REAL GAPS FOR REZ MERCHANT ON HOJAI

## Gap 1: Merchant Entity Missing

Hojai Data Platform needs Merchant entity.

```typescript
interface Merchant {
  id: string;
  tenant_id: string;
  
  // Profile
  name: string;
  business_type: string;
  gstin?: string;
  pan?: string;
  
  // Contact
  phone: string;
  email: string;
  address: Address;
  
  // Business
  categories: string[];
  tags: string[];
  
  // Metrics
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  
  // Status
  status: 'active' | 'inactive' | 'suspended';
}
```

## Gap 2: Merchant AI OS Missing

REZ Merchant needs a product layer.

```
Merchant AI OS (on top of Hojai)
├── Dashboard
├── Customers
├── Orders
├── Products
├── AI Employee
├── Workflows
├── Integrations
└── Analytics
```

## Gap 3: Analytics Platform Incomplete

REZ Merchant needs dashboards.

```
Analytics Platform needs:
├── Dashboard builder
├── Report templates
├── Export functionality
└── Real-time metrics
```

---

# PART 5: RECOMMENDED ACTIONS

## Immediate (Week 1)

### Add Merchant Entity to Hojai Data Platform

```typescript
// packages/hojai-data-models/src/entities/merchant.ts

interface Merchant {
  id: string;
  tenant_id: string;
  name: string;
  business_type: string;
  categories: string[];
  contact: {
    phone: string;
    email: string;
    address: Address;
  };
  metrics: {
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
  };
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}
```

## Week 2: Build Merchant AI OS

Create product layer for merchants.

## Week 3: Enhance Analytics Platform

Add dashboard functionality.

---

# PART 6: COMPLETE SERVICE LIST

## REZ Merchant Services (24)

```
REZ-Merchant/
├── Core Services
│   ├── rez-merchant-service/              → Data Platform (Merchant entity)
│   ├── rez-merchant-intelligence-service/ → Intelligence Platform
│   ├── rez-merchant-loans-service/       → External (Finance)
│   ├── rez-merchant-copilot/             → Agents Platform (Support Agent)
│   ├── rez-merchant-integrations/        → Workflows Platform
│   ├── rez-merchant-intelligence-aggregator/ → Analytics Platform
│   ├── rez-merchant-trust-bridge/        → Identity Platform
│   └── rez-merchant-corpperks-bridge/    → Communications Platform
│
├── Intelligence
│   ├── REZ-competitive-intelligence/    → Industry Platform
│   ├── REZ-franchise-management/       → Workflows Platform
│   ├── REZ-multi-warehouse/           → Data Platform (Location entity)
│   └── REZ-b2b-integration/            → Workflows Platform
│
├── Mobile Apps
│   ├── rez-merchant-app/              → Merchant AI OS
│   ├── rez-app-merchant/              → Merchant AI OS
│   ├── REZ-kds-mobile/               → Keep separate (industry)
│   └── REZ-purchase-order-mobile/     → Keep separate (industry)
│
├── Dashboards
│   ├── REZ-dashboard/                → Analytics Platform
│   ├── rez-unified-dashboard/         → Analytics Platform
│   └── REZ-unified-dashboard/        → Analytics Platform (duplicate)
│
└── Other
    ├── NexTaBizz/                    → Keep separate (B2B)
    ├── industry-os/                   → Industry Platform
    ├── verify-qr-admin/              → Communications Platform
    └── rez-barcode-scanner-ui/        → Keep separate
```

---

# PART 7: SUMMARY

## Correct Numbers

| Metric | Old (Wrong) | New (Right) |
|--------|-------------|---------------|
| Services | 24 | Collapse to **Platform features** |
| Gaps | Unknown | **3 real gaps** |
| Build | Many | **Merchant Entity + Merchant AI OS + Analytics** |

## 3 Real Gaps

| Gap | Platform | Work |
|-----|----------|------|
| Merchant Entity | Data Platform | Add to hojai-data-models |
| Merchant AI OS | Product Layer | Build separately |
| Dashboards | Analytics Platform | Enhance Analytics |

## What is NOT a Gap

| Service | Is Actually |
|---------|-------------|
| rez-merchant-service | Merchant CRUD → Data Platform |
| rez-merchant-copilot | Support Agent → Agents Platform |
| rez-merchant-integrations | Workflows → Workflows Platform |
| rez-merchant-trust-bridge | Trust → Identity Platform |

---

*Document Version: 1.0*
*Last Updated: May 30, 2026*
