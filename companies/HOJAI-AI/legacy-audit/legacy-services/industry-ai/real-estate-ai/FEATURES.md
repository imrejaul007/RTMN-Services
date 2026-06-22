# RealEstateAI - Features Documentation

**Version:** 1.0.0  
**Date:** June 15, 2026  
**Location:** `industry-ai/real-estate-ai/`

---

## Overview

**RealEstateAI** is an AI-powered real estate management system.

---

## Property Service (Port 4830)

**Location:** `services/property-service/`  
**Lines:** 222

| Module | Features |
|--------|---------|
| **Properties** | Listings, search, details |
| **Leads** | Capture, scoring, tracking |
| **Site Visits** | Scheduling, reminders |

---

## API Endpoints

### Properties

```
POST   /api/properties                - Create listing
GET    /api/properties                - Search listings
GET    /api/properties/:id           - Property details
PATCH  /api/properties/:id           - Update listing
```

### Leads

```
POST   /api/leads                    - Capture lead
GET    /api/leads                    - List leads
GET    /api/leads/:id               - Lead details
PATCH  /api/leads/:id/status        - Update status
```

### Site Visits

```
POST   /api/site-visits              - Schedule visit
GET    /api/site-visits              - List visits
```

---

## AI Employees (3 Agents)

### 1. Lead Qualifier Agent

```
Role: Scoring & qualifying
Skills:
  - Lead scoring (hot/warm/cold)
  - Budget qualification
  - Urgency detection
  - Source attribution
Integration: CRM, Pipeline
```

### 2. Property Advisor AI

```
Role: Recommendations
Skills:
  - Property matching
  - Preference learning
  - Market analysis
  - Price comparison
Integration: Listings, User profiles
```

### 3. Tour Coordinator

```
Role: Visit scheduling
Skills:
  - Calendar management
  - Reminder notifications
  - Route optimization
  - Follow-up automation
Integration: Properties, Leads
```

---

## Integration Hub

**Location:** `src/connectors/index.ts`

| Connector | Purpose | Status |
|-----------|---------|--------|
| Valuation | Property value estimation | Built |
| Leads | Lead scoring | Built |
| Tours | Schedule property tours | Built |
| Mortgage | EMI calculation | Built |

---

## Comparison

| Feature | Generic RE | RealEstateAI |
|---------|------------|--------------|
| Listings | Basic | ✅ AI-matched |
| Leads | Manual | ✅ Auto-scored |
| Visits | Phone | ✅ Auto-scheduled |
| Valuation | Estimate | ✅ AI-powered |

---

**Last Updated:** June 15, 2026
