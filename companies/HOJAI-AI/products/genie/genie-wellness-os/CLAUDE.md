# Genie Wellness OS - Documentation

> **Version:** 1.0.0  
> **Port:** 4723  
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

Genie Wellness OS provides comprehensive wellness tracking across physical health, sleep, nutrition, mental wellness, and fitness with AI-powered insights and recommendations.

---

## 🏗️ Architecture

```
Port 4723
└── Wellness OS
    ├── /health      - Body metrics, vitals, weight tracking
    ├── /sleep       - Sleep tracking, quality analysis, debt
    ├── /nutrition   - Diet logging, meal planning, macros
    ├── /mental      - Mood tracking, meditation, breathing
    ├── /fitness     - Workout logging, exercise library, plans
    └── /insights    - AI wellness insights & recommendations
```

---

## 📚 Routes

### Health Tracking (`/health`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/profile/:userId` | GET | Get user's health profile |
| `/profile/:userId` | POST | Set up health profile |
| `/vitals/:userId` | POST | Log vital signs (HR, BP, O2, temp) |
| `/vitals/:userId/trends` | GET | Get vital trends over time |
| `/weight/:userId` | POST | Log weight |
| `/weight/:userId/history` | GET | Get weight history |
| `/weight/:userId/goal` | POST | Set weight goal |
| `/daily/:userId` | GET | Get daily health checkup |

**Vital Ranges Monitored:**
- Heart Rate (40-150 bpm)
- Blood Pressure (systolic/diastolic)
- Blood Oxygen (95-100%)
- Temperature (97.8-99.1°F)
- BMI (18.5-24.9 optimal)

### Sleep Tracking (`/sleep`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/profile/:userId` | GET | Get sleep profile |
| `/profile/:userId/goals` | POST | Set sleep goals (bedtime, duration) |
| `/log/:userId` | POST | Log sleep session |
| `/records/:userId` | GET | Get sleep records |
| `/trends/:userId` | GET | Get sleep trends analysis |
| `/factors` | GET | List sleep quality factors |
| `/routine/:userId` | POST | Log pre-sleep routine |
| `/debt/:userId` | GET | Get sleep debt calculation |
| `/score/:userId` | GET | Get sleep score (0-100) |

**Sleep Factors Tracked:**
- Screen time before bed
- Caffeine intake
- Exercise timing
- Room temperature/noise/light
- Sleep schedule consistency
- Stress levels

### Nutrition (`/nutrition`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/goals/:userId` | GET/POST | Set/get nutrition goals |
| `/meal/:userId` | POST | Log a meal |
| `/daily/:userId` | GET | Get daily nutrition summary |
| `/weekly/:userId` | GET | Get weekly nutrition summary |
| `/water/:userId` | POST | Log water intake |
| `/foods` | GET | Get food database |
| `/foods/search` | GET | Search foods |
| `/plan/:userId` | POST | Generate meal plan |
| `/insights/:userId` | GET | Get nutrition insights |

**Food Database Categories:**
- Proteins (8 items)
- Carbs (8 items)
- Vegetables (8 items)
- Healthy Fats (6 items)

**Diet Types Supported:**
- Balanced
- Keto
- Paleo
- Vegan

### Mental Wellness (`/mental`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard/:userId` | GET | Get mental wellness dashboard |
| `/mood/:userId` | POST | Log mood |
| `/mood/:userId` | GET | Get mood history |
| `/exercises` | GET | Get exercise library |
| `/exercise/:type/:exerciseId` | GET | Get specific exercise |
| `/meditate/:userId` | POST | Start meditation session |
| `/meditation/:userId` | GET | Get meditation history |
| `/journal/:userId` | POST | Create journal entry |
| `/journal/:userId` | GET | Get journal entries |
| `/breathe/:userId` | POST | Start breathing exercise |
| `/score/:userId` | GET | Get mental wellness score |
| `/stress-check/:userId` | POST | Stress assessment |

**Exercise Library:**
- Breathing (5 exercises): Box, 4-7-8, Diaphragmatic, etc.
- Meditation (6 exercises): Body Scan, Loving Kindness, etc.
- Journaling (5 exercises): Gratitude, Emotion Check, etc.
- Stretching (4 routines): Neck, Hip, Back, Full Body

**Mood Categories (12):**
- Positive: Happy, Excited, Calm, Grateful, Hopeful, Content
- Challenging: Anxious, Sad, Angry, Stressed, Tired, Lonely

### Fitness (`/fitness`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard/:userId` | GET | Get fitness dashboard |
| `/goals/:userId` | POST | Set fitness goals |
| `/workout/:userId` | POST | Log workout |
| `/workouts/:userId` | GET | Get workout history |
| `/exercises` | GET | Get exercise library |
| `/exercises/search` | GET | Search exercises |
| `/templates` | GET | Get workout templates |
| `/templates/:templateId` | GET | Get specific template |
| `/plan/:userId` | POST | Generate workout plan |
| `/steps/:userId` | POST | Log steps |
| `/steps/:userId` | GET | Get steps history |
| `/progress/:userId` | GET | Get fitness progress |

**Exercise Categories:**
- Cardio (8 exercises): Running, Cycling, Swimming, HIIT, etc.
- Strength (10 exercises): Push-ups, Squats, Deadlifts, etc.
- Flexibility (4 exercises): Yoga, Pilates, Stretching, Tai Chi
- Balance (2 exercises): Balance Board, Single Leg

**Workout Templates:**
- Beginner Full Body (45 min)
- Strength Hypertrophy (60 min)
- HIIT Cardio Blast (30 min)
- Active Recovery (30 min)

### Wellness Insights (`/insights`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:userId` | GET | Comprehensive wellness insights |
| `/:userId/weekly` | GET | Weekly wellness summary |
| `/:userId/plan` | GET | Personalized wellness plan |
| `/:userId/correlations` | GET | Correlation insights |
| `/:userId/mood-activity` | GET | Mood-activity correlation |
| `/:userId/sleep-activity` | GET | Sleep-activity correlation |
| `/:userId/nutrition-activity` | GET | Nutrition-activity correlation |
| `/:userId/stress-impact` | GET | Stress impact analysis |
| `/:userId/ask` | POST | AI wellness coach Q&A |
| `/:userId/accountability` | GET | Habit streaks & accountability |

---

## 📊 Scoring System

### Overall Wellness Score (0-100)
```
Overall = (Health × 0.20) + (Sleep × 0.25) + (Nutrition × 0.20) + (Mental × 0.20) + (Fitness × 0.15)
```

### Dimension Scores
- **Health Score**: Based on BMI, vital signs
- **Sleep Score**: Duration + Quality + Consistency
- **Nutrition Score**: Calorie tracking adherence
- **Mental Score**: Meditation + Journaling + Streak
- **Fitness Score**: Weekly goal adherence

---

## 🔗 Integration

**RTMN Integration:**
- Healthcare OS (5020) - Medical records if needed
- MemoryOS (4703) - Store wellness history
- TwinOS (4705) - Create Wellness Twin

---

## 🚀 Quick Start

```bash
cd products/genie/genie-wellness-os
npm install
npm start  # Port 4723
```

### Test Commands

```bash
# Health profile setup
curl -X POST http://localhost:4723/health/profile/user123 \
  -H "Content-Type: application/json" \
  -d '{"age": 30, "gender": "male", "height": 70, "weight": 175}'

# Log sleep
curl -X POST http://localhost:4723/sleep/log/user123 \
  -H "Content-Type: application/json" \
  -d '{"bedtime": "22:30", "wakeTime": "06:30", "quality": 85}'

# Log workout
curl -X POST http://localhost:4723/fitness/workout/user123 \
  -H "Content-Type: application/json" \
  -d '{"template": "beginner-full-body", "workoutType": "strength"}'

# Get wellness insights
curl http://localhost:4723/insights/user123

# Log mood
curl -X POST http://localhost:4723/mental/mood/user123 \
  -H "Content-Type: application/json" \
  -d '{"moodId": "happy", "intensity": 8}'
```

---

## 📈 Statistics

| Category | Count |
|----------|-------|
| Health Metrics | 5 vitals tracked |
| Sleep Exercises | 5 breathing + 6 meditation |
| Food Database | 30+ items |
| Mood Categories | 12 emotions |
| Fitness Exercises | 24 exercises |
| Workout Templates | 4 templates |

---

## 🎯 Key Features

1. **Holistic Tracking**: Unified view of physical and mental wellness
2. **AI Insights**: Correlations between sleep, fitness, nutrition, and mood
3. **Personalized Plans**: Goals and recommendations based on data
4. **Streaks & Accountability**: Gamified habit tracking
5. **Comprehensive**: Health, sleep, nutrition, mental, fitness all in one

---

## 📋 Data Models

### Sleep Record
```javascript
{
  id: 'sleep-xxx',
  date: '2026-06-18',
  bedtime: '22:30',
  wakeTime: '06:30',
  duration: 8.0,
  quality: 85,
  factors: { screen_time: 30, caffeine: 4, stress: 3 }
}
```

### Wellness Score
```javascript
{
  overallScore: 82,
  dimensionScores: {
    health: 90,
    sleep: 85,
    nutrition: 78,
    mental: 80,
    fitness: 75
  },
  recommendations: ['Focus on sleep consistency', 'Add more protein']
}
```

---

*Genie Wellness OS - Your Personal Wellness Companion*