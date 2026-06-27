# Commercial Lease Manager — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P1 | **Build:** ₹30L / 6 weeks | **ARR:** ₹1.5Cr

---

## 1. Concept & Vision

Comprehensive commercial lease management for landlords and property managers — tracking leases, escalations, renewals, and tenant health.

---

## 2. Core Features

### 2.1 Lease Lifecycle Management (P0)
- Lease creation with customizable terms
- Rent escalation tracking (fixed %, CPI-linked, milestone-based)
- Security deposit management
- Lock-in period tracking
- Renewal workflow automation

### 2.2 Rent Collection (P0)
- Automated rent invoicing
- Payment tracking (on-time, late, defaults)
- Late fee calculation
- PDC/cheque management
- Reconciliation reports

### 2.3 Tenant Health Monitoring (P0)
```typescript
interface TenantHealth {
  tenantId: string;
  
  // Financial Health
  paymentScore: number;           // 0-100
  onTimeRate: number;             // percentage
  avgDaysLate: number;
  
  // Business Health
  businessType: string;
  revenueTrend: 'growing' | 'stable' | 'declining';
  employeeCount: number;
  
  // Lease Health
  remainingTenure: number;        // months
  renewalLikely: boolean;
  expansionInterest: boolean;
  
  overallHealth: 'healthy' | 'watch' | 'at-risk' | 'critical';
}
```

### 2.4 Escalation Calculator (P0)
- Fixed percentage escalation (annual)
- CPI-linked escalation
- Market-linked escalation
- Milestone-based (upon renewal)
- Cap and floor calculations

### 2.5 Renewal Pipeline (P1)
- 6-month advance renewal alerts
- Market rent analysis for renegotiation
- Tenant satisfaction survey
- Counter-offer workflow
- Renewal vs. vacancy analysis

---

## 3. API Endpoints

```
GET    /api/leases
POST   /api/leases
GET    /api/leases/:id
PUT    /api/leases/:id
POST   /api/leases/:id/escalate
GET    /api/leases/expiring          # Expiring in 6 months
POST   /api/leases/:id/renew

GET    /api/tenants/:id/health       # Tenant health score
GET    /api/collections/outstanding  # Outstanding rent
POST   /api/collections/remind       # Send reminder
```

---

## 4. Success Metrics

| Metric | Target |
|--------|--------|
| Collection efficiency | 98%+ |
| On-time renewals | 85%+ |
| Vacancy gap | <15 days |
| Tenant retention | 75%+ |

---

*Spec created: June 28, 2026*
