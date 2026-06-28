# Event Taxonomy

**Port:** 5461
**Purpose:** 100+ standardized event types organized by category

## Categories

| Category | Events |
|---|---|
| website | page_view, product_view, search, add_to_cart, checkout_start, etc. |
| user | sign_up, login, email_subscribe, profile_update |
| engagement | widget_open, chat_start, cta_click, exit_intent |
| commerce | cart_abandon, purchase_complete, refund_request |
| marketing | email_open, email_click, sms_sent, push_sent |
| support | ticket_create, ticket_resolve |
| funnel | pricing_view, wishlist_add, back_to_cart |
| mobile | app_install, app_open, push_enable |
| attribution | utm_seen, paid_ad_click, organic_search |

## Total: 100+ event types

## API

- GET /api/events/types — List all event types
- GET /api/events/categories — List categories
- POST /api/events/validate — Validate an event type
