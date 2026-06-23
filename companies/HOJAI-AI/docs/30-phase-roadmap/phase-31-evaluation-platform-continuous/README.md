# Phase 31: Evaluation Platform (Continuous) — 4 weeks

> **The platform that lets you know if every model, prompt, agent, and workflow change made things better or worse.**
>
> **Status:** 📋 NEW — Not started
> **Duration:** 4 weeks
> **Team:** 2 ML engineers + 1 backend engineer
> **Priority:** P0 (critical path)
> **Depends on:** Phase 11 (LLM Gateway)
> **Blocks:** Phase 32 (Agent OS), Phase 38 (AI Studio)

---

## 🎯 Goal

Build a **continuous evaluation platform** that scores every AI output in real-time, detects regressions, enables safe rollouts, and provides the ground truth for "is HOJAI getting better?"

**Why this is critical:** Without continuous evaluation, every model/prompt/agent change is a gamble. You can't ship AI without knowing if it got better. This is the difference between "we think it's better" and "we measured it."

---

## 📊 Current State

**Problem:** HOJAI has 9 LLM models, 240+ services, and is about to ship agents. But:
- No way to know if a new model is better than the old one
- No way to detect regressions when shipping agent updates
- No way to A/B test prompts
- No way to monitor quality in production
- No golden datasets
- No human-in-the-loop review

**Reference:** LangSmith, Helicone, Braintrust, WhyLabs, Arize AI, Phoenix (Arize)

---

## 🎁 Deliverables

### 31.1 Golden Dataset Management (Week 1)
- **Dataset CRUD:** Create, read, update, delete evaluation datasets
- **Dataset versioning:** Track changes over time
- **Dataset import:** CSV, JSON, Hugging Face format
- **Dataset split:** Train/val/test splits
- **Dataset tagging:** Tag by domain, difficulty, language
- **Storage:** MongoDB + S3 for large datasets

### 31.2 LLM-as-Judge (Week 1)
- **Multiple judges:** GPT-4, Claude-3.5, Gemini-1.5-Pro as evaluators
- **Custom rubrics:** Define your own scoring criteria
- **Pairwise comparison:** "Is A better than B?"
- **Scoring scales:** 1-5, 1-10, 0-100, pass/fail
- **Judge calibration:** Compare judge scores to human scores

### 31.3 Live Evaluation (Week 2)
- **Real-time scoring:** Score every production LLM call
- **Sampling:** Score 10% of production calls (configurable)
- **Metrics:** Accuracy, relevance, helpfulness, safety, latency, cost
- **Alerts:** Slack/email when quality drops
- **Dashboard:** Grafana dashboard with real-time scores

### 31.4 Shadow Testing (Week 2)
- **Shadow mode:** Run new model/prompt alongside old, don't return to user
- **Comparison report:** Side-by-side scoring
- **Statistical significance:** A/B test calculator
- **Decision support:** "Ship new version? 73% likely better (p<0.01)"

### 31.5 Canary Deployment (Week 3)
- **Gradual rollout:** 1% → 10% → 50% → 100%
- **Auto-rollback:** Rollback if quality drops >5%
- **Per-tenant rollout:** Roll out to beta tenants first
- **Kill switch:** Instantly disable new version

### 31.6 Regression Detection (Week 3)
- **Baseline tracking:** Track quality metrics over time
- **Anomaly detection:** Alert when quality drops unexpectedly
- **Root cause analysis:** "Quality dropped because model X had an outage"
- **Drift detection:** Detect input distribution shift

### 31.7 Human-in-the-Loop Review (Week 4)
- **Review queue:** Human reviewers rate AI outputs
- **Reviewer agreement:** Track inter-rater reliability
- **Gold standard:** Use human labels to improve LLM-as-judge
- **Active learning:** Show uncertain cases to humans first

### 31.8 Benchmark Suite (Week 4)
- **Standard benchmarks:** MMLU, HellaSwag, GSM8K, HumanEval, TruthfulQA
- **Custom benchmarks:** Domain-specific (legal, medical, etc.)
- **Leaderboard:** Compare HOJAI vs OpenAI vs Anthropic
- **Public benchmarks:** Publish results for credibility

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  EVALUATION PLATFORM ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   DATASETS   │  │   JUDGES     │  │   METRICS    │            │
│  │              │  │              │  │              │            │
│  │ • Golden     │  │ • LLM-as-    │  │ • Accuracy   │            │
│  │   datasets   │  │   judge      │  │ • Relevance  │            │
│  │ • Custom     │  │ • Human      │  │ • Safety     │            │
│  │   datasets   │  │   review     │  │ • Latency    │            │
│  │ • Public     │  │ • Rule-based │  │ • Cost       │            │
│  │   benchmarks │  │              │  │              │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                 │                      │
│         └─────────────────┼─────────────────┘                      │
│                           │                                        │
│                           ▼                                        │
│                  ┌──────────────────┐                              │
│                  │  EVAL ENGINE     │                              │
│                  │                  │                              │
│                  │ • Batch eval     │                              │
│                  │ • Live eval      │                              │
│                  │ • Shadow test    │                              │
│                  │ • Canary deploy  │                              │
│                  └────────┬─────────┘                              │
│                           │                                        │
│                           ▼                                        │
│                  ┌──────────────────┐                              │
│                  │   STORAGE        │                              │
│                  │                  │                              │
│                  │ • MongoDB        │                              │
│                  │ • TimescaleDB    │                              │
│                  │ • S3             │                              │
│                  └────────┬─────────┘                              │
│                           │                                        │
│                           ▼                                        │
│                  ┌──────────────────┐                              │
│                  │  DASHBOARD       │                              │
│                  │                  │                              │
│                  │ • Real-time      │                              │
│                  │ • Historical     │                              │
│                  │ • Comparison     │                              │
│                  │ • Alerts         │                              │
│                  └──────────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

```
# Dataset Management
POST   /api/eval/datasets                     # Create dataset
GET    /api/eval/datasets                     # List datasets
GET    /api/eval/datasets/:id                 # Get dataset
PUT    /api/eval/datasets/:id                 # Update dataset
DELETE /api/eval/datasets/:id                 # Delete dataset
POST   /api/eval/datasets/:id/versions        # Create new version

# Evaluation Runs
POST   /api/eval/runs                         # Start eval run
GET    /api/eval/runs/:id                     # Get run status
GET    /api/eval/runs/:id/results             # Get results
POST   /api/eval/runs/:id/cancel              # Cancel run

# Live Evaluation
POST   /api/eval/live/score                   # Score single output
POST   /api/eval/live/batch                   # Score batch
GET    /api/eval/live/metrics                 # Get live metrics

# Shadow Testing
POST   /api/eval/shadow/start                 # Start shadow test
GET    /api/eval/shadow/:id/compare           # Get comparison
POST   /api/eval/shadow/:id/decide            # Make ship decision

# Canary Deployment
POST   /api/eval/canary/start                 # Start canary
PUT    /api/eval/canary/:id/traffic           # Adjust traffic %
POST   /api/eval/canary/:id/promote           # Promote to 100%
POST   /api/eval/canary/:id/rollback          # Rollback

# Human Review
GET    /api/eval/review/queue                 # Get review queue
POST   /api/eval/review/:id/submit            # Submit review
GET    /api/eval/review/stats                 # Reviewer stats

# Benchmarks
GET    /api/eval/benchmarks                   # List benchmarks
POST   /api/eval/benchmarks/:id/run           # Run benchmark
GET    /api/eval/benchmarks/:id/leaderboard   # Get leaderboard
```

---

## 🧪 Test Gates

- **Unit tests:** 80%+ coverage
- **Integration tests:** All endpoints
- **E2E test:** Create dataset → Run eval → Get results (full flow)
- **Performance test:** Score 10,000 outputs in <5 minutes
- **Judge calibration test:** LLM judge agrees with humans 80%+ of the time
- **Regression detection test:** Inject quality drop, verify alert fires

**Definition of Done:**
- [ ] All 8 deliverables complete
- [ ] All test gates pass
- [ ] Documentation: API, user guide, judge guide
- [ ] Dashboard deployed
- [ ] Alerting configured
- [ ] 3 sample datasets seeded (general, legal, medical)
- [ ] LLM Gateway integration live (Phase 11)

---

## 📊 Success Criteria

- **Coverage:** 100% of LLM Gateway calls sampled and scored
- **Latency:** Live scoring adds <50ms p95 to LLM calls
- **Accuracy:** LLM judge agrees with humans 80%+ (measured continuously)
- **Detection:** Regression detection catches 95%+ of quality drops within 1 hour
- **Adoption:** 50+ evaluation runs per week across HOJAI teams

---

## 🚀 Implementation Details

### Tech Stack
- **Backend:** Node.js/TypeScript, Python (for ML)
- **Storage:** MongoDB (datasets, runs), TimescaleDB (metrics), S3 (large artifacts)
- **Queue:** BullMQ (async eval runs)
- **Dashboard:** Grafana (metrics), custom React app (eval management)
- **LLM judges:** GPT-4, Claude-3.5-Sonnet, Gemini-1.5-Pro

### Key Services
- `eval-platform` (port 4800) — Main API
- `eval-dataset-service` (port 4801) — Dataset management
- `eval-judge-service` (port 4802) — LLM-as-judge
- `eval-live-service` (port 4803) — Live evaluation
- `eval-shadow-service` (port 4804) — Shadow testing
- `eval-canary-service` (port 4805) — Canary deployment
- `eval-review-service` (port 4806) — Human review
- `eval-benchmark-service` (port 4807) — Benchmark suite

### Integration Points
- **LLM Gateway (Phase 11):** Every call scored
- **Agent Runtime (Phase 14):** Every agent run scored
- **AI Studio (Phase 38):** Playground uses eval for comparison
- **Agent OS (Phase 32):** Auto-rollback on quality drop

---

## 📚 Documentation Deliverables

- [ ] **API Reference** — All endpoints
- [ ] **User Guide** — How to create datasets, run evals
- [ ] **Judge Guide** — How to write good rubrics
- [ ] **Integration Guide** — How to integrate with LLM Gateway
- [ ] **Best Practices** — Sample size, statistical significance, judge calibration

---

## 🔗 Related Phases

- **Depends on:** Phase 11 (LLM Gateway)
- **Blocks:** Phase 32 (Agent OS), Phase 38 (AI Studio)
- **Related:** Phase 26 (Foundation Models — fine-tuning needs eval), Phase 14 (Agent Runtime — agent eval)

---

*Last Updated: June 22, 2026*
