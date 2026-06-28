# Workflow Visual Builder

**Port:** 5462
**Purpose:** Pre-built workflow templates, FlowOS integration

## Templates

| Template | Category | Impact |
|---|---|---|
| Abandoned Cart Recovery | conversion | Rs 50K/mo |
| Welcome Series | onboarding | Rs 20K/mo |
| Win-Back Campaign | retention | Rs 30K/mo |
| Post-Purchase Follow-Up | retention | Rs 15K/mo |
| Birthday Campaign | retention | Rs 10K/mo |
| Lead Nurture | lead | Rs 25K/mo |
| Low Stock Alert | operations | Prevent losses |
| Replenishment Reminder | retention | Rs 20K/mo |
| Price Drop Alert | marketing | Rs 15K/mo |
| Subscription Renewal | retention | Rs 40K/mo |

## API

- GET /api/templates — List templates
- POST /api/workflows — Create workflow from template
- PUT /api/workflows/:id — Update workflow
- POST /api/workflows/:id/activate — Activate + register with FlowOS
- POST /api/workflows/validate — Validate workflow
