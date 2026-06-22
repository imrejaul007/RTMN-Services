# HOJAI Shift Handover Service

**Port: 4603** | **Company: HOJAI AI (RTNM Group)**

A comprehensive shift handover service for healthcare facilities, enabling seamless care continuity between shift changes. Part of the Nourish healthcare AI suite.

## Features

- **Shift Handover Management**: Create, manage, and complete shift handovers
- **Patient Status Tracking**: Track patient conditions, vitals, and pending tasks
- **Task Management**: Add, update, and track tasks across shifts
- **Critical Alert System**: Real-time alerts for urgent patient care issues
- **Acknowledgment Workflow**: Sign-off process for handover acceptance
- **Template System**: Reusable handover templates by facility/department
- **Archive & Search**: Searchable archive of completed handovers
- **Shift Reports**: Generate comprehensive shift statistics and reports
- **Multi-channel Notifications**: Push, Email, SMS, and WhatsApp alerts

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOJAI Shift Handover Service                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  REST API   │  │ Middleware  │  │    Validation Layer     │ │
│  │  (Express)  │  │ (Security)  │  │  (Zod Schemas)         │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                     │               │
│  ┌──────▼────────────────▼─────────────────────▼─────────────┐ │
│  │                    Service Layer                         │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │ │
│  │  │ Handover   │  │ Template   │  │   Notification     │   │ │
│  │  │ Service    │  │ Service    │  │   Service          │   │ │
│  │  └────────────┘  └────────────┘  └────────────────────┘   │ │
│  │  ┌────────────┐  ┌────────────┐                          │ │
│  │  │ Archive    │  │ Report     │                          │ │
│  │  │ Service    │  │ Service    │                          │ │
│  │  └────────────┘  └────────────┘                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │                   Data Layer (MongoDB)                    │ │
│  │  ShiftHandover │ HandoverTemplate │ ArchivedHandover       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │                   Cache Layer (Redis)                     │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB 6.0+
- Redis 7.0+

### Installation

```bash
cd hojai-ai/services/shift-handover-service
npm install
```

### Configuration

Create a `.env` file:

```env
PORT=4603
MONGODB_URI=mongodb://localhost:27017/shift-handover
REDIS_URL=redis://localhost:6379
NODE_ENV=development
CORS_ORIGIN=*
LOG_DIR=logs
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### Build & Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Docker

```bash
docker build -t hojai-shift-handover-service .
docker run -p 4603:4603 hojai-shift-handover-service
```

## API Reference

### Handover Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/handovers` | Create a new handover |
| GET | `/api/v1/handovers/:handoverId` | Get handover by ID |
| GET | `/api/v1/handovers/date/:date` | Get handovers by date (YYYY-MM-DD) |
| GET | `/api/v1/handovers/pending/:userId` | Get pending handovers for user |
| PUT | `/api/v1/handovers/:handoverId/patient` | Add patient update |
| PUT | `/api/v1/handovers/:handoverId/task` | Add task |
| PUT | `/api/v1/handovers/:handoverId/alert` | Add alert |
| PUT | `/api/v1/handovers/:handoverId/acknowledge` | Acknowledge handover |
| PUT | `/api/v1/handovers/:handoverId/complete` | Complete handover |
| GET | `/api/v1/handovers/search` | Search handovers |
| GET | `/api/v1/handovers/stats` | Get handover statistics |

### Template Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/templates` | Create template |
| GET | `/api/v1/templates/:templateId` | Get template |
| GET | `/api/v1/templates/facility/:facilityId` | Get facility templates |
| PUT | `/api/v1/templates/:templateId` | Update template |
| POST | `/api/v1/templates/:templateId/apply/:handoverId` | Apply template to handover |
| POST | `/api/v1/templates/:templateId/duplicate` | Duplicate template |
| DELETE | `/api/v1/templates/:templateId` | Delete template |

### Archive Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/archive/:handoverId` | Archive handover |
| GET | `/api/v1/archive/:archiveId` | Get archived handover |
| POST | `/api/v1/archive/:archiveId/restore` | Restore archived handover |
| GET | `/api/v1/reports/shift` | Generate shift report |
| POST | `/api/v1/archive/auto-cleanup` | Auto-archive old handovers |

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |

## Data Models

### ShiftHandover

```typescript
{
  handoverId: string;          // HO-XXXXXXXX
  outgoingStaffId: string;
  outgoingStaffName: string;
  incomingStaffId?: string;
  incomingStaffName?: string;
  shiftDate: Date;
  shiftType: 'day' | 'night' | 'evening';
  facilityId: string;
  facilityName: string;
  departmentId?: string;
  departmentName?: string;
  status: 'draft' | 'in_progress' | 'pending_acknowledgment' | 'completed' | 'archived' | 'cancelled';
  sections: {
    patients: PatientHandover[];
    tasks: TaskHandover[];
    alerts: AlertHandover[];
    notes: string;
  };
  acknowledgments: HandoverAcknowledgment[];
  templateId?: string;
  templateName?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### PatientHandover

```typescript
{
  patientId: string;
  patientName: string;
  roomNumber: string;
  bedNumber?: string;
  condition: string;
  diagnosis?: string;
  treatmentPlan?: string;
  pendingTasks: string[];
  concerns: string[];
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    respiratoryRate?: number;
  };
  lastUpdated: Date;
}
```

### TaskHandover

```typescript
{
  taskId: string;              // TASK-XXXXXXXX
  description: string;
  category?: string;
  assignedTo?: string;
  assignedToName?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delegated' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueTime?: Date;
  patientId?: string;
  notes?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

### AlertHandover

```typescript
{
  alertId: string;             // ALERT-XXXXXXXX
  type: 'critical' | 'urgent' | 'warning' | 'info' | 'allergy' | 'fall_risk' | 'medication' | 'lab_result';
  patientId?: string;
  patientName?: string;
  description: string;
  actionRequired: string;
  actionTaken?: string;
  createdBy: string;
  createdAt: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}
```

## Example Usage

### Create a Handover

```bash
curl -X POST http://localhost:4603/api/v1/handovers \
  -H "Content-Type: application/json" \
  -d '{
    "outgoingShiftId": "SHIFT-001",
    "outgoingStaffId": "STAFF-001",
    "outgoingStaffName": "Nurse Sarah",
    "incomingStaffId": "STAFF-002",
    "incomingStaffName": "Nurse John",
    "shiftDate": "2026-06-01T00:00:00Z",
    "shiftType": "night",
    "facilityId": "FAC-001",
    "facilityName": "General Hospital"
  }'
```

### Add a Patient

```bash
curl -X PUT http://localhost:4603/api/v1/handovers/HO-XXXXXXXX/patient \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PAT-001",
    "patientName": "John Doe",
    "roomNumber": "101",
    "bedNumber": "A",
    "condition": "Stable",
    "diagnosis": "Post-operative recovery",
    "vitals": {
      "bloodPressure": "120/80",
      "heartRate": 72,
      "temperature": 98.6
    },
    "pendingTasks": ["Administer medication at 8 PM", "Check wound dressing"],
    "concerns": ["Mild pain reported"]
  }'
```

### Add a Critical Alert

```bash
curl -X PUT http://localhost:4603/api/v1/handovers/HO-XXXXXXXX/alert \
  -H "Content-Type: application/json" \
  -d '{
    "type": "critical",
    "patientId": "PAT-001",
    "patientName": "John Doe",
    "description": "Sudden drop in oxygen saturation",
    "actionRequired": "Immediate respiratory assessment and oxygen support",
    "createdBy": "STAFF-001"
  }'
```

### Acknowledge and Complete

```bash
# Acknowledge
curl -X PUT http://localhost:4603/api/v1/handovers/HO-XXXXXXXX/acknowledge \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "STAFF-002",
    "userName": "Nurse John",
    "role": "Registered Nurse",
    "comments": "All information received and understood"
  }'

# Complete
curl -X PUT http://localhost:4603/api/v1/handovers/HO-XXXXXXXX/complete
```

### Generate Shift Report

```bash
curl "http://localhost:4603/api/v1/reports/shift?facilityId=FAC-001&startDate=2026-06-01&endDate=2026-06-30"
```

## Notification Channels

The service supports multi-channel notifications:

- **Push**: Mobile app notifications (FCM/APNs)
- **Email**: SMTP-based email delivery
- **SMS**: Twilio/AWS SNS integration
- **WhatsApp**: Business API integration

Critical alerts automatically trigger all notification channels for immediate attention.

## Security

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing control
- **Rate Limiting**: Request throttling (configurable)
- **Input Validation**: Zod schema validation
- **Parameterized Queries**: MongoDB injection prevention
- **Timing-Safe Comparison**: Authentication token validation

## Monitoring

Health and metrics endpoints:

- `/health` - Overall service health
- `/ready` - Service readiness for traffic
- MongoDB connection status
- Redis connection status
- Collection counts

## Related Services

| Service | Port | Description |
|---------|------|-------------|
| HOJAI Core | 4500-4610 | AI Infrastructure |
| REZ-Intelligence | 4500 | Privileged AI/ML |
| Auth Service | 4002 | Authentication |
| Notification Service | 4011 | Notifications |

## License

MIT License - HOJAI AI (RTNM Group)

---

**Built with care for healthcare continuity by HOJAI AI**
