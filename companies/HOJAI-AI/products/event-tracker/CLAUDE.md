# Event Tracker

**Port:** 5453
**Purpose:** Tracks 100 events on websites for HOJAI SiteOS analytics

## What It Does

Tracks website events (page views, clicks, conversions, etc.) and provides analytics.

## 25 Core Event Types

page_view, product_view, search, add_to_cart, cart_remove, checkout_start, checkout_fail, payment_complete, purchase_complete, sign_up, login, logout, email_subscribe, email_unsubscribe, profile_update, widget_open, widget_close, chat_start, chat_message, voice_use, cta_click, exit_intent, form_start, form_submit, form_abandon, cart_abandon, order_complete, order_cancel, refund_request, ticket_create, ticket_resolve, email_open, email_click, sms_sent, push_sent, whatsapp_click, scroll_25, scroll_50, scroll_75, scroll_90, first_purchase, repeat_purchase, subscription_start, subscription_cancel

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/events/track` | Track single event |
| POST | `/api/events/batch` | Track batch (max 100) |
| GET | `/api/events/summary/:visitorId` | Visitor event summary |
| GET | `/api/events/page/:pageId` | Page event stats |
| GET | `/api/events/funnel/:companyId` | Funnel metrics |
| GET | `/api/events/types` | List supported event types |

## Startup

```bash
cd products/event-tracker && npm install && npm start  # Port 5453
```
