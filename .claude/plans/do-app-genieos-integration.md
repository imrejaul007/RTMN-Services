# Plan: Port HOJAI Brain Integration + Commerce Engine into Do App

> **Date:** June 21, 2026
> **Goal:** Transform the standalone Do App from a thin chat client into a full Agentic Commerce Platform that uses the HOJAI brain (genie-os) for AI work and provides its own commerce engine.

---

## 0. Current State (verified, not imagined)

### `/Users/rejaulkarim/Documents/genie-os/` (the HOJAI brain)
- **NOT a git repo** (verified with `git status` → "fatal: not a git repository")
- **33 source files** across:
  - 7 foundation services: `corpid/`, `flowos/`, `goalos/`, `memoryos/`, `policyos/`, `skillos/`, `twinos/`
  - 3 AI runtime services: `agentos/`, `genie/`, `sutar/`
  - 3 thin s: `do-client/`, `nexha-client/`, `salar-client/`
  - 1 web frontend: `frontend/web/`
  - 8 infrastructure scripts: `start-all.js`, `start-foundation.js`, `start-runtime.js`, `start-products.js`, `stop-all.js`, `test-all.js`, `health-check.js`, `demo.js`
  - 1 seed script: `infrastructure/seed/seed.js`
  - 1 web server: `frontend/web/server.js`
- **Commerce code does NOT exist in genie-os** — it's expected to live in the standalone product repos (Do, Nexha, Salar)

### `imrejaul007/do-app/` (the chat client)
- **61 source files** at the time of last audit
- 1 backend (Express + Mongoose, 39 tests)
- 1 mobile (Expo SDK 53, 8 tests)
- **Has only auth, onboarding, and Genie proxy** — no commerce endpoints

### Architecture
```
genie-os (HOJAI brain)                 standalone product repos
─────────────────────                ──────────────────────────
CorpID  ◀───────────────────────   Do App (consumer commerce)
TwinOS  ◀───────────────────────   Nexha (B2B)
MemoryOS ◀──────────────────────   Salar (AI marketplace)
GoalOS
PolicyOS                       do-client  ──proxies──▶  Do App (currently port 3001)
SkillOS                        nexha-client
FlowOS                          salar-client
Genie
Sutar
AgentOS
```

---

## 1. Strategy

The Do App's `backend/` should become a **full commerce engine** that:

1. **On signup:** Calls `CorpID` to issue identity, `TwinOS` to create twin
2. **On chat (`/api/genie/ask`):** Calls `Genie` (port 7100) for the actual AI
3. **On action (`/api/agent/action`):** Composes a flow using `FlowOS` + `SkillOS` + `Sutar`
4. **On order:** Stores locally + calls `Merchant` registry to find products, `PolicyOS` to check limits
5. **On payment:** Calls `Wallet` to charge
6. **Throughout:** Uses `MemoryOS` for personalization, `GoalOS` for alignment

The Do App backend stays self-sufficient (works even if HOJAI is down) but gets superpowers when HOJAI is reachable.

---

## 2. Backend changes (Do App `backend/`)

### 2.1 New environment config
Add to `backend/src/config.ts`:
```ts
HOJAI_BRAIN_URL    // Default: http://localhost:7100 (genie)
HOJAI_CORPID_URL   // Default: http://localhost:7001
HOJAI_TWINOS_URL   // Default: http://localhost:7002
HOJAI_MEMORYOS_URL // Default: http://localhost:7003
HOJAI_GOALOS_URL   // Default: http://localhost:7004
HOJAI_POLICYOS_URL // Default: http://localhost:7005
HOJAI_SKILLOS_URL  // Default: http://localhost:7006
HOJAI_FLOWOS_URL   // Default: http://localhost:7007
HOJAI_SUTAR_URL    // Default: http://localhost:7200
HOJAI_AGENTOS_URL  // Default: http://localhost:7300
HOJAI_INTERNAL_TOKEN // Shared secret with HOJAI services
```

### 2.2 New HTTP client for HOJAI
Create `backend/src/services/hojaiClient.ts`:
- Single class with one method per service (`corpId.issue()`, `twins.create()`, `memory.search()`, etc.)
- Graceful fallback: returns `null` on connection error
- All calls include `x-internal-token` header

### 2.3 Update existing routes
- `POST /api/auth/signup` (in `auth.ts`): After creating User, call `CorpID.issue()` and `TwinOS.create()`. Store returned `corpId` and `twinId` on User document. If HOJAI is down, log a warning and continue (user can be re-linked later).

### 2.4 New Mongoose models (in `models/index.ts`)
- `Order` — orderId, userId, items[], total, status (pending/confirmed/shipped/delivered/cancelled/refunded), paymentMethod, shippingAddress, agentAssisted, createdAt
- `Subscription` — subscriptionId, userId, productName, frequency (daily/weekly/monthly), nextDelivery, active, totalDelivered
- `Wishlist` — userId, productId, productName, price, addedAt
- `Invoice` — invoiceId, orderId, userId, amount, items[], pdfUrl, issuedAt

### 2.5 New routes
- `backend/src/routes/orders.ts` — POST/GET/GET:id/POST:id/cancel/POST:id/refund
- `backend/src/routes/subscriptions.ts` — POST/GET/DELETE:id
- `backend/src/routes/wishlist.ts` — POST/GET/DELETE:id
- `backend/src/routes/agent.ts` — POST /api/agent/action (the "DO executes" endpoint)
- `backend/src/routes/merchants.ts` — GET /api/merchants, GET /api/merchants/search, GET /api/products/:id
- `backend/src/routes/wallet.ts` — GET /api/wallet/me, GET /api/wallet/transactions, POST /api/wallet/topup (calls HOJAI Wallet or local fallback)

### 2.6 Update auth/me to include new fields
The `GET /api/auth/me` response should include:
- `corpId` (from HOJAI CorpID)
- `twinId` (from HOJAI TwinOS)
- `preferences` (categories, dietary, brands — from local User doc)
- `walletBalance` (from HOJAI Wallet, optional)
- `activeGoals` (from HOJAI GoalOS, optional)

### 2.7 New service: `intentClassifier.ts`
A local rule-based + regex-based intent classifier (replacing the broken "low-level" matching in `genie`):
- `commerce_search` — "buy", "find", "show me"
- `commerce_order` — "order", "purchase", "get me"
- `commerce_track` — "where is", "track", "status of"
- `commerce_return` — "return", "refund"
- `commerce_subscribe` — "subscribe", "every week", "monthly"
- `info_account` — "balance", "wallet", "my orders"
- `info_goals` — "goal", "progress", "target"
- `memory_save` — "remember", "I prefer", "I like"
- `help` — "help", "what can you do"

The classifier returns `{ intent, params, requiresAction, actionRoute }`. The route uses this to decide whether to call HOJAI Genie for the AI response, or call FlowOS for the action.

### 2.8 New route: `POST /api/agent/action`
The "DO executes" endpoint. Called by mobile (and internally by Genie ask):
```json
POST /api/agent/action
{
  "intent": "commerce_search",
  "params": { "query": "toothpaste", "preferences": [...] },
  "context": { "userId": "...", "corpId": "...", "twinId": "..." }
}

Response:
{
  "success": true,
  "data": {
    "action": "search_results",
    "results": [
      { "merchantId": "...", "productId": "...", "name": "Colgate Total", "price": 4.99, "currency": "USD" }
    ],
    "next_action": "POST /api/orders"
  }
}
```

The route internally:
1. Checks `PolicyOS.evaluate({ userId, amount: estimated_total })` → blocks if over limit
2. Searches `Merchant` for matching products
3. Negotiates with `Sutar` for best price (optional)
4. Returns the top N options

---

## 3. Mobile changes (Do App `mobile/`)

### 3.1 New screens
- `app/(tabs)/orders.tsx` — order history with status
- `app/(tabs)/wallet.tsx` — balance, recent transactions
- `app/(tabs)/subscriptions.tsx` — active subscriptions
- `app/(tabs)/wishlist.tsx` — saved items
- `app/shop/[productId].tsx` — product detail
- `app/shop/cart.tsx` — cart before checkout
- `app/shop/checkout.tsx` — checkout with PolicyOS preview

### 3.2 New API methods (in `services/api.ts`)
- `api.orders.list() / get(id) / cancel(id) / refund(id)`
- `api.subscriptions.list() / create(data) / cancel(id)`
- `api.wishlist.list() / add(productId) / remove(id)`
- `api.wallet.get() / topup(amount) / transactions()`
- `api.agent.action(intent, params)` — the "DO executes" endpoint
- `api.merchants.search(query)` — find merchants
- `api.products.get(id)` — get product detail

### 3.3 Update useGenie to use new flow
`useGenie.ask()` should:
1. POST to `/api/genie/ask` on the local backend
2. If the response contains `action`, the chat UI shows a button to "Confirm Action"
3. Tapping the button calls `api.agent.action()` and shows the result

### 3.4 Update ChatScreen to handle agent actions
The chat bubble renderer needs a new component: `<ActionConfirmationCard>` that shows:
- The proposed action (e.g., "Order Colgate Total from Blinkit for $4.99")
- Confirm / Cancel buttons
- Once confirmed, shows the result (success/failure)

---

## 4. Configuration

### 4.1 Backend `.env` additions
```bash
# HOJAI brain services (optional — falls back to local-only)
HOJAI_BRAIN_URL=http://localhost:7100
HOJAI_CORPID_URL=http://localhost:7001
HOJAI_TWINOS_URL=http://localhost:7002
HOJAI_MEMORYOS_URL=http://localhost:7003
HOJAI_GOALOS_URL=http://localhost:7004
HOJAI_POLICYOS_URL=http://localhost:7005
HOJAI_SKILLOS_URL=http://localhost:7006
HOJAI_FLOWOS_URL=http://localhost:7007
HOJAI_SUTAR_URL=http://localhost:7200
HOJAI_AGENTOS_URL=http://localhost:7300
HOJAI_INTERNAL_TOKEN=hojai-internal-service-token-change-me

# DO Backend port (kept for backwards compat with do-client)
DO_PORT=3001
```

### 4.2 Mobile `.env` additions
No changes needed — mobile already points at the local backend.

---

## 5. Tests (target: 60+ tests)

### 5.1 New backend test files
- `backend/__tests__/integration/orders.test.ts` — order CRUD, cancel, refund
- `backend/__tests__/integration/subscriptions.test.ts` — sub lifecycle
- `backend/__tests__/integration/wishlist.test.ts` — add/remove
- `backend/__tests__/integration/agent.test.ts` — agent/action with PolicyOS
- `backend/__tests__/integration/merchants.test.ts` — search, get
- `backend/__tests__/integration/hojai.test.ts` — fallback when HOJAI is down
- `backend/__tests__/unit/intentClassifier.test.ts` — all intent types

### 5.2 Updated tests
- `backend/__tests__/integration/auth.test.ts` — verify CorpID + TwinOS are called on signup (mocked)

### 5.3 New mobile test
- `mobile/__tests__/unit/api.test.ts` — verify all new api methods have correct types

---

## 6. Documentation updates

### 6.1 README.md
- Add "Agentic Commerce Flow" diagram
- Update API table with new endpoints
- Update "What's in here" tree
- Update "Quick start" with HOJAI env vars

### 6.2 docs/INTEGRATION-WITH-RTMN.md → rename to INTEGRATION-WITH-HOJAI.md
- Full HOJAI service contract
- All 9 service URLs
- Fallback behavior
- Internal token requirements
- **Cross-reference:** [runtime-genie-api-reference.md](runtime-genie-api-reference.md) — the authoritative API surface for all 23 specialists (Phases 1–13, June 22 2026). This is the document client developers should read first; INTEGRATION-WITH-HOJAI.md describes the do-app side of the integration.

### 6.3 docs/ARCHITECTURE.md
- Add "Action layer" section
- Document the full agentic flow with sequence diagram
- Document fallback chain: HOJAI → local rules → degraded response

### 6.4 CHANGELOG.md
- New "1.1.0" entry documenting the commerce surface

### 6.5 DO-VISION-AUDIT.md → update with new coverage
- Move items from ❌ Missing to ✅ Done

---

## 7. Order of work

### Phase 1: Backend commerce engine (2 days)
1. Add HOJAI env vars to config
2. Create `hojaiClient.ts` with all 9 service wrappers + fallback
3. Update `auth.ts` signup to call CorpID + TwinOS
4. Add new Mongoose models: Order, Subscription, Wishlist, Invoice
5. Create routes: orders, subscriptions, wishlist, merchants, agent
6. Update OpenAPI spec
7. Write backend tests for new routes
8. Verify all 39 existing tests still pass

### Phase 2: Mobile commerce surface (2 days — extended for rewards + family)
9. Add new API methods to `services/api.ts` (orders, subscriptions, wishlist, wallet, agent, merchants, family)
10. Create new screens: orders, wallet, subscriptions, wishlist, product detail, cart
11. Add tab bar entries for the new screens
12. Add `<ActionConfirmationCard>` component
13. Update `useGenie` hook to expose action results
14. Add rewards section to Wallet screen (tier badge, points display, redeem button — calls `/api/wallet/redeem` to HOJAI Wallet)
15. Add Family tab + Family Twin creation flow (invite household members, shared cart, shared budget)
16. Update mobile tests

### Phase 3: Agent action endpoint (1 day)
15. Create `intentClassifier.ts` (rule-based)
16. Create `routes/agent.ts` with the full action flow
17. Wire into Genie chat flow
18. Write agent tests

### Phase 4: Documentation (0.5 day)
19. Update README, ARCHITECTURE, INTEGRATION docs
20. Update CHANGELOG to v1.1.0
21. Update DO-VISION-AUDIT (close many ❌ items)
22. Create docs/AGENTIC-FLOW.md with full sequence diagram

### Phase 5: Final verification (0.5 day)
23. Run all tests (60+ expected)
24. Typecheck both projects
25. Build backend
26. Commit, push, close issues
27. Update RTMN gitlink

**Total: ~6 days of focused work** (with rewards + family mode added)

---

## 8. Risk mitigation

| Risk | Mitigation |
|---|---|
| HOJAI is unavailable | Every call has a fallback path; user can still use the app locally |
| Schema mismatch with HOJAI | Use HOJAI's existing data model (corpId, twinId) verbatim |
| Breaking change for existing Do App users | None — backwards compat (existing auth/me still works) |
| Test environment needs HOJAI | Use jest.mock to inject the hojaiClient; all tests run without external services |
| do-client (in genie-os) is now redundant | Mark for deprecation but keep working (it points at our port 3001) |

---

## 9. What this does NOT do

- ❌ Does not modify genie-os itself
- ❌ Does not change HOJAI service contracts
- ❌ Does not add a web frontend to Do App
- ❌ Does not implement the actual LLM inside Genie (still rule-based in genie-os)
- ❌ Does not add payment gateway integration (Stripe/Razorpay) — uses HOJAI Wallet's internal `charge` only

---

## 10. Success criteria

After implementation:
- ✅ All 60+ tests pass
- ✅ Backend builds, mobile typechecks
- ✅ Mobile app has Orders/Wallet/Subscriptions/Wishlist tabs working
- ✅ Chat can trigger agent actions with confirm flow
- ✅ HOJAI integration works (or falls back gracefully)
- ✅ Documentation is updated
- ✅ DO-VISION-AUDIT.md reflects new coverage
- ✅ At least 60% of the vision document is now implemented (up from 5%)

---

## 11. Open questions for user

1. **Should I add a paid/credit system to the wallet?** HOJAI Wallet has a "tier" field (bronze/silver/gold/platinum). Should Do App surface this in mobile UI?
2. **Real payment gateway?** HOJAI Wallet is internal. Should we add a Stripe/Razorpay adapter so users can actually pay?
3. **Loyalty/rewards?** HOJAI Wallet has `rewardsPoints`. Should Do App surface this?
4. **Family/household accounts?** Vision mentions "Family Twin". Add now or v1.2?
