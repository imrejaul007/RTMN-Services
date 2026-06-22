# Genie Life University Engine - Documentation

> **Version:** 1.0.0  
> **Port:** 4727  
> **Status:** ✅ Complete - All Routes Built  
> **Last Updated:** June 22, 2026

---
---

## 🔐 Auth (Phase 7)

This service now requires a **Bearer JWT** (CorpID-issued) on every request except `/health`, `/`, and `/ready`. Auth is enforced via `app.use(requireAuth)` from `@rtmn/shared/auth`.

**Get a token:**

```bash
# Dev shortcut (base64 JSON token — matches what requireAuth verifies):
TOKEN=$(curl -s -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"dev"}' | jq -r .token)
```

**Call this service:**

```bash
curl http://localhost:PORT/health                      # public, no token
curl http://localhost:PORT/your-endpoint \
  -H "Authorization: Bearer $TOKEN"                   # protected
```

**Disable in dev/test:** Set `SERVICE_REQUIRE_AUTH=false` env var.

See [shared/MIGRATION-GUIDE.md](../../shared/MIGRATION-GUIDE.md) for the full `@rtmn/shared/auth` pattern and the canonical thin-shim approach.

## 🎯 Overview

Genie Life University Engine provides comprehensive lifelong learning capabilities including personalized curricula, course catalog, lesson content with quizzes, progress tracking, expert instructors, and professional certifications.

---

## 🏗️ Architecture

```
Port 4727
└── Life University Engine
    ├── /curriculum   - Personalized learning paths
    ├── /courses     - Course catalog and enrollment
    ├── /lessons     - Lesson content and quizzes
    ├── /progress    - Learning progress and achievements
    ├── /instructors - Expert instructors
    └── /certification - Certificates and achievements
```

---

## 📚 Routes

### Curriculum (`/curriculum`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Create personalized curriculum |
| `/:userId` | GET | Get user's curricula |
| `/:userId/:curriculumId` | GET | Get specific curriculum |
| `/:curriculumId` | PUT | Update curriculum |
| `/:curriculumId/complete/:courseId` | POST | Complete course in curriculum |
| `/paths/all` | GET | Get all learning paths |
| `/paths/:pathId` | GET | Get specific learning path |
| `/recommendations` | POST | Get curriculum recommendations |

**Learning Paths:**
- Leadership Mastery (6 months)
- Entrepreneur Track (8 months)
- Career Accelerator (3 months)
- Technical Expert (12 months)
- Creative Mastery (4 months)

### Courses (`/courses`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Browse courses |
| `/:courseId` | GET | Get course details |
| `/:courseId/enroll` | POST | Enroll in course |
| `/enrolled/:userId` | GET | Get enrolled courses |
| `/categories/all` | GET | Get course categories |
| `/featured/all` | GET | Get featured courses |

**Categories:** Leadership, Professional, Technical, Business, Creative

**Features:**
- Course ratings and reviews
- Student counts
- Module structure
- Skill development tracking

### Lessons (`/lessons`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:courseId/:lessonId` | GET | Get lesson content |
| `/:courseId/:lessonId/complete` | POST | Complete lesson |
| `/:courseId/:lessonId/quiz` | GET | Get lesson quiz |
| `/:courseId/:lessonId/quiz` | POST | Submit quiz answers |
| `/:courseId/:lessonId/next` | GET | Get next lesson |

**Lesson Types:**
- Video (Introduction lessons)
- Reading (Concept lessons)
- Exercise (Practice lessons)

### Progress (`/progress`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:userId` | GET | Get overall progress |
| `/:userId/course/:courseId` | GET | Get course progress |
| `/:userId/lesson` | POST | Update lesson progress |
| `/:userId/streak` | GET | Get streak info |
| `/:userId/streak` | POST | Update streak |
| `/:userId/achievements` | GET | Get achievements |
| `/leaderboard/:userId` | GET | Get leaderboard |

**Gamification:**
- XP system with levels
- Daily streaks
- Achievements and badges
- Leaderboard rankings

### Instructors (`/instructors`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Browse instructors |
| `/:instructorId` | GET | Get instructor details |
| `/:instructorId/courses` | GET | Get instructor's courses |
| `/featured/all` | GET | Get featured instructors |

**Instructor Features:**
- Expert profiles
- Course associations
- Ratings and credentials
- Student counts

### Certification (`/certification`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/course/:courseId` | POST | Issue course certificate |
| `/curriculum/:curriculumId` | POST | Issue professional certificate |
| `/:userId` | GET | Get user's certificates |
| `/verify/:verificationId` | GET | Verify certificate |
| `/download/:certificateId` | GET | Download certificate |
| `/templates/all` | GET | Get certificate templates |

---

## 🎓 Learning Features

### Curriculum Builder
- 5 comprehensive learning paths
- Personalized to goals and current level
- Time commitment planning
- Milestone tracking
- Progress analytics

### Course System
- Multi-module courses
- Video, reading, and exercise lessons
- Interactive quizzes
- Progress tracking per course
- Instructor ratings

### Gamification
- XP rewards for completing lessons
- Level progression
- Daily learning streaks
- Achievement badges
- Community leaderboards

### Certifications
- Course completion certificates
- Professional certificates for curricula
- Unique verification IDs
- Shareable credentials

---

## 🔗 Integration

**RTMN Integration:**
- Genie Learning OS (4722) - Shared curriculum
- MemoryOS (4703) - Store learning history
- TwinOS (4705) - Create Learner Twin
- Operations OS (5250) - Skills tracking

---

## 🚀 Quick Start

```bash
cd products/genie/genie-life-university
npm install
npm start  # Port 4727
```

### Test Commands

```bash
# Get learning paths
curl http://localhost:4727/curriculum/paths/all

# Create curriculum
curl -X POST http://localhost:4727/curriculum \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "pathId": "leadership-mastery"}'

# Browse courses
curl http://localhost:4727/courses

# Enroll in course
curl -X POST http://localhost:4727/courses/leadership-fundamentals/enroll \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'

# Get lesson
curl http://localhost:4727/lessons/leadership-fundamentals/lesson-1

# Complete lesson
curl -X POST http://localhost:4727/lessons/leadership-fundamentals/lesson-1/complete \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'

# Get progress
curl http://localhost:4727/progress/user123

# Get achievements
curl http://localhost:4727/progress/user123/achievements

# Get certificates
curl http://localhost:4727/certification/user123

# Get instructors
curl http://localhost:4727/instructors
```

---

## 📊 Statistics

| Category | Count |
|----------|-------|
| Learning Paths | 5 |
| Courses in Catalog | 5 |
| Lesson Types | 3 (video, reading, exercise) |
| Achievement Types | 10 |
| Instructor Profiles | 5 |
| Certificate Templates | 3 |

---

## 🎯 Key Features

1. **Personalized Learning Paths**: Curated curricula for career goals
2. **Expert Instructors**: World-class instructors with credentials
3. **Interactive Lessons**: Video, reading, and hands-on exercises
4. **Smart Quizzes**: Test understanding with immediate feedback
5. **Gamification**: XP, levels, streaks, and achievements
6. **Progress Tracking**: Track learning across all courses
7. **Professional Certifications**: Shareable credentials
8. **Leaderboards**: Compete with other learners

---

## 🏆 Achievements

| Achievement | Description | XP |
|-------------|-------------|-----|
| First Step | Complete first lesson | 50 |
| Dedicated Learner | Complete 10 lessons | 200 |
| Knowledge Seeker | Complete 50 lessons | 500 |
| Scholar | Complete 100 lessons | 1000 |
| Getting Started | 3-day streak | 100 |
| Week Warrior | 7-day streak | 300 |
| Unstoppable | 30-day streak | 1000 |
| Rising Star | Earn 500 XP | 0 |
| Superstar | Earn 5000 XP | 0 |
| Legend | Earn 10000 XP | 0 |

---

*Genie Life University - Never Stop Learning*