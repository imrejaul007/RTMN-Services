# CLAUDE.md - Fitness AI

## Project Overview

**Name:** Fitness AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Gym & Fitness Management"
**Built from:** REZ-Merchant, REZ-intent-graph, hojai-voice-os
**Version:** 1.0.0
**Date:** June 14, 2026

## Target Customers

- Commercial gyms (Snap Fitness, Gold's Gym style)
- Boutique fitness studios (CrossFit, Yoga, Pilates)
- Personal training studios
- Corporate fitness centers
- Hotel gyms

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Member Service | 4801 | Member management, check-in/out |
| Class Scheduler | 4802 | Class scheduling, trainer assignment |
| Attendance Service | 4803 | Attendance tracking |
| Membership Plan | 4804 | Plan management, pricing |

---

## Integration Hub ✅ NEW!

**Location:** `src/connectors/index.ts`

```typescript
import { fitnessHub } from './src/connectors';
await fitnessHub.healthCheck();
```

### Connectors

| Connector | Purpose | Status |
|-----------|---------|--------|
| Weather | Rain → Indoor classes | Built |
| Wealth | Membership profits | Built |
| Discovery | Gym search for Genie | Built |

---

## AI EMPLOYEES (6 Agents)

### 1. Membership Advisor
```
Role: Sales & retention
Skills: Plan recommendations, renewals, upgrades
Channels: WhatsApp, App, In-person
```

### 2. Fitness Coach
```
Role: Workout planning
Skills: Custom plans, progress tracking, motivation
Integration: Member profiles, attendance
```

### 3. Nutrition Advisor
```
Role: Diet planning
Skills: Macros calculation, meal plans, restrictions
Integration: Member goals
```

### 4. Retention Manager
```
Role: Churn prevention
Skills: Risk analysis, campaigns, win-back
Integration: Attendance, CRM
```

### 5. Class Scheduler
```
Role: Optimal scheduling
Skills: Class timetables, trainer assignment
Integration: Capacity management
```

### 6. Trainer Matcher
```
Role: Member-trainer matching
Skills: Goal matching, availability alignment
Integration: Trainer profiles, schedules
```

---

## FEATURES

### Member Experience
- [x] Digital membership cards (QR code)
- [x] WhatsApp check-in (send "checkin" to bot)
- [x] Voice check-in (IVR system)
- [x] Class booking via WhatsApp
- [x] Personalized workout plans
- [x] Diet recommendations
- [x] Attendance reminders
- [x] Renewal notifications

### Operations
- [x] Multi-plan membership (Basic, Premium, Elite)
- [x] Trainer management (profiles, certifications, availability)
- [x] Class scheduling (Yoga, HIIT, Zumba, CrossFit, Pilates)
- [x] Capacity management (max per class)
- [x] Equipment tracking (maintenance, usage)
- [x] Daily stats dashboard
- [x] Peak hour analysis

### AI & Analytics
- [x] Churn prediction (who will cancel)
- [x] Re-engagement campaigns (personalized messages)
- [x] Personalized recommendations (classes, trainers)
- [x] Attendance analytics (trends, patterns)
- [x] Peak hour analysis (when gym is busy)
- [x] Member lifetime value (MLV calculation)
- [x] Goal tracking (weight, muscle, cardio)

---

## MEMBERSHIP PLANS

| Plan | Price | Features |
|------|-------|----------|
| **Basic** | ₹999/mo | Gym access, basic equipment |
| **Premium** | ₹1,999/mo | + Classes (4/week), guest passes, locker |
| **Elite** | ₹3,999/mo | + Unlimited classes, PT (2/month), spa |

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹2,999/mo | Single location, <200 members |
| **Professional** | ₹7,999/mo | Multi-location, <1000 members |
| **Enterprise** | ₹19,999/mo | Chains, unlimited |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
fitness-ai/
├── src/
│   └── index.ts          # Main entry point
├── test/                  # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md
├── PRODUCT.md            # Product documentation
└── CLAUDE.md             # This file
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4801 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection URL |

---

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/members | List members |
| POST | /api/members | Register member |
| POST | /api/members/:id/checkin | Check in |
| POST | /api/members/:id/checkout | Check out |
| GET | /api/classes | List classes |
| POST | /api/classes | Create class |
| POST | /api/classes/:id/book | Book class |
| GET | /api/memberships | List plans |
| POST | /api/memberships | Create plan |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Membership payments |
| RABTUL Wallet | 4004 | REZ Coins, cashback |
| RABTUL Notification | 4005 | Attendance reminders, renewal alerts |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice check-in, commands |

---

## Deployment Checklist

- [x] Codebase exists
- [x] Documentation complete
- [x] AI Employees documented (6 agents)
- [x] Features documented
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Health endpoint implemented
- [ ] Docker support added
- [ ] Monitoring configured
- [ ] Security audit passed

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Verify MONGODB_URI |
| Redis timeout | Verify REDIS_URL |
| WhatsApp check-in fails | Verify WhatsApp integration |
| Class booking fails | Check trainer availability |

---

## Related Products

| Product | Industry | AI Agents |
|---------|----------|-----------|
| retail-ai | Retail | 4 |
| hr-ai | HR/Payroll | 4 |
| fitness-ai | Gym/Fitness | 6 |
| salon-ai | Salon/Spa | 6 |
| manufacturing-ai | Manufacturing | 4 |
| society-ai | Apartments | 4 |
| real-estate-ai | Real Estate | 3 |
| finance-ai | Finance | 4 |
| education-ai | Education | 4 |
| logistics-ai | Logistics | 4 |
| franchise-ai | Franchise | 4 |
| travel-ai | Travel | 4 |

---

**Last Updated:** 2026-06-12
**HOJAI AI - Industry AI Division**