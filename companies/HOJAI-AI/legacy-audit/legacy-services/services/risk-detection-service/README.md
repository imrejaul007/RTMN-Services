# HOJAI Risk Detection Service

**Port: 4604** | **Part of HOJAI AI Infrastructure**

A comprehensive healthcare risk detection service that identifies and monitors:

- **Fall Risk** - Assessing patient fall probability and recommending interventions
- **Wound Deterioration** - Monitoring wound healing and detecting deterioration
- **Safeguarding Concerns** - Identifying vulnerable patients and potential abuse
- **Clinical Deterioration** - Early warning system using NEWS (National Early Warning Score)

---

## Features

### Fall Risk Assessment
- Comprehensive fall risk scoring based on vision, balance, strength, medications, history, and environment
- Risk stratification: Low, Moderate, High, Very High
- Personalized intervention recommendations
- Fall incident tracking and correlation
- Trend analysis over time

### Wound Risk Assessment
- Wound staging (Stage 1-4, Unstageable, Deep Tissue Injury)
- Braden Scale for pressure ulcer risk assessment
- Infection risk calculation
- Deterioration detection with comparison to previous assessments
- Tissue viability monitoring
- Customized wound care recommendations

### Clinical Deterioration Monitoring
- NEWS (National Early Warning Score) calculation
- Real-time vital signs monitoring
- Deterioration type classification (Respiratory, Cardiovascular, Neurological, Metabolic, Sepsis)
- Escalation protocols
- Response tracking

### Safeguarding Risk Assessment
- Multi-category concern identification (Physical, Emotional, Sexual Abuse, Neglect, Financial Abuse, etc.)
- Vulnerability assessment
- Risk indicator analysis
- Protective factor identification
- Referral pathway coordination
- Multi-agency information sharing support

### Alert System
- Priority-based alerts (Low, Medium, High, Urgent, Critical)
- Multi-channel notifications (Slack, PagerDuty, Email, SMS)
- Alert escalation
- Care team coordination
- Care plan generation

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

```bash
# Navigate to service directory
cd /Users/rejaulkarim/Documents/ReZ\ Full\ App/hojai-ai/services/risk-detection-service

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Build TypeScript
npm run build

# Start service
npm start
```

### Development Mode

```bash
npm run dev
```

---

## Configuration

### Environment Variables

```env
# Server
PORT=4604
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/risk-detection

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty Integration
PAGERDUTY_API_KEY=your-pagerduty-api-key

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_USER=user@example.com
SMTP_PASS=password

# SMS Gateway
SMS_GATEWAY_URL=https://sms-gateway.example.com/api/send
```

---

## API Reference

### Fall Risk

#### Assess Fall Risk
```http
POST /api/risk/fall/assess/:patientId
Content-Type: application/json

{
  "factors": {
    "vision": { "impaired": true, "severity": "moderate" },
    "balance": { "impaired": true, "gait": "unsteady" },
    "strength": { "lowerExtremity": "moderate_weakness", "fatigueLevel": "mild" },
    "medications": {
      "highRiskMedications": ["sedatives", "antihypertensives"],
      "totalMedications": 5,
      "sedatives": true,
      "antihypertensives": true,
      "analgesics": false
    },
    "history": {
      "previousFalls": 2,
      "recentFallWithin30Days": true,
      "fearOfFalling": true,
      "hipFracture": false
    },
    "environment": {
      "homeHazards": ["loose rugs"],
      "poorLighting": true,
      "stairs": true,
      "bathroomsafety": false,
      "rugsCarpet": true
    }
  },
  "mobility": {
    "ambulationStatus": "limited",
    "distance": 10,
    "assistanceRequired": true
  },
  "medications": {
    "anticoagulants": false,
    "psychotropics": true,
    "polypharmacy": true
  },
  "history": {
    "fallsInPastYear": 2,
    "injuriousFalls": 1,
    "lastFallDate": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Fall Risk
```http
GET /api/risk/fall/:patientId
```

#### Get Fall Risk History
```http
GET /api/risk/fall/:patientId/history?limit=10
```

### Wound Risk

#### Assess Wound Risk
```http
POST /api/risk/wound/assess/:patientId
Content-Type: application/json

{
  "woundId": "wound-001",
  "location": "Sacrum",
  "stage": "stage_3",
  "size": {
    "length": 3.5,
    "width": 2.0,
    "depth": 1.5
  },
  "riskFactors": {
    "nutrition": {
      "status": "poor",
      "bmi": 18.5,
      "hydrationStatus": "mildly_dehydrated"
    },
    "mobility": {
      "level": "immobile",
      "repositioningFrequency": 4,
      "abilityToShift": false
    },
    "continence": {
      "urinary": "incontinent",
      "fecal": "occasionally_incontinent",
      "combined": "moist_constantly"
    },
    "age": 78,
    "comorbidities": {
      "diabetes": true,
      "vascularDisease": true,
      "anemia": false,
      "neuropathy": true,
      "respiratoryDisease": false,
      "renalDisease": false,
      "cancer": false
    },
    "sensory": {
      "sensoryLoss": true,
      "painLevel": 4,
      "numbness": true
    }
  }
}
```

#### Detect Wound Deterioration
```http
GET /api/risk/wound/deterioration/:woundId
```

### Pressure Ulcer Risk

#### Assess Pressure Ulcer Risk (Braden Scale)
```http
POST /api/risk/pressure/assess/:patientId
Content-Type: application/json

{
  "factors": {
    "sensoryPerception": 2,
    "moisture": 2,
    "activity": 1,
    "mobility": 1,
    "nutrition": 2,
    "frictionShear": 2
  }
}
```

### Clinical Deterioration

#### Monitor Vitals
```http
POST /api/risk/deterioration/monitor/:patientId
Content-Type: application/json

{
  "vitals": {
    "heartRate": 105,
    "systolicBP": 88,
    "diastolicBP": 55,
    "respiratoryRate": 26,
    "temperature": 38.5,
    "oxygenSaturation": 91,
    "consciousness": "alert"
  }
}
```

#### Calculate NEWS Score
```http
POST /api/risk/calculate/news
Content-Type: application/json

{
  "vitals": {
    "heartRate": 95,
    "respiratoryRate": 22,
    "systolicBP": 100,
    "temperature": 37.8,
    "oxygenSaturation": 94,
    "consciousness": "alert"
  }
}
```

### Safeguarding

#### Assess Safeguarding Risk
```http
POST /api/risk/safeguarding/assess/:patientId
Content-Type: application/json

{
  "concernType": "neglect",
  "vulnerabilities": [
    { "category": "physical_abuse", "present": false, "severity": "low" },
    { "category": "neglect", "present": true, "severity": "high", "evidence": ["poor hygiene", "weight loss"] },
    { "category": "self_neglect", "present": true, "severity": "medium" }
  ],
  "riskIndicators": {
    "isolation": false,
    "financialExploitation": false,
    "unexplainedInjuries": false,
    "caregiverStress": true,
    "missedAppointments": true,
    "medicationNonCompliance": true,
    "changesInBehavior": true,
    "poorHygiene": true,
    "inadequateNutrition": true,
    "housingConcerns": false
  }
}
```

### Alerts

#### Get Patient Alerts
```http
GET /api/risk/alerts/:patientId?type=deterioration&status=sent&limit=20
```

#### Acknowledge Alert
```http
POST /api/risk/alerts/:alertId/acknowledge
Content-Type: application/json

{
  "acknowledgedBy": "nurse.jane@hospital.com"
}
```

### Care Plans

#### Create Care Plan
```http
POST /api/risk/careplan/:patientId
Content-Type: application/json

{
  "riskType": "fall",
  "riskLevel": "high",
  "goals": {
    "shortTerm": ["Prevent falls for 7 days"],
    "longTerm": ["Reduce fall risk to low"]
  }
}
```

---

## Risk Levels

| Level | Score Range | Response Time | Actions |
|-------|-------------|--------------|---------|
| **Low** | 0-19 | Routine | Standard precautions |
| **Moderate** | 20-39 | Within 24h | Enhanced monitoring |
| **High** | 40-59 | Within 1h | Urgent review, interventions |
| **Very High** | 60-100 | Immediate | Emergency response |

---

## Deterioration Classification

The NEWS-based classification identifies:

- **Respiratory** - RR, SpO2 abnormalities
- **Cardiovascular** - HR, BP abnormalities
- **Neurological** - Consciousness changes
- **Metabolic** - Blood glucose disturbances
- **Sepsis** - Combined physiological disturbance

---

## Response Codes

All responses follow this format:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "details": [ ... ]
}
```

---

## Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Overdue Assessment Check | Every hour | Alerts for overdue assessments |
| Alert Escalation | Every 15 min | Escalates unacknowledged alerts |
| Daily Statistics | Daily at midnight | Logs alert statistics |

---

## Health Checks

```http
GET /health    # Basic health check
GET /ready     # Readiness check (includes DB)
```

---

## Models

### Database Collections

- `fall_risk_assessments` - Fall risk assessment records
- `wound_assessments` - Wound assessment records
- `pressure_ulcer_risks` - Braden scale assessments
- `deterioration_signals` - Clinical deterioration alerts
- `safeguarding_risks` - Safeguarding concern records
- `risk_alerts` - Alert records
- `risk_care_plans` - Care plan records

---

## Integration

### Slack Integration
Configure `SLACK_WEBHOOK_URL` to receive alerts in Slack channels.

### PagerDuty Integration
Configure `PAGERDUTY_API_KEY` for on-call escalation.

### Custom Notifications
Extend `AlertService` in `src/services/alertService.ts` for additional channels.

---

## License

Proprietary - RTNM Group / HOJAI AI

---

## Support

For issues or feature requests, contact the HOJAI AI team.
