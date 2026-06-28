# Marketing Automation

**Port:** 5459
**Phase:** 2
**Purpose:** 8 automation rules for customer lifecycle

## Rules

| Rule | Trigger | Impact |
|---|---|---|
| Abandoned Cart | cart_abandon | Rs 50K/mo |
| Welcome Series | sign_up | Rs 20K/mo |
| Win-Back | inactive_60d | Rs 30K/mo |
| Post-Purchase | purchase_complete | Rs 15K/mo |
| Birthday | birthday | Rs 10K/mo |
| Lead Nurture | form_submit | Rs 25K/mo |
| Low Stock Alert | low_stock | Prevent losses |
| Replenishment | replenishment_time | Rs 20K/mo |

## API

- `GET /api/rules` — List rules
- `POST /api/rules/:id/execute` — Execute rule
- `GET /api/executions/:companyId` — View executions

## Startup

```bash
cd products/marketing-automation && npm install && npm start
```