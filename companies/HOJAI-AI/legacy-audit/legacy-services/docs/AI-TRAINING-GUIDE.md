# AI Training Guide

**How AI gets trained in HOJAI**

---

## Training Methods

### 1. INITIAL TRAINING
New AI trained from seed data, best practices, sample conversations.

### 2. TRANSFER LEARNING
Base model + domain data = specialized AI.

### 3. CONTINUAL LEARNING
AI learns from every interaction.

### 4. REINFORCEMENT LEARNING
Human feedback → Better AI.

---

## Training Pipeline

```
Data → Clean → Train → Validate → Deploy
```

---

## Data Sources

| Type | Format | Training For |
|------|--------|-------------|
| Conversations | JSON | Responses |
| Documents | PDF, MD | Knowledge |
| Interactions | Events | Behavior |
| Feedback | Ratings | Improvement |
| Decisions | Choices | Outcomes |

---

## Quick Start

```bash
# Start training service
cd hojai-training-pipeline
npm run dev

# Train AI employee
curl -X POST http://localhost:4880/api/train/employee/ai_sdr_001 \
  -d '{"config": {"epochs": 10}}'
```

---

**Status:** Complete
**Updated:** May 30, 2026
