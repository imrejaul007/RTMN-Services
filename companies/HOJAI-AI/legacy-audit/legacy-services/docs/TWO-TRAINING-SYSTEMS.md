# Two Training Systems

## 1. SELF-LEARNING (Real-time)
## 2. FED TRAINING (Batch)

---

# SELF-LEARNING SYSTEM

## How It Works

```
User Interaction → AI Response → Feedback → Memory Update
```

### Triggers

| Trigger | What AI Learns |
|----------|-----------------|
| Task completed | Success pattern |
| Task failed | Failure pattern |
| User correction | New approach |
| Follow-up question | Context gap |
| User accepts | Good response |
| User rejects | Wrong response |

### Self-Learning Flow

```
1. AI responds to user
2. Capture interaction
3. Analyze outcome
4. Update memory
5. Adjust future responses
```

---

# FED TRAINING SYSTEM

## How It Works

```
Admin → Data → Training Pipeline → AI Model Update
```

### Methods

| Method | When | Data |
|---------|------|-----|
| Initial | New AI | Seed conversations |
| Transfer | Specialize | Domain data |
| Incremental | Weekly | Feedback logs |
| Fine-tune | Monthly | Corrections |

---

# MEMORY vs MODEL

| Self-Learning | Fed Training |
|---------------|-------------|
| Updates memory | Updates model |
| Real-time | Batch |
| Fast change | Slow change |
| Contextual | General |
| Low cost | High cost |

---

# MEMORY LAYER

```
SELF-LEARNING (Memory)
├── Short-term (conversation)
├── Long-term (patterns)
└── User preferences

FED TRAINING (Model)
├── General knowledge
├── Domain expertise
└── Company knowledge
```

---

## Self-Learning Example

```
User: "Book meeting room"
AI: [Wrong room suggested]

User: "Actually 2PM, Conference A"

AI learns:
├── Wrong assumption → Avoid
├── Correct time → Reinforce
└── Right room → Use going forward
```

## Fed Training Example

```
Admin uploads: 1000 support tickets

Pipeline processes:
├── Clean data
├── Extract patterns
├── Train model
└── Deploy update
```

---

# ARCHITECTURE

```
HOJAI AI
│
├── SELF-LEARNING (Real-time)
│   └── Memory Layer
│       └── Continuous improvement
│
└── FED TRAINING (Batch)
    └── Model updates
        └── Scheduled retraining
```

---

# METRICS

## Self-Learning

| Metric | Source |
|--------|--------|
| Task success | Outcome |
| User corrections | Feedback |
| Follow-up rate | Behavior |
| Resolution time | Performance |

## Fed Training

| Metric | Source |
|---------|--------|
| Accuracy | Test set |
| Precision | Validation |
| Recall | Real-world |
| F1 Score | Combined |

---

# TRIGGERS

## Self-Learning

```
Every interaction → Immediate update
```

## Fed Training

```
Weekly: Feedback batch
Monthly: Full retrain
Quarterly: Model version
```

---

# SERVICE ARCHITECTURE

```
SELF-LEARNING (Memory Layer)
├── Interaction capture
├── Feedback analysis
├── Memory update
└── Context enrichment

FED TRAINING (Model Layer)
├── Data collection
├── Cleaning & processing
├── Training pipeline
└── Model registry
```

---

## Self-Learning Service (4881)
## Fed Training Service (4880)

| Port | Service | Purpose |
|------|---------|---------|
| 4880 | Fed Training | Batch training |
| 4881 | Self-Learning | Real-time updates |
