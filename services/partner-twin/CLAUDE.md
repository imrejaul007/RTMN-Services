# Partner Twin Service

**Version:** 1.0.0
**Port:** 4892
**Status:** Production Ready

## Overview

Partner Twin is a comprehensive service for managing vendor/supplier/service provider relationships with full lifecycle tracking including SLAs, performance metrics, contracts, financial management, and trust scoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Partner Twin Service                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Partner    │  │  Contract    │  │     SLA      │            │
│  │   Module     │  │   Module     │  │   Module     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │ Performance  │  │   Trust      │                              │
│  │   Module     │  │    Score     │                              │
│  └──────────────┘  └──────────────┘                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │                  MongoDB Database                  │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Partner Management
- Multi-tenant architecture (tenantId required)
- Partner types: vendor, supplier, service_provider, courier, integrator
- Status tracking: active, inactive, pending, suspended, blacklisted
- Contact management with primary/secondary contacts
- Address management (billing/shipping)
- Integration status tracking
- Partnership duration and renewal tracking
- Custom metadata and tags

### 2. Contract Management
- Multiple contract types: master, service, NDA, SLA, pricing, volume, exclusive
- Contract lifecycle: draft, pending_approval, active, expired, terminated, renewed
- Party management (signatories, emails)
- Payment terms configuration
- Renewal automation with custom terms
- Contract value tracking
- Line items and deliverables
- Attachment references
- Signature tracking

### 3. SLA Management
- Configurable metrics: uptime, response_time, resolution_time, delivery_time, quality_score, accuracy, availability
- Target thresholds with warning levels
- Weighted metric calculations
- Actual vs target tracking with data points
- Breach recording with severity levels
- Breach resolution tracking
- Penalty/credit management
- SLA reviews and reporting
- Auto-status updates based on breaches

### 4. Performance Tracking
- Multiple measurement periods: daily, weekly, monthly, quarterly, yearly
- Five metric categories:
  - Delivery: on-time rate, delivery time, accuracy, fulfillment
  - Quality: defect rate, return rate, complaints, first-pass yield
  - Responsiveness: response time, resolution time, escalation rate
  - Cost: efficiency, competitiveness, savings
  - Compliance: regulatory, documentation, audit scores
- Incident tracking with severity and impact
- Trend analysis (improving, stable, declining)
- Risk level assessment
- Overall score calculation with weights

### 5. Financial Management
- Credit line management
- Transaction history (invoice, payment, credit, debit, refund)
- Payment history with punctuality scoring
- Aging buckets (current, 31-60, 61-90, over 90)
- Invoice tracking
- Tax information and exemption
- Insurance and bond tracking
- Financial health scoring

### 6. Trust Score Engine
Comprehensive trust scoring combining:
- Performance Score (40% weight)
- Reliability Score (25% weight)
- Financial Score (20% weight)
- Compliance Score (15% weight)

Features:
- Factor-by-factor breakdown
- Impact analysis
- Recommendations generation
- Batch recalculation
- Cached results with timestamps

## API Endpoints

### Partners
```
POST   /api/partners              - Create partner
GET    /api/partners               - List partners (with filters)
GET    /api/partners/:id           - Get partner by ID
PUT    /api/partners/:id           - Update partner
DELETE /api/partners/:id           - Soft delete partner
PATCH  /api/partners/:id/status    - Update partner status
GET    /api/partners/stats/summary - Get partner statistics
PATCH  /api/partners/:id/trust-score - Update trust score
```

### Contracts
```
POST   /api/contracts/:partnerId   - Create contract
GET    /api/contracts              - List contracts
GET    /api/contracts/:id          - Get contract by ID
PUT    /api/contracts/:id          - Update contract
DELETE /api/contracts/:id          - Soft delete contract
GET    /api/contracts/partner/:partnerId - Get contracts by partner
PATCH  /api/contracts/:id/status   - Update contract status
PATCH  /api/contracts/:id/sign     - Sign contract
POST   /api/contracts/:id/renew    - Renew contract
GET    /api/contracts/stats/summary - Get contract statistics
```

### SLAs
```
POST   /api/slas/:partnerId        - Create SLA
GET    /api/slas                   - List SLAs
GET    /api/slas/:id               - Get SLA by ID
PUT    /api/slas/:id               - Update SLA
DELETE /api/slas/:id               - Soft delete SLA
GET    /api/slas/partner/:partnerId - Get SLAs by partner
PATCH  /api/slas/:id/metrics/actual - Update metric actual
POST   /api/slas/:id/breaches      - Record breach
PATCH  /api/slas/:id/breaches/:breachId/resolve - Resolve breach
GET    /api/slas/stats/summary     - Get SLA statistics
```

### Performance
```
POST   /api/performance/:partnerId - Create performance record
GET    /api/performance            - List performance records
GET    /api/performance/:id        - Get performance by ID
PUT    /api/performance/:id        - Update performance
GET    /api/performance/partner/:partnerId - Get by partner
GET    /api/performance/partner/:partnerId/current - Get current
POST   /api/performance/:id/incidents - Add incident
PATCH  /api/performance/:id/incidents/:incidentId/resolve - Resolve incident
GET    /api/performance/stats/summary - Get performance statistics
GET    /api/performance/compare/:partnerId - Compare over time
```

### Trust Score
```
POST   /api/partners/:partnerId/trust-score/calculate - Calculate trust score
GET    /api/partners/:partnerId/trust-score - Get cached trust score
POST   /api/trust-scores/batch - Batch recalculate all
```

### Financial
```
GET    /api/partners/:partnerId/financial - Get financial data
```

## Data Models

### Partner
```typescript
{
  partnerId: string;
  tenantId: string;
  name: string;
  type: 'vendor' | 'supplier' | 'service_provider' | 'courier' | 'integrator';
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'blacklisted';
  category: { primary: string; secondary?: string[] };
  primaryContact: IContactInfo;
  contacts: IContactInfo[];
  billingAddress?: IAddress;
  shippingAddress?: IAddress;
  paymentTerms?: string;
  creditLimit?: number;
  integrationStatus: 'none' | 'basic' | 'standard' | 'advanced' | 'real_time';
  partnership: { startDate: Date; endDate?: Date; autoRenew?: boolean };
  trustScore?: number;
  trustScoreBreakdown?: { performanceScore, reliabilityScore, financialScore, complianceScore };
  complianceStatus?: 'compliant' | 'pending' | 'non_compliant';
  riskLevel?: 'low' | 'medium' | 'high';
}
```

### Contract
```typescript
{
  contractId: string;
  partnerId: string;
  tenantId: string;
  title: string;
  type: 'master' | 'service' | 'nda' | 'sla' | 'pricing' | 'volume' | 'exclusive';
  status: 'draft' | 'pending_approval' | 'active' | 'expired' | 'terminated' | 'renewed';
  effectiveDate: Date;
  expirationDate?: Date;
  terms: { paymentTerms, currency, minimumCommitment, maximumLiability };
  renewal: { autoRenew, renewalPeriod, noticePeriod, renewalRate };
  totalValue?: number;
  currency: string;
  lineItems?: IContractLineItem[];
}
```

### SLA
```typescript
{
  slaId: string;
  partnerId: string;
  tenantId: string;
  name: string;
  status: 'active' | 'breached' | 'at_risk' | 'paused' | 'terminated';
  priority: 'critical' | 'high' | 'medium' | 'low';
  metrics: ISLAMetricDefinition[];
  actuals: ISLAMetricActual[];
  overallCompliance: number;
  breaches: ISLABreach[];
  reviews: ISLAReview[];
}
```

### Performance
```typescript
{
  performanceId: string;
  partnerId: string;
  tenantId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  overallScore: number;
  status: 'on_track' | 'at_risk' | 'below_target' | 'exceeded';
  deliveryMetrics: IDeliveryMetrics;
  qualityMetrics: IQualityMetrics;
  responsivenessMetrics: IResponsivenessMetrics;
  costMetrics: ICostMetrics;
  complianceMetrics: IComplianceMetrics;
  incidents: IIncident[];
}
```

## Multi-Tenancy

All API requests must include the tenant ID via header:
```
X-Tenant-ID: <tenant-id>
```

If not provided, defaults to 'default'.

## Response Format

All API responses follow this format:

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Paginated
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "details": [...] // Optional validation errors
}
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Configuration

Environment variables (see .env.example):
- `PORT` - Service port (default: 4892)
- `MONGODB_URI` - MongoDB connection string
- `LOG_LEVEL` - Logging level (default: info)

## Health Check

```
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "service": "partner-twin",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "mongodb": "connected"
}
```

## Dependencies

- express: ^4.18.2
- mongoose: ^8.0.3
- cors: ^2.8.5
- helmet: ^7.1.0
- uuid: ^9.0.1
- winston: ^3.11.0
- zod: ^3.22.4

## Development

TypeScript configuration:
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Source maps enabled

## License

MIT
