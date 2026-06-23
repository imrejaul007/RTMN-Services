# Phase 14: Planning Engine — Decompose & Execute

**Duration:** 4 weeks (Week 28–31)
**Priority:** P0 (Critical)
**Owner:** Senior AI Engineer

---

## Goal

LLMs plan before acting. Complex multi-step tasks execute reliably with decomposition, dependency tracking, retry, recovery, and dynamic replanning.

---

## Why This Matters

**Current State:**
- Today's LLMs immediately answer
- No planning, no decomposition
- No retry, no recovery
- No dynamic replanning

**Impact:** Without Planning Engine, complex tasks fail. "Plan a wedding" or "Launch a product" requires multi-step execution.

**After This Phase:** Complex tasks execute reliably with full planning, execution, verification, and recovery.

---

## Flow

```
Goal
  ↓
Planner (decompose into task graph)
  ↓
Execution (parallel/sequential)
  ↓
Verification (check results)
  ↓
Memory (store learnings)
  ↓
Done (or replan if failed)
```

---

## 6 Planning Engine Services

### 14.1 Task Decomposer (Port 4930)

**Purpose:** Break complex tasks into steps

**Implementation:**
```javascript
async function decomposeTask(goal) {
  const prompt = `Decompose this goal into a task dependency graph:

Goal: ${goal}

Return JSON with tasks and dependencies:
{
  "tasks": [
    {"id": "t1", "name": "Research venues", "duration_hours": 4},
    {"id": "t2", "name": "Book venue", "duration_hours": 2, "depends_on": ["t1"]}
  ]
}`;

  const response = await inferenceGateway.complete({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }]
  });

  return JSON.parse(response.content);
}
```

---

### 14.2 Dependency Graph (Port 4931)

**Purpose:** Track task dependencies

**Features:**
- Graph storage (Neo4j)
- Cycle detection
- Topological sort
- Dependency visualization

---

### 14.3 Execution Engine (Port 4932)

**Purpose:** Execute task graphs

**Features:**
- Parallel execution (up to 10 tasks)
- Sequential execution (dependencies)
- Conditional execution (if/else)
- Loop execution (retry until success)

---

### 14.4 Retry Planner (Port 4933)

**Purpose:** Handle failures

**Features:**
- Exponential backoff
- Circuit breaker
- Alternative plan selection
- Human escalation

---

### 14.5 Recovery Planner (Port 4934)

**Purpose:** Recover from failures

**Features:**
- State rollback (undo last 3 steps)
- Alternative path exploration
- Partial result handling
- Failure learning

---

### 14.6 Dynamic Replanner (Port 4935)

**Purpose:** Adapt plans on the fly

**Features:**
- Real-time replanning
- Plan optimization
- Constraint relaxation
- Goal reprioritization

---

## Success Criteria

✅ 6 Planning Engine services deployed
✅ Complex tasks execute reliably
✅ Retry and recovery working
✅ Dynamic replanning functional
✅ 90%+ task success rate

---

*Phase 14 documentation: 2026-06-22*