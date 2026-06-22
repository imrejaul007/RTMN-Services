# @hojai/training-pipeline

**AI Training Pipeline - Train AI employees, models, and agents**

---

## Overview

Train AI employees, models, and agents with real data.

## Training Types

| Type | Description |
|------|-------------|
| Employee | Train AI workers |
| Model | Train ML models |
| Agent | Train AI agents |
| Workflow | Train automation |

## How AI Gets Trained

### 1. DATA COLLECTION

```
Training Data Sources:
├── Conversations
│   ├── Chat history
│   ├── Support tickets
│   └── Emails
├── Documents
│   ├── Knowledge base
│   ├── Policies
│   └── Procedures
├── Interactions
│   ├── Actions taken
│   ├── Decisions made
│   └── Outcomes
└── Feedback
    ├── Ratings
    ├── Corrections
    └── Approvals
```

### 2. TRAINING PIPELINE

```
Raw Data → Cleaning → Features → Training → Validation → Deployment
              ↓           ↓           ↓
           Normalize    Extract     Tune
           Dedupe      Embed      Test
           Validate    Vectorize   Metrics
```

### 3. TRAINING METHODS

| Method | When | Use Case |
|--------|-------|----------|
| Initial | New AI | Train from scratch |
| Transfer | Similar domain | Leverage existing knowledge |
| Incremental | Ongoing | Continual learning |
| Fine-tune | Existing model | Domain adaptation |
| Reinforcement | Human feedback | Behavior learning |

## Quick Start

```bash
npm install @hojai/training-pipeline
npm run dev
```

```typescript
import { Training } from '@hojai/training-pipeline';

// Create training job
const job = await training.jobs.create({
  type: 'employee',
  targetId: 'ai_sdr_001',
  config: { epochs: 10 }
});

// Monitor progress
const status = await training.jobs.get(job.jobId);
```

## Training Pipeline

```
1. Data Ingestion
   └── Connect data sources

2. Data Processing
   └── Clean, normalize, vectorize

3. Model Training
   └── Train with processed data

4. Validation
   └── Test accuracy, metrics

5. Deployment
   └── Push to production
```

## Training Methods

### Initial Training

```typescript
// Train new AI from scratch
await training.train.employee('ai_sdr_001', {
  data: conversations,
  epochs: 10,
  validationSplit: 0.2
});
```

### Transfer Learning

```typescript
// Use existing model as base
await training.transfer({
  sourceModel: 'sales_expert_v1',
  targetType: 'ai_sdr',
  newData: myConversations
});
```

### Incremental Training

```typescript
// Continue learning
await training.incremental({
  modelId: 'ai_sdr_v2',
  newData: recentConversations
});
```

## Data Sources

| Source | Format | Use For |
|--------|--------|---------|
| Conversations | JSON | Training data |
| Documents | PDF, MD | Knowledge |
| Interactions | Events | Behavior |
| Feedback | Ratings | Improvement |

---

**Port:** 4880
**Status:** Production Ready
