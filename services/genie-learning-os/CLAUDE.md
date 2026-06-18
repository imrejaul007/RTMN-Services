# Genie Learning OS - Documentation

> **Version:** 1.0.0  
> **Port:** 4722  
> **Status:** ✅ Complete - All Routes Built  
> **Last Updated:** June 18, 2026

---

## 🎯 Overview

Genie Learning OS provides comprehensive learning and education capabilities across languages, business education (MBA curriculum), technical/life skills, and personalized curriculum building.

---

## 🏗️ Architecture

```
Port 4722
└── Learning OS
    ├── /language     - 7 Languages (EN, HI, AR, JA, FR, ES, DE)
    ├── /business    - MBA Curriculum (Foundations, Leadership, Specialization, Capstone)
    ├── /skills      - Technical, Communication, Leadership, Productivity, Life Skills
    └── /curriculum  - Personalized Curriculum Builder
```

---

## 📚 Routes

### Language Learning (`/language`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/languages` | GET | List all 7 supported languages |
| `/enroll/:languageId/:userId` | POST | Enroll in language course |
| `/progress/:userId/:languageId` | GET | Get user's language progress |
| `/lesson/:languageId/:lessonId/:userId` | GET | Get lesson content |
| `/practice/:languageId/:lessonId/:userId` | POST | Practice speaking/writing |
| `/converse/:languageId/:userId` | POST | AI conversation practice |
| `/progress/:userId` | GET | Get all language progress |

**Supported Languages:**
- English (en)
- Hindi (hi)
- Arabic (ar)
- Japanese (ja)
- French (fr)
- Spanish (es)
- German (de)

### Business Education (`/business`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/curriculum` | GET | Get MBA curriculum overview |
| `/curriculum/:trackId` | GET | Get specific track (foundations/leadership/specialization/capstone) |
| `/progress/:userId` | GET | Get user's MBA progress |
| `/enroll/:userId` | POST | Enroll in MBA program |
| `/course/:courseId/start/:userId` | POST | Start a course |
| `/course/:courseId/lesson/:lessonIndex/complete/:userId` | POST | Complete a lesson |
| `/case-study/:caseId` | GET | Get business case study |
| `/case-studies` | GET | List all case studies |
| `/simulate/:scenarioId/:userId` | POST | Business simulation |

**MBA Tracks:**
- Foundations (5 courses, 15 credits)
- Leadership & Management (5 courses, 14 credits)
- Specializations (Marketing, Finance, Operations, Entrepreneurship)
- Capstone Projects (3 real-world projects)

**Case Studies:**
- Netflix Pivot
- AWS Launch
- Airbnb Trust Building

### Skills Training (`/skills`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/categories` | GET | List skill categories |
| `/category/:categoryId` | GET | Get skills in category |
| `/:skillId` | GET | Get skill details |
| `/profile/:userId` | GET | Get user's skill profile |
| `/learn/:skillId/:userId` | POST | Start learning skill |
| `/lesson/:skillId/:lessonIndex/:userId` | POST | Complete a lesson |
| `/recommendations/:userId` | GET | Get personalized recommendations |
| `/practice/:skillId/:lessonIndex` | GET | Get practice exercises |

**Skill Categories:**
- Technical (10 skills): Python, JavaScript, SQL, AWS, Data Analysis, ML, Cybersecurity, DevOps, Mobile, Web Dev
- Communication (6 skills): Public Speaking, Writing, Storytelling, Active Listening, Conflict Resolution, Cross-Cultural
- Leadership (5 skills): Delegation, Coaching, Team Building, Change Management, Strategic Thinking
- Productivity (6 skills): Time Blocking, Task Management, Deep Work, Meeting Management, Email, Delegation
- Life (8 skills): Financial Literacy, Negotiation, Decision Making, Critical Thinking, Problem Solving, Creativity, Networking, Personal Branding

### Curriculum Builder (`/curriculum`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/create` | POST | Create personalized curriculum |
| `/:userId` | GET | Get user's curriculum |
| `/templates/all` | GET | List all templates |
| `/templates/:templateId` | GET | Get specific template |
| `/:userId/complete/:courseId` | POST | Mark course complete |
| `/:userId/start/:courseId` | POST | Start a course |
| `/:userId/schedule` | GET | Get weekly schedule |
| `/:userId/custom` | POST | Add custom course |
| `/:userId/optimize` | POST | AI-optimize curriculum |

**Curriculum Templates:**
- Career Launch Accelerator (6 months, 24 weeks)
- Future Leaders Program (4 months, 16 weeks)
- Startup Founder Blueprint (8 months, 32 weeks)
- 10x Developer Path (12 months, 48 weeks)
- Side Hustle to Business (3 months, 12 weeks)

---

## 📊 Data Models

### Language Progress
```javascript
{
  languageId: 'en',
  level: 'beginner',
  xp: 1250,
  lessonsCompleted: 8,
  totalLessons: 40,
  streak: 5,
  fluency: 12
}
```

### Skill Profile
```javascript
{
  skills: [{ skillId, level, xp }],
  inProgress: [{ skillId, name, currentLesson, totalLessons }],
  completed: [{ skillId, name, completedAt, level }],
  recommendations: [{ category, skills, reason }]
}
```

### Curriculum
```javascript
{
  id: 'curriculum-xxx',
  template: 'career-launch',
  phases: [{ week, title, courses, status, startedAt, completedAt }],
  milestones: [{ week, name, requirement, achieved, achievedAt }],
  progress: 45,
  coursesCompleted: [],
  totalCourses: 24
}
```

---

## 🔗 Integration

**RTMN Integration:**
- MemoryOS (4703) - Store learning progress and preferences
- TwinOS (4705) - Create Learner Twin with capabilities
- CorpID (4702) - User authentication
- Skills connect to Workforce OS (5077) for career development

---

## 🚀 Quick Start

```bash
cd services/genie-learning-os
npm install
npm start  # Port 4722
```

### Test Commands

```bash
# Get language options
curl http://localhost:4722/language/languages

# Enroll in Spanish
curl -X POST http://localhost:4722/language/enroll/es/user123

# Get MBA curriculum
curl http://localhost:4722/business/curriculum

# Get skill categories
curl http://localhost:4722/skills/categories

# Create personalized curriculum
curl -X POST http://localhost:4722/curriculum/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "template": "career-launch"}'

# Get available templates
curl http://localhost:4722/curriculum/templates/all
```

---

## 📈 Statistics

| Metric | Value |
|--------|-------|
| Languages | 7 |
| Language Lessons | 40 per language |
| MBA Tracks | 4 |
| MBA Courses | 19 |
| MBA Credits | 29 |
| Case Studies | 3 |
| Skill Categories | 5 |
| Total Skills | 35 |
| Curriculum Templates | 5 |

---

## 🎯 Key Features

1. **Multi-Language Support**: 7 languages with AI conversation practice
2. **MBA Curriculum**: Complete business education from foundations to capstone
3. **Skill Development**: Technical, soft, and life skills with structured paths
4. **Personalized Curriculum**: Templates + AI optimization for career goals
5. **Progress Tracking**: XP, streaks, milestones, and achievements
6. **Practice Exercises**: Interactive quizzes, scenarios, and reflections

---

*Genie Learning OS - Your Personal University*