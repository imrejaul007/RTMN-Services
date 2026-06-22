# FitnessAI - Features Documentation

**Version:** 1.0.0  
**Date:** June 15, 2026  
**Location:** `industry-ai/fitness-ai/`

---

## Overview

**FitnessAI** is an AI-powered gym & fitness management system with 4 microservices and 4 AI coaches.

---

## Microservices

### 1. Member Service (Port 4801)

**Location:** `services/member-service/`  
**Lines:** ~300

| Feature | Description |
|---------|-------------|
| Member Registration | Digital signup |
| Member Profile | Health goals, preferences |
| Check-in/out | Badge/QR tracking |
| Progress Tracking | Weight, measurements, goals |
| Plan Management | Membership tier tracking |

### 2. Class Scheduler (Port 4802)

**Location:** `services/class-scheduler/`  
**Lines:** ~300

| Feature | Description |
|---------|-------------|
| Class Management | Create, schedule classes |
| Trainer Assignment | Auto-assign trainers |
| Class Booking | Members can book |
| Capacity Management | Auto-manage limits |
| Waitlist | Handle full classes |

### 3. Attendance Service (Port 4803)

**Location:** `services/attendance-service/`  
**Lines:** ~200

| Feature | Description |
|---------|-------------|
| Check-in Tracking | Entry/exit times |
| Attendance Reports | Daily/weekly/monthly |
| Peak Hours | Usage analytics |
| Member Engagement | Visit frequency |

### 4. Membership Plan Service (Port 4804)

**Location:** `services/membership-plan-service/`  
**Lines:** ~250

| Feature | Description |
|---------|-------------|
| Plan Management | Create plans |
| Pricing | Flexible pricing |
| Auto-Renewal | Subscription management |
| Upgrade/Downgrade | Plan changes |
| Freeze/Pause | Temporary pause |

---

## API Endpoints

### Member Service (4801)

```
POST   /api/members                    - Register member
GET    /api/members                    - List members
GET    /api/members/:id                - Get member
PATCH  /api/members/:id               - Update member
GET    /api/members/:id/progress      - Progress history
POST   /api/members/:id/checkin      - Check-in
POST   /api/members/:id/checkout      - Check-out
```

### Class Scheduler (4802)

```
GET    /api/classes                    - List classes
POST   /api/classes                    - Create class
GET    /api/classes/:id               - Get class
GET    /api/classes/:id/schedule      - Class schedule
POST   /api/classes/:id/book          - Book class
DELETE /api/classes/:id/book/:memberId - Cancel booking
```

### Attendance Service (4803)

```
POST   /api/attendance/checkin         - Check-in
POST   /api/attendance/checkout        - Check-out
GET    /api/attendance/report          - Attendance report
GET    /api/attendance/stats           - Statistics
```

### Membership Plan (4804)

```
GET    /api/plans                     - List plans
POST   /api/plans                    - Create plan
GET    /api/plans/:id                - Get plan
POST   /api/memberships              - Subscribe
PATCH  /api/memberships/:id          - Update membership
POST   /api/memberships/:id/freeze   - Freeze membership
```

---

## AI Employees (4 Coaches)

### 1. Fitness Coach

```
Role: Workout planning
Skills:
  - Custom workout plans
  - Progressive overload
  - Exercise demonstrations
  - Form correction
Integration: Member profiles, Attendance
```

### 2. Membership Advisor

```
Role: Sales & retention
Skills:
  - Plan recommendations
  - Upgrade suggestions
  - Renewal reminders
  - Churn prevention
Channels: WhatsApp, App, In-person
```

### 3. Nutrition Advisor

```
Role: Diet planning
Skills:
  - Macros calculation
  - Meal suggestions
  - Calorie tracking
  - Restriction handling
Integration: Member profiles
```

### 4. Retention Manager

```
Role: Churn prevention
Skills:
  - Engagement tracking
  - Re-engagement campaigns
  - Win-back offers
  - Feedback collection
Channels: WhatsApp, SMS, Email
```

---

## Integration Hub

**Location:** `src/connectors/index.ts`

```typescript
import { fitnessHub } from './src/connectors';
await fitnessHub.healthCheck();
```

| Connector | Purpose | Status |
|-----------|---------|--------|
| Weather | Rain → Indoor classes | Built |
| Wealth | Membership profits | Built |
| Discovery | Gym search for Genie | Built |

---

## External Integrations

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | Member authentication |
| RABTUL Payment | 4001 | Payments |
| RABTUL Wallet | 4004 | Balance/checkout |
| RABTUL Notification | 4005 | Notifications |

---

## Comparison

| Feature | Generic Gym | FitnessAI |
|---------|-------------|-----------|
| Member Management | Manual | ✅ Digital |
| Class Booking | Phone | ✅ Auto |
| AI Coach | None | ✅ 4 coaches |
| Nutrition | None | ✅ Built-in |
| Retention | None | ✅ AI-powered |

---

**Last Updated:** June 15, 2026
