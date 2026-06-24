# HOJAI Widget Backend

> **Port:** 5380
> **Purpose:** Receives visitor messages from the HOJAI Widget (5KB browser JS), classifies intent, enriches with REZ Intelligence, routes to the right SUTAR agent, and returns a natural-language reply (with optional rich content: products, bookings, time slots).

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/widget/message` | Main handler — visitor message → AI reply |
| `GET` | `/api/v1/widget/intents` | List of supported intents + agents |
| `POST` | `/api/v1/widget/identify` | Bind visitor → user identity (for memory) |
| `GET` | `/api/v1/widget/conversation/:visitorId` | Fetch conversation history |
| `GET` | `/health` | Health check |
| `GET` | `/ready` | Readiness (incl. REZ Intel health) |
| `GET` | `/rez-intel-status` | REZ Intel connection status |

---

## Architecture

```
Widget (browser, 5KB)
    │  POST /api/v1/widget/message
    ↓
Widget Backend (:5380)
    ├─→ Intent Engine (local keyword classifier + REZ Intel fallback)
    ├─→ REZ Intel (:5370)  ← enrichment (customer insights, intent)
    └─→ SUTAR Agent Router
            ├─→ merchant-agents (:4737) for commerce
            ├─→ sales-copilot (:4928) for sales
            ├─→ support-copilot for support
            ├─→ booking agents for appointments
            └─→ Local fallback builders (when agents unavailable)
    ↓
Natural-language reply + optional rich content
```

---

## Message Flow

1. **Receive** — `{ companyId, visitorId, message, user?, context?, history[] }`
2. **Classify intent** — try REZ Intel `/api/v1/intent/classify` → fallback to local keyword classifier
3. **Enrich** — REZ Intel `/api/v1/agent/enrich` (graceful if unavailable)
4. **Route** — try SUTAR agent (e.g. `merchant-agents/api/agents/run`) → fallback to local reply builder
5. **Persist** — both messages stored in `conversations` Map (in-memory for MVP)
6. **Reply** — `{ reply, rich, intent, agent, confidence, enriched }`

---

## Supported Intents (10)

| Intent | Agent | Examples |
|---|---|---|
| `greeting` | assistant | "hi", "hello" |
| `product_search` | sales | "show me black hoodies" |
| `place_order` | commerce | "order 2 pizzas" |
| `book_appointment` | booking | "book a table for 2" |
| `track_order` | support | "where is my order?" |
| `get_support` | support | "I want a refund" |
| `ask_question` | assistant | "what are your hours?" |
| `negotiate_price` | sales | "can you do 10% off?" |
| `request_quote` | sales | "quote for 500 units" |
| `subscribe` | commerce | "upgrade my plan" |

---

## Rich Content Types

The backend returns `rich` payloads that the widget renders inline:

| Type | Shape |
|---|---|
| `products` | `{ items: [{ id, name, price, image, url }] }` |
| `time_slots` | `{ slots: [{ time, available }] }` |
| `tickets` | `{ items: [...] }` |
| `cart_prompt` / `booking_prompt` / `pricing_prompt` / `quote_form` | `{ type }` |
| `order_lookup` | `{ type }` |
| `subscription_actions` | `{ type }` |
| `faq` | `{ source }` |

---

## Auth

By default, the service requires `Authorization: Bearer <key>` header. Override:

```bash
WIDGET_REQUIRE_AUTH=false   # dev mode (no auth)
WIDGET_REQUIRE_AUTH=true    # production mode
HOJAI_API_KEY=secret        # the expected key
```

The widget sends `pk_live_...` or `pk_test_...` keys which are accepted by default.

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `WIDGET_BACKEND_PORT` | `5380` | Server port |
| `HOJAI_API_KEY` | `dev-key` | Required API key (when auth enabled) |
| `WIDGET_REQUIRE_AUTH` | `true` | Enforce Bearer auth |
| `REZ_INTEL_URL` | `http://localhost:5370` | REZ Intelligence service |
| `REZ_INTEL_ENABLED` | `true` | Toggle REZ Intel integration |
| `REZ_INTEL_TIMEOUT_MS` | `3000` | REZ Intel HTTP timeout |
| `SUTAR_MERCHANT_AGENTS_URL` | `http://localhost:4737` | merchant-agents endpoint |
| `SUTAR_MERCHANT_AGENTS_ENABLED` | `true` | Enable merchant-agents routing |
| `SUTAR_MERCHANT_AGENTS_AUTH` | (none) | Auth header for merchant-agents (e.g. `x-internal-token: secret`) |
| `SUTAR_SUPPORT_COPILOT_URL` | `http://localhost:4453` | support-copilot endpoint |
| `SUTAR_SUPPORT_COPILOT_ENABLED` | `true` | Enable support-copilot routing |
| `SUTAR_SALES_COPILOT_URL` | `http://localhost:4928` | sales-copilot endpoint |
| `SUTAR_SALES_COPILOT_ENABLED` | `true` | Enable sales-copilot routing |
| `SUTAR_ACN_HUB_URL` | `http://localhost:4852` | acn-hub endpoint |
| `SUTAR_ACN_HUB_ENABLED` | `true` | Enable acn-hub routing |
| `SUTAR_TIMEOUT_MS` | `4000` | SUTAR agent HTTP timeout |

### Auth header format

`SUTAR_*_AUTH` accepts either:
- `Bearer xyz123` → forwards as `Authorization: Bearer xyz123`
- `x-internal-token: mysecret` → forwards as `x-internal-token: mysecret`
- `xyz123` (no colon) → forwards as `Authorization: Bearer xyz123`

This lets you wire either JWT-based or service-to-service tokens without code changes.

---

## SUTAR Agent Routing

The backend dispatches each classified intent to a real SUTAR agent when one is reachable, falling back to local reply builders otherwise. Per-intent routing:

| Intent | Agent | Wire format |
|---|---|---|
| `product_search` | merchant-agents | `POST /api/merchants/:id/message` (ACP QUERY) |
| `place_order` | merchant-agents | `POST /api/merchants/:id/message` (ACP ORDER) |
| `negotiate_price` | merchant-agents | `POST /api/merchants/:id/message` (ACP COUNTER) |
| `request_quote` | merchant-agents | `POST /api/merchants/:id/message` (ACP QUOTE) |
| `track_order` | merchant-agents | `GET /api/merchants/:id/track/:orderId` |
| `get_support` | support-copilot | `POST /api/suggest` |
| `ask_question` | sales-copilot | `POST /api/recommend` |
| `greeting`, `subscribe`, `book_appointment` | (local) | n/a — generated locally |

The `merchantId` is resolved automatically by:
1. `GET /api/merchants?companyId=<X>` first
2. Fall back to first merchant in `GET /api/merchants`
3. Prefer matching `companyId` / `businessId` / `id`
4. Return null if no merchants exist (fallback to local)

When a real agent is called, the response goes through a **shaper** that:
- Maps ACP types (`QUOTE`, `OFFER`, `ACCEPT`, `REJECT`, `COUNTER`) → natural language
- Extracts products, quotes, orders, tickets → `rich` payload for the widget
- Formats prices, currencies, delivery dates

The widget response includes `routingSource`:
- `sutar-merchantAgents` / `sutar-supportCopilot` / `sutar-salesCopilot` — real agent
- `local-builder` — fallback (real agent unreachable or returned non-2xx)

Inspect live status at `GET /api/v1/widget/agents` — returns endpoints, intent map, and health for each SUTAR agent.

---

## Quick Start with merchant-agents

```bash
# 1. Start merchant-agents with service-to-service token
cd companies/HOJAI-AI/sutar-os/agents/merchant-agents
INTERNAL_SERVICE_TOKEN=widget-internal-secret PORT=4737 node src/index.js &

# 2. Start widget backend wired to merchant-agents
cd companies/HOJAI-AI/products/widget-backend
WIDGET_REQUIRE_AUTH=false \
  SUTAR_MERCHANT_AGENTS_URL=http://localhost:4737 \
  SUTAR_MERCHANT_AGENTS_AUTH="x-internal-token: widget-internal-secret" \
  npm start &

# 3. Create a merchant + product (one-time setup)
curl -X POST http://localhost:4737/api/merchants \
  -H "x-internal-token: widget-internal-secret" \
  -H "Content-Type: application/json" \
  -d '{"id":"maya","name":"Maya","businessId":"maya","businessName":"Maya","industry":"fashion","type":"retail","rules":{"negotiationRounds":3}}'

curl -X POST http://localhost:4737/api/merchants/maya/products \
  -H "x-internal-token: widget-internal-secret" \
  -H "Content-Type: application/json" \
  -d '{"id":"hoodie-black","name":"Black Cotton Hoodie","price":1999,"categories":["hoodies"]}'

# 4. Test the widget → merchant-agents flow
curl -X POST http://localhost:5380/api/v1/widget/message \
  -H 'Content-Type: application/json' \
  -d '{"companyId":"maya","visitorId":"v1","message":"show me black hoodies"}'

# Response:
# {
#   "success": true,
#   "data": {
#     "reply": "Here's a quote for Black Cotton Hoodie: USD 1999 per unit. Delivery by 6/29/2026.",
#     "rich": { "type": "quote", "offer": {...}, "terms": {...} },
#     "intent": "product_search",
#     "routingSource": "sutar-merchantAgents"
#   }
# }
```

---

## Run

```bash
cd companies/HOJAI-AI/products/widget-backend
npm install
npm start

# Tests
npm test
```

---

## Demo

`demo/index.html` shows the widget in action — chat bubble in bottom-right, sample products, test prompts.

Open it in a browser after starting both this backend and serving the widget bundle.

---

## Files

```
widget-backend/
├── package.json
├── CLAUDE.md
├── src/
│   ├── index.js              # Express app + routes
│   ├── intent-engine.js      # Intent classification (REZ + local)
│   ├── rez-intel-client.js   # REZ Intelligence wrapper
│   ├── sutar-router.js       # SUTAR agent dispatch + local fallback
│   └── __tests__/
│       ├── intent.test.js    # 15 intent + routing tests
│       └── api.test.js       # 10 HTTP integration tests
└── demo/
    └── index.html            # Working demo page
```
