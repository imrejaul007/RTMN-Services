# REZ First Loop - Behavior Discovery Engine

## Purpose

> **This pilot is for discovering how merchants actually think.**
> **Not for proving the system works.**

---

## Core Insight

```
MODIFICATION > APPROVAL

suggested: 10
actual: 12
delta: +20%

This reveals merchant psychology, not just acceptance.
```

---

## Active Discovery Data Structure

### Every feedback should capture:

```json
{
  "decision_id": "uuid",
  "merchant_id": "merchant_123",
  "suggested_quantity": 10,
  "actual_quantity": 12,
  "delta_percent": 20,
  
  "WHY_IT_CHANGED": {
    "reason_category": "high_demand | low_trust | constraint | preference | habit",
    "reason_detail": "Free text explanation",
    "was_explained": true
  },
  
  "INTENTION_TYPE": {
    "correction": true/false,
    "preference": true/false,
    "constraint": true/false
  },
  
  "CONFIDENCE_GAP": {
    "ai_confidence": 0.82,
    "actual_delta": 0.20,
    "gap": "high_delta_low_confidence | aligned | low_delta_high_confidence"
  },
  
  "CONTEXT_COMPLETENESS": {
    "had_recent_sales": true,
    "had_day_pattern": true,
    "had_seasonality": false,
    "missing_features": ["seasonality"]
  },
  
  "IGNORED": {
    "was_ignored": false,
    "time_to_decision_ms": 5000,
    "ignored_after_hours": null
  }
}
```

---

## Modification Classification

### CORRECTION (System was wrong)
```
suggested: 10, actual: 8
delta: -20%
→ AI overestimated
```

### PREFERENCE (Merchant style)
```
suggested: 10, actual: 12
delta: +20%
→ Consistent pattern for this merchant
```

### CONSTRAINT (External factor)
```
suggested: 10, actual: 10
delta: 0%
reason: "Supplier limit"
```

---

## Confidence Gap Analysis

### Track this relationship:

```json
ai_confidence: 0.82
delta: +20%

Analysis:
- high_confidence + large_delta → Model calibrated poorly
- low_confidence + small_delta → Model calibrated well
- high_confidence + small_delta → Trust signal
```

---

## Ignored Patterns

### If suggestion is ignored:

```json
{
  "ignored": true,
  "ignored_after_hours": 48,
  "action_taken": null
}
```

**Interpretation:**
- Ignored = Irrelevant suggestion
- If many ignored → Decision trigger is wrong
- Time to ignore = Urgency signal

---

## Context Completeness Check

### For each decision, log what context was available:

```json
"context": {
  "recent_sales_3_days": true,
  "avg_daily_sales": true,
  "day_of_week": true,
  "hour_of_day": true,
  "seasonality": false,
  "supplier_lead_time": false
}

"missing_features": ["seasonality", "supplier_lead_time"]
```

**This directly feeds Version 2 development.**

---

## Merchant Profile Emergence

### During pilot, patterns will emerge:

```
Merchant A: "aggressive_buyer"
  - avg_delta: +18%
  - approval_rate: 0.9
  - modification_type: "preference"

Merchant B: "conservative_optimizer"
  - avg_delta: -8%
  - approval_rate: 0.7
  - modification_type: "correction"

Merchant C: "trend_reactive"
  - avg_delta: varies wildly
  - approval_rate: 0.5
  - modification_type: "context_dependent"
```

---

## Weekly Analysis Questions

### Not just numbers. Ask:

```
WHY did merchants change suggestions?
WHEN do they override?
WHAT patterns repeat?
WHO are the segments?
WHERE are the context gaps?
```

---

## Service Endpoints

```
Event Platform: http://localhost:4008
Action Engine: http://localhost:4009 (SHADOW MODE)
Feedback: http://localhost:4010
Dashboard: http://localhost:4010/dashboard
```

---

## When to Enable Learning

NOT just "after N decisions."

ONLY when:
1. Feedback quality is HIGH (real decisions, not lazy clicking)
2. Modification patterns are STABLE (consistent behavior)
3. Context gaps are IDENTIFIED
4. Merchant profiles are CHARACTERIZED

Then: α = 0.05, adaptive = 10-20%

---

## Remember

```
You are not building a feature.
You are reverse-engineering human decision-making.
```

---

## Pilot Success = Discovery

```
Pilot is for discovering how merchants actually think.
```
