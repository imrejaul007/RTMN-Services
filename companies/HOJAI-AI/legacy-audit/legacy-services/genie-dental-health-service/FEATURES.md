# Genie Dental Health Service - Features

**Version:** 1.0.0
**Date:** June 14, 2026
**Status:** 🆕 NEW - Built for SmileCraft Dental Clinic

---

## Overview

Dental health context for Genie AI - enables personalized dental reminders and health tracking.

**Port:** 4708

---

## Features

### 1. Dental Memory Storage

| Feature | Description | Status |
|---------|-------------|--------|
| Visit memory | Track dental visits | ✅ |
| Treatment memory | Store treatment history | ✅ |
| Condition memory | Track dental conditions | ✅ |
| Entity linking | Link dentists, clinics | ✅ |
| Time-based | Track timing of events | ✅ |
| Category tags | Dental-specific categorization | ✅ |

### 2. Risk Assessment

| Feature | Description | Status |
|---------|-------------|--------|
| Visit frequency | Months since last visit | ✅ |
| Overdue detection | >12 months = overdue | ✅ |
| Sensitivity history | Track sensitivity issues | ✅ |
| Gum issue tracking | Track gum problems | ✅ |
| Cavity history | Track cavity occurrences | ✅ |
| Risk levels | Low, medium, high | ✅ |

### 3. Dental Reminders

| Feature | Description | Status |
|---------|-------------|--------|
| Checkup reminders | Based on last visit | ✅ |
| Risk-based priority | Urgent for high risk | ✅ |
| Personalized messages | Based on patient history | ✅ |
| Actionable | Book appointment action | ✅ |
| Clinic suggestion | Suggest nearby clinic | ✅ |
| Appointment slots | Include available times | ✅ |

### 4. Gum Inflammation Risk

| Feature | Description | Status |
|---------|-------------|--------|
| Time-based risk | Risk increases with time | ✅ |
| History-based | Based on past issues | ✅ |
| Messaging | "Gum inflammation risk increasing" | ✅ |
| Recommendations | Preventive care tips | ✅ |

### 5. Context for Consultation

| Feature | Description | Status |
|---------|-------------|--------|
| Last visit info | Date and description | ✅ |
| Treatment history | Past treatments | ✅ |
| Active conditions | Current issues | ✅ |
| Visit count | Lifetime visits | ✅ |
| Risk summary | Overall risk level | ✅ |

---

## API Endpoints

### Memory

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/memory` | POST | Store dental memory |
| `/api/memory/:corpId` | GET | Get memories |
| `/api/memory/:corpId/last-visit` | GET | Get last visit |

### Risk

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/risk/:corpId` | GET | Calculate risk |

### Reminders

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reminder` | POST | Create reminder |
| `/api/reminder/:corpId` | GET | Get reminders |
| `/api/reminder/:id/actioned` | PUT | Mark actioned |

### Context

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/context/:corpId` | GET | Get consultation context |

---

## Story Flow

### 7:00 AM - Karim Gets Reminder

```
Genie notices:
  Last dental visit: 14 months ago

Genie says:
  "Karim, you skipped your last dental checkup."

  "Based on your history, gum inflammation risk is increasing."

  "Recommended clinic: SmileCraft Dental"

  "Appointment available: 11:30 AM"

Karim books in one tap
```

---

## Quick Start

```bash
cd companies/hojai-ai/genie-dental-health-service
npm install
npm start

# Store dental memory
curl -X POST http://localhost:4708/api/memory \
  -d '{"corpId": "xxx", "content": "Dental cleaning visit"}'

# Calculate risk
curl http://localhost:4708/api/risk/xxx

# Send reminder
curl -X POST http://localhost:4708/api/reminder \
  -d '{"corpId": "xxx", "patientName": "Karim", "lastVisitMonths": 14}'
```

---

## Story Verification

| Story Component | Status |
|----------------|--------|
| 7:00 AM - Genie notices last visit | ✅ Built |
| 7:00 AM - "You skipped checkup" message | ✅ Built |
| 7:00 AM - "Gum inflammation risk" | ✅ Built |
| 7:00 AM - Clinic recommendation | ✅ Built |
| 7:00 AM - Appointment available | ✅ Built |
| 7:00 AM - One tap booking | ✅ Built |

---

## Integration Points

| Service | Purpose | Status |
|---------|---------|--------|
| RisaCare (4700) | Patient data | ✅ |
| Dental Twin (4751) | Dental records | ✅ |
| Genie Briefing (4706) | Send reminders | ✅ |

---

**Built for:** SmileCraft Dental Clinic Story
**Purpose:** Dental health reminders and context for Genie AI
