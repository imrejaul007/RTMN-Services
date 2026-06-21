# Plan: Complete the DO Vision

> **Date:** June 21, 2026
> **Goal:** Turn the standalone Do App from "a chat client with commerce endpoints" into a working Agentic Consumer Commerce Platform. Implement the missing pieces the vision document demands.

---

## 0. Current state (verified)

### Backend (after Phase 1)
- ✅ 17 new commerce endpoints: orders, subs, wishlist, wallet, merchants, household, agent
- ✅ 5 new Mongoose models: Order, Subscription, Wishlist, Invoice, Household
- ✅ HOJAI client (talks to 12 HOJAI services)
- ✅ Intent classifier (10 intents, rule-based)
- ✅ 66/66 backend tests pass
- ❌ No real LLM (uses rule-based classifier only)
- ❌ No /api/llm endpoint for LLM integration
- ❌ No policy management (PolicyOS not exposed)
- ❌ No autopilot (no background jobs)

### Mobile (current)
- ✅ 1 real screen (Chat/Genie)
- 🟡 6 placeholder tabs (Health, Finance, Twins, Exhibitions, Settings, plus Genie chat)
- ❌ No Orders, Wallet, Subscriptions, Wishlist, Family tabs
- ❌ No AgentActionConfirmationCard
- ❌ No voice/image input

---

## 1. Backend additions (Phase 2)

### 1.1 New endpoint: `POST /api/llm/chat`
A unified LLM endpoint that:
- Accepts `{ text, imageBase64?, audioBase64?, context? }`
- Auto-routes to HOJAI Genie's `/api/ask` (which currently uses rule-based — we wrap it)
- For real LLM, we'll add an `OPENAI_API_KEY` env var. If set, calls OpenAI directly. If not, falls back to HOJAI Genie.
- This is the "Think" endpoint that DO calls to understand what the user wants.

### 1.2 New endpoint: `GET /api/agent/autopilot/status`
Returns the user's autopilot state:
- `policy` (spending limits, auto-approve thresholds)
- `last_run` (when did autopilot last check pantry/expiring items)
- `mode` (manual/assisted/autopilot/autonomous)

### 1.3 New endpoint: `PUT /api/agent/autopilot/policy`
Set/update spending policy:
```ts
{
  mode: 'manual' | 'assisted' | 'autopilot' | 'autonomous',
  perOrderLimit: number,        // auto-approve if order < this
  perMonthLimit: number,         // block if month > this
  autoApproveCategories: string[],  // e.g. ["groceries", "medicine"]
  requireApprovalCategories: string[]
}
```

### 1.4 New endpoint: `GET /api/memory` and `POST /api/memory`
Memory store for user preferences/facts. Wraps HOJAI MemoryOS with local fallback.

### 1.5 New endpoint: `GET /api/goals` and `POST /api/goals`
User goals. Wraps HOJAI GoalOS with local fallback.

### 1.6 New endpoint: `GET /api/products/search`
Product search (different from merchants.search). Wraps HOJAI Merchant with local fallback.

### 1.7 New endpoint: `POST /api/agent/autopilot/run`
Manually trigger the autopilot (e.g., "check if I need milk"). In real prod this would be a cron, but for v1.1 it's a manual trigger.

---

## 2. Mobile additions (Phase 3)

### 2.1 New screens (replace hardcoded tabs)
| New tab | File | Purpose |
|---|---|---|
| Orders | `app/(tabs)/orders.tsx` | Real order history with status, cancel, refund |
| Wallet | `app/(tabs)/wallet.tsx` | Balance, topup, transactions, rewards (gold/silver/bronze) |
| Subs | `app/(tabs)/subs.tsx` | Recurring orders management |
| Wishlist | `app/(tabs)/wishlist.tsx` | Saved products with price alerts |
| Family | `app/(tabs)/family.tsx` | Household management, invite members, shared budget |
| Shop | `app/(tabs)/shop.tsx` | Browse + search products (the new home) |

### 2.2 Update existing tabs to use real data
- `twins.tsx` — call `/api/genie/dashboard` instead of hardcoded data
- `health.tsx` — connect to MemoryOS
- `finance.tsx` — connect to Wallet (already covered by new wallet tab)
- `exhibitions.tsx` — keep as is (special category)

### 2.3 New component: `AgentActionCard`
A reusable card that shows proposed agent actions:
```tsx
<AgentActionCard
  action="search_results"
  results={[...]}
  message="Found 5 merchants for 'toothpaste'"
  onConfirm={() => order(...)}
  onCancel={() => dismiss()}
/>
```

### 2.4 Update ChatScreen
- After `genie.ask` returns, check for `action` field
- If present, render `<AgentActionCard>` below the Genie reply
- "Confirm" calls `api.orders.create(...)` then navigates to Orders
- "Cancel" dismisses the card

### 2.5 Voice + image input
- Add a `+` button next to the chat input
- Tap → action sheet: "Voice" / "Image" / "Location"
- Voice: use `expo-av` recording, send audioBase64 to `/api/llm/chat`
- Image: use `expo-image-picker` to pick/take, send imageBase64
- Location: use `expo-location`, send lat/lng for context

### 2.6 Shop tab (NEW home)
- Top: search bar
- Middle: featured categories (Groceries, Healthcare, Travel, Services, etc.)
- Body: trending products
- Tap product → `app/shop/[productId].tsx` (product detail)
- Product detail: image, price, merchant rating, delivery time, "Add to Cart" + "Buy Now"
- "Buy Now" → checkout flow → order confirmation

### 2.7 Autopilot config screen
- `app/(tabs)/autopilot.tsx` (or modal in settings)
- Shows current mode (Manual/Assisted/Autopilot/Autonomous)
- Toggle between modes
- Set per-order and per-month spending limits
- Set auto-approve categories (groceries, medicine, etc.)
- "Run now" button to manually trigger pantry check

### 2.8 Memory/Goals screens
- `app/memory.tsx` — list of saved preferences/facts, with edit/delete
- `app/goals.tsx` — list of goals with progress bars
- Add a "save preference" button in chat (the `memory_save` intent already returns the message)

---

## 3. Order of work

### Phase 2A: Backend additions (1 day)
1. Add `/api/llm/chat` endpoint (with OpenAI integration, fallback to HOJAI)
2. Add `/api/agent/autopilot/*` endpoints (status, policy, run)
3. Add `/api/memory` endpoints
4. Add `/api/goals` endpoints
5. Add `/api/products/search` endpoint
6. Add LLM provider abstraction (`services/llm.ts`)
7. Write tests for all new endpoints

### Phase 2B: Mobile commerce surface (2 days)
8. Create new screens: Orders, Wallet, Subs, Wishlist, Family, Shop
9. Update tab bar with new entries
10. Update existing tabs to use real data (twins, health, finance)
11. Add `AgentActionCard` component
12. Update ChatScreen to render action cards
13. Add voice input (expo-av)
14. Add image input (expo-image-picker)

### Phase 2C: Mobile shop + autopilot (1.5 days)
15. Create Shop tab (browse + search)
16. Create product detail screen
17. Create checkout flow
18. Create Autopilot config screen
19. Create Memory screen
20. Create Goals screen

### Phase 2D: Documentation + verification (0.5 day)
21. Update README with new feature list
22. Update ARCHITECTURE with the agentic flow
23. Update CHANGELOG to v1.2.0
24. Update DO-VISION-AUDIT to close out implemented features
25. Add docs/AGENTIC-FLOW.md with full sequence diagram
26. Commit, push, close all open issues

**Total: ~5 days of focused work**

---

## 4. The Full Agentic Flow (what the vision demands)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER                                       │
│  Types "Buy me toothpaste" or says it / shows it / etc.            │
└───────────────────────┬─────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────────┐
│  DO MOBILE APP                                                       │
│  - Captures input (text / voice / image / location)                │
│  - Sends to /api/llm/chat                                           │
│  - Receives structured intent from LLM                             │
│  - Shows AgentActionCard for confirmation                          │
└───────────────────────┬─────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────────┐
│  DO BACKEND (Express)                                                │
│  - /api/llm/chat: parses intent via LLM (or HOJAI Genie)           │
│  - /api/agent/action: routes intent to Policy + Merchant + Wallet │
│  - /api/agent/autopilot: scheduled (or manual) pantry/spend check   │
│  - /api/orders: places order locally, syncs with HOJAI              │
│  - /api/memory: stores user preferences                            │
│  - /api/goals: tracks user goals                                    │
└────────┬───────────────┬───────────────┬──────────────┬──────────────┘
         ↓               ↓               ↓              ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Genie     │  │   PolicyOS   │  │   Merchant   │  │    Wallet    │
│   (Think)   │  │   (limits)   │  │   (search)   │  │   (pay)      │
│  port 7100  │  │  port 7005   │  │  port 8003   │  │  port 8002   │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
         ↓               ↓               ↓              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  HOJAI Brain (genie-os monorepo)                                    │
│  - 7 foundation services (CorpID, TwinOS, MemoryOS, GoalOS, etc.)  │
│  - 3 AI runtime services (Genie, Sutar, AgentOS)                    │
│  - Already deployed and tested (119 tests)                          │
└─────────────────────────────────────────────────────────────────────┘
```

This is the **complete agentic flow** the vision demands. We have:
- ✅ Genie (Think) — calls work
- 🟡 Policy (limits) — called by agent/action but no UI
- ✅ Merchant (search) — wrapped, fallback works
- 🟡 Wallet (pay) — wrapped, no actual payment gateway
- ❌ Voice/image input — missing
- ❌ LLM integration — currently uses rule-based classifier
- ❌ Autopilot — endpoint exists, no UI
- ❌ UI: Orders, Wallet, Subs, Wishlist, Family, Shop tabs — missing

---

## 5. Risk mitigation

| Risk | Mitigation |
|---|---|
| LLM cost blowup | OpenAI key optional, falls back to HOJAI Genie rule-based |
| Image upload size | Compress to 1024px max before sending |
| Voice transcription | Use OpenAI Whisper if key set, else HOJAI |
| Production-ready payments | Out of scope for v1.2 — uses HOJAI Wallet's internal charge |
| User trust | Always require explicit confirmation for orders (no auto-buy) |
| Household edge cases | Household creation tested; invite flow TODO in v1.3 |

---

## 6. What this plan does NOT do

- ❌ Does not add a web app (still mobile-only)
- ❌ Does not replace the genie-os LLM (we wrap it)
- ❌ Does not add real payment gateway (Stripe/Razorpay) — uses HOJAI's internal `charge`
- ❌ Does not implement push notifications (deferred to v1.3)
- ❌ Does not add offline mode (deferred to v1.3)
- ❌ Does not add multi-language support (deferred to v1.3)

---

## 7. Success criteria

After this plan:
- ✅ Backend has 30+ commerce endpoints (was 17)
- ✅ Mobile has 6 working commerce tabs (was 1 stub + 5 hardcoded)
- ✅ Voice + image input works
- ✅ LLM (or HOJAI fallback) handles the chat
- ✅ AgentActionCard UI flows into checkout
- ✅ Autopilot UI lets users set policy
- ✅ Memory/Goals UI lets users manage their twin
- ✅ At least 100 backend tests pass
- ✅ Mobile typechecks
- ✅ Docs updated (vision-audit should show 70%+ coverage)
