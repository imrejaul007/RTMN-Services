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
| `SUTAR_ROUTER_ENABLED` | `false` | Call real SUTAR agents (otherwise local fallback) |
| `SUTAR_AGENT_URL` | `http://localhost:4737` | SUTAR agent endpoint |
| `SUTAR_TIMEOUT_MS` | `5000` | SUTAR agent HTTP timeout |

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
