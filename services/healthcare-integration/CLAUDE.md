# Healthcare Integration Service

**Version:** 1.0.0
**Port:** 4965
**Status:** Production Ready

## Overview

The Healthcare Integration Service bridges RisaCare and Healthcare OS with Customer Operations (Twins), enabling seamless data synchronization across the RTMN ecosystem's healthcare vertical.

```
┌─────────────────────────────────────────────────────────────────┐
│                  Healthcare Integration                          │
│                        Port: 4965                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐         ┌─────────────────────────────┐    │
│  │  RisaCare      │         │     Customer Operations     │    │
│  │  (Port 7000)   │────────►│                             │    │
│  └────────────────┘         │  ┌─────────────────────┐    │    │
│                              │  │ Customer Twin      │    │    │
│  ┌────────────────┐         │  │ (Port 3017)         │    │    │
│  │  Healthcare OS │────────►│  └─────────────────────┘    │    │
│  │  (Port 5020)   │         │  ┌─────────────────────┐    │    │
│  └────────────────┘         │  │ Journey Twin        │    │    │
│                              │  │ (Port 3016)         │    │    │
│  ┌────────────────┐         │  └─────────────────────┘    │    │
│  │  Voice AI      │────────►│  ┌─────────────────────┐    │    │
│  │  Runtime       │         │  │ Subscription Twin  │    │    │
│  │  (Port 3000)   │         │  │ (Port 3018)         │    │    │
│  └────────────────┘         │  └─────────────────────┘    │    │
│                              │  ┌─────────────────────┐    │    │
│                              │  │ Industry Twin       │    │    │
│                              │  │ (Port 4705)         │    │    │
│                              │  └─────────────────────┘    │    │
│                              └─────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Mappings

| Healthcare Data | Customer Operation Twin | Purpose |
|-----------------|------------------------|---------|
| Patients | Customer Twin | Buyer profiles, lifetime value, risk scoring |
| Appointments | Journey Twin | Customer journey tracking, referrals |
| Medical Records | Industry Twin | Healthcare-specific data, diagnostics |
| Prescriptions | Subscription Twin | Recurring medication management |
| Telehealth | Voice AI Runtime | Telemedicine conversations, transcriptions |

## API Endpoints

### Patients (`/api/patients`)
- `GET /` - List all patients (paginated)
- `GET /:id` - Get patient by ID
- `POST /` - Create patient (auto-syncs to Customer Twin)
- `PUT /:id` - Update patient
- `DELETE /:id` - Delete patient
- `GET /:id/journey` - Get patient journey analytics

### Appointments (`/api/appointments`)
- `GET /` - List appointments (filterable)
- `GET /:id` - Get appointment by ID
- `POST /` - Create appointment (syncs to Journey Twin)
- `PUT /:id` - Update appointment
- `POST /:id/checkin` - Check-in patient
- `POST /:id/cancel` - Cancel appointment
- `GET /today/summary` - Today's appointment summary

### Medical Records (`/api/medical`)
- `GET /records` - List medical records
- `GET /records/:id` - Get record by ID
- `POST /records` - Create medical record (syncs to Industry Twin)
- `PUT /records/:id` - Update record
- `GET /history/:patientId` - Patient medical history

### Prescriptions (`/api/medical/prescriptions`)
- `GET /` - List prescriptions
- `GET /:id` - Get prescription by ID
- `POST /` - Create prescription (syncs to Subscription Twin)
- `PUT /:id` - Update prescription
- `POST /:id/refill` - Request refill

### Telehealth (`/api/telehealth`)
- `GET /` - List telehealth sessions
- `GET /:id` - Get session by ID
- `POST /` - Schedule session (initializes Voice AI)
- `POST /:id/start` - Start session
- `POST /:id/end` - End session
- `POST /:id/cancel` - Cancel session
- `GET /analytics/summary` - Telehealth analytics

### Service Info
- `GET /health` - Health check
- `GET /api/info` - Service information and connection status

## Data Models

### PatientProfile
```typescript
{
  id: string;
  corpid?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  address?: Address;
  emergencyContact?: EmergencyContact;
  insuranceInfo?: InsuranceInfo;
  medicalHistory?: MedicalHistory;
  preferences?: PatientPreferences;
  customerTwinId?: string;
  journeyStage?: string;
  lifetimeValue?: number;
  riskScore?: number;
}
```

### Appointment
```typescript
{
  id: string;
  patientId: string;
  providerId: string;
  appointmentType: 'consultation' | 'follow-up' | 'routine-checkup' | 'telehealth' | ...;
  status: 'scheduled' | 'confirmed' | 'checked-in' | 'completed' | 'cancelled' | ...;
  scheduledAt: string;
  duration: number;
  location?: string;
  journeyTwinId?: string;
}
```

## Environment Variables

```bash
PORT=4965
NODE_ENV=development

# Healthcare OS
HEALTHCARE_OS_URL=http://localhost:5020
RISACARE_URL=http://localhost:7000

# Customer Operations
CUSTOMER_TWIN_URL=http://localhost:3017
JOURNEY_TWIN_URL=http://localhost:3016
INDUSTRY_TWIN_URL=http://localhost:4705
SUBSCRIPTION_TWIN_URL=http://localhost:3018

# Voice AI
VOICE_AI_URL=http://localhost:3000

# Service Registry
SERVICE_REGISTRY_URL=http://localhost:4399
EVENT_BUS_URL=http://localhost:4510
```

## Events Published

| Event | Trigger | Payload |
|-------|---------|---------|
| `appointment.created` | New appointment | `{ appointmentId, patientId, scheduledAt, type }` |
| `appointment.updated` | Status change | `{ appointmentId, patientId, status, previousStatus }` |
| `appointment.checked-in` | Check-in | `{ appointmentId, patientId, checkedInAt }` |
| `appointment.cancelled` | Cancellation | `{ appointmentId, patientId, previousStatus, reason }` |
| `medical.record.created` | New record | `{ recordId, patientId, recordType, diagnosis }` |
| `prescription.created` | New prescription | `{ prescriptionId, patientId, medication, refills }` |
| `prescription.refill-requested` | Refill | `{ prescriptionId, patientId, refillsRemaining }` |
| `telehealth.scheduled` | Session booked | `{ sessionId, patientId, providerId, scheduledAt }` |
| `telehealth.started` | Session begins | `{ sessionId, patientId, startedAt }` |
| `telehealth.ended` | Session ends | `{ sessionId, patientId, endedAt, duration }` |
| `telehealth.cancelled` | Cancellation | `{ sessionId, patientId, providerId }` |

## Quick Start

```bash
# Install dependencies
cd services/healthcare-integration
npm install

# Start service
npm run dev

# Build for production
npm run build
npm start
```

## Health Check

```bash
curl http://localhost:4965/health
```

## Example: Create Patient

```bash
curl -X POST http://localhost:4965/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane.doe@example.com",
    "phone": "+1234567890",
    "dateOfBirth": "1985-03-15",
    "insuranceInfo": {
      "provider": "BlueCross",
      "policyNumber": "BC123456",
      "memberId": "JDOE001"
    }
  }'
```

## Example: Schedule Telehealth

```bash
curl -X POST http://localhost:4965/api/telehealth \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PAT-12345678",
    "providerId": "DR-001",
    "sessionType": "video",
    "scheduledAt": "2026-06-20T10:00:00Z",
    "appointmentId": "APT-12345678"
  }'
```

## Architecture

```
                    Healthcare Integration (4965)
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐       ┌─────▼─────┐       ┌─────▼─────┐
    │ Healthcare│       │  RisaCare│       │  Voice AI │
    │    OS     │       │  (7000)   │       │  Runtime  │
    │  (5020)   │       └───────────┘       │  (3000)   │
    └───────────┘                           └───────────┘
          │
    ┌─────▼─────────────────────────────────────────────┐
    │              Customer Operations                   │
    ├─────────┬─────────┬─────────┬───────────────────┤
    │Customer │ Journey │Industry │  Subscription      │
    │ Twin    │ Twin    │ Twin    │  Twin              │
    │(3017)   │(3016)   │(4705)   │  (3018)           │
    └─────────┴─────────┴─────────┴───────────────────┘
```

## Related Services

| Service | Port | Purpose |
|---------|------|---------|
| Healthcare OS | 5020 | Core healthcare management |
| RisaCare | 7000 | Healthcare platform |
| Customer Twin | 3017 | Buyer profiles |
| Journey Twin | 3016 | Referral/journey tracking |
| Industry Twin | 4705 | Digital twins hub |
| Subscription Twin | 3018 | Deal/subscription management |
| Voice AI Runtime | 3000 | Conversational AI |
| Event Bus | 4510 | Pub/Sub messaging |
| Service Registry | 4399 | Service discovery |

## License

RTMN Proprietary - All rights reserved
