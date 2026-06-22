# Incident Management Service

A comprehensive incident management and safeguarding service for RisaCare healthcare facilities, built on the HOJAI AI platform.

## Overview

This service handles **incident reports** and **safeguarding concerns** critical for healthcare compliance. It provides complete incident lifecycle management from reporting through resolution, with integrated safeguarding workflows and alerting.

### Key Features

- **Incident Reporting** - Create detailed incident reports with patient, location, and severity information
- **Safeguarding Management** - Raise, assess, and track safeguarding concerns with risk levels
- **Investigation Tracking** - Add witnesses, investigations, findings, and corrective actions
- **Alerting System** - Automated alerts to family, management, and authorities
- **Analytics Dashboard** - Trends, reports, compliance metrics, and patient risk scoring
- **Healthcare Compliance** - Regulatory reportable incidents, audit logging, documentation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INCIDENT MANAGEMENT SERVICE                    │
├─────────────────────────────────────────────────────────────────┤
│  Routes Layer                                                     │
│  ├── Incident Routes (CRUD, Resolve, Escalate)                   │
│  ├── Safeguarding Routes (Concerns, Risk, Protection Plans)     │
│  └── Analytics Routes (Trends, Reports, Compliance)            │
├─────────────────────────────────────────────────────────────────┤
│  Services Layer                                                   │
│  ├── IncidentService     - Core incident operations              │
│  ├── SafeguardingService - Concern management                    │
│  ├── AlertService        - Notifications & alerts                │
│  └── AnalyticsService    - Reporting & metrics                    │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                       │
│  ├── Incident Model    (Mongoose)                                 │
│  └── Safeguarding Model (Mongoose)                               │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure                                                    │
│  ├── MongoDB          - Primary data store                       │
│  └── Redis            - Caching & session                        │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB 6.0+
- Redis 7.0+ (optional for caching)

### Installation

```bash
cd hojai-ai/services/incident-management-service
npm install
```

### Configuration

Create a `.env` file:

```env
PORT=4602
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/incident_management
REDIS_URL=redis://localhost:6379

# Notification Service Integration
NOTIFICATION_SERVICE_URL=http://localhost:4011
SMS_SERVICE_URL=http://localhost:4011/sms
EMAIL_SERVICE_URL=http://localhost:4011/email
TASK_SERVICE_URL=http://localhost:4011/tasks
WEBHOOK_URL=https://your-webhook-endpoint.com/alerts

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Logging
LOG_DIR=/var/log/incident-service
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

### Incidents

#### Report Incident
```http
POST /api/incidents
Content-Type: application/json

{
  "patientId": "PAT-12345",
  "patientName": "John Doe",
  "facilityId": "FAC-001",
  "facilityName": "RisaCare Home",
  "type": "fall",
  "severity": "moderate",
  "title": "Patient Fall in Room 204",
  "description": "Patient fell while attempting to get out of bed...",
  "location": {
    "building": "Main",
    "floor": "2",
    "room": "204",
    "area": "Patient Room"
  },
  "incidentDate": "2026-06-01T14:30:00Z",
  "incidentTime": "14:30",
  "reportedBy": {
    "userId": "STAFF-001",
    "name": "Jane Smith",
    "role": "Care Assistant",
    "department": "Floor 2"
  },
  "injuries": [{
    "type": "bruise",
    "bodyPart": "left_hip",
    "severity": "minor",
    "treatmentRequired": true
  }],
  "regulatoryReportable": false
}
```

#### Get Incident
```http
GET /api/incidents/:incidentId
```

#### Get Patient Incidents
```http
GET /api/incidents/patient/:patientId?limit=50&skip=0&status=reported
```

#### Get Incidents by Date Range
```http
GET /api/incidents/date-range?startDate=2026-01-01&endDate=2026-06-01&facilityId=FAC-001
```

#### Update Incident
```http
PUT /api/incidents/:incidentId
Content-Type: application/json

{
  "severity": "major",
  "status": "investigating"
}
```

#### Add Witness
```http
POST /api/incidents/:incidentId/witness
Content-Type: application/json

{
  "witnessId": "WIT-001",
  "witnessName": "Bob Wilson",
  "witnessRole": "Nurse",
  "statement": "I heard a loud thud and found the patient on the floor...",
  "timeOfObservation": "2026-06-01T14:32:00Z",
  "isPrimaryWitness": true
}
```

#### Add Investigation
```http
POST /api/incidents/:incidentId/investigation
Content-Type: application/json

{
  "investigatorId": "INV-001",
  "investigatorName": "Dr. Sarah Johnson",
  "investigatorRole": "Clinical Director",
  "findings": "The bed rails were lowered and the patient was unsupervised...",
  "rootCause": "Inadequate supervision during high-risk period",
  "contributingFactors": ["Staffing shortage", "Alarm fatigue"],
  "recommendations": [
    "Implement 15-minute check protocol",
    "Review bed rail policy",
    "Staff training on fall prevention"
  ],
  "correctiveActions": [
    {
      "action": "Review and update fall prevention protocol",
      "assignedTo": "Clinical Director",
      "dueDate": "2026-06-15"
    }
  ]
}
```

#### Resolve Incident
```http
PUT /api/incidents/:incidentId/resolve
Content-Type: application/json

{
  "resolvedBy": "STAFF-001",
  "resolvedByName": "Jane Smith",
  "resolutionSummary": "Patient recovered fully. Fall prevention measures implemented.",
  "followUpRequired": true,
  "followUpDate": "2026-06-15"
}
```

#### Escalate Incident
```http
PUT /api/incidents/:incidentId/escalate
Content-Type: application/json

{
  "escalatedBy": "STAFF-001",
  "escalatedByName": "Jane Smith",
  "escalatedTo": "Regional Manager",
  "escalationReason": "Incident requires executive review due to pattern of falls"
}
```

### Safeguarding

#### Raise Concern
```http
POST /api/safeguarding/concerns
Content-Type: application/json

{
  "concernType": "neglect",
  "description": "Concern raised about adequate nutrition and hydration...",
  "vulnerablePerson": {
    "personId": "PAT-12345",
    "name": "John Doe",
    "dateOfBirth": "1945-03-15",
    "gender": "male",
    "careType": "Residential Care",
    "careLocation": "RisaCare Home"
  },
  "concernRaisedBy": {
    "userId": "STAFF-001",
    "name": "Jane Smith",
    "role": "Care Assistant",
    "department": "Floor 2"
  },
  "immediateActions": [
    "Increased monitoring of nutritional intake",
    "Consulted with GP"
  ]
}
```

#### Assess Risk
```http
POST /api/safeguarding/concerns/:concernId/risk-assessment
Content-Type: application/json

{
  "riskScore": 65,
  "riskFactors": [
    "History of similar concerns",
    "Vulnerable due to cognitive impairment",
    "Dependency on others for basic needs"
  ],
  "protectiveFactors": [
    "Family visits regularly",
    "Responsive to staff prompts"
  ],
  "riskLevelJustification": "Medium-high risk due to ongoing concerns and limited capacity to self-advocate",
  "assessedBy": "SAF-001"
}
```

#### Notify Authorities
```http
POST /api/safeguarding/concerns/:concernId/authorities
Content-Type: application/json

{
  "authorityName": "Local Authority Safeguarding Team",
  "contactMethod": "phone",
  "contactPerson": "Ms. Thompson",
  "referenceNumber": "LA-SAF-2026-001"
}
```

#### Create Protection Plan
```http
POST /api/safeguarding/concerns/:concernId/protection-plan
Content-Type: application/json

{
  "measures": [
    {
      "measure": "Weekly weight monitoring",
      "responsibleParty": "Care Team",
      "startDate": "2026-06-01"
    },
    {
      "measure": "Monthly care plan review",
      "responsibleParty": "Clinical Lead",
      "startDate": "2026-06-01"
    }
  ],
  "reviewDate": "2026-07-01",
  "nextReviewDate": "2026-08-01",
  "createdBy": "SAF-001"
}
```

### Analytics

#### Get Incident Trends
```http
GET /api/incidents/trends?period=30d
```

#### Get Incident Report
```http
GET /api/analytics/report?period=30d&facilityId=FAC-001
```

#### Get Patient Risk Score
```http
GET /api/analytics/risk-score/:patientId?lookbackDays=90
```

#### Get Compliance Metrics
```http
GET /api/analytics/compliance?facilityId=FAC-001&startDate=2026-01-01&endDate=2026-06-01
```

## Data Models

### Incident Types
- `fall` - Patient/resident falls
- `medication_error` - Medication administration errors
- `safeguarding` - Safeguarding-related incidents
- `elopement` - Patient leaving facility unsafely
- `aggression` - Physical or verbal aggression
- `wound` - Wound or skin integrity issues
- `equipment` - Equipment-related incidents
- `other` - Other incidents

### Severity Levels
- `minor` - Minimal impact, no injury
- `moderate` - Moderate impact, minor injury
- `major` - Significant impact, serious injury
- `critical` - Life-threatening or death

### Status Flow
```
reported -> investigating -> resolved -> closed
     \          |
      \         v
       -> escalated -> investigating -> resolved -> closed
```

### Safeguarding Concern Types
- `physical_abuse` - Physical harm
- `emotional_abuse` - Psychological harm
- `sexual_abuse` - Sexual harm or exploitation
- `neglect` - Failure to provide care
- `financial_abuse` - Financial exploitation
- `self_neglect` - Self-harm through neglect
- `exploitation` - General exploitation
- `radicalisation` - Radicalisation concerns
- `missing_person` - Missing vulnerable person
- `other` - Other safeguarding concerns

### Risk Levels
- `low` - Minimal immediate risk
- `medium` - Moderate risk, monitoring required
- `high` - Significant risk, action needed
- `immediate` - Immediate danger, emergency response

## Health Checks

```bash
# Basic health check
curl http://localhost:4602/health

# Readiness check (includes DB status)
curl http://localhost:4602/health/ready
```

## Monitoring

The service includes comprehensive logging:

- **HTTP Request Logs** - All API requests with timing
- **Audit Logs** - Compliance-relevant actions
- **Security Logs** - Authentication failures, rate limits
- **Performance Logs** - Slow operation detection

Log files are stored at `/var/log/incident-service/` (production) or console (development).

## Security Features

- Helmet.js security headers
- Rate limiting (100 requests/15min general, 10/min for incidents)
- CORS with configurable origins
- Input validation with Zod
- SQL injection prevention (MongoDB parameterized queries)
- XSS prevention through input sanitization
- Audit trail for compliance

## Error Handling

All errors return a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    { "field": "fieldName", "message": "Specific error" }
  ]
}
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## License

MIT License - HOJAI AI / RTNM Group

---

Built with care for healthcare compliance and patient safety.
