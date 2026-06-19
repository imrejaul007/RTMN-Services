# Synthetic Data Generation

**Version:** 1.0.0
**Port:** 4777
**Status:** ✅ NEW (June 19, 2026)
**Layer:** HOJAI AI Training & Model Platform (Division 7)

## What This Is

Generates labeled training data from three modes:
- **domain** — pick from 5 built-in banks (customer_support, ecommerce, healthcare, finance, general); gets realistic prompt/completion pairs
- **schema** — generate rows that fit a simple JSON-Schema-ish field map (string, number, boolean, date)
- **seedSet** — generate variations of an existing seed set, maintaining prompt/completion shape

20+ realistic templates per domain. In production this would call the inference-gateway (4770) with a generation prompt; here we ship a deterministic-but-diverse generator that produces real-looking training data.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/generate` | Generate rows → returns a dataset id |
| GET | `/api/datasets` | List generated datasets |
| GET | `/api/datasets/:id` | Get dataset (sample row + count) |
| DELETE | `/api/datasets/:id` | Remove a dataset |
| GET | `/api/domains` | List built-in domain banks |

## Quick Start

```bash
cd services/synthetic-data-generation
npm install
npm start  # port 4777

# Generate 100 healthcare training pairs
curl -X POST http://localhost:4777/api/generate \
  -H "Content-Type: application/json" \
  -d '{"domain":"healthcare","count":100,"name":"health-qa-v1"}'
```

## Integration

- **fine-tuning-pipeline (4776)** — generated datasets can be submitted as training data
- **knowledge-extraction (4784)** — extracted entities can seed dataset generation
- **evaluation-harness (4775)** — synthetic eval sets for regression testing
