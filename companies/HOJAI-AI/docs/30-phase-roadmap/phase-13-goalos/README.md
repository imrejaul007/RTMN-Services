# Phase 13: GoalOS — Persistent Objectives

**Duration:** 3 weeks (Week 25–27)
**Priority:** P0 (Critical)
**Owner:** Senior AI Engineer

---

## Goal

Enable persistent objectives that span weeks or months with daily planning, progress tracking, and personalized coaching.

---

## Why This Matters

**Current State:**
- User asks something → AI responds → Done
- No persistent goals
- No long-term planning
- No progress tracking

**Impact:** Without GoalOS, HOJAI cannot help users achieve long-term objectives like "lose 10kg" or "launch a business".

**After This Phase:** Users can set persistent goals with daily plans, progress tracking, and coaching.

---

## Example: Lose 10kg Goal

```
Goal: Lose 10kg by September 30, 2026
  ↓
Daily Planner: 30-min workout + 1800 cal diet
  ↓
Workout: Cardio + strength training
  ↓
Meal: High protein, low carb
  ↓
Shopping: Grocery list with ingredients
  ↓
Sleep: 8 hours, consistent schedule
  ↓
Progress: 3.2kg lost in 3 weeks
  ↓
Coach: "Great progress! Keep going!"
```

---

## 5 GoalOS Services

### 13.1 Goal Registry (Port 4920)

**Purpose:** Store long-term goals

**Schema:**
```yaml
goal:
  id: "lose-10kg-q3-2026"
  user_id: "user-123"
  objective: "Lose 10kg by September 30, 2026"
  success_criteria:
    - "Weight <= 75kg"
    - "Body fat <= 18%"
  constraints:
    - "No surgery"
    - "Budget: $200/month"
  progress:
    current: 3.2
    target: 10.0
    unit: "kg"
  created: "2026-06-01"
  deadline: "2026-09-30"
```

---

### 13.2 Goal Decomposer (Port 4921)

**Purpose:** Break goals into sub-goals

**Features:**
- Hierarchical goal structure
- Dependency mapping
- Time estimation
- Resource estimation

---

### 13.3 Goal Tracker (Port 4922)

**Purpose:** Monitor progress

**Features:**
- Daily check-ins
- Progress metrics (%, ETA)
- Blocker detection
- Milestone celebrations

---

### 13.4 Goal Coach (Port 4923)

**Purpose:** Personalized coaching

**Features:**
- Adaptive advice
- Motivation engine
- Course correction
- Celebration

---

### 13.5 Goal Templates (Port 4924)

**Purpose:** Reusable goal patterns

**Features:**
- 20+ templates (fitness, learning, business, financial)
- Template customization
- Template sharing

---

## Success Criteria

✅ 5 GoalOS services deployed
✅ 20+ goal templates
✅ Daily check-ins working
✅ Progress tracking accurate
✅ Coaching personalized

---

*Phase 13 documentation: 2026-06-22*