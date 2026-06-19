# Fine-Tuning Pipeline

**Version:** 1.0.0
**Port:** 4776
**Status:** ✅ NEW (June 19, 2026)
**Layer:** HOJAI AI Training & Model Platform (Division 7)

---

## What This Is

The **Fine-Tuning Pipeline** orchestrates the full lifecycle of taking a base LLM and producing a tuned version for a specific task or customer. It is the core "training" service in the HOJAI AI Training & Model Platform (Division 7).

It supports the major PEFT (Parameter-Efficient Fine-Tuning) methods:
- **LoRA** (Low-Rank Adaptation) — default
- **QLoRA** (4-bit quantized base + LoRA adapters) — for fitting 70B-class models on a single A100
- **Prefix Tuning** — for low-overhead domain adaptation
- **IA³** — fewer params than LoRA, same quality at smaller scale
- **Full fine-tune** — for high-stakes, high-budget cases

The service provides the full lifecycle: dataset registration, job submission, GPU queueing, simulated training loop with realistic loss curves, checkpoint management, and a 5-method / 7-base-model catalog.

In production this would shell out to:
- `peft` + `transformers` (Python) for the actual training
- `trl` for RLHF
- `bitsandbytes` for quantization
- `vLLM` / `TGI` for serving the resulting adapter

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Service health + stats |
| POST | `/api/datasets` | Register a training dataset |
| GET | `/api/datasets` | List all datasets |
| GET | `/api/datasets/:id` | Get a dataset |
| DELETE | `/api/datasets/:id` | Remove a dataset |
| POST | `/api/jobs` | Submit a training job |
| GET | `/api/jobs` | List jobs (optional `?status=`) |
| GET | `/api/jobs/:id` | Get job + live progress |
| POST | `/api/jobs/:id/cancel` | Cancel a running job |
| GET | `/api/queue` | GPU queue (ordered by priority) |
| GET | `/api/checkpoints` | List checkpoints (optional `?jobId=`) |
| GET | `/api/checkpoints/:id` | Get a checkpoint |
| GET | `/api/methods` | LoRA/PEFT method catalog |
| GET | `/api/base-models` | Supported base models |

## Quick Start

```bash
cd services/fine-tuning-pipeline
npm install
npm start  # port 4776
```

## Example: Submit a LoRA fine-tune

```bash
# 1. Register a dataset
DATASET=$(curl -s -X POST http://localhost:4776/api/datasets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "support-copilot-finetune",
    "rows": [
      {"prompt": "How do I reset my password?", "completion": "Go to Settings > Security > Reset Password."},
      {"prompt": "What is your refund policy?", "completion": "30-day money-back guarantee, no questions asked."}
    ]
  }')
DATASET_ID=$(echo $DATASET | jq -r '.dataset.id')

# 2. Submit a job
curl -X POST http://localhost:4776/api/jobs \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"support-copilot-v1\",
    \"datasetId\": \"$DATASET_ID\",
    \"baseModel\": \"llama-3-8b\",
    \"method\": \"lora\",
    \"loraRank\": 16,
    \"learningRate\": 2e-4,
    \"epochs\": 3
  }"

# 3. Poll progress
curl http://localhost:4776/api/jobs/<jobId>
```

## Integration Points

- **model-registry (4773)** — registered models + adapters are published to the registry
- **prompt-manager (4771)** — system prompts and few-shot examples feed into training datasets
- **evaluation-harness (4775)** — every checkpoint is auto-evaluated against the harness
- **ai-intelligence (4881)** — `fine-tune` capability exposed via ai-intelligence
- **inference-gateway (4770)** — fine-tuned adapters loaded at runtime by the gateway
