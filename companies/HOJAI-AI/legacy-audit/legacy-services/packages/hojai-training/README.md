# @hojai/training

**Training pipeline for AI models and employees**

---

## Overview

Batch training service that processes training data and improves AI models.

## Features

- Batch training
- Model versioning
- Training job management
- Data source management
- Transfer learning
- Incremental training

---

## Training Types

| Type | Description |
|------|-------------|
| **Employee** | Train AI workers |
| **Model** | Train ML models |
| **Agent** | Train AI agents |
| **Workflow** | Train automation |

---

## API

### Training Jobs
```typescript
POST /api/jobs          // Create job
GET  /api/jobs          // List jobs
GET  /api/jobs/:id      // Get job
POST /api/jobs/:id/cancel  // Cancel
```

### Training Endpoints
```typescript
POST /api/train/employee/:id   // Train AI employee
POST /api/train/model/:name    // Train model
POST /api/train/agent/:id      // Train agent
POST /api/train/batch          // Batch training
POST /api/train/transfer        // Transfer learning
POST /api/train/incremental     // Incremental
```

### Data Sources
```typescript
POST /api/sources   // Add source
GET  /api/sources   // List sources
```

### Evaluation
```typescript
POST /api/evaluate/:jobId   // Evaluate model
```

---

## Usage

```typescript
import { Training } from '@hojai/training';

const training = new Training();

// Create training job
const job = await training.jobs.create({
  type: 'employee',
  targetId: 'ai_sdr_001',
  config: { epochs: 10 }
});

// Transfer learning
await training.transfer({
  sourceModel: 'sales_expert_v1',
  targetType: 'ai_sdr',
  newData: myConversations
});
```

---

## Port: 4880
