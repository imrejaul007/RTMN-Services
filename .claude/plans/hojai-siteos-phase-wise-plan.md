# HOJAI SiteOS — Phase-Wise Implementation Plan
## Based on Deep Code Audit + Vision (June 2026)

> **Audit date:** 2026-06-27
> **Plan version:** 1.0
> **Codebase completion:** ~15-20% of full vision

---

## Audit Summary

| Metric | Value |
|---|---|
| Files audited | 15 |
| Lines of code | ~2,800 |
| Bugs found | 23 |
| P0 (critical) | 2 |
| P1 (high) | 8 |
| P2 (medium) | 13 |
| Tests | ~104 passing |
| Bundle size | 37KB raw (vs 5KB spec) |
| Languages | 19 (vs 50+ spec) |
| SDKs | 2 of 11 spec-listed |
| Integrations | 0 of 20+ needed |

---

## Phase 0: Critical Bug Fixes (Week 0-1)

**Prerequisite — nothing else matters if these aren't fixed first.**

### Bug Fixes

| # | Bug | File | Fix |
|---|---|---|---|
| BUG-01 | Auth accepts any `pk_live_*` key — no key store validation | `widget-backend/src/index.js:33` | Implement per-company API key validation against DB or `HOJAI_API_KEY` env var |
| BUG-02 | Shopify API key in public metafield | `widget-install/shopify/hojai-widget.liquid:17` | Remove key from Shopify metafield. Store in HOJAI system. Use webhook verification. |
| ~~BUG-03~~ | ~~Backend `package.json` missing dependencies~~ | ~~`widget-backend/package.json`~~ | **FALSE POSITIVE** — `package.json` already declares `express`, `cors`, `helmet`, `morgan`, `uuid`. Dependencies ARE present. |
| BUG-04 | In-memory Map loses all data on restart | `widget-backend/src/index.js:106,360` | Add MongoDB persistence (use existing `MemoryOS` at port 4703) |
| BUG-05 | WhatsApp sessions in-memory, lost on restart | `widget-backend/src/channels/whatsapp.js:36` | Persist sessions to MongoDB with TTL |
| BUG-06 | No rate limiting on `/message` endpoint | `widget-backend/src/index.js:198-303` | Add `express-rate-limit` — 100 req/min per companyId |
| BUG-07 | CORS wide open | `widget-backend/src/index.js:50` | Whitelist: `cdn.hojai.ai`, `hojai.ai`, customer domains |
| BUG-08 | WhatsApp webhook has no HMAC verification | `widget-backend/src/channels/whatsapp.js` | Implement Meta WhatsApp webhook verification (check `hub.mode`, `hub.verify_token`, `hub.challenge`) |
| BUG-09 | `useImperativeHandle` wrong deps in React SDK | `hojai-widget-react/src/index.tsx:78-91` | Fix dependency array — wrap methods in `useCallback` |
| BUG-10 | `visitorId` uses `Math.random()` | `hojai-widget-core/src/index.ts:440-453` | Replace with `crypto.randomUUID()` |

### Missing from CLAUDE.md but not implemented (AUDIT GAPS)

| # | Missing | Evidence | Phase |
|---|---|---|---|
| MISS-01 | `examples/shopify-app/` scaffold (OAuth + App Bridge) | CLAUDE.md line 48: "scaffold at `examples/shopify-app/`" — does NOT exist | Phase 1 |
| MISS-02 | `examples/webflow-app/` scaffold (Designer Extension) | CLAUDE.md line 50: "scaffold at `examples/webflow-app/`" — does NOT exist | Phase 3 |
| MISS-03 | WordPress `readme.txt` for WordPress.org submission | CLAUDE.md line 49: "needs `readme.txt`" — does NOT exist | Phase 1 |
| MISS-04 | WordPress plugin uses MIT license, WordPress.org requires GPL-2.0+ | CLAUDE.md line 49: "currently MIT" — needs license change | Phase 1 |

### Immediate Wins (also in Phase 0)

| # | Task | Impact |
|---|---|---|
| WIN-01 | Add `widget.js` build + CDN deploy pipeline | `widget-backend/src/index.js` already serves it at `GET /widget.js` — needs `dist/` to exist |
| WIN-02 | Run actual bundle size check in CI | Add `gzip -c dist/index.mjs \| wc -c` to build script |
| WIN-03 | Fix `bizora/src/widgets.ts` hardcoded localhost | Change line 20 to respect passed `config.baseUrl` |
| WIN-04 | Add `identify` endpoint payload size limit | Cap at ~10KB in `widget-backend/src/index.js:305-315` |
| WIN-05 | Add structured error logging in `callAgent` | Log `{ error, status, url }` instead of silent `null` returns |

**Phase 0 deliverables:** Production-safe widget with working installs, no security holes.
**Phase 0 time:** 1 week, 1 engineer.

---

## Phase 1: Working AI Salesperson Widget (Weeks 1-4)

**Goal:** A widget that businesses can install in < 5 minutes that actually sells and supports.

### 1.1 Rich Content Rendering (P0 — the core missing feature)

**File:** `hojai-widget-core/src/index.ts`

```typescript
// BUG-15 fix: Add rich content rendering in _renderMessage()
// Replace el.textContent = m.content with rich renderer

private _renderMessage(m: WidgetMessage): void {
  const list = this.rootEl?.querySelector('.hojai-messages');
  if (!list) return;
  const el = document.createElement('div');
  el.className = `hojai-msg hojai-msg-${m.role}`;

  if (m.rich) {
    this._renderRichContent(el, m.rich);
  } else {
    el.textContent = m.content;
  }

  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

private _renderRichContent(el: HTMLElement, rich: any): void {
  switch (rich.type) {
    case 'products':
      // Render product cards with image, price, "Add to Cart" button
      rich.items.forEach((product: Product) => {
        const card = document.createElement('div');
        card.className = 'hojai-product-card';
        card.innerHTML = `
          <img src="${product.image}" alt="${product.name}" />
          <div class="hojai-product-info">
            <strong>${product.name}</strong>
            <span>₹${product.price}</span>
            <button onclick="window.hojaiWidget.send('I want ${product.name}')">Add</button>
          </div>
        `;
        el.appendChild(card);
      });
      break;
    case 'quote':
      // Render quote block with approve/reject buttons
      el.innerHTML = `
        <div class="hojai-quote">
          <strong>Quote for ${rich.productName}</strong>
          <p>Price: ₹${rich.price}</p>
          <p>Delivery: ${rich.delivery}</p>
          <div class="hojai-quote-actions">
            <button class="hojai-btn-accept">Approve</button>
            <button class="hojai-btn-counter">Counter</button>
          </div>
        </div>
      `;
      break;
    case 'time_slots':
      // Render booking slot selector
      el.innerHTML = `<div class="hojai-slots">
        ${rich.slots.map((s: string) => `
          <button onclick="window.hojaiWidget.send('Book ${s}')">${s}</button>
        `).join('')}
      </div>`;
      break;
    case 'order_confirmation':
      el.innerHTML = `
        <div class="hojai-order-confirm">
          <strong>✅ Order #${rich.orderId} confirmed!</strong>
          <p>Tracking: ${rich.trackingLink}</p>
        </div>
      `;
      break;
    case 'support_suggestions':
      el.innerHTML = rich.suggestions.map((s: string) =>
        `<button onclick="window.hojaiWidget.send('${s}')">${s}</button>`
      ).join('');
      break;
    default:
      el.textContent = rich.text || '';
  }
}
```

**Types to add:**
```typescript
interface RichProduct { id: string; name: string; price: number; image: string; url?: string; }
interface RichQuote { type: 'quote'; productName: string; price: number; delivery: string; }
interface RichSlots { type: 'time_slots'; slots: string[]; }
interface RichOrder { type: 'order_confirmation'; orderId: string; trackingLink?: string; }
type RichContent = { type: string; items?: RichProduct[] } | RichQuote | RichSlots | RichOrder;
interface WidgetMessage { role: string; content: string; rich?: RichContent; timestamp?: number; }
```

### 1.2 Shopify OAuth App (replacing Liquid snippet)

**Why:** The current Liquid snippet leaks the API key and isn't a real Shopify app.

**Architecture:**
```
Shopify App Store
↓
OAuth 2.0 (token exchange)
↓
HOJAI Cloud (stores tokens per shop)
↓
Widget embeds via App Proxy (secure API calls)
```

**Deliverables:**
- `widget-install/shopify-app/server/` — Express server with Shopify OAuth
- `widget-install/shopify-app/server/routes/auth.js` — OAuth flow
- `widget-install/shopify-app/server/routes/widget.js` — App Proxy for widget config
- `widget-install/shopify-app/server/routes/webhook.js` — Shopify webhooks (app uninstall, etc.)
- `widget-install/shopify-app/server/services/shopify.js` — Shopify API client (via `@shopify/shopify-api`)
- `widget-install/shopify-app/frontend/` — Embedded React settings UI
- `widget-install/shopify-app/app-block/` — Shopify Checkout Extension (render in checkout)
- `widget-install/shopify-app/dist/` — Built app for Shopify deployment

**Install flow:**
1. Merchant installs from Shopify App Store
2. Redirects to HOJAI OAuth → merchant approves
3. Token stored in HOJAI DB (NOT Shopify metafields)
4. Widget served via App Proxy with merchant config
5. Widget loaded on storefront with merchant's API key

**Files to create:** ~25 files

### 1.3 WordPress Plugin v2 (proper activation/deactivation)

**Deliverables:**
- `widget-install/wordpress-v2/hojai-widget.php` — Complete rewrite
- Uninstall handler (remove all options + database tables)
- Deactivation handler (preserve settings)
- Settings page with:
  - API key input + validation (calls backend `/ready`)
  - Company ID input
  - Widget position (bottom-left, bottom-right, inline)
  - Primary color picker
  - Custom greeting text
  - Page targeting (show on all pages / specific pages / exclude pages)
  - WooCommerce integration toggle
  - Shortcode `[hojai_widget]`
- Gutenberg block for `[hojai_widget]`
- REST API endpoint for frontend JS (secure key exchange)
- GDPR compliance section:
  - Cookie consent checkbox
  - Privacy policy URL field
  - Data deletion endpoint (`/wp-json/hojai/v1/delete-data`)
- WordPress.org submission files:
  - `readme.txt` (with proper markdown)
  - `LICENSE` (GPL-2.0, required by WordPress.org)
  - `uninstall.php`

### 1.4 WooCommerce Integration

**Deliverables:**
- Detect WooCommerce automatically
- Sync product catalog → widget product search
- Track WooCommerce events:
  - `add_to_cart` → backend event
  - `checkout_start` → backend event
  - `order_complete` → backend event
  - `order_cancel` → backend event
- Show order status in widget chat
- Abandoned cart detection (WooCommerce session)
- Product recommendations from WooCommerce catalog

### 1.5 Conversation Quota + Free Tier Enforcement

**Backend additions:**
```javascript
// Track conversations per company per month
// Free tier: 100 conversations/month
// Starter: 1,000, Growth: 10,000, Business+: unlimited

const QUOTAS = {
  free: 100,
  starter: 1000,
  growth: 10000,
  business: Infinity
};

// Middleware: checkAndDecrementQuota(companyId, plan)
// Returns 429 if quota exceeded
// Returns upgrade prompt in response body
```

### 1.6 Basic Customer Twin (Phase 1 lite)

**Backend:** Extend conversation storage to include:
```javascript
{
  visitorId: string,
  companyId: string,
  messages: Message[],
  user: { name, email, phone } | null,
  events: WebsiteEvent[],      // ← NEW
  profile: CustomerProfile {}, // ← NEW
  lastSeen: timestamp,
  intentHistory: string[],
  totalConversations: number
}
```

**Frontend event tracking:**
```typescript
// In widget-core, add trackEvent() method
trackEvent(name: string, properties?: Record<string, any>): void {
  // Send to backend: POST /api/v1/widget/event
  // Backend stores in Customer Twin
}
```

**Track these events in Phase 1:**
- `page_view` (on widget load, send referrer/page)
- `chat_opened`
- `message_sent`
- `voice_used`
- `cta_clicked`
- `exit_intent`

### Phase 1 Deliverables

| # | Deliverable | Status |
|---|---|---|
| 1.1 | Rich content rendering (products, quotes, slots, orders) | NEW |
| 1.2 | Shopify OAuth app (replaces Liquid snippet) | NEW |
| 1.3 | WordPress plugin v2 (GDPR, Gutenberg, uninstall) | NEW |
| 1.4 | WooCommerce integration (event tracking, product sync) | NEW |
| 1.5 | Conversation quota + free tier enforcement | NEW |
| 1.6 | Basic Customer Twin (events, profile, history) | NEW |

**Phase 1 time:** 4 weeks, 2 engineers + 1 designer
**Phase 1 tests to add:** ~60 new tests (rich renderer, OAuth flow, event tracking)

---

## Phase 2: Intelligence Layer (Weeks 5-8)

**Goal:** Turn the widget into an intelligent salesperson and marketing engine.

### 2.1 Lead Scoring Engine

**Formula:**
```
Lead Score = Σ(signal × weight) × velocity_bonus × recency_decay

Signals:
- pricing_visit: +15
- product_view: +5
- add_to_cart: +20
- checkout_start: +30
- repeat_visit: +10 (per visit, max 5)
- email_subscribe: +25
- WhatsApp_click: +15
- compare_products: +20
- download_pdf: +20
- exit_intent: +10

Velocity:
- 3+ signals in 1 hour: ×1.5
- 5+ signals in 1 day: ×1.3

Recency:
- Last activity < 1 hour: ×1.2
- Last activity < 24 hours: ×1.0
- Last activity < 7 days: ×0.8
- Last activity > 7 days: ×0.5
```

**Backend:** New service at port 5401 `widget-intelligence/`
- `POST /api/intelligence/lead-score` — calculate score
- `POST /api/intelligence/intent-signal` — record signal
- `GET /api/intelligence/lead/:visitorId` — get full lead profile

### 2.2 Marketing Automation Engine

**Abandoned Cart Recovery Flow:**
```
1. Event: user adds to cart, no purchase in 30 min
2. Trigger: After 15 min → WhatsApp (if opted in)
3. Trigger: After 6 hours → Email
4. Trigger: After 24 hours → WhatsApp + 5% coupon
5. Trigger: After 72 hours → WhatsApp + 10% coupon + notify sales rep
```

**Implementation:**
```javascript
// widget-automation/src/rules/abandoned-cart.js
const abandonedCartRule = {
  name: 'abandoned_cart',
  trigger: { event: 'checkout_abandon', wait: '15m' },
  conditions: [
    { field: 'cart.value', op: '>', value: 0 },
    { field: 'user.optedInWhatsApp', op: '==', value: true }
  ],
  actions: [
    { type: 'whatsapp', template: 'cart_abandon_15m', delay: '0' },
    { type: 'email', template: 'cart_abandon_6h', delay: '6h' },
    { type: 'whatsapp', template: 'cart_abandon_24h_coupon', delay: '24h', coupon: '5OFF' },
    { type: 'notify', channel: 'slack', template: 'cold_cart_alert', delay: '72h' }
  ]
};
```

**Rules to build:**
1. `abandoned_cart` — cart abandonment recovery
2. `welcome_series` — new subscriber nurture (3 emails over 7 days)
3. `win_back` — inactive customers (no purchase 60+ days)
4. `birthday_campaign` — birthday discount
5. `post_purchase` — order follow-up + review request
6. `low_stock_alert` — notify sales of high-intent cart on low-stock item
7. `price_drop` — notify watchers of price reduction
8. `replenishment` — reorder reminders for consumables

### 2.3 WhatsApp + Email Automation Infrastructure

**WhatsApp integration:**
- Use existing `hojai-whatsapp-ai` at `companies/HOJAI-AI/products/hojai-whatsapp-ai/`
- Add widget-specific templates to WhatsApp OS
- Templates needed:
  - `cart_abandon_15m` — "Hi {{1}}, you left items in your cart! Complete order: {{2}}"
  - `cart_abandon_24h_coupon` — "Hi {{1}}, here's 5% off: {{2}}"
  - `welcome_message` — "Welcome to {{1}}! How can I help?"
  - `order_confirmed` — "Your order #{{1}} is confirmed! Track: {{2}}"
  - `support_ticket` — "Ticket #{{1}} created. We'll respond within 2 hours."
  - `review_request` — "How was your experience with {{1}}? Leave a review: {{2}}"

**Email integration:**
- Integrate with existing email infrastructure or add SMTP service
- Use `@hojai/email` package or integrate Resend/SendGrid
- Add email tracking (open, click, bounce)

### 2.4 Customer Twin (full profile)

**Expand the Customer Twin with:**
```typescript
interface CustomerTwin {
  identity: {
    visitorId: string;
    companyId: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    location?: string;
    device: string;
    browser: string;
    language: string;
  };
  behavior: {
    firstVisit: Date;
    lastVisit: Date;
    visitCount: number;
    avgSessionDuration: number;
    pagesViewed: string[];
    productsViewed: string[];
    cartAbandons: number;
    purchases: number;
    totalSpent: number;
    avgOrderValue: number;
    favoriteCategories: string[];
    preferredChannel: 'whatsapp' | 'email' | 'chat';
  };
  signals: {
    leadScore: number;
    intentLevel: 'cold' | 'warm' | 'hot' | 'buying';
    churnRisk: number; // 0-100
    ltv: number;
    lastPurchase: Date;
    daysSinceLastVisit: number;
  };
  touchpoints: {
    whatsapp: boolean;
    email: boolean;
    phone: boolean;
    inStore: boolean;
  };
  relationships: {
    referredBy?: string;
    referrals: string[];
    corporateId?: string;
    teamMembers: string[];
  };
  predictive: {
    purchaseProbability: number; // 0-100
    nextBestAction: string;
    predictedLtv: number;
    predictedChurnDate: Date;
  };
  consent: {
    marketing: boolean;
    whatsapp: boolean;
    dataRetention: Date;
  };
}
```

**Service:** New `widget-customer-twin/` at port 5402
- `GET /api/twin/:visitorId` — get full twin
- `POST /api/twin/:visitorId/signal` — record behavioral signal
- `POST /api/twin/:visitorId/identify` — merge identity data
- `POST /api/twin/:visitorId/event` — record event
- `GET /api/twin/:visitorId/recommendations` — get next best action

### 2.5 Heatmap + Session Recording (lightweight)

**Architecture:**
- Use existing TwinOS at port 4705 for session storage
- Add `widget-analytics/` service at port 5403
- Lightweight implementation:
  - Track clicks, scrolls, mouse movements as events
  - Aggregate into heatmap data server-side
  - Store session recordings as compressed event sequences
  - Serve heatmap visualization via dashboard

**Deliverables:**
- `widget-analytics/src/services/heatmap.js` — aggregate click/scroll data
- `widget-analytics/src/services/session-recording.js` — store/playback sessions
- `widget-analytics/src/routes/heatmap.js` — API for dashboard
- `widget-analytics/src/routes/sessions.js` — session list + playback

### 2.6 Intent Signal Tracking (100 events, Phase 1 implementation)

**Implement the 100-event taxonomy (from master plan):**

| Category | Events to implement | Count |
|---|---|---|
| Website | page_view, product_view, search, add_to_cart, checkout_start, payment_complete | 6 |
| User | sign_up, email_subscribe, profile_update | 3 |
| Engagement | widget_open, chat_start, voice_use, cta_click, exit_intent, scroll_75 | 6 |
| Commerce | cart_abandon, order_complete, refund_request, subscription_start | 4 |
| Marketing | email_open, email_click, sms_sent, push_sent | 4 |
| Support | ticket_create, ticket_resolve | 2 |

**Total Phase 2: 25 events** (rest in Phase 3)

### Phase 2 Deliverables

| # | Deliverable | Status |
|---|---|---|
| 2.1 | Lead scoring engine (weighted signals) | NEW |
| 2.2 | Marketing automation engine (8 rules) | NEW |
| 2.3 | WhatsApp + Email automation (templates, SMTP) | NEW |
| 2.4 | Full Customer Twin (identity, behavior, predictive) | NEW |
| 2.5 | Heatmap + session recording (lightweight) | NEW |
| 2.6 | 25 core event types | NEW |

**Phase 2 time:** 4 weeks, 3 engineers + 1 designer
**Phase 2 tests to add:** ~80 new tests

---

## Phase 3: Full-Stack Channels & Integrations (Weeks 9-12)

### 3.1 Voice Widget (STT + TTS)

**Current state:** STT (voice input) is built. TTS (voice output) is missing.

**Implement:**
```typescript
// In widget-core, add TTS:
private _speak(text: string, lang: string): void {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = this._mapLanguage(lang);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// Trigger on AI response when voice mode is enabled:
on('response', (msg) => {
  if (this.config.voice?.autoSpeak) {
    this._speak(msg.content, this.config.language);
  }
});
```

**Phone receptionist (IVR):**
- New service: `widget-voice/` at port 5404
- Integrates with Twilio
- Routes: `/voice/start`, `/voice/call`, `/voice/ivr`
- Flow: Twilio webhook → intent classification → FlowOS → response → TwiML

### 3.2 Meta Pixel + CAPI Manager

**New service:** `widget-ads/` at port 5405

**Features:**
```javascript
// Pixel installation (auto-inject on storefront)
<meta id="hojai-pixel" data-pixel-id="PIXEL_ID" />
<script>
// Auto-track standard events
hojai.track('PageView');
hojai.track('ViewContent', { content_name: 'Product', content_category: 'Shoes' });
hojai.track('AddToCart', { content_ids: ['SKU123'], value: 1999, currency: 'INR' });
hojai.track('Purchase', { content_ids: ['SKU123'], value: 1999, currency: 'INR' });
</script>

// CAPI integration
// Server-side event → HOJAI → Meta CAPI
POST /api/ads/capi/event
{
  event: 'Purchase',
  event_time: 1712345678,
  user_data: { email: 'hash', phone: 'hash' },
  custom_data: { value: 1999, currency: 'INR' }
}
```

**Capabilities:**
- Auto-install Meta Pixel via Shopify/WordPress plugin
- Track all 17 standard Meta events
- Server-side CAPI for events blocked by browser
- Audience sync (cart abandoners, purchasers, etc.)
- ROAS tracking

### 3.3 Google Ads + TikTok + LinkedIn CAPI

**Same pattern as Meta:**
- `widget-ads/src/integrations/google.js` — Google Ads Enhanced Conversions
- `widget-ads/src/integrations/tiktok.js` — TikTok Events API
- `widget-ads/src/integrations/linkedin.js` — LinkedIn Insight Tag + CAPI

### 3.4 CRM Connectors

**New service:** `widget-crm/` at port 5406

**Connectors:**
- [ ] HubSpot — contacts, deals, notes sync
- [ ] Salesforce — leads, opportunities sync
- [ ] Zoho — contacts, deals sync
- [ ] WooCommerce — orders, customers sync (already in 1.4, enhance)

**Sync patterns:**
```javascript
// On lead capture
leadCaptured(visitorId) → CRM.createContact(visitorId, data) → CRM.createDeal(data)

// On purchase
orderComplete(visitorId) → CRM.updateContact(visitorId, { lifetimeValue }) → CRM.createDeal(dealData)

// On support
ticketCreated(visitorId) → CRM.createNote(visitorId, ticketData)
```

### 3.5 Knowledge Base Training

**New service:** `widget-kb/` at port 5407

**Features:**
- PDF upload → extract text → chunk → embed → store in vector DB
- Website URL crawl → extract content → chunk → embed
- Video transcription (via Whisper)
- FAQ import (CSV, JSON)
- Document Q&A (RAG with uploaded content)

**API:**
```javascript
POST /api/kb/upload     // Upload PDF/document
POST /api/kb/crawl       // Crawl website URL
POST /api/kb/query       // Query KB with RAG
GET  /api/kb/status      // Indexing status
DELETE /api/kb/:docId    // Remove document
```

### 3.6 A/B Testing Engine

**New service:** `widget-experiments/` at port 5408

**Features:**
- Create experiment (variant A vs B)
- Traffic split (% per variant)
- Track conversions per variant
- Statistical significance calculation
- Auto-winner declaration
- Deploy winner to 100%

**API:**
```javascript
POST /api/experiments          // Create experiment
GET  /api/experiments          // List experiments
GET  /api/experiments/:id      // Get results
POST /api/experiments/:id/variant  // Assign variant (returns which to show)
POST /api/experiments/:id/conversion  // Record conversion
```

### 3.7 Multi-Touch Attribution Engine

**New service:** `widget-attribution/` at port 5409

**Models:**
1. First-touch — credit to first touchpoint
2. Last-touch — credit to last touchpoint
3. Linear — equal credit to all touchpoints
4. Time-decay — more credit to recent touchpoints
5. Position-based — 40% first, 40% last, 20% middle
6. Data-driven (ML) — algorithm determines attribution

**API:**
```javascript
POST /api/attribution/track   // Track touchpoint
GET  /api/attribution/journey/:visitorId  // Get customer journey
GET  /api/attribution/report  // Attribution report by model
```

### Phase 3 Deliverables

| # | Deliverable | Status |
|---|---|---|
| 3.1 | Voice (TTS output + IVR phone) | NEW |
| 3.2 | Meta Pixel + CAPI | NEW |
| 3.3 | Google/TikTok/LinkedIn CAPI | NEW |
| 3.4 | CRM connectors (HubSpot, SF, Zoho) | NEW |
| 3.5 | Knowledge base (PDF, URL, RAG) | NEW |
| 3.6 | A/B testing engine | NEW |
| 3.7 | Multi-touch attribution | NEW |

**Phase 3 time:** 4 weeks, 4 engineers
**Phase 3 tests to add:** ~100 new tests

---

## Phase 4: Nexus Connect — Global Agent Economy (Weeks 13-16)

### 4.1 Product/Service Federation

**Sync catalog to Nexus:**
```javascript
// widget-nexus/src/product-federation.js
class ProductFederation {
  async syncToNexus(companyId) {
    // 1. Fetch all products from company's platform (Shopify, Woo, etc.)
    const products = await this.platform.getProducts(companyId);
    // 2. Transform to Nexus format
    const nexusProducts = products.map(p => ({
      id: `hojai_${companyId}_${p.id}`,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      category: p.category,
      availability: p.inStock ? 'in_stock' : 'out_of_stock',
      images: p.images,
      url: p.url,
      capabilities: ['search', 'order', 'track', 'negotiate']
    }));
    // 3. Publish to Nexus Discovery
    await nexusClient.publishProducts(nexusProducts);
  }
}
```

### 4.2 Agent-to-Agent Protocol

**Implement Nexus ACP protocol for widget:**
```javascript
// Customer Agent (on DO App or any agent) queries:
{
  type: 'QUERY',
  intent: 'find_hotel',
  params: {
    location: 'Dubai',
    budget: 600,
    checkin: '2026-07-15',
    checkout: '2026-07-17'
  },
  requesterAgent: 'do_user_12345',
  timestamp: 1712345678000
}

// HOJAI Widget backend receives → routes to hotel merchant
// Merchant Agent responds:
{
  type: 'OFFER',
  items: [{
    hotel: 'Grand Hotel',
    price: 550,
    available: true,
    amenities: ['wifi', 'pool']
  }],
  validUntil: 1712346600000,
  merchantAgent: 'hojai_merchant_67890'
}
```

### 4.3 DO App Integration

**Sync products/services so DO agents can discover and sell them:**
- [ ] Product catalog → Nexus Discovery
- [ ] Real-time availability updates
- [ ] Order routing from DO → merchant
- [ ] Commission settlement

### 4.4 Agent Reputation Layer

**Track agent performance:**
```javascript
{
  agentId: 'hojai_merchant_123',
  trustScore: 92,  // 0-100
  fulfillmentRate: 0.97,  // orders fulfilled / total
  avgResponseTime: 45,  // seconds
  disputeRate: 0.02,
  rating: 4.7,  // 1-5 stars
  totalTransactions: 1543,
  registeredOn: '2026-01-15',
  lastActive: '2026-06-27'
}
```

### 4.5 Contract Engine for Agent Deals

**Auto-generate contracts for B2B agent purchases:**
```javascript
// Use existing SUTAR Contract OS (port 4292)
// Add widget-specific contract templates:
// - B2C purchase contract (merchant → consumer)
// - B2B supply contract (merchant → merchant)
// - Service contract (agent → client)
```

### Phase 4 Deliverables

| # | Deliverable | Status |
|---|---|---|
| 4.1 | Product/service federation to Nexus | NEW |
| 4.2 | Agent-to-agent ACP protocol | NEW |
| 4.3 | DO App product sync + order routing | NEW |
| 4.4 | Agent reputation layer | NEW |
| 4.5 | Contract engine for agent deals | Uses existing SUTAR Contract OS |

**Phase 4 time:** 4 weeks, 3 engineers
**Phase 4 tests to add:** ~50 new tests

---

## Phase 5: Autonomy — AI Executes, Not Just Recommends (Weeks 17-20)

### 5.1 AI Business Advisor

**Natural language insights for owners:**
```javascript
// Widget command center
POST /api/command/ask
{
  question: "Why did revenue drop this week?"
}

// Response:
{
  answer: "Revenue dropped 12% this week due to three reasons:

1. Mobile checkout failures increased by 28%
   - Cause: Payment gateway timeout on iOS Safari
   - Impact: ~₹45,000 lost revenue
   - Fix: Enable express UPI checkout

2. Returning customer purchases fell 18%
   - Cause: No re-engagement campaign in 14 days
   - Impact: ~₹30,000 lost revenue
   - Fix: Launch win-back campaign

3. Cart abandonment rate increased from 68% to 74%
   - Cause: Shipping cost displayed too late
   - Impact: ~₹60,000 lost revenue
   - Fix: Show shipping cost on cart page

Recommended actions:
1. Fix mobile payment (high urgency, high impact)
2. Launch win-back campaign (medium urgency, medium impact)
3. Fix shipping display (high urgency, medium impact)",
  insights: [
    { metric: 'revenue', change: -12, reason: 'mobile_checkout_failure' },
    { metric: 'returning_customers', change: -18, reason: 'no_reengagement' },
    { metric: 'cart_abandon', change: +6, reason: 'shipping_cost_display' }
  ],
  actions: [
    { action: 'fix_payment_gateway', priority: 1, estimatedImpact: 45000 },
    { action: 'launch_winback', priority: 2, estimatedImpact: 30000 },
    { action: 'fix_shipping_display', priority: 3, estimatedImpact: 60000 }
  ]
}
```

### 5.2 Campaign Auto-Creation

**AI generates campaigns from insights:**
```javascript
// When AI detects churn risk spike:
// 1. Create segment: "Inactive 60+ days, LTV > 5000"
// 2. Generate email copy with LLM
// 3. Generate WhatsApp message
// 4. Create coupon code
// 5. Schedule send times
// 6. Execute campaign
// 7. Track results
// 8. Optimize next campaign
```

### 5.3 Coupon Auto-Optimization

**AI finds minimum effective discount:**
```javascript
// Analyze conversion rates at different discount levels
// Find the lowest discount that maximizes revenue
// Ex: 15% converts same as 8% → recommend 8%
```

### 5.4 Dynamic Pricing Execution

**Real-time price optimization:**
```javascript
// When demand spikes + inventory low → increase price 5%
// When competitor lowers price → analyze impact → recommend response
// When inventory aging → suggest bundle + discount
```

### 5.5 Budget Auto-Allocation

**AI allocates ad spend across channels:**
```javascript
// Monitor ROAS per channel daily
// Shift budget toward highest-performing channels
// Alert on anomalies
// Predict next-day budget needs
```

### Phase 5 Deliverables

| # | Deliverable | Status |
|---|---|---|
| 5.1 | AI business advisor (command center) | NEW |
| 5.2 | Campaign auto-creation | NEW |
| 5.3 | Coupon auto-optimization | NEW |
| 5.4 | Dynamic pricing execution | NEW |
| 5.5 | Budget auto-allocation (ads) | NEW |

**Phase 5 time:** 4 weeks, 3 engineers

---

## New Services to Build

| Port | Service | Phase |
|---|---|---|
| 5401 | `widget-intelligence` — lead scoring, intent signals | Phase 2 |
| 5402 | `widget-customer-twin` — full customer profiles | Phase 2 |
| 5403 | `widget-analytics` — heatmaps, session recording | Phase 2 |
| 5404 | `widget-voice` — IVR, phone receptionist | Phase 3 |
| 5405 | `widget-ads` — Pixel manager, CAPI, attribution | Phase 3 |
| 5406 | `widget-crm` — HubSpot, SF, Zoho connectors | Phase 3 |
| 5407 | `widget-kb` — Knowledge base, RAG | Phase 3 |
| 5408 | `widget-experiments` — A/B testing | Phase 3 |
| 5409 | `widget-attribution` — Multi-touch attribution | Phase 3 |
| 5410 | `widget-nexus` — Nexus connect, federation | Phase 4 |
| 5411 | `widget-automation` — Marketing automation rules | Phase 2 |
| 5412 | `widget-command` — AI business advisor | Phase 5 |

---

## SDK Completeness

| SDK | Spec | Phase 1 | Phase 3 | Final |
|---|---|---|---|---|
| `@hojai/widget-core` (JS, 5KB) | Required | ✅ | ✅ | ✅ (with lazy chunks) |
| `@hojai/widget-react` | Required | ✅ | ✅ | ✅ |
| `@hojai/widget-vue` | Listed | ❌ | ✅ | ✅ |
| `@hojai/widget-angular` | Listed | ❌ | ❌ | ✅ |
| `@hojai/widget-svelte` | Listed | ❌ | ❌ | ✅ |
| `@hojai/widget-wordpress` | Listed | ✅ (v2) | ✅ | ✅ |
| `@hojai/widget-shopify` | Listed | ✅ (OAuth) | ✅ | ✅ |
| `@hojai/widget-woocommerce` | Needed | ✅ | ✅ | ✅ |
| `@hojai/widget-webflow` | Listed | ❌ | ✅ | ✅ |
| `@hojai/widget-react-native` | Listed | ❌ | ✅ | ✅ |
| `@hojai/widget-flutter` | Listed | ❌ | ❌ | ✅ |

---

## Bundle Size Plan

**Current:** ~37KB raw (violates 5KB spec)

**Target:** 5KB core + lazy-loaded chunks

| Chunk | Content | Load strategy | Target size |
|---|---|---|---|
| Core | Chat bubble, panel, send/receive | Immediate | 5KB gzipped |
| Analytics | Event tracking | Lazy (after 1s idle) | 3KB gzipped |
| Rich Content | Product cards, quotes | Lazy (on first rich response) | 2KB gzipped |
| Voice | STT + TTS | Lazy (on voice button click) | 5KB gzipped |
| i18n | 19 language bundles | Lazy (per language) | 1KB per language |

**Build changes:**
```javascript
// rollup.config.js
export default {
  output: [
    { file: 'dist/index.mjs', format: 'esm', chunkFileNames: 'chunks/[name]-[hash].js' }
  ],
  // Dynamic imports
  plugins: [{
    resolveId(id) {
      if (id === 'voice') return { id: './src/voice.ts', external: false };
      if (id === 'analytics') return { id: './src/analytics.ts', external: false };
    }
  }]
};

// In widget code:
if (this.config.voice?.enabled) {
  const voiceModule = await import('./voice.js');  // lazy
  this.voiceInput = voiceModule.createVoiceInput(...);
}
```

---

## Complete Test Plan

| Phase | Tests to add | Total tests |
|---|---|---|
| Phase 0 | 20 (bug fix regression tests) | ~124 |
| Phase 1 | 60 (rich renderer, OAuth, events) | ~184 |
| Phase 2 | 80 (lead scoring, automation, twin) | ~264 |
| Phase 3 | 100 (ads, CRM, KB, experiments) | ~364 |
| Phase 4 | 50 (Nexus, federation) | ~414 |
| Phase 5 | 40 (AI advisor, autonomy) | ~454 |

**Total after all phases:** ~454 tests

---

## Resources Summary

| Phase | Engineers | Designers | Weeks | New Services |
|---|---|---|---|---|
| Phase 0 | 1 | 0 | 1 | 0 |
| Phase 1 | 2 | 1 | 4 | 1 (`shopify-app`) |
| Phase 2 | 3 | 1 | 4 | 4 |
| Phase 3 | 4 | 0 | 4 | 6 |
| Phase 4 | 3 | 0 | 4 | 1 (`widget-nexus`) |
| Phase 5 | 3 | 0 | 4 | 1 (`widget-command`) |
| **Total** | **16** | **2** | **21 weeks** | **13** |

---

## Milestone Timeline

```
Week 0:  Phase 0 — P0 bugs fixed, production-safe
Week 1:  Shopify OAuth app live
Week 2:  WordPress v2 + WooCommerce integration
Week 3:  Rich content rendering + event tracking
Week 4:  Customer Twin + basic analytics
Week 5:  Lead scoring + marketing automation
Week 6:  Abandoned cart recovery live
Week 7:  WhatsApp/email automation working
Week 8:  Heatmaps + session recording
Week 9:  Voice widget (TTS + IVR)
Week 10: Meta Pixel + CAPI manager
Week 11: Google/TikTok/LinkedIn CAPI
Week 12: CRM connectors + A/B testing
Week 13: Nexus Connect — product federation
Week 14: DO App integration
Week 15: Agent-to-agent protocol
Week 16: Agent reputation + contracts
Week 17: AI business advisor (command center)
Week 18: Campaign auto-creation
Week 19: Dynamic pricing + coupon optimization
Week 20: Budget auto-allocation + polish
Week 21: Launch prep + documentation
```

---

## Success Metrics

| Phase | Metric | Target |
|---|---|---|
| Phase 0 | All P0 bugs fixed | 0 P0 remaining |
| Phase 1 | Install success rate | > 95% |
| Phase 1 | Shopify OAuth flow | < 3 minutes |
| Phase 2 | Cart recovery rate | > 15% |
| Phase 2 | Lead scoring accuracy | > 80% |
| Phase 3 | Ad attribution accuracy | > 85% |
| Phase 3 | CRM sync success rate | > 99% |
| Phase 4 | Agent orders processed | > 100/day |
| Phase 5 | AI-initiated actions | > 50% of total |
| Phase 5 | Owner NPS | > 50 |

---

*This plan is the canonical implementation guide for HOJAI SiteOS. It supersedes all previous widget plans.*

*Last updated: 2026-06-27*

---

## REUSE AUDIT — 200+ Existing Services to Reuse

**Key insight: We don't build from scratch. We build the SiteOS GLUE LAYER that connects to existing RTMN services.**

### REUSE SUMMARY

| HOJAI SiteOS Feature | Existing Service | Port | % Reusable |
|---|---|---|---|
| Command Center / AI Advisor | Genie Gateway, Business Copilot, Marketing Copilot | 4701, 4600, 4929 | ~70% |
| Visual Automation Builder | FlowOS Executor, Workflow Builder API | 7007, 4440 | ~80% |
| Employee Copilot | Employee Twin, TwinOS Hub, Agent Copilot | 4730, 4705, 4920 | ~75% |
| Churn Intervention | Customer Success OS, Risk Intelligence, Predictive Intelligence | 4050, 4755, 4754 | ~70% |
| Identity Resolution | CorpID, Identity Cloud OS, Customer Twin | 4702, 4162, 4895 | ~80% |
| Marketing Automation | Marketing OS, Notification Service, REZ CRM Hub | 5500, (HOJAI), 4056 | ~85% |
| Lead Scoring | Sales OS, Revenue Intelligence OS | 5055, 5400 | ~75% |
| Knowledge Base (RAG) | MemoryOS, Memory Intelligence, Memory Learning Engine | 4703, 4786, 4788 | ~80% |
| Voice Widget | Voice Gateway, Genie Voice Services | 4880, 4767-4715 | ~70% |
| Meta Pixel/CAPI | REZ DSP, REZ Audience, REZ CDP | 4990, 4805, 4901 | ~80% |
| CRM Connectors | Sales OS, REZ CRM Hub | 5055, 4056 | ~100% |
| Nexus Connect | All Nexha services (13) | 4270-4340 | ~60% |
| Agent-to-Agent Protocol | Nexha ACP Messaging, AgentOS | 4340, 4802-4814 | ~70% |
| Agent Reputation | Nexha Reputation OS, BLR AI Marketplace | 4271, 4250 | ~70% |
| Product Federation | Nexha Supplier Registry | 4281 | ~70% |
| Campaign Auto-Creation | Marketing OS, FlowOS | 5500, 7007 | ~80% |
| Coupon Optimization | REZ Wallet | 4004 | ~60% |
| Dynamic Pricing | Nexha Pricing Network | 4286 | ~60% |
| Budget Allocation | Revenue Intelligence OS | 5400 | ~60% |
| Customer Twin | Customer Twin, Order Twin, Wallet Twin | 4895, 4885, 4896 | ~90% |
| Heatmaps/Session Recording | Analytics Service, Media OS | (HOJAI), 5600 | ~60% |
| Competitor Intelligence | Nexha Market OS | 4275 | ~50% |
| Business Benchmarking | CXO OS | 5100 | ~50% |
| Reputation Management | Nexha Reputation OS | 4271 | ~50% |
| Lookalike Generator | REZ Audience | 4805 | ~60% |
| A/B Testing | ExperimentOS, Quality OS | 4165, 4757 | ~70% |
| Multi-Touch Attribution | REZ Attribution | 4803 | ~80% |
| 5 Vertical Templates | All 26 Industry OS | various | ~80% |

### WHAT TO BUILD (SiteOS Glue Layer Only)

| Service | Description | Existing Foundation | Lines |
|---|---|---|---|
| **SiteOS Gateway** | Unified entry point, connects widget to all existing services | widget-backend (exists) | ~2,000 |
| **Business Context Wrapper** | Wrap Genie Gateway for business owner Q&A | Genie Gateway 4701 | ~2,000 |
| **Workflow UI** | Drag-drop visual builder for non-technical owners | FlowOS Executor 7007 | ~3,000 |
| **Channel Stitcher** | Match visitor IDs across website/WhatsApp/email/phone/QR | CorpID 4702, Customer Twin 4895 | ~2,000 |
| **Event Tracker** | Track 100 events on website, send to Analytics | Analytics Service | ~1,500 |
| **Heatmap Aggregator** | Aggregate click/scroll data into heatmaps | Analytics Service | ~1,500 |
| **Benchmark Database** | Industry averages by vertical | CXO OS 5100 | ~1,000 |
| **Review Scrapers** | Google/social/app store review scraping | Reputation OS 4271 | ~2,000 |
| **Lookalike Algorithm** | Best customer → lookalike profile | REZ Audience 4805 | ~1,500 |
| **Ad CAPI Sync** | Server-side conversion tracking to Meta/Google | REZ DSP 4990 | ~1,500 |
| **Vertical Configs** | 5 industry-specific agent configurations | All 26 Industry OS | ~2,000 |
| **Phone IVR** | Twilio-based voice receptionist | Voice Gateway 4880 | ~2,000 |
| **Product Federation** | Sync catalog to Nexus Discovery | Nexha 4281 | ~1,500 |
| **Merchant Agent** | Expose widget as merchant agent on Nexus | Nexha ACP 4340 | ~1,500 |
| **Command Center UI** | Natural language Q&A dashboard for owners | Genie Gateway 4701 | ~2,000 |

**Total SiteOS glue layer: ~15 services, ~26,000 lines**

### EXISTING FOUNDATIONS TO LEVERAGE

- **Memory Layer:** 17 services (4703, 4152, 4704, 4780-4793) — fully reusable
- **TwinOS:** 86+ twins (4705, 4895, 4885, 4896, etc.) — fully reusable
- **AgentOS:** 12 services (4802-4814) — fully reusable
- **All 26 Industry OS** — fully reusable for verticals
- **Marketing OS (5500):** 13 modules, 15 AI agents — fully reusable
- **Sales OS (5055):** 13 modules, 22 AI agents — fully reusable
- **Customer Success OS (4050):** 8 modules, 6 agents — fully reusable
- **Nexha Network (13 services):** 4270-4340 — fully reusable
- **REZ Services:** CRM (4056), Wallet (4004), Auth (4002), Care (4055) — fully reusable
- **Genie Suite:** Gateway (4701), Voice (4880), Calendar (4709), Briefing (4712) — fully reusable
- **FlowOS:** Executor (7007), Builder (4440), Canonical (4156) — fully reusable
- **BLR AI Marketplace (4250):** 1,200+ catalog items — fully reusable

**REUSE: ~70% already exists. Build: ~30% SiteOS glue layer only.**
