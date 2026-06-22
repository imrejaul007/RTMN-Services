# CLAUDE.md - Genie Dental Health Service

## Overview

**Service:** Genie Dental Health Service  
**Port:** 4708  
**Purpose:** Dental health reminders and risk assessment for Genie AI  
**Story:** SmileCraft Dental Clinic - "It's been 14 months since your last visit"

## Quick Commands

```bash
# Install and start
cd companies/hojai-ai/genie-dental-health-service
npm install
npm start

# Health check
curl http://localhost:4708/health

# Calculate dental risk
curl http://localhost:4708/api/risk/xxx

# Send reminder
curl -X POST http://localhost:4708/api/reminder \
  -H "Content-Type: application/json" \
  -d '{"corpId": "xxx", "patientName": "Karim", "lastVisitMonths": 14}'
```

## Architecture

```
Genie Dental Health Service (4708)
├── Memory Storage
│   ├── Visit memory
│   ├── Treatment memory
│   └── Condition memory
├── Risk Assessment
│   ├── Visit frequency
│   ├── History factors
│   └── Risk levels
├── Reminder Generation
│   ├── Personalized messages
│   ├── Risk-based priority
│   └── Actionable suggestions
└── Context Service
    └── Consultation context
```

## Risk Calculation

| Factor | Weight | Trigger |
|--------|--------|---------|
| Months since visit | 40% | >12mo = +1 |
| Sensitivity history | 20% | If present = +1 |
| Gum issues history | 20% | If present = +1 |
| Cavity history | 15% | If present = +1 |
| Treatment count | 5% | >10 = +1 |

| Risk Level | Score | Action |
|------------|-------|--------|
| Low | 0-1 | Normal reminder |
| Medium | 2-3 | Priority reminder |
| High | 4-5 | Urgent reminder |

## Reminder Messages

| Risk | Message |
|------|---------|
| High (24+ mo) | "It's been {X} months since your last visit. Gum inflammation risk is increasing." |
| Medium (14 mo) | "You skipped your last dental checkup. It's been {X} months." |
| Low | "Your dental checkup is due. Book now for preventive care." |

## Integration Points

| Service | Port | Purpose |
|---------|------|---------|
| Genie Briefing | 4706 | Forward reminders |
| Dental Twin | 4751 | Patient data |
| RisaCare | 4700 | Patient context |

## Story Timeline

| Time | Event | Endpoint |
|------|-------|----------|
| 7:00 AM | Genie notices | `/api/risk/:corpId` |
| 7:00 AM | Reminder sent | `/api/reminder` |
| 7:00 AM | Appointment booked | Action endpoint |

## Testing

```bash
# Test health
curl http://localhost:4708/health

# Calculate risk
curl http://localhost:4708/api/risk/test123

# Store memory
curl -X POST http://localhost:4708/api/memory \
  -H "Content-Type: application/json" \
  -d '{"corpId": "test123", "content": "Dental cleaning visit"}'

# Get last visit
curl http://localhost:4708/api/memory/test123/last-visit

# Send reminder
curl -X POST http://localhost:4708/api/reminder \
  -H "Content-Type: application/json" \
  -d '{"corpId": "test123", "patientName": "Karim", "lastVisitMonths": 14}'

# Get context
curl http://localhost:4708/api/context/test123
```

## Notes

- In-memory storage (use Redis for production)
- Forwards to Genie Briefing for actual delivery
- Personalized messages based on risk level
- Actionable: book_appointment with clinic info
