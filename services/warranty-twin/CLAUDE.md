# Warranty Twin Service

**Version:** 1.0.0  
**Port:** 4905  
**Status:** Production Ready

## Overview

The Warranty Twin service manages warranty claims, repairs, and service history across the RTMN ecosystem. It provides a comprehensive warranty management system with multi-tenant support, validation workflows, and full traceability.

## Features

- Multi-tenant warranty management
- Warranty creation, validation, and renewal
- Claim workflow (pending, approved, rejected, in_progress, completed)
- Repair tracking with parts and labor management
- Service history with full audit trail
- Expiring warranty notifications
- Customer feedback for completed repairs

## API Endpoints

### Health Check
```
GET /health
```

### Warranties
```
GET  /api/warranties                 - List warranties with filtering
GET  /api/warranties/expiring        - Get warranties expiring soon
GET  /api/warranties/stats           - Warranty statistics
GET  /api/warranties/:warrantyId      - Get single warranty
POST /api/warranties                  - Create warranty
PUT  /api/warranties/:warrantyId      - Update warranty
PATCH /api/warranties/:warrantyId/activate   - Activate warranty
PATCH /api/warranties/:warrantyId/deactivate - Deactivate warranty
POST /api/warranties/:warrantyId/renew       - Renew warranty
DELETE /api/warranties/:warrantyId           - Delete warranty
GET  /api/warranties/:warrantyId/claims      - Get warranty claims
GET  /api/warranties/:warrantyId/repairs     - Get warranty repairs
GET  /api/warranties/:warrantyId/service-history - Get service history
```

### Claims
```
GET  /api/claims                    - List claims with filtering
GET  /api/claims/stats              - Claim statistics
GET  /api/claims/:claimId           - Get single claim
POST /api/claims                    - Create claim
PATCH /api/claims/:claimId           - Update claim
PATCH /api/claims/:claimId/approve   - Approve claim
PATCH /api/claims/:claimId/reject    - Reject claim
PATCH /api/claims/:claimId/start     - Start processing claim
PATCH /api/claims/:claimId/complete  - Complete claim
POST /api/claims/:claimId/notes      - Add note to claim
POST /api/claims/:claimId/documents  - Add document to claim
DELETE /api/claims/:claimId          - Delete claim
```

### Repairs
```
GET  /api/repairs                    - List repairs with filtering
GET  /api/repairs/stats              - Repair statistics
GET  /api/repairs/scheduled          - Get scheduled repairs
GET  /api/repairs/:repairId          - Get single repair
POST /api/repairs                    - Create repair
PATCH /api/repairs/:repairId          - Update repair
PATCH /api/repairs/:repairId/start    - Start repair
PATCH /api/repairs/:repairId/complete - Complete repair
PATCH /api/repairs/:repairId/cancel   - Cancel repair
POST /api/repairs/:repairId/parts     - Add part to repair
POST /api/repairs/:repairId/labor      - Add labor entry
POST /api/repairs/:repairId/attachments - Add attachment
POST /api/repairs/:repairId/feedback   - Submit customer feedback
DELETE /api/repairs/:repairId         - Delete repair
```

## Data Models

### Warranty
```typescript
{
  warrantyId: string;          // WTY-XXXXXXXX
  tenantId: string;
  customerId: string;
  productId: string;
  orderId?: string;
  productName: string;
  productModel?: string;
  productSerial?: string;
  manufacturer?: string;
  type: 'manufacturer' | 'extended';
  startDate: Date;
  endDate: Date;
  purchaseDate: Date;
  isValid: boolean;
  isActive: boolean;
  coverage: {
    parts: boolean;
    labor: boolean;
    type: 'basic' | 'comprehensive' | 'limited';
    deductible?: number;
    maxCoverageAmount?: number;
  };
  claims: Claim[];
  repairs: Repair[];
  serviceHistory: ServiceHistoryEntry[];
  notes?: string;
  metadata?: Record<string, any>;
}
```

### Claim
```typescript
{
  claimId: string;             // CLM-XXXXXXXX
  warrantyId: string;
  tenantId: string;
  customerId: string;
  productId: string;
  date: Date;
  issue: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  items: ClaimItem[];
  claimAmount: number;
  approvedAmount: number;
  deductibleApplied: number;
  resolution?: string;
  documents: string[];
  notes: ClaimNote[];
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  scheduledDate?: Date;
  completedAt?: Date;
  processedAt?: Date;
}
```

### Repair
```typescript
{
  repairId: string;            // REP-XXXXXXXX
  warrantyId?: string;
  claimId?: string;
  tenantId: string;
  customerId: string;
  productId: string;
  productSerial?: string;
  date: Date;
  type: string;
  category: 'hardware' | 'software' | 'maintenance' | 'inspection';
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  diagnosis?: {
    diagnosedAt: Date;
    diagnosedBy: string;
    symptoms: string[];
    rootCause: string;
    recommendedAction: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  partsUsed: Part[];
  laborEntries: LaborEntry[];
  totalPartsCost: number;
  totalLaborCost: number;
  totalCost: number;
  isWarrantyCovered: boolean;
  warrantyCoverageAmount?: number;
  customerPaidAmount?: number;
  technician?: string;
  technicianNotes?: string;
  scheduledDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  attachments: Attachment[];
  customerFeedback?: {
    rating: number;
    comment?: string;
    submittedAt?: Date;
  };
}
```

## Multi-Tenancy

All requests must include the `X-Tenant-ID` header to identify the tenant:

```bash
curl -H "X-Tenant-ID: tenant-123" http://localhost:4905/api/warranties
```

## Claim Workflow

```
  [Create] --> [Pending] --> [Approved] --> [In Progress] --> [Completed]
                   |             |
                   v             v
               [Rejected]   [Rejected]
```

## Repair Workflow

```
  [Create] --> [Scheduled] --> [In Progress] --> [Completed]
                                  |
                                  v
                              [Cancelled]
```

## Getting Started

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start service
npm start

# Development mode
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4905 | Service port |
| MONGODB_URI | mongodb://localhost:27017/warranty-twin | MongoDB connection |
| JWT_SECRET | - | JWT secret for auth |
| ALLOWED_ORIGINS | http://localhost:3000 | CORS origins |
| LOG_LEVEL | info | Logging level |

## Health Check Response

```json
{
  "status": "healthy",
  "service": "warranty-twin",
  "version": "1.0.0",
  "timestamp": "2026-06-16T00:00:00.000Z",
  "uptime": 12345,
  "requestId": "uuid",
  "database": {
    "status": "connected",
    "name": "warranty-twin"
  },
  "checks": {
    "database": true,
    "memory": true
  }
}
```

## Integration with Other Services

The Warranty Twin integrates with:
- **Hotel OS** (5025) - For hotel equipment warranties
- **Restaurant OS** (5010) - For kitchen equipment warranties
- **Retail OS** (5030) - For retail product warranties
- **Manufacturing OS** (5150) - For manufacturing equipment warranties
- **Goal OS** (4242) - For warranty expiry notifications
- **TwinOS Hub** (4705) - For digital twin synchronization

## License

Internal RTMN Service
