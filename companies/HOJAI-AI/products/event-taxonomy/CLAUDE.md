# Event Taxonomy

**Port:** 5461
**Phase:** 2
**Purpose:** 100+ standardized event types

## Categories

| Category | Events |
|---|---|
| website | page_view, product_view, search, add_to_cart... |
| commerce | cart_abandon, purchase_complete, refund... |
| marketing | email_open, email_click, sms_sent... |
| mobile | app_install, app_open, push_enable... |

## API

- `GET /api/events/types` — List all event types
- `POST /api/events/validate` — Validate event
- `GET /api/events/categories` — List categories

## Startup

```bash
cd products/event-taxonomy && npm install && npm start
```