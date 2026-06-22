# Fitness AI

**Location:** `industry-ai/fitness-ai/`  
**Company:** HOJAI AI  
**Category:** Fitness Industry  
**Type:** Industry AI Vertical  
**Status:** ✅ **TEMPLATE WITH TESTS** | **June 13, 2026**  
**Port:** 3000 (configurable)  
**Unit Tests:** 33 passing ✅

---

## Overview

This service provides AI-powered capabilities for the fitness industry. It is part of the HOJAI Industry AI ecosystem, which provides privacy-preserving industry-specific intelligence.

---

## Features

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Member Management** | Create, update, track gym members | ✅ Template |
| **Class Scheduling** | Schedule and manage fitness classes | ✅ Template |
| **Workout Plans** | Create personalized workout plans | ✅ Template |
| **Progress Tracking** | Track member progress over time | ✅ Template |

### Member Management Features

| Feature | Description |
|---------|-------------|
| Member Registration | Add new members with contact info |
| Membership Types | Basic, Premium, VIP tiers |
| Status Tracking | Active, Inactive, Suspended |
| Source Attribution | Website, Referral, Social, Event, Partner |
| Tags & Segmentation | Custom tags for targeted marketing |

### Class Scheduling Features

| Feature | Description |
|---------|-------------|
| Class Types | Yoga, HIIT, Cardio, Strength, Spinning, Pilates |
| Instructor Assignment | Assign instructors to classes |
| Capacity Management | Track enrollment vs capacity |
| Schedule Management | Day of week, start/end times |
| Availability Check | Real-time availability status |

### Workout Plans Features

| Feature | Description |
|---------|-------------|
| Difficulty Levels | Beginner, Intermediate, Advanced |
| Exercise Library | Sets, reps, rest times |
| Muscle Group Targeting | Legs, Chest, Back, Arms, Core |
| Duration Planning | Weekly sessions, total weeks |
| Workout Time Calculator | Estimate total workout duration |

### Progress Tracking Features

| Feature | Description |
|---------|-------------|
| Weight Tracking | Log and track weight changes |
| Body Composition | Body fat, muscle mass tracking |
| Measurements | Custom measurements (chest, waist, etc.) |
| BMI Calculation | Automatic BMI calculation |
| Progress Reports | Weekly/monthly progress summaries |

---

## Membership Plans

| Plan | Monthly Price | Features |
|------|-------------|----------|
| **Basic** | ₹999 | Gym access, Locker |
| **Premium** | ₹2,499 | Gym access, Locker, Group classes, Sauna |
| **VIP** | ₹4,999 | Gym access, Locker, Group classes, Sauna, Personal training, Nutrition plan |

---

## API Endpoints

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/health/live` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |

### Info Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/info` | Service information |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Service port |
| `NODE_ENV` | No | development | Environment |
| `MONGODB_URI` | Yes | - | MongoDB connection |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `REDIS_URL` | No | localhost:6379 | Redis connection |
| `CORS_ORIGIN` | No | localhost:3000 | CORS origin |

---

## Integration Points

### RABTUL Services (Core)

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | Authentication |
| RABTUL Payment | 4001 | Payments |
| RABTUL Wallet | 4004 | Balance |
| RABTUL Notification | 4005 | Notifications |

### HOJAI AI Services

| Service | Port | Purpose |
|---------|------|---------|
| HOJAI Industry | 4700 | Industry intelligence |
| HOJAI Memory | 4520 | Context storage |
| HOJAI Twin | 4860 | Digital twins |

---

## Unit Tests (33 passing)

### Test Coverage

| Test Suite | Tests | Status |
|------------|-------|--------|
| Feature Flags | 1 | ✅ |
| Member Management | 7 | ✅ |
| Class Scheduling | 6 | ✅ |
| Workout Plans | 4 | ✅ |
| Progress Tracking | 5 | ✅ |
| Membership Calculations | 4 | ✅ |
| Attendance Tracking | 3 | ✅ |
| Health Endpoints | 3 | ✅ |

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/index.test.ts
```

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis
- **Testing:** Vitest
- **Logging:** Pino

---

## Related Services

### Industry AI Vertical Services

| Service | Industry | Tests |
|---------|----------|-------|
| **fitness-ai** | Fitness | ✅ 33 tests |
| **legal-ai** | Legal | ✅ 24 tests |
| **crm** | CRM | ✅ 18 tests |
| salon-ai | Commerce | Template |
| retail-ai | Commerce | Template |
| logistics-ai | Fleet | Template |
| travel-ai | Travel | Template |
| + 30 more | Various | Templates |

### REZ-Merchant Industry OS

| Industry | Services | Status |
|----------|----------|--------|
| Restaurant | 15+ | ✅ Full |
| Hotel | 12+ | ✅ Full |
| Salon | 10+ | ✅ Full |
| Healthcare | 8+ | ✅ Full |
| Fitness | 6+ | ✅ Full |
| Pharmacy | 4+ | ✅ Full |

---

## Documentation

| Document | Description |
|----------|-------------|
| CLAUDE.md | Developer documentation |
| IMPLEMENTATION.md | Implementation guide |
| INTEGRATION.md | Integration guide |
| RTNM-COMPANIES-AUDIT.md | Company audit |
| RTNM-PRODUCTS-FEATURES-AUDIT.md | Product features |

---

## Reference Implementation

See `waitron` (Restaurant OS) for a complete example:
- Full MongoDB integration
- Complete API endpoints
- Production-ready structure

---

## License

Proprietary - RTNM Digital

---

**Last Updated:** June 13, 2026
