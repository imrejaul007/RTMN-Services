# HOJAI Pre-Visit Intelligence Service

**Port: 4600**

A comprehensive microservice that generates dynamic questions and preparation materials for doctor visits - the MeetKin prep feature for healthcare visits.

## Overview

The Pre-Visit Intelligence Service helps patients prepare for their medical appointments by:

- Generating personalized questions to ask their doctor
- Creating comprehensive pre-visit checklists
- Tracking and analyzing symptoms over time
- Managing medical history for doctor visits
- Recording and monitoring vital signs
- Generating post-visit summaries

## Features

### 1. Dynamic Question Generation

The service generates relevant questions based on:
- Visit type (checkup, follow-up, specialist, etc.)
- Patient symptoms
- Medical history
- Previous visit notes
- AI-powered question enhancement (optional)

### 2. Pre-Visit Preparation

Comprehensive preparation including:
- Personalized checklists by visit type
- Task tracking with reminders
- Document preparation guidance
- Medication review checklists
- Progress tracking

### 3. Symptom Tracking

- Log symptoms with severity and duration
- Pattern analysis over time
- Worsening symptom detection
- Severity scoring
- Trend visualization

### 4. Medical History Management

- Conditions tracking
- Surgery history
- Allergy management
- Family history
- Immunization records
- Screening history

### 5. Vitals Monitoring

- Blood pressure, heart rate, temperature, etc.
- Baseline comparison
- Concern detection
- Trend analysis over 90 days

### 6. Visit Summaries

- AI-powered summary generation
- Key points extraction
- Action items tracking
- Care circle sharing

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 5+
- Redis 6+ (optional but recommended)
- TypeScript 5+

### Installation

```bash
cd hojai-ai/services/pre-visit-intelligence-service
npm install
```

### Configuration

Create a `.env` file:

```env
PORT=4600
MONGODB_URI=mongodb://localhost:27017/pre-visit-service
REDIS_URL=redis://localhost:6379
NODE_ENV=development
OPENAI_API_KEY=your-openai-api-key  # Optional, for AI features
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Preparation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/previsit/preparation` | Create visit preparation |
| GET | `/api/previsit/preparation/:visitId` | Get preparation |

### Questions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/previsit/questions/:visitId` | Generate questions |
| GET | `/api/previsit/questions/:visitId` | Get questions |
| POST | `/api/previsit/questions/:visitId/personalize` | Personalize questions |
| POST | `/api/previsit/questions/:visitId/followup` | Get follow-up questions |

### Symptoms

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/previsit/symptoms/:patientId` | Log symptoms |
| GET | `/api/previsit/symptoms/:patientId` | Get symptom history |
| GET | `/api/previsit/symptoms/:patientId/patterns` | Analyze patterns |
| GET | `/api/previsit/symptoms/:patientId/severity` | Calculate severity |
| GET | `/api/previsit/symptoms/:patientId/summary` | Get summary |
| GET | `/api/previsit/symptoms/:patientId/worsening` | Detect worsening |

### Vitals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/previsit/vitals/:patientId` | Log vitals |
| GET | `/api/previsit/vitals/:patientId` | Get recent vitals |
| GET | `/api/previsit/vitals/:patientId/compare` | Compare to baseline |
| GET | `/api/previsit/vitals/:patientId/summary` | Get vitals summary |
| GET | `/api/previsit/vitals/:patientId/concerns` | Detect concerns |
| GET | `/api/previsit/vitals/:patientId/trends/:type` | Get trends |

### History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/previsit/history/:patientId` | Get relevant history |
| GET | `/api/previsit/history/:patientId/full` | Get full history |
| GET | `/api/previsit/history/:patientId/medications` | Get medications |
| GET | `/api/previsit/history/:patientId/tests` | Get test results |
| GET | `/api/previsit/history/:patientId/past-visits` | Get past visits |

### Checklist

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/previsit/checklist/:visitId` | Generate checklist |
| GET | `/api/previsit/checklist/:prepId` | Get checklist |
| PUT | `/api/previsit/checklist/:taskId/complete` | Mark task complete |
| PUT | `/api/previsit/checklist/:taskId/status` | Update task status |
| GET | `/api/previsit/checklist/:prepId/progress` | Get progress |

### Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/previsit/summary/:visitId` | Generate summary |
| GET | `/api/previsit/summary/:visitId` | Get summary |
| GET | `/api/previsit/summary/:visitId/report` | Get formatted report |
| POST | `/api/previsit/summary/:visitId/action/:actionId/status` | Update action |
| GET | `/api/previsit/summary/patient/:patientId` | Get patient summaries |
| GET | `/api/previsit/summary/patient/:patientId/statistics` | Get statistics |

### Sharing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/previsit/share/:visitId/:circleId` | Share with care circle |

### Reminders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/previsit/reminders/:patientId` | Get reminders |
| GET | `/api/previsit/reminders/:patientId/unfinished` | Get unfinished tasks |

## Visit Types Supported

| Type | Description |
|------|-------------|
| `general_checkup` | Routine checkup |
| `follow_up` | Follow-up visit |
| `new_condition` | New health concern |
| `chronic_care` | Chronic condition management |
| `specialist_referral` | Specialist visit |
| `urgent_care` | Urgent care |
| `telemedicine` | Virtual visit |
| `annual_physical` | Annual physical |
| `wellness_visit` | Wellness check |
| `preoperative` | Pre-surgery |
| `postoperative` | Post-surgery |
| `pediatric` | Child visit |
| `mental_health` | Mental health visit |
| `dental` | Dental visit |
| `ophthalmology` | Eye specialist |
| `cardiology` | Heart specialist |
| `dermatology` | Skin specialist |
| `orthopedics` | Bone/joint specialist |
| `oncology` | Cancer care |

## Data Models

### VisitPreparation

Complete preparation package including:
- Questions for the doctor
- Checklist items
- Medications to review
- Relevant history
- Vitals summary
- Symptom summary
- Progress tracking

### Symptom

```typescript
{
  name: string;
  severity: 0-4;
  duration: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  durationValue: number;
  location?: string;
  triggers?: string[];
  frequency?: 'constant' | 'intermittent' | 'occasional';
  impactOnDailyLife?: 1-10;
}
```

### Vital Types

- Blood Pressure
- Heart Rate
- Temperature
- Respiratory Rate
- Oxygen Saturation
- Weight
- Height
- BMI
- Blood Glucose
- Cholesterol

## Architecture

```
pre-visit-intelligence-service/
├── src/
│   ├── models/
│   │   └── preVisit.ts          # Mongoose models
│   ├── services/
│   │   ├── questionGeneratorService.ts
│   │   ├── preparationService.ts
│   │   ├── symptomAnalyzerService.ts
│   │   ├── historyService.ts
│   │   ├── vitalsService.ts
│   │   └── visitSummaryService.ts
│   ├── routes/
│   │   └── preVisitRoutes.ts    # Express routes
│   ├── middleware/
│   │   └── validation.ts        # Zod validation
│   ├── utils/
│   │   └── logger.ts           # Winston logger
│   └── index.ts                # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Security

- Rate limiting (100 requests per 15 minutes)
- Helmet security headers
- CORS configuration
- Input validation with Zod
- Request ID tracking
- Audit logging

## Monitoring

- Health check: `GET /health`
- Readiness check: `GET /ready`
- Structured logging with Winston
- Performance metrics

## License

MIT - HOJAI AI
