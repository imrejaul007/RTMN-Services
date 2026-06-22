# REZ Insight Synthesis Layer

## Purpose

Transform raw feedback into structured intelligence.

```
Raw Feedback → Pattern Detection → Cluster Analysis → Merchant Models → Insights
```

---

## Feedback Quality Meta-Signal

### Capture:

```json
{
  "feedback_quality": {
    "is_confident": true,
    "interaction_time_ms": 5000,
    "edited_multiple_times": false,
    "source": "quick_click | careful_edit | repeated_session"
  }
}
```

### Why:

```
Fast click → low signal
Careful edit → high signal
```

---

## Delta Weight Normalization

### Raw vs Normalized:

```
10 → 12 = +20%
100 → 110 = +10%

But impact is different!
```

### Add:

```json
{
  "delta_weighted": {
    "percent": 0.20,
    "absolute": 2,
    "impact_score": 0.12,  // absolute / suggested
    "normalized": true
  }
}
```

---

## Repeat Pattern Detection

### Track:

```json
{
  "pattern_repeat": {
    "similar_decisions_7d": 4,
    "avg_delta_7d": 0.18,
    "delta_variance": 0.02,
    "is_pattern": true
  }
}
```

### Detection Rules:

```
>3 similar in 7 days + low variance → PATTERN
→ Store as merchant characteristic
```

---

## Decision Clusters

### Start grouping:

```
CLUSTER_A: high_demand + evening + weekend
CLUSTER_B: low_stock + weekday + rush_hour
CLUSTER_C: new_item + conservative
```

### Use:

- Context features
- Time patterns  
- Quantity ranges
- Modification direction

---

## Merchant Trust Signals

### Track:

```json
{
  "trust_signal": {
    "auto_accept_rate": 0.7,
    "override_rate": 0.3,
    "trust_trend": "increasing",
    "suggestions_ignored_7d": 2,
    "suggestions_approved_7d": 8
  }
}
```

### Signals:

```
auto_accept_rate > 0.8 → HIGH_TRUST
override_rate > 0.5 → LOW_TRUST
trust_trend increasing → BUILDING_RELIANCE
```

---

## Weekly Insight Generation

### Auto-generated every Sunday:

```
TOP 5 MERCHANT PATTERNS:
1. Merchant X: prefers +20% buffer consistently
2. Merchant Y: highly reactive to day-of-week
...

TOP 3 CONTEXT GAPS:
1. Missing: supplier lead time (mentioned in 12 reasons)
2. Missing: competitor pricing (mentioned in 8 reasons)
...

TOP 3 FAILURE MODES:
1. Suggestions too conservative for aggressive buyers
2. Weekend predictions miss demand surge
...

TOP 3 EMERGING BEHAVIORS:
1. New pattern: morning orders increasing
2. Shift: away from bulk to frequent small orders
```

---

## Insight Endpoint

### `GET /insights/weekly`

Returns structured insights for review.

---

## Service Endpoints

```
Event Platform: http://localhost:4008
Action Engine: http://localhost:4009 (SHADOW MODE)
Feedback Service: http://localhost:4010
Dashboard: http://localhost:4010/dashboard
Insights: http://localhost:4010/insights/weekly
```

---

## System Evolution

```
Observation System ✅
Decision System ✅
Feedback System ✅
Insight System 🔄 (THIS LAYER)
Merchant Models → NEXT
```

---

## The Big Picture

```
Not predicting users.
Learning how they actually think.
```
