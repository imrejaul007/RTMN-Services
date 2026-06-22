# CLAUDE.md - HR AI

## Project Overview

**Name:** HR AI
**Type:** Industry AI Product
**Tagline:** "Complete HR Management"
**Built from:** CorpPerks, PeopleOS, TalentAI
**Version:** 1.0.0
**Date:** June 12, 2026

## Target Customers

- Startups
- SMEs
- Enterprises

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Payroll Service | 4840 | Employee management, payroll processing |

---

## AI EMPLOYEES (4 Agents)

### 1. Recruiter AI
```
Role: Resume screening
Skills: Resume parsing, candidate scoring, interview scheduling
Integration: Job postings, ATS
```

### 2. Interview AI
```
Role: Candidate evaluation
Skills: Initial rounds, answer scoring, feedback generation
Integration: Video calls, calendar
```

### 3. HR Helpdesk Agent
```
Role: Policy questions
Skills: Leave policies, benefits, employee queries
Channels: WhatsApp, chat, email
```

### 4. Payroll Agent
```
Role: Salary processing
Skills: CTC calculation, PF/ESI, payslip generation
Integration: Bank transfers, compliance
```

---

## FEATURES

### Employee Management
- [x] Employee database (profile, documents, emergency contacts)
- [x] Document upload (offer letter, ID proof, certificates)
- [x] Employment status tracking (active, on leave, terminated)
- [x] Performance history
- [x] Hierarchical org chart

### Attendance
- [x] Check-in/out (web, mobile, biometric)
- [x] Geo-fencing (only mark within office area)
- [x] Shift management
- [x] Overtime calculation
- [x] Late arrival tracking
- [x] Work-from-home tracking

### Leave Management
- [x] Leave request submission
- [x] Manager approval workflow
- [x] Leave balance tracking (CL, SL, PL, EL)
- [x] Holiday calendar
- [x] Leave encashment
- [x] Leave policy rules

### Payroll
- [x] Salary components (Basic, HRA, Special Allowance, PF, ESI, TDS)
- [x] Tax calculations (80C, 80D, HRA)
- [x] Bank transfer file generation
- [x] Payslip generation
- [x] Year-end tax forms (Form 16)
- [x] Reimbursement processing

### Recruitment
- [x] Job posting creation
- [x] Resume parsing (AI screening)
- [x] Candidate scoring (skills, experience, culture fit)
- [x] Interview scheduling
- [x] Offer letter generation
- [x] Onboarding workflow

### Performance
- [x] OKRs and goals
- [x] 360-degree feedback
- [x] Performance reviews
- [x] Development plans

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹9/employee/mo | <50 employees |
| **Professional** | ₹7/employee/mo | 50-500 employees |
| **Enterprise** | ₹5/employee/mo | 500+ employees |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
hr-ai/
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
| PORT | No | 4840 | Service port |
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
| GET | /api/employees | List employees |
| POST | /api/employees | Create employee |
| GET | /api/employees/:id | Get employee details |
| PUT | /api/employees/:id | Update employee |
| GET | /api/attendance | List attendance records |
| POST | /api/attendance/checkin | Check in |
| POST | /api/attendance/checkout | Check out |
| GET | /api/leave | List leave requests |
| POST | /api/leave | Submit leave request |
| PUT | /api/leave/:id/approve | Approve leave |
| GET | /api/payroll | List payroll records |
| POST | /api/payroll/generate | Generate monthly payroll |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Salary disbursement |
| RABTUL Wallet | 4004 | Reimbursement, benefits |
| RABTUL Notification | 4005 | Leave reminders, payroll notifications |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice AI for HR queries |

---

## Deployment Checklist

- [x] Codebase exists
- [x] Documentation complete
- [x] AI Employees documented (4 agents)
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
| JWT validation fails | Verify JWT_SECRET |
| Payroll calculation wrong | Check salary components |
| Leave approval fails | Check manager hierarchy |

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