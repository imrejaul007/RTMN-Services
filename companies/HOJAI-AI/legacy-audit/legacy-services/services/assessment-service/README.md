# HOJAI Assessment Service

Formal Health Assessment Service for standardized clinical assessments, part of the HOJAI AI ecosystem (RisaCare Division).

**Port:** 4605  
**Parent Company:** RTNM Group - HOJAI AI

## Assessment Types Supported

| Type | Name | Category | Purpose |
|------|------|----------|---------|
| `MUST` | Malnutrition Universal Screening Tool | Nutrition | Identifies malnutrition risk |
| `Braden` | Braden Scale | Skin Integrity | Pressure ulcer risk assessment |
| `WATERLOW` | Waterlow Score | Skin Integrity | Pressure sore risk calculator |
| `Morse_Fall` | Morse Fall Scale | Fall Risk | Fall risk assessment |
| `Barthel_Index` | Barthel Index | Functional Status | Activities of daily living |
| `MMSE` | Mini-Mental State Examination | Cognitive | Cognitive function screening |
| `PHQ9` | Patient Health Questionnaire-9 | Mental Health | Depression screening |
| `GAD7` | Generalized Anxiety Disorder-7 | Mental Health | Anxiety screening |
| `General` | General Assessment | General | Custom/unspecified assessments |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- Redis (optional, for caching)

### Installation

```bash
cd /Users/rejaulkarim/Documents/ReZ\ Full\ App/hojai-ai/services/assessment-service
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4605 | Service port |
| `NODE_ENV` | development | Environment mode |
| `MONGODB_URI` | mongodb://localhost:27017/hojai-assessment | MongoDB connection string |
| `REDIS_HOST` | localhost | Redis host |
| `LOG_LEVEL` | info | Logging level |

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Assessments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/assessments` | Create new assessment |
| GET | `/assessments/:assessmentId` | Get assessment by ID |
| GET | `/assessments/patient/:patientId` | Get patient assessments |
| GET | `/assessments/patient/:patientId/:type` | Get by type |
| GET | `/assessments/:assessmentId/trend` | Get score trend |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/assessments/templates` | Create template |
| GET | `/assessments/templates/:type` | Get template |
| GET | `/assessments/templates` | List templates |
| PUT | `/assessments/templates/:templateId` | Update template |

### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/assessments/analysis/trends/:patientId/:type` | Trend analysis |
| GET | `/assessments/analysis/predict/:patientId/:type` | Decline prediction |
| GET | `/assessments/analysis/reassess/:patientId/:type` | Reassessment recommendation |
| GET | `/assessments/analysis/overview/:patientId` | Patient overview |

## Usage Examples

### Create MUST Assessment

```bash
curl -X POST http://localhost:4605/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "P12345",
    "type": "MUST",
    "assessorId": "N123",
    "assessorName": "Jane Doe",
    "responses": [
      {"questionId": "MUST-001", "answer": 22},
      {"questionId": "MUST-002", "answer": 3},
      {"questionId": "MUST-003", "answer": "no"}
    ]
  }'
```

### Get Patient Trends

```bash
curl http://localhost:4605/assessments/analysis/trends/P12345/Braden?days=30
```

### Predict Decline

```bash
curl http://localhost:4605/assessments/analysis/predict/P12345/MUST
```

## Data Models

### Assessment

```typescript
{
  assessmentId: string;      // ASM-uuid
  patientId: string;
  type: AssessmentType;
  date: Date;
  assessorId: string;
  score: {
    score: number;
    maxScore: number;
    level: RiskLevel;
    interpretation: string;
  };
  responses: AssessmentResponse[];
  riskLevel: RiskLevel;
  recommendations: string[];
}
```

### Assessment Template

```typescript
{
  templateId: string;        // TMPL-uuid
  type: AssessmentType;
  name: string;
  questions: Question[];
  scoring: {
    method: 'sum' | 'weighted' | 'formula';
  };
  thresholds: {
    low: number;
    medium?: number;
    high?: number;
    veryHigh?: number;
  };
}
```

## Risk Levels

| Level | Color Code | Action |
|-------|------------|--------|
| No Risk | Green | Routine monitoring |
| Low | Yellow | Basic precautions |
| Medium | Orange | Enhanced monitoring |
| High | Red | Active intervention |
| Very High | Dark Red | Urgent intervention |

## Scoring Details

### MUST (0-6)

| Score | Risk Level | Action |
|-------|------------|--------|
| 0 | Low | Routine care |
| 1 | Medium | 3-day observation |
| 2+ | High | Dietitian referral |

### Braden Scale (6-23)

| Score | Risk Level |
|-------|------------|
| 19-23 | No Risk |
| 15-18 | Low Risk |
| 13-14 | Moderate Risk |
| 10-12 | High Risk |
| 6-9 | Very High Risk |

### PHQ-9 (0-27)

| Score | Severity |
|-------|----------|
| 0-4 | None/Minimal |
| 5-9 | Mild |
| 10-14 | Moderate |
| 15-19 | Moderately Severe |
| 20-27 | Severe |

### Morse Fall Scale (0-125)

| Score | Risk Level |
|-------|------------|
| 0-24 | No Risk |
| 25-50 | Low Risk |
| 51+ | High Risk |

## Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway (Port 4605)             │
├─────────────────────────────────────────────────────────┤
│  Routes Layer                                           │
│  ├── Assessment Routes                                  │
│  └── Template Routes                                    │
├─────────────────────────────────────────────────────────┤
│  Service Layer                                          │
│  ├── assessmentService      (CRUD, scoring)             │
│  ├── templateService       (template management)        │
│  ├── trendAnalysisService  (trends, predictions)        │
│  ├── mustService           (MUST scoring)              │
│  ├── bradenService         (Braden scale)              │
│  ├── fallRiskAssessment    (Morse scale)                │
│  └── mentalHealthAssessment (PHQ-9, GAD-7)              │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  ├── MongoDB (Assessments, Templates, History)          │
│  └── Redis (Caching)                                   │
└─────────────────────────────────────────────────────────┘
```

## Error Handling

All errors return JSON:

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    { "field": "fieldName", "message": "Validation error" }
  ]
}
```

## Rate Limiting

- Window: 15 minutes
- Max requests: 100 per window
- Returns 429 Too Many Requests when exceeded

## Health Checks

```bash
# Liveness
curl http://localhost:4605/health

# Readiness
curl http://localhost:4605/ready
```

## License

Proprietary - RTNM Group / HOJAI AI

## Related Services

- **RisaCare Main** (Port 4700-4799) - Healthcare platform
- **Auth Service** (Port 4002) - Authentication
- **Notification Service** (Port 4011) - Alerts and notifications
