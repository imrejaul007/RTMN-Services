# Marketing Automation

**Port:** 5459
**Purpose:** 8 automation rules for customer lifecycle

## Rules

| Rule | Trigger | Actions |
|---|---|---|
| Abandoned Cart | cart_abandon | WhatsApp@15m → Email@6h → SMS@24h |
| Welcome Series | sign_up | 3-email over 7 days |
| Win-Back | inactive 60d | Email → WhatsApp → SMS |
| Post-Purchase | purchase_complete | Thank you → Review → Loyalty |
| Birthday | birthday | WhatsApp + Email with coupon |
| Low Stock Alert | low_stock | Notify sales |
| Price Drop | price_reduction | Notify watchers |
| Replenishment | replenishment_time | Remind to reorder |

## API

- GET /api/rules — List all rules
- GET /api/rules/:id — Get rule details
- PUT /api/rules/:id — Update rule
- POST /api/rules/:id/execute — Execute rule
- GET /api/executions/:companyId — View executions
