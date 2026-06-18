# Customer Success OS v1.0.0

> **Port:** 4050  
> **Status:** ✅ **OPERATIONAL** - Onboarding, NPS, Health Scores, Churn Prevention

---

## Overview

Customer Success OS manages customer lifecycle, onboarding journeys, NPS surveys, health scores, and churn prediction.

## Features

| Feature | Description |
|---------|-------------|
| **Customer Profiles** | Lifecycle tracking, CS ownership |
| **Onboarding Journeys** | Tasks, milestones, progress |
| **NPS Surveys** | Send, track, analyze |
| **Health Scores** | Engagement, adoption, satisfaction |
| **Churn Prediction** | AI risk scoring |
| **Check-ins** | Scheduled touchpoints |
| **CS Campaigns** | Re-engagement flows |

## API Endpoints

### Customer Management
```
GET  /api/customers            # List all
POST /api/customers           # Create
GET  /api/customers/:id        # Get with health
PATCH /api/customers/:id/lifecycle  # Update stage
```

### Onboarding Journeys
```
POST /api/journeys            # Create journey
POST /api/journeys/:id/tasks  # Add task
POST /api/journeys/:id/complete-task/:taskId  # Complete
```

### NPS Surveys
```
POST /api/nps/send           # Send survey
POST /api/nps/:id/respond   # Submit response
GET  /api/nps/:customerId/trends  # NPS trends
```

### Health Scores
```
GET  /api/health/:customerId  # Calculate score
```

### Churn Prediction
```
GET  /api/churn/predictions   # All risks
POST /api/churn/:customerId/predict  # Single prediction
```

### Check-ins
```
POST /api/checkins          # Schedule
GET  /api/checkins/upcoming # Upcoming
```

## Quick Start

```bash
cd services/customer-success-os
npm install
npm start  # Port 4050

curl http://localhost:4050/health
curl http://localhost:4050/api/customers
```

---

*Built for RTMN Ecosystem*
