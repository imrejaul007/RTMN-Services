# Integration

> How genie-os connects to external repos (DO, Nexha, Salar) and to the 23 specialized Genie services that live in the same parent folder.

## Three integration patterns

### Pattern 1: genie-os → external product repo (via thin client)

genie-os has 3 thin HTTP clients that act as stable local endpoints for the 3 product repos.

```
Browser                          genie-os                              External repo
   │                                │                                       │
   ├── GET /api/do/auth/me ────►   │                                       │
   │                                ├─ do-client (port 8090)               │
   │                                │     │                                 │
   │                                │     └─► http://localhost:3001/api/...│
   │                                │              │                        │
   │                                │              └──► companies/do-app  │
   │                                │                                       │
```

**The chain:** Browser → web (3000) → thin client (8090/8190/8290) → external repo (3001/8000/8200)

**Why a thin client?** The external repo might be deployed anywhere — different server, different port, different domain. The thin client gives genie-os a **stable local endpoint** that doesn't change when the external service moves.

**Code:** `products/do-client/src/index.js` is ~75 lines. It just forwards HTTP requests with header pass-through.

### Pattern 2: runtime/genie → 23 specialized Genie services (in same parent folder)

genie-os's runtime/genie can delegate to any of the 23 sibling services. The 23 services live in `RTMN/companies/HOJAI-AI/products/genie/<name>/` and they're started independently.

```
User asks: "Help me buy a wireless mouse"
   ↓
runtime/genie (genie-os:7100)
   ├── Detects intent: "buy" → DELEGATE
   ↓
POST to genie-shopping-agent (sibling at port 4728)
   ├── genie-shopping-agent returns a shopping session
   └── runtime/genie wraps the response
   ↓
User sees: "I found your shopping session! ..."
```

**The intent detection logic** is in `runtime/genie/src/index.js`:

| User says | Delegated to | Port |
|---|---|---:|
| "buy", "purchase", "order", "shop" | genie-shopping-agent | 4728 |
| "calendar", "meeting", "schedule" | genie-calendar-service | 4709 |
| "budget", "spend", "money", "finance" | genie-money-os | 4715 |
| "health", "sleep", "workout", "mood" | genie-wellness-os | 4717 |
| "briefing" (via /api/briefing) | genie-briefing-service | 4712 |
| anything else | genie-gateway | 4701 |
| (fallback) | runtime/genie (local response) | n/a |

**Configurable via env vars:** `GENIE_SHOPPING_URL`, `GENIE_CALENDAR_URL`, etc. (see `.env`)

### Pattern 3: External repo → runtime/genie (for AI features)

External repos can also call genie-os to get AI features. For example, a DO app might want to use Genie for recommendations.

```
DO app backend (port 3001)
   ↓
Needs AI recommendation
   ↓
GET http://localhost:7100/api/ask
   ↓
runtime/genie returns answer
```

External repos need to:
1. Add `http://localhost:7100` to their `GENIE_URL` (or set in their .env)
2. Use JWT bearer tokens (or call internal-only endpoints with `x-internal-token`)

## Configuration

All integration is controlled by `.env` in genie-os root:

```bash
# === EXTERNAL REPO URLS ===
DO_BACKEND_URL=http://localhost:3001         # companies/do-app
NEXHA_URL=http://localhost:8000              # companies/Nexha
SALAR_URL=http://localhost:8200              # HOJAI-AI/salar

# === 23 SIBLING GENIE SERVICES (parent folder) ===
GENIE_GATEWAY_URL=http://localhost:4701
GENIE_SHOPPING_URL=http://localhost:4728
GENIE_BRIEFING_URL=http://localhost:4712
GENIE_CALENDAR_URL=http://localhost:4709
GENIE_MONEY_URL=http://localhost:4715
GENIE_WELLNESS_URL=http://localhost:4717
GENIE_WAKE_WORD_URL=http://localhost:4767
GENIE_LISTENING_MODES_URL=http://localhost:4768
GENIE_DEVICE_INTEGRATION_URL=http://localhost:4769

# === GENIE-OS OWN SERVICES (used by thin clients + web) ===
GENIE_URL=http://localhost:7100              # runtime/genie
DO_CLIENT_URL=http://localhost:8090
NEXHA_CLIENT_URL=http://localhost:8190
SALAR_CLIENT_URL=http://localhost:8290
WEB_PORT=3000
```

## Startup order

**Important:** External repos must be running BEFORE the genie-os thin clients are useful. But the genie-os services can start in any order; they self-recover from connection failures.

Recommended order:

```bash
# 1. External repos (in their own terminals)
cd /Users/rejaulkarim/Documents/RTMN/companies/do-app
npm run dev:backend  # port 3001

cd /Users/rejaulkarim/Documents/RTMN/companies/Nexha/commerce-identity
npm run dev  # port 8000

cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/salar
npm start  # port 8200

# 2. genie-os (starts all 14 services)
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie/genie-os
npm run start:all

# 3. (Optional) The 23 specialized Genie services (each in its own terminal)
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie/genie-gateway
npm install && npm start
# ... (22 more)
```

## How the 3 thin clients work

Each thin client is a simple HTTP forwarder. Here's the full code of `do-client/src/index.js`:

```javascript
import express from 'express';
import axios from 'axios';
// ... boilerplate ...

app.use('/api/:product', async (req, res) => {
  try {
    const restPath = req.url; // e.g. "/auth/signup"
    const targetUrl = `${DO_BACKEND_URL}/api${restPath}`;
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'content-type': 'application/json',
        ...(req.headers.authorization && { authorization: req.headers.authorization }),
        ...(req.headers['x-internal-token'] && { 'x-internal-token': req.headers['x-internal-token'] }),
      },
      timeout: 15000,
      validateStatus: () => true,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(502).json({ success: false, error: { code: 'PROXY_ERROR', message: `Failed to reach ${DO_BACKEND_URL}: ${err.message}` } });
  }
});
```

**The key insight:** The thin client adds `/api` back to the path (Express strips it from `req.url`) and forwards. Headers (especially auth) are passed through.

## How runtime/genie delegates to specialists

The delegation logic is in `runtime/genie/src/index.js`. Here's the relevant code:

```javascript
app.post('/api/ask', authMiddleware, async (req, res, next) => {
  const { question } = req.body;
  const lower = question.toLowerCase();

  // Intent detection
  if (lower.includes('buy') || lower.includes('shop')) {
    return callInternal(`${GENIE_SHOPPING_URL}/api/session`, 'POST', { ... });
  }
  if (lower.includes('calendar')) {
    return callInternal(`${GENIE_CALENDAR_URL}/api/calendar/events`, 'GET');
  }
  // ... 5 more intents ...

  // Fallback: try genie-gateway (which knows about all 23)
  const res = await callInternal(`${GENIE_GATEWAY_URL}/api/query`, 'POST', { ... });
  if (res && res.data && res.data.answer) {
    return res.json({ success: true, data: { answer: res.data.answer, delegated_to: 'genie-gateway' } });
  }

  // Last resort: local response
  return res.json({ success: true, data: { answer: 'Hi! How can I help?' } });
});
```

**The fallback chain:** Specific specialist → genie-gateway (knows all 23) → local response.

**Graceful degradation:** If a specialist is down, the call returns `null` and the next fallback kicks in. The user never sees a hard error.

## How to add a new integration

### Add a new external product
1. Create `products/<name>-client/` following the do-client pattern
2. Add the client port to `.env` and `infrastructure/scripts/start-all.js`
3. Add the upstream URL to `.env` (e.g., `NEWPRODUCT_URL=http://localhost:9999`)
4. Add a thin client test in `products/<name>-client/test/test.js`
5. Update `frontend/web/server.js` to proxy `/api/<name>` to the new client
6. Update `frontend/web/public/index.html` to add a tab for the new product
7. Document it in `docs/SERVICES.md`

### Add a new Genie specialist
1. Add the service URL to `runtime/genie/src/index.js` constants
2. Add a new intent detection block in the `/api/ask` handler
3. Test by starting both genie-os and the new specialist

## See also

- [QUICKSTART.md](QUICKSTART.md) — 5-minute setup
- [ARCHITECTURE.md](ARCHITECTURE.md) — overall architecture
- [SERVICES.md](SERVICES.md) — every service catalog
- [DEVELOPMENT.md](DEVELOPMENT.md) — for contributors
