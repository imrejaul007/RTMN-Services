# Care Plan Service

**hojai-care-plan-service** - AI-powered care planning and goal tracking for RisaCare (RisaCare Healthcare Ecosystem)

Part of the RTNM Group / HOJAI AI ecosystem.

---

## Overview

The Care Plan Service is a comprehensive healthcare solution for creating, managing, and tracking patient care plans. It provides:

- **Care Plan Management** - Create and manage patient care plans with goals, interventions, reviews, and notes
- **Goal Tracking** - Track progress with detailed metrics, timelines, and completion predictions
- **AI Insights** - Generate actionable insights, predict outcomes, and detect goal drift
- **Automated Notifications** - Send alerts for reviews, milestones, and goal updates
- **Healthcare Compliance** - Built with healthcare best practices

---

## Features

### Care Plan Management
- Create care plans with patient information, dates, and categories
- Manage plan status (draft, active, on_hold, completed, archived)
- Add goals with SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)
- Track interventions with assignments and resources
- Add clinical notes and reviews
- Patient consent tracking

### Goal Tracking
- Track progress with history and milestones
- Calculate completion metrics and projections
- Identify overdue goals
- Auto-adjust goals based on patterns
- Generate AI-powered suggestions

### AI Insights
- Comprehensive plan health scoring
- Risk detection and warnings
- Outcome predictions
- Goal drift detection
- Actionable recommendations

### Notifications
- Review due reminders
- Goal completion alerts
- Progress updates
- Milestone achievements
- Multi-channel delivery (in-app, email, SMS)

---

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis (optional, for caching)

### Installation

```bash
# Navigate to service directory
cd hojai-ai/services/care-plan-service

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start service
npm start
```

### Development Mode

```bash
npm run dev
```

### Environment Variables

Create a `.env` file:

```env
# Server
PORT=4601
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/careplan

# Redis (optional)
REDIS_URL=redis://localhost:6379

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Notification Service
NOTIFICATION_SERVICE_URL=http://localhost:4011
EMAIL_SERVICE_URL=http://localhost:4011/email
SMS_SERVICE_URL=http://localhost:4011/sms

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
LOG_TO_FILE=false
```

---

## API Reference

### Care Plans

#### Create Care Plan
```http
POST /api/plans
Content-Type: application/json

{
  "patientId": "P12345",
  "patientName": "John Doe",
  "title": "Diabetes Management Plan",
  "description": "Comprehensive diabetes care plan",
  "category": "chronic_disease",
  "priority": "high",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-09-01T00:00:00Z",
  "createdBy": "DR001",
  "riskFactors": ["obesity", "sedentary_lifestyle"],
  "allergies": ["penicillin"],
  "tags": ["diabetes", "chronic"]
}
```

#### Get Care Plan
```http
GET /api/plans/:planId
```

#### Get Patient Plans
```http
GET /api/plans/patient/:patientId
GET /api/plans/patient/:patientId?active=true
```

#### Update Care Plan
```http
PUT /api/plans/:planId
Content-Type: application/json

{
  "status": "active",
  "nextReviewDate": "2026-07-01T00:00:00Z"
}
```

#### Archive Care Plan
```http
PUT /api/plans/:planId/archive
```

### Goals

#### Add Goal
```http
POST /api/plans/:planId/goals
Content-Type: application/json

{
  "type": "short_term",
  "description": "Lower HbA1c to below 7%",
  "priority": "high",
  "targetDate": "2026-08-01T00:00:00Z",
  "startDate": "2026-06-01T00:00:00Z",
  "milestones": [
    {
      "title": "Diet plan created",
      "targetDate": "2026-06-15T00:00:00Z"
    },
    {
      "title": "Exercise routine established",
      "targetDate": "2026-07-01T00:00:00Z"
    }
  ],
  "measurements": [
    {
      "metric": "HbA1c",
      "currentValue": 8.5,
      "targetValue": 7.0,
      "unit": "%"
    }
  ],
  "barriers": ["dietary_non_compliance"],
  "facilitators": ["family_support"]
}
```

#### Track Progress
```http
POST /api/plans/:planId/goals/:goalId/progress
Content-Type: application/json

{
  "value": 45,
  "note": "Significant improvement in diet adherence",
  "updatedBy": "DR001"
}
```

#### Get Goal Timeline
```http
GET /api/plans/:planId/goals/:goalId/timeline
```

#### Get Goal Completion Metrics
```http
GET /api/plans/:planId/goals/:goalId/completion
```

### Interventions

#### Add Intervention
```http
POST /api/plans/:planId/interventions
Content-Type: application/json

{
  "type": "therapy",
  "description": "Weekly nutrition counseling sessions",
  "frequency": "weekly",
  "duration": "3 months",
  "assignedTo": "NUT001",
  "assignedToRole": "Nutritionist",
  "startDate": "2026-06-01T00:00:00Z",
  "expectedOutcome": "Improved dietary habits and HbA1c reduction",
  "reminders": {
    "enabled": true,
    "frequency": "weekly",
    "times": ["09:00"]
  }
}
```

### Notes

#### Add Note
```http
POST /api/plans/:planId/notes
Content-Type: application/json

{
  "authorId": "DR001",
  "authorName": "Dr. Sarah Smith",
  "authorRole": "Primary Care Physician",
  "content": "Patient shows excellent progress. Blood sugar levels have stabilized.",
  "type": "progress",
  "relatedGoalIds": ["G-ABC12345"],
  "tags": ["diabetes", "progress", "positive"]
}
```

### Reviews

#### Add Review
```http
POST /api/plans/:planId/reviews
Content-Type: application/json

{
  "reviewerId": "DR001",
  "reviewerName": "Dr. Sarah Smith",
  "reviewerRole": "Primary Care Physician",
  "date": "2026-06-15T00:00:00Z",
  "type": "scheduled",
  "notes": "Mid-plan review. Overall progress is satisfactory.",
  "outcome": "improving",
  "goalStatuses": [
    {
      "goalId": "G-ABC12345",
      "previousStatus": "in_progress",
      "currentStatus": "on_track",
      "changeNote": "Improved adherence to medication"
    }
  ],
  "recommendations": [
    "Continue current medication regimen",
    "Increase exercise frequency"
  ],
  "nextReviewDate": "2026-07-15T00:00:00Z"
}
```

### AI Insights

#### Get Plan Insights
```http
GET /api/plans/:planId/insights
```

#### Get AI Adjustments
```http
POST /api/plans/:planId/insights/adjustments
```

#### Predict Goal Outcome
```http
GET /api/plans/:planId/insights/predictions/:goalId
```

#### Detect Goal Drift
```http
GET /api/plans/:planId/insights/drift/:goalId
```

#### Suggest Goals
```http
POST /api/suggest-goals
Content-Type: application/json

{
  "patientId": "P12345",
  "conditions": ["Type 2 Diabetes", "Hypertension"],
  "category": "chronic_disease"
}
```

### Statistics

#### Get Patient Statistics
```http
GET /api/patient/:patientId/statistics
```

#### Get Overdue Goals
```http
GET /api/patient/:patientId/overdue
```

#### Get Plans Due for Review
```http
GET /api/reviews/due
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "patientId",
      "message": "Patient ID is required"
    }
  ]
}
```

---

## Data Models

### CarePlan Status
- `draft` - Initial creation, not yet active
- `active` - Currently being implemented
- `on_hold` - Temporarily paused
- `completed` - Successfully completed
- `archived` - Archived for historical reference

### Goal Types
- `short_term` - Goals to be achieved within weeks
- `long_term` - Goals spanning months or years
- `maintenance` - Ongoing maintenance goals
- `preventive` - Prevention-focused goals
- `rehabilitation` - Recovery/rehab goals

### Goal Status
- `not_started` - Not yet started
- `in_progress` - Work has begun
- `on_track` - Meeting expected progress
- `at_risk` - Behind schedule, may not be achieved
- `achieved` - Successfully completed
- `partially_achieved` - Partially completed
- `not_achieved` - Not achieved

### Intervention Types
- `medication` - Medication-related interventions
- `therapy` - Therapeutic interventions
- `lifestyle` - Lifestyle modifications
- `education` - Patient education
- `monitoring` - Regular monitoring
- `referral` - Specialist referrals
- `procedure` - Medical procedures
- `support` - Support services

### Note Types
- `general` - General notes
- `clinical` - Clinical observations
- `progress` - Progress notes
- `concern` - Concerns or issues
- `communication` - Communication logs
- `assessment` - Assessment notes

---

## Cron Jobs

The service runs automated tasks:

| Schedule | Job | Description |
|----------|-----|-------------|
| Hourly | Review Reminders | Send notifications for upcoming reviews |
| Every 6 hours | Overdue Status Update | Mark goals as at_risk if past target |
| Daily (midnight) | Bulk Status Check | Daily overdue goal check |

---

## Health Checks

```http
GET /health     # Basic health check
GET /ready      # Readiness check (includes DB status)
```

---

## Security

- Helmet.js for HTTP headers
- Rate limiting on all endpoints
- Input validation with Zod
- Parameterized MongoDB queries
- CORS configuration
- Request logging

---

## Port Configuration

| Service | Port | Environment Variable |
|---------|------|---------------------|
| Care Plan Service | 4601 | `PORT` |

---

## Related Services

- **RisaCare Main Service** (4700-4710) - Primary healthcare services
- **Notifications Service** (4011) - Notification delivery
- **Auth Service** (4002) - Authentication

---

## License

MIT - RTNM Group / HOJAI AI

---

## Version

1.0.0 - Initial Release (June 2026)
