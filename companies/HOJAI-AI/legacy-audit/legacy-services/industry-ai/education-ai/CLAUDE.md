# CLAUDE.md - Education AI

## Project Overview

**Name:** Education AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Learning Management System"
**Built from:** hojai-rag
**Version:** 1.0.0
**Date:** June 12, 2026

## Target Customers

- Schools
- Colleges
- EdTech
- Corporate training

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| LMS Service | 4860 | Course management, enrollments, assessments |

---

## AI EMPLOYEES (4 Agents)

### 1. Tutor AI
```
Role: Personalized learning
Skills: Study plan creation, Q&A, topic explanation
Integration: Courses, assessments
```

### 2. Admission Counselor
```
Role: Enrollment help
Skills: Student guidance, application processing, queries
Integration: Enrollment system
```

### 3. Placement Officer
```
Role: Career guidance
Skills: Job matching, placement tracking, industry connects
Integration: Jobs portal, career services
```

### 4. Assignment Grader
```
Role: Auto-grading
Skills: Quiz grading, feedback generation, performance tracking
Integration: Assessments, LMS
```

---

## FEATURES

### Course Management
- [x] Course creation (title, description, curriculum)
- [x] Video/text lessons
- [x] Assignments & quizzes
- [x] Live classes integration
- [x] Certificate generation

### Enrollments
- [x] Student registration
- [x] Batch management
- [x] Payment tracking
- [x] Attendance tracking

### Assessments
- [x] Multiple choice questions
- [x] Descriptive questions
- [x] Auto-grading
- [x] Plagiarism detection
- [x] Peer review

### Progress Tracking
- [x] Student dashboard
- [x] Completion percentage
- [x] Time spent
- [x] Performance analytics
- [x] Learning gaps identification

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹2,999/mo | <200 students |
| **Professional** | ₹7,999/mo | 200-2000 students |
| **Enterprise** | ₹19,999/mo | 2000+ students |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
education-ai/
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
| PORT | No | 4860 | Service port |
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
| GET | /api/courses | List courses |
| POST | /api/courses | Create course |
| GET | /api/enrollments | List enrollments |
| POST | /api/enrollments | Enroll student |
| GET | /api/assessments | List assessments |
| POST | /api/assessments | Create assessment |
| POST | /api/assessments/:id/submit | Submit answer |
| GET | /api/progress/:studentId | Student progress |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Course payments |
| RABTUL Wallet | 4004 | Scholarship funds |
| RABTUL Notification | 4005 | Class reminders, deadlines |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice tutoring |

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