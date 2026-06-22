# Go4Food — Restaurant Discovery (NO delivery in v1)

**Owner:** REZ-Consumer
**Status:** Exists, scope unclear
**v1 scope:** 6 weeks
**Hard rule:** **NO delivery in v1.** Discovery + reservation only.

---

## Why no delivery in v1

Delivery is a logistics business, not a tech business. You need:
- Driver fleet (or 3P aggregator integration)
- Real-time tracking
- Cold-chain for some food
- Dispute resolution
- Insurance for delivery accidents

That's a $50M+ problem. **v1 is discovery, photos, reviews, reservations.** That's a $5M problem.

---

## v1 Scope — 3 features

1. **Restaurant discovery** — search by cuisine, area, price, dietary
2. **Menu + photos** — read-only menu, community photos
3. **Reviews** — write reviews (publishes `FoodReviewCreated` to Sync Engine)

### Bonus v1 features (if time)
4. **Reservations** — book a table, no payment in v1 (just hold a slot)
5. **Personalized "where to eat tonight"** — based on user's last food visits from RisaLife/MemoryOS

### Hard cuts
- ❌ NO delivery (v2 — 3P aggregator integration)
- ❌ NO online ordering (v2)
- ❌ NO restaurant POS / management (v3, this is REZ-Merchant)
- ❌ NO cooking classes (v3)
- ❌ NO food tours (v3)
- ❌ NO kitchen OS (v3)
- ❌ NO recipe sharing (v3)

---

## Services to build (v1)

| Service | Port | Purpose | Reuse |
|---------|------|---------|-------|
| `go4food-discovery` | 4070 | Restaurant search | sync-engine :4960, place-graph :4965 |
| `go4food-menus` | 4071 | Menu management (read-only) | new, MongoDB |
| `go4food-reviews` | 4072 | Reviews (writes to sync) | reviews-service :4969 |
| `go4food-app` | 4073 | Mobile app | React Native + Expo |

**Reuse:**
- Place graph :4965 (restaurants are places)
- Media service :4968 (photos)
- MemoryOS :4703 ("you liked Italian last time")
- REZ Wallet :4004 (any future payment)

---

## Engagement loop (v1)

```
User opens Go4Food
  → "Where to eat tonight?" card
  → Personalized based on last visits (from RisaLife walks + MemoryOS)
  → 3 restaurant cards with photos + reviews
  → Tap → see menu + photos
  → "Reserve table for 7:30 PM" (no payment in v1)
  → User writes review after visit
  → Review publishes to Sync Engine → shows up in BuzzLocal + RisaLife activity summary
```

---

## Why reviews feed the ecosystem

This is the critical point. A Go4Food review at "Cubbon Park café" gets published to Sync Engine. Now:
- RisaLife user who runs in Cubbon Park sees "great café, 4.7⭐ from 200 reviews" in their post-run screen
- BuzzLocal place detail for "Cubbon Park" shows food reviews
- Axom Trails sees cafés near treks
- StayOwn sees cafés near hotels

**One review, four apps benefit.** This is the moat working.

---

## What I would NOT do

- Don't ship delivery. Period.
- Don't ship a restaurant POS. Out of scope.
- Don't ship online ordering in v1.
- Don't build menu management for restaurant owners in v1 (read-only via API integration to existing restaurant systems if possible).
- Don't try to compete with Zomato/Swiggy in v1 (they own delivery; we own context).
