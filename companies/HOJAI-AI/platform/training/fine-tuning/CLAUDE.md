# Fine-tuning Platform — Foundation Models Orchestration

> Phase 30 of the HOJAI AI 40-phase plan.
> Manages LLM fine-tuning jobs: datasets, training, model registry, metrics.

## Quick Start

```bash
cd platform/training/fine-tuning
npm install
npm start        # Port 4610
npm test         # vitest
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/datasets` | Create dataset |
| GET | `/api/datasets` | List datasets |
| GET | `/api/datasets/:id` | Get dataset |
| DELETE | `/api/datasets/:id` | Delete dataset |
| POST | `/api/datasets/:id/prepare` | Format & tokenize |
| POST | `/api/jobs` | Create training job |
| GET | `/api/jobs` | List jobs |
| GET | `/api/jobs/:id` | Get job |
| POST | `/api/jobs/:id/start` | Start training |
| POST | `/api/jobs/:id/cancel` | Cancel job |
| POST | `/api/jobs/:id/queue` | Queue job |
| GET | `/api/jobs/:id/metrics` | Training metrics |
| GET | `/api/jobs/:id/metrics/trend` | Metrics over time |
| POST | `/api/jobs/:id/metrics/seed` | Seed mock metrics |
| GET | `/api/models` | List fine-tuned models |
| GET | `/api/models/:id` | Get model |
| POST | `/api/models/:id/archive` | Archive model |
| POST | `/api/models/:id/deploy` | Deploy model |

## Supported Models

llama-3-8b, llama-3-70b, llama-3.1-8b, llama-3.1-70b, mistral-7b, mistral-8x7b, mixtral-8x22b, phi-3-mini, phi-3-medium, gemma-2b, gemma-7b

## Supported Formats

jsonl, csv, parquet, sft, rlhf

## Quantization

4bit, 8bit, none

## Architecture

- **Dataset Manager**: CRUD, format detection, preparation
- **Training Job**: state machine (draft→queued→training→done/failed)
- **Model Registry**: versioning, checkpoints, deployment
- **Metrics Collector**: per-step loss/accuracy tracking
- File-based JSON storage (no MongoDB)

## Env vars

- `PORT` — server port (default 4610)
- `DATA_DIR` — data storage directory
- `GPU_SERVICE_URL` — external GPU training service
- `INFERENCE_SERVICE_URL` — LLM Gateway URL
