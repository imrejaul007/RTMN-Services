# v1.3 Plan: Real Payments + Push Notifications + Offline Mode

> **Date:** June 21, 2026
> **Goal:** Wire real money, real notifications, and offline resilience into the agentic commerce flow.

---

## Scope

### Phase 3A: Stripe payment integration
- Add `stripe` SDK to backend
- New endpoints: `/api/payments/create-intent`, `/api/payments/confirm`, `/api/payments/webhook`
- Update `orders.ts` to use Stripe PaymentIntent (with fallback to internal wallet)
- Refund flow via Stripe Refund API
- Mobile: add Stripe PaymentSheet screen
- **Tests:** Stripe is mocked at the network layer

### Phase 3B: Push notifications
- Add `expo-notifications` to mobile (already in Expo SDK)
- New backend endpoint: `/api/notifications/register` (store push token)
- Server-side triggers: order status changes, subscription reminders, price drops on wishlist
- **Tests:** Mock push token storage

### Phase 3C: Offline mode
- New mobile service: `offlineQueue.ts` — queues actions when offline
- Auto-replay on reconnect
- Show offline indicator in UI
- **Tests:** Unit tests for queue logic

### Phase 3D: Docs + commit
- Update CHANGELOG to v1.3.0
- Update README, vision-audit
- Final commit, push

---

## Out of scope (deferred)
- Push notification **delivery** in production (requires FCM/APNS keys + provisioning)
- Stripe **webhook** signature verification (requires Stripe CLI / public webhook URL)
- Real cron jobs for autopilot (use `setInterval` for v1.3 demo)
- Background fetch (iOS-only, complex)

---

## Phase 3A: Stripe integration — design

### Backend changes

**New file:** `backend/src/services/stripe.ts`
- Wraps the Stripe SDK
- Methods: `createPaymentIntent`, `confirmPaymentIntent`, `refund`
- If `STRIPE_SECRET_KEY` not set → returns null (fallback to internal wallet charge)

**New file:** `backend/src/routes/payments.ts`
```
POST /api/payments/create-intent   — body: { amount, currency } → { clientSecret, paymentIntentId }
POST /api/payments/confirm         — body: { paymentIntentId, orderId } → { status }
POST /api/payments/webhook          — Stripe webhook (stub for v1.3, full in v2.0)
GET  /api/payments/history          — payment events for current user
POST /api/payments/refund           — body: { orderId, amount? } → { refundId, status }
```

**Updated:** `backend/src/routes/orders.ts`
- When `paymentMethod === 'card'`, create a Stripe PaymentIntent instead of charging the internal wallet
- Store `paymentIntentId` on the order
- Update order status based on payment confirmation

### Mobile changes

**New screen:** `mobile/app/payment/[orderId].tsx`
- Loads the order, calls `/api/payments/create-intent`, opens Stripe PaymentSheet
- On success, calls `/api/payments/confirm`
- On cancel, navigates back to Orders

**Updated:** `mobile/app/(tabs)/shop.tsx` and `orders.tsx`
- For card payments, navigate to the payment screen after order creation
- Wallet payments stay instant

### Tests

- `backend/__tests__/integration/payments.test.ts`
  - create-intent without Stripe key → returns null/fallback
  - create-intent with mocked Stripe → returns clientSecret
  - confirm → updates order status
  - refund → partial refund amount
  - webhook signature verification

---

## Phase 3B: Push notifications — design

### Backend

**New Mongoose model:** `PushToken`
```
{
  userId, token (Expo push token), platform (ios|android), deviceName, createdAt, lastSeenAt
}
```

**New file:** `backend/src/services/push.ts`
- Wraps Expo Server SDK
- `send(userId, title, body, data)` → returns ticket info
- No-op if `EXPO_ACCESS_TOKEN` not set

**New routes:** `backend/src/routes/notifications.ts`
```
POST   /api/notifications/register    — body: { token, platform, deviceName }
DELETE /api/notifications/unregister  — body: { token }
GET    /api/notifications             — recent notifications for user
POST   /api/notifications/test        — body: { userId, title, body } (admin only)
```

**Updated:** `backend/src/routes/orders.ts`, `subscriptions.ts`, `autopilot.ts`
- After status change / subscription reminder / wishlist restock → call `push.send(userId, ...)`

### Mobile

**New file:** `mobile/src/services/notifications.ts`
- `register()` — gets Expo push token, POSTs to `/api/notifications/register`
- `unregister()` — on logout
- `addReceivedListener(handler)` — react to incoming notifications while app is foregrounded

**Updated:** `mobile/app/_layout.tsx`
- On mount: call `register()`. On unmount: `unregister()`.

### Tests

- `backend/__tests__/integration/notifications.test.ts`
  - register stores token
  - unregister removes token
  - sending a test notification returns success/fallback

---

## Phase 3C: Offline mode — design

### Mobile

**New file:** `mobile/src/services/offlineQueue.ts`
```typescript
interface QueuedAction {
  id: string;          // uuid
  endpoint: string;    // e.g. '/api/orders'
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  createdAt: string;
  attempts: number;
}

const queue: QueuedAction[] = [];   // in-memory + AsyncStorage backup
const isOnline = (): boolean => NetInfo.fetch().isConnected;
const enqueue = (action) => queue.push(action);
const flush = async () => {
  if (!isOnline()) return;
  for (const action of queue) {
    await api.request(action.endpoint, { method: action.method, body: action.body });
  }
  queue.length = 0;
};
```

**Updated:** `mobile/src/services/api.ts`
- Wrap `request()` so that non-GET methods, when offline, enqueue instead of failing
- Auto-flush on `AppState.change === 'active'` (i.e. when user foregrounds app)

**Updated:** `mobile/app/(tabs)/_layout.tsx` (or a new component)
- Show a small "Offline" badge when NetInfo says no connection

### Tests

- `mobile/__tests__/unit/offlineQueue.test.ts`
  - enqueue + flush when online → request fires, queue clears
  - enqueue when offline → stays in queue
  - flush retries with exponential backoff

---

## Order of work

1. Backend: Stripe service + payments routes (~2h)
2. Backend: tests for payments (~30min)
3. Mobile: Stripe PaymentSheet integration (~2h)
4. Backend: push notifications (~1h)
5. Backend: notifications routes + tests (~1h)
6. Mobile: notifications service + registration (~1h)
7. Mobile: offline queue + NetInfo + tests (~2h)
8. Wire push notifications into order/subscription/autopilot flows (~1h)
9. Update docs (~1h)
10. Final commit + push (~10min)

**Total: ~12 hours of focused work**

---

## Success criteria

- [ ] `npm test` in backend → all tests pass (96+ new tests)
- [ ] `npx jest` in mobile → all tests pass (5+ new tests)
- [ ] Place order with `paymentMethod: 'card'` → creates PaymentIntent
- [ ] Place order with `paymentMethod: 'wallet'` → internal charge (existing behavior)
- [ ] Register push token on app start
- [ ] Receive push when offline (queued)
- [ ] Auto-flush queue on reconnect
- [ ] Stripe webhooks update order status (stub for v1.3)
- [ ] CHANGELOG, README, vision-audit updated
