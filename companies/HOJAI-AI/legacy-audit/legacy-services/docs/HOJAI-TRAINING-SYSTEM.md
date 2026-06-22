# Hojai AI Training System

> **Documented:** May 31, 2026
> **Version:** 1.0

---

## Overview

Hojai AI uses a **multi-layered training system** combining:

1. **Voice Training** - Speech recognition & synthesis
2. **Intent Training** - NLU/NLP
3. **Continuous Learning** - Real-time feedback loops
4. **RAG** - Retrieval Augmented Generation
5. **Model Registry** - Version management
6. **Feature Store** - ML features

---

## Training Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOJAI TRAINING SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    VOICE TRAINING (Port 4880)                     │  │
│  │  Whisper Fine-tuning │ TTS │ Speaker Verification │ Intent        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│  ┌──────────────────────┐     ┌────────────────────────────────┐         │
│  │   CONTINUOUS         │     │   RAG PIPELINE                  │         │
│  │   LEARNING           │     │   Embeddings │ Vector Store │ Rerank │         │
│  │   (Port 4891)       │     │   (Port 4720-4721)                │         │
│  └──────────────────────┘     └────────────────────────────────┘         │
│                                    │                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    ML PLATFORM (Ports 4710-4742)                   │  │
│  │  Feature Store │ Model Registry │ Model Router │ Training Pipeline    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    LLM PROVIDERS (Port 4730)                      │  │
│  │  Claude │ GPT-4 │ Llama │ Mistral │ Gemini                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Voice Training (Port 4880)

### Location
`hojai-ai/voice-training/`

### Training Scripts

| Script | Purpose |
|--------|---------|
| `fine_tune_models.py` | Fine-tune Whisper for Indian English/Hinglish |
| `train_intent.py` | Train 6-class intent classifier |
| `train_speaker.py` | Speaker verification model |
| `dataset_generator.py` | Generate synthetic training data |
| `cloud_training.py` | Train via Replicate/HuggingFace/Modal |
| `export_models.py` | Export to ONNX/TFLite for mobile |

### Models Trained

| Model | Base | Purpose |
|-------|------|---------|
| Whisper-Hinglish | OpenAI Whisper | Indian English/Hindi speech |
| Intent-Classifier | DistilBERT | 6-class intent detection |
| SpeakerNet | ResNet34 | Voice authentication |
| NER-Model | BiLSTM-CRF | Named entity recognition |

### Training Pipeline

```python
# voice-training/scripts/train_all.py

# 1. Generate synthetic data
python scripts/dataset_generator.py \
  --output ./data/synthetic \
  --num_samples 10000 \
  --languages "en,hi,hinglish"

# 2. Fine-tune Whisper
python scripts/fine_tune_models.py \
  --base_model "openai/whisper-small" \
  --dataset ./data/synthetic \
  --epochs 5 \
  --batch_size 16 \
  --output_dir ./models/whisper-hinglish

# 3. Train intent classifier
python scripts/train_intent.py \
  --model distilbert-base-uncased \
  --dataset ./data/intent_data \
  --num_labels 6

# 4. Export for mobile
python scripts/export_models.py \
  --model ./models/whisper-hinglish \
  --format "onnx,tflite" \
  --target "ios,android"
```

---

## 2. Continuous Learning (Port 4891)

### Architecture

```typescript
// learn.fromEvent() - Learn from any event
import { learn } from '@hojai/continuous-learning';

learn.fromEvent({
  event: 'chat.message',
  data: {
    query: userMessage,
    response: aiResponse,
    outcome: userFeedback
  }
});

// learn.fromCorrection() - Learn from corrections
learn.fromCorrection({
  wrong: incorrectResponse,
  right: correctedResponse,
  context: conversationHistory
});

// learn.fromOutcome() - Learn from outcomes
learn.fromOutcome({
  action: agentAction,
  outcome: businessResult
});
```

### Learning Types

| Type | Source | Update |
|------|--------|--------|
| **Feedback Loop** | User thumbs up/down | Response quality scores |
| **Correction** | Agent corrections | Response patterns |
| **Outcome** | Business results | Action success |
| **Preference** | User behavior | Persona traits |
| **Entity** | Conversations | New entities/relationships |

### Feedback Pipeline

```
User Feedback (👍/👎)
       ↓
Continuous Learning Service (4891)
       ↓
Vector Store Update
       ↓
Response Ranking
       ↓
Future Responses
```

---

## 3. RAG Pipeline (Ports 4720-4721)

### Components

| Component | Port | Purpose |
|-----------|------|---------|
| **Embedding Service** | 4720 | Generate embeddings |
| **pgvector Service** | 4721 | Vector storage |
| **RAG Engine** | 4731 | Retrieval + Generation |

### Embedding Process

```typescript
// 1. Chunk documents
const chunks = await chunker.chunk({
  documents: [article1, article2, ...],
  chunkSize: 512,
  overlap: 64
});

// 2. Generate embeddings
const embeddings = await embeddingService.embed({
  texts: chunks,
  model: 'text-embedding-3-small'
});

// 3. Store in pgvector
await pgvectorService.insert({
  table: 'knowledge_base',
  embeddings,
  metadata: { source, category, createdAt }
});

// 4. Query for retrieval
const results = await pgvectorService.search({
  query: userQuery,
  topK: 5,
  filter: { category: 'support' }
});
```

### RAG Flow

```
User Query
    ↓
Embedding (4720)
    ↓
pgvector Search (4721)
    ↓
Context Assembly
    ↓
LLM Generation (4730)
    ↓
Response
```

---

## 4. Model Registry (Port 4711)

### Purpose
Centralized model versioning and management.

### API

```bash
# Register model
POST /api/models
{
  "name": "intent-classifier",
  "version": "2.0.0",
  "metrics": {
    "accuracy": 0.94,
    "f1": 0.92,
    "latency_ms": 45
  }
}

# Get best model
GET /api/models/intent-classifier/best

# Deploy model
POST /api/models/intent-classifier/2.0.0/deploy
```

### Model Lifecycle

```
Draft → Testing → Staged → Production → Archived
```

---

## 5. Feature Store (Port 4710)

### Purpose
Serve pre-computed ML features in real-time.

### Features

| Category | Features |
|----------|----------|
| **User** | engagement_score, churn_probability, ltv, segments |
| **Product** | popularity, affinity_scores, price_sensitivity |
| **Temporal** | recency, frequency, seasonality |
| **Behavioral** | browse_patterns, purchase_intent_signals |

### API

```bash
# Get features
GET /api/features/user/{userId}
GET /api/features/product/{productId}

# Bulk features
POST /api/features/batch
{
  "users": ["u1", "u2"],
  "features": ["engagement_score", "churn_probability"]
}
```

---

## 6. Training Pipeline (Port 4880)

### Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Retrain Intent | Weekly | Improve NLU |
| Update Embeddings | Daily | Fresh knowledge |
| Fine-tune Whisper | Monthly | Better ASR |
| A/B Test Models | Continuous | Optimize metrics |

### Training Flow

```
┌─────────────┐
│ Data Source │
│ (Kafka/DB) │
└──────┬──────┘
       ↓
┌──────▼──────┐
│ Preprocessing │
└──────┬──────┘
       ↓
┌──────▼──────┐
│ Training Job │
│ (Python/ML) │
└──────┬──────┘
       ↓
┌──────▼──────┐
│ Validation   │
└──────┬──────┘
       ↓
┌──────▼──────┐
│ Model Reg   │
│ (Port 4711)  │
└──────┬──────┘
       ↓
┌──────▼──────┐
│ Deploy/Stage │
└──────────────┘
```

---

## 7. LLM Providers (Port 4730)

### Supported Models

| Provider | Models |
|----------|--------|
| **Claude** | Opus, Sonnet, Haiku |
| **OpenAI** | GPT-4, GPT-3.5 |
| **Local** | Llama 2, Mistral, Phi |
| **Google** | Gemini Pro |

### Routing Logic

```typescript
// model-router decides which model to use

const routeModel = (context: Context) => {
  if (context.complexity === 'high' && context.latency_tolerance === 'low') {
    return 'claude-3-opus';
  }
  if (context.complexity === 'medium') {
    return 'claude-3-sonnet';
  }
  if (context.cost_sensitivity === 'high') {
    return 'gpt-3.5-turbo';
  }
  return 'claude-3-haiku';
};
```

---

## 8. Data Sources for Training

### Feedback Sources

| Source | Type | Volume |
|--------|------|--------|
| Conversations | Text | 10M+/month |
| Support Tickets | Text | 100K+/month |
| Product Interactions | Events | 1B+/month |
| User Feedback | Ratings | 1M+/month |
| Business Outcomes | Results | 10K+/month |

### Data Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Event Bus   │────▶│ Data Lake   │────▶│ Feature    │
│ (Kafka)    │     │ (S3/GCS)  │     │ Store      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Training   │
                    │ Jobs       │
                    └─────────────┘
```

---

## 9. Training Metrics

### Model Performance

| Model | Metric | Target |
|-------|--------|--------|
| Intent Classifier | Accuracy | > 92% |
| Whisper Hinglish | WER | < 15% |
| RAG | Precision@5 | > 85% |
| Churn Model | AUC | > 0.85 |

### Continuous Learning Metrics

| Metric | Current | Target |
|--------|----------|--------|
| Response Quality | 78% | 90% |
| Correction Rate | 12% | < 5% |
| Learning Speed | 24h | 1h |
| Feature Freshness | 4h | 15min |

---

## 10. Training SDK

### Client API

```typescript
import { HojaiTraining } from '@hojai/training';

// Submit training data
await hojaiTraining.submit({
  type: 'correction',
  data: {
    conversationId: 'conv-123',
    query: 'Track my order',
    incorrectResponse: 'Order #123 shipped yesterday',
    correctResponse: 'Order #123 shipped on May 28, arriving May 31'
  }
});

// Get training status
const status = await hojaiTraining.getStatus();
console.log(status.models);
```

### CLI

```bash
# Train specific model
hojai train intent-classifier --data ./feedback_data --epochs 10

# List training jobs
hojai training list

# Monitor training
hojai training logs --job-id abc123
```

---

## Summary

### How Hojai AI Trains

| Layer | Method | Frequency |
|-------|--------|-----------|
| **Voice** | Fine-tune Whisper | Monthly |
| **Intent** | Train DistilBERT | Weekly |
| **RAG** | Update embeddings | Daily |
| **Continuous** | Feedback loops | Real-time |
| **Features** | Stream processing | Real-time |
| **Models** | Model Registry | On-demand |

### Key Training Services

| Port | Service | Purpose |
|------|---------|---------|
| 4710 | Feature Store | Pre-computed features |
| 4711 | Model Registry | Version management |
| 4712 | Model Router | Model selection |
| 4720 | Embedding Service | Generate vectors |
| 4721 | pgvector | Vector storage |
| 4730 | LLM Providers | Model access |
| 4731 | RAG | Knowledge retrieval |
| 4880 | Training Pipeline | Batch training |
| 4891 | Continuous Learning | Real-time learning |

---

**Training Status:** Active
**Models in Production:** 15+
**Training Data:** 10B+ events/month
**Feedback Loop:** Real-time
