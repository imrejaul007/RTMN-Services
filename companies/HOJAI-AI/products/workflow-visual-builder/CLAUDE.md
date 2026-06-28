# Workflow Visual Builder

**Port:** 5462
**Phase:** 2
**Purpose:** Pre-built workflow templates

## Templates

| Template | Category | Impact |
|---|---|---|
| Abandoned Cart | conversion | Rs 50K/mo |
| Welcome Series | onboarding | Rs 20K/mo |
| Win-Back | retention | Rs 30K/mo |
| Post-Purchase | retention | Rs 15K/mo |
| Birthday Campaign | retention | Rs 10K/mo |

## API

- `GET /api/templates` — List templates
- `POST /api/workflows` — Create workflow
- `POST /api/workflows/:id/activate` — Activate

## Startup

```bash
cd products/workflow-visual-builder && npm install && npm start
```