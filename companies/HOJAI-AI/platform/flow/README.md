# FlowOS - Autonomous Execution Platform

**Version:** 1.0.0
**Last Updated:** June 27, 2026
**Location:** [platform/flow/](platform/flow/)

---

## 📋 Executive Summary

FlowOS is the **autonomous execution layer** of HOJAI AI, providing 20 interconnected services for AI agent orchestration, decision-making, risk management, and predictive intelligence.

### What FlowOS Does

```
User/AI Intent
      ↓
Flow Orchestrator (4244)
      ↓
┌─────────────────────────────────────────────────────────────┐
│  DECISION LAYER                                             │
│  ├── Decision Engine (4240) - Policy & Authorization         │
│  ├── Decision Intelligence (4756) - Recommendations & NBA     │
│  └── Simulation OS (4241) - What-if scenarios               │
├─────────────────────────────────────────────────────────────┤
│  EXECUTION LAYER                                           │
│  ├── Task Decomposer (4156) - Goal → Tasks                 │
│  ├── Dependency Graph (4152) - Task DAGs                   │
│  ├── Execution Engine (4153) - Parallel execution           │
│  ├── Retry Planner (4154) - Failure handling               │
│  ├── Recovery Planner (4155) - Rollback                    │
│  └── Dynamic Replanner (4157) - Real-time adaptation        │
├─────────────────────────────────────────────────────────────┤
│  INTELLIGENCE LAYER                                        │
│  ├── Predictive Intelligence (4754) - Forecasting            │
│  ├── Risk Intelligence (4755) - Fraud/Churn/Credit         │
│  ├── Trust Intelligence (4882) - Agent trust scoring        │
│  └── Journey Intelligence (4758) - Customer journeys        │
├─────────────────────────────────────────────────────────────┤
│  GOVERNANCE LAYER                                          │
│  ├── Policy OS (4254) - Universal governance               │
│  ├── Compliance Engine (4759) - GDPR/SOC2/HIPAA            │
│  ├── Consent Engine (4760) - User consent tracking           │
│  └── Goal Conflict Engine (4151) - Resource conflicts       │
├─────────────────────────────────────────────────────────────┤
│  TWIN LAYER                                                │
│  ├── Goal OS (4242) - Goal decomposition                   │
│  └── Industry Twin (4893) - Industry-specific context       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture

### Directory Structure

```
platform/flow/
├── scripts/
│   └── start-flow-os.sh          # Startup script
├── decision-intelligence/          # Recommendations & NBA (4756)
├── decision-engine/               # Policy & Authorization (4240)
├── predictive-intelligence/         # Forecasting & Anomaly (4754)
├── risk-intelligence/             # Fraud, Churn, Credit (4755)
├── trust-intelligence/            # Agent trust scoring (4882)
├── journey-intelligence/          # Customer journeys (4758)
├── policy-os/                    # Universal governance (4254)
├── flow-orchestrator/            # Central orchestrator (4244)
├── goal-os/                      # Goal decomposition (4242)
├── simulation-os/                # What-if scenarios (4241)
├── goal-conflict-engine/          # Resource conflicts (4151)
├── compliance-engine/             # Compliance tracking (4759)
├── consent-engine/               # Consent management (4760)
├── dependency-graph/             # Task DAGs (4152)
├── execution-engine/             # Parallel execution (4153)
├── retry-planner/                # Retry strategies (4154)
├── recovery-planner/              # Rollback logic (4155)
├── task-decomposer/              # Goal → Tasks (4156)
└── dynamic-replanner/            # Real-time adaptation (4157)
```

---

## 📊 Service Registry

### Core Orchestration (4 services)

| Service | Port | Lines | Tests | Purpose |
|---------|------|-------|-------|---------|
| **flow-orchestrator** | 4244 | 1,823 | ✅ | Central orchestrator |
| **goal-os** | 4242 | 1,604 | ❌ | Goal decomposition |
| **policy-os** | 4254 | 2,359 | ✅ Shell | Universal governance |
| **simulation-os** | 4241 | 360 | ❌ | What-if scenarios |

### Intelligence Services (4 services)

| Service | Port | Lines | Tests | Status |
|---------|------|-------|-------|--------|
| **decision-intelligence** | 4756 | 1,158 | ✅ 22 | **PASSING** |
| **predictive-intelligence** | 4754 | 1,187 | ✅ 18 | **PASSING** |
| **risk-intelligence** | 4755 | 1,025 | ✅ 13 | **PASSING** |
| **trust-intelligence** | 4882 | 983 | ✅ 20 | **PASSING** |

### Execution Planning (6 services)

| Service | Port | Lines | Tests | Status |
|---------|------|-------|-------|--------|
| **task-decomposer** | 4156 | 386 | ✅ 1 | Good |
| **dependency-graph** | 4152 | 363 | ✅ 2 | Good |
| **execution-engine** | 4153 | 317 | ✅ 1 | Good |
| **retry-planner** | 4154 | 258 | ✅ 1 | Good |
| **recovery-planner** | 4155 | 352 | ✅ 1 | Good |
| **dynamic-replanner** | 4157 | 390 | ✅ 1 | Good |

### Governance (4 services)

| Service | Port | Lines | Tests | Status |
|---------|------|-------|-------|--------|
| **goal-conflict-engine** | 4151 | 730 | ❌ | Needs tests |
| **compliance-engine** | 4759 | 465 | ❌ | Needs tests |
| **consent-engine** | 4760 | 349 | ❌ | Needs tests |
| **journey-intelligence** | 4758 | 311 | ❌ | Needs tests |

### Other (2 services)

| Service | Port | Lines | Tests | Status |
|---------|------|-------|-------|--------|
| **decision-engine** | 4240 | 1,695 | ❌ | Missing deps |
| **industry-twin** | 4893 | 44 | ✅ 1 | Trivial stub |

---

## 🔌 RTMN Hub Integration

FlowOS services are wired through the RTMN Hub at port 4399:

```
/api/flow/*         → flow-orchestrator (4244)
/api/goals/*        → goal-os (4242)
/api/policy/*       → policy-os (4254)
/api/decision/*     → decision-intelligence (4756)
/api/predict/*      → predictive-intelligence (4754)
/api/risk/*         → risk-intelligence (4755)
/api/trust/*        → trust-intelligence (4882)
```

---

## 🔄 Service Connections

### Flow Orchestrator (4244) - Central Hub

```
Flow Orchestrator
├── TwinOS (4705) - Resolve entity twins
├── MemoryOS (4703) - Pull context
├── Intelligence (4881) - AI inference
├── SkillOS (4743) - Execute skills
└── PolicyOS (4254) - Gate decisions
```

### Decision Intelligence (4756)

```
Decision Intelligence
├── Recommendation Engine (Collaborative/Content/Popularity/Hybrid)
├── NBA Engine (Next Best Action)
├── WSM Decision Framework
├── TOPSIS Decision Framework
└── Audit Log
```

### Risk Intelligence (4755)

```
Risk Intelligence
├── Fraud Scoring (Linear + Sigmoid)
├── Churn Prediction (Logistic Regression)
├── Credit Scoring (FICO-like)
├── Composite Risk
└── Audit Trail
```

### Predictive Intelligence (4754)

```
Predictive Intelligence
├── Linear Regression
├── Moving Average (Simple/Weighted/Exponential)
├── Holt-Winters (Triple Exponential Smoothing)
├── Ensemble Methods
├── Anomaly Detection (Z-score/IQR/Modified Z)
├── Trend Analysis
└── Demand Prediction
```

### Trust Intelligence (4882)

```
Trust Intelligence
├── Agent Trust Scoring (Decay + Reputation + Risk)
├── Trust Graph (PageRank-style)
├── Confidence Scoring
├── Risk Propagation
└── Model Trust Tracking
```

---

## 🚀 Quick Start

### Install Dependencies

```bash
cd platform/flow
for dir in */; do
  cd "$dir"
  npm install 2>/dev/null || echo "Skipping $dir"
  cd ..
done
```

### Run Tests

```bash
# Run all tests
cd platform/flow
npx vitest run

# Run specific service tests
cd decision-intelligence && npx vitest run
cd predictive-intelligence && npx vitest run
cd risk-intelligence && npx vitest run
cd trust-intelligence && npx vitest run
```

### Start Services

```bash
# Using the startup script
./scripts/start-flow-os.sh start

# Check status
./scripts/start-flow-os.sh status

# Stop all
./scripts/start-flow-os.sh stop
```

### Health Checks

```bash
# Check all services
for port in 4244 4242 4241 4254 4756 4754 4755 4882; do
  curl -s "http://localhost:$port/health" | jq -r ".service, .status"
done
```

---

## 📁 Feature Details

### 1. Decision Intelligence (4756)

**Recommendation Algorithms:**
- **Collaborative Filtering**: Item-item cosine similarity
- **Content-Based**: Tag/attribute overlap
- **Popularity**: Global most-interacted items
- **Hybrid**: Weighted blend of all three

**NBA (Next Best Action):**
- Score = (ExpectedValue × P(success) × GoalAlignment) - Cost
- Supports: revenue, retention, expansion, engagement goals

**Decision Frameworks:**
- **WSM (Weighted Sum Model)**: Linear weighted combination
- **TOPSIS**: Closeness to ideal solution

### 2. Predictive Intelligence (4754)

**Forecasting Methods:**
- Linear regression (least squares)
- Moving average (simple/weighted/exponential)
- Holt-Winters (triple exponential smoothing)
- Seasonal naive
- Ensemble (weighted average)

**Anomaly Detection:**
- Z-score
- IQR (Interquartile Range)
- Modified Z-score (robust to outliers)

**Demand Prediction:**
- Safety stock calculation
- Reorder point
- Stockout probability

### 3. Risk Intelligence (4755)

**Fraud Scoring:**
- 8 features (amount, velocity, account age, etc.)
- Linear combination → Sigmoid → 0-100 score
- Levels: low/medium/high/critical

**Churn Prediction:**
- 10 features (tenure, NPS, support tickets, etc.)
- Logistic regression
- Expected churn days estimation

**Credit Scoring:**
- 7 features (income, DTI, credit history, etc.)
- FICO-like 300-850 scale
- Auto-approved amount + interest rate

### 4. Trust Intelligence (4882)

**Trust Model:**
```
effectiveTrust = baseTrust × decay + reputationContribution - riskPenalty
decay = exp(-ageInDays / 30)
```

**Trust Levels:**
- 🏆 Platinum: 90-100
- ⭐ Gold: 80-89
- 🥈 Silver: 70-79
- 🥉 Bronze: 50-69
- ⚙️ Iron: 30-49
- ⚠️ Restricted: 0-29

---

## 🧪 Test Coverage

### Passing Tests (73 total)

| Service | Tests | Status |
|---------|-------|--------|
| decision-intelligence | 22 | ✅ PASSING |
| predictive-intelligence | 18 | ✅ PASSING |
| risk-intelligence | 13 | ✅ PASSING |
| trust-intelligence | 20 | ✅ PASSING |
| dependency-graph | 2 | ✅ Good |
| execution-engine | 1 | ✅ Good |
| retry-planner | 1 | ✅ Good |
| recovery-planner | 1 | ✅ Good |
| task-decomposer | 1 | ✅ Good |
| dynamic-replanner | 1 | ✅ Good |
| industry-twin | 1 | ✅ Trivial |
| **Total** | **73** | **All Passing** |

---

## 🔧 Configuration

### Environment Variables

```bash
# Auth Configuration
DECISION_INTELLIGENCE_REQUIRE_AUTH=false
PREDICTIVE_INTELLIGENCE_REQUIRE_AUTH=false
RISK_INTELLIGENCE_REQUIRE_AUTH=false
TRUST_INTELLIGENCE_REQUIRE_AUTH=false

# Ports (defaults)
PORT=4756  # decision-intelligence
PORT=4754  # predictive-intelligence
PORT=4755  # risk-intelligence
PORT=4882  # trust-intelligence

# Test Mode
NODE_ENV=test
```

### Vitest Setup Files

Each service has a `__tests__/setup.js` file that configures:
```javascript
process.env.<SERVICE>_NO_LISTEN = '1';
process.env.<SERVICE>_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';
```

---

## 📈 Performance Notes

- All services use in-memory storage (can be upgraded to Redis/Postgres)
- Seed data is auto-loaded on startup for demo purposes
- Auth bypass is available for testing via env vars
- Services have graceful shutdown handlers

---

## 🔮 Future Enhancements

1. **Add tests to remaining services** (governance layer mostly)
2. **Convert to TypeScript** for better type safety
3. **Add OpenAPI documentation** to all services
4. **Integrate with Redis** for persistence
5. **Add load testing** with k6 or Artillery
6. **Wire to RTMN Hub** for full ecosystem integration

---

## 📚 Related Documentation

- [CLAUDE.md](CLAUDE.md) - Original service documentation
- [../docs/sutar-os/README.md](../../docs/sutar-os/README.md) - SUTAR OS integration
- [../docs/nexha/README.md](../../docs/nexha/README.md) - Nexha federation

---

## 🏆 Test Results

```
Test Run - June 27, 2026

decision-intelligence:  ✅ 22/22 passing
predictive-intelligence: ✅ 18/18 passing
risk-intelligence:      ✅ 13/13 passing
trust-intelligence:      ✅ 20/20 passing

Total: 73 tests, 73 passing, 0 failing
```

---

*FlowOS - Autonomous Execution Platform for the RTMN Ecosystem*
