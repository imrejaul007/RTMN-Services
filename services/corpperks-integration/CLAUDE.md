# CorpPerks Integration Service

**Version:** 1.0.0
**Port:** 4968
**Status:** Active

---

## Overview

CorpPerks Integration Service provides HR, Payroll, and Benefits management for the RTMN ecosystem. It connects employee data to Customer Operations through Digital Twins.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CorpPerks Integration                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │     HR      │    │   Payroll   │    │  Benefits   │         │
│  │   Routes    │    │   Routes    │    │   Routes    │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                   │                   │               │
│         └───────────────────┴───────────────────┘               │
│                             │                                     │
│  ┌──────────────────────────▼──────────────────────────┐         │
│  │              Customer Ops Bridge                     │         │
│  │    Employee Twin │ Payment Twin │ Industry Twin    │         │
│  └──────────────────────────┬──────────────────────────┘         │
│                             │                                     │
│  ┌──────────────────────────▼──────────────────────────┐         │
│  │              Employee Sync Service                  │         │
│  │           (TwinOS Hub Integration)                   │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Twin Connections

| Twin | Service | Purpose |
|------|---------|---------|
| **Employee Twin** | agent-twin (3011) | Employee profiles, karma, employment |
| **Payment Twin** | Payment Twin | Payroll, compensation, payments |
| **Industry Twin** | TwinOS Hub (4705) | HR industry data, compliance |

## API Endpoints

### Health Check
```
GET /health
```

### HR Endpoints
```
POST   /api/hr              - Create employee
GET    /api/hr              - List employees (with filters)
GET    /api/hr/:id          - Get employee by ID
PUT    /api/hr/:id          - Update employee
DELETE /api/hr/:id          - Terminate employee
GET    /api/hr/manager/:id  - Get direct reports
GET    /api/hr/stats/summary - Get statistics
POST   /api/hr/sync/all     - Bulk sync to twins
```

### Payroll Endpoints
```
POST   /api/payroll/process     - Process payroll
GET    /api/payroll/record/:id   - Get payroll record
GET    /api/payroll/employee/:id - Get employee payroll
GET    /api/payroll/summary      - Get payroll summary
PATCH  /api/payroll/record/:id/status - Update status
POST   /api/payroll/batch/process - Batch process
GET    /api/payroll/export       - Export records
POST   /api/payroll/record/:id/sync - Sync to Payment Twin
```

### Benefits Endpoints
```
GET    /api/benefits/enrollment/:id     - Get enrollment
POST   /api/benefits/enrollment          - Enroll in benefits
PATCH  /api/benefits/enrollment/:id      - Update enrollment
GET    /api/benefits/leave/balance/:id  - Get leave balances
POST   /api/benefits/leave/request      - Request leave
PATCH  /api/benefits/leave/:id           - Approve/reject leave
GET    /api/benefits/leave/requests/:id - Get leave requests
GET    /api/benefits/leave/pending      - Get pending requests
GET    /api/benefits/plans               - Get available plans
POST   /api/benefits/enrollment/:id/sync - Sync to Industry Twin
```

## Data Models

### EmployeeProfile
```typescript
interface EmployeeProfile {
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  department: string;
  jobTitle: string;
  employmentType: 'full-time' | 'part-time' | 'contractor' | 'intern';
  workLocation: string;
  managerId?: string;
  payStructure: PayStructure;
  bankAccount: BankAccount;
  taxInformation: TaxInformation;
  benefitsPackage?: BenefitsPackage;
  status: 'active' | 'on-leave' | 'terminated' | 'pending';
  twins: {
    employeeTwinId?: string;
    paymentTwinId?: string;
    industryTwinId?: string;
  };
}
```

## Event Bus Integration

Publishes events to REZ-event-bus (4510):
- `employee.twin.connected` - Employee synced to twin
- `payment.twin.created` - Payroll synced to Payment Twin
- `benefits.industry.connected` - Benefits synced to Industry Twin

## Environment Variables

```bash
PORT=4968
EMPLOYEE_TWIN_URL=http://localhost:3011
PAYMENT_TWIN_URL=http://localhost:3012
INDUSTRY_TWIN_URL=http://localhost:4705
EVENT_BUS_URL=http://localhost:4510
SERVICE_REGISTRY_URL=http://localhost:4399
JWT_SECRET=your-jwt-secret
LOG_LEVEL=info
```

## Quick Start

```bash
# Install dependencies
cd services/corpperks-integration
npm install

# Start service
npm run dev

# Health check
curl http://localhost:4968/health
```

## Integration with Customer Operations

CorpPerks connects employee lifecycle to customer operations:
1. Employee created → Employee Twin synchronized
2. Payroll processed → Payment Twin updated
3. Benefits enrolled → Industry Twin (HR) synced

This enables:
- Unified employee view across RTMN
- Payroll tracking for contractors
- Benefits compliance monitoring
- Employee karma/profiling via TwinOS

---

*Last Updated: June 16, 2026*
