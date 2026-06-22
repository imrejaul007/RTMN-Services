# Karma — Social Impact + Visible Karma Score

**Owner:** Karma-Foundation
**Status:** 6 services exist (per CLAUDE.md)
**Tagline:** "Impact, Trust & Community Good"
**v1 polish window:** 4 weeks

---

## What's already built

| Service | Port | Purpose |
|---------|------|---------|
| karma-service | 3009 | Backend API |
| karma-web | (web) | Consumer web app (Next.js) |
| karma-mobile | (mobile) | Mobile app (Expo) |
| karma-loyalty-bridge | (svc) | Loyalty integration |
| loyalty-program-service | (?) | Existing |
| points-expiration-service | (?) | Existing |
| rewards-catalog-service | (?) | Existing |
| tier-management-service | (?) | Existing |

Plus anniversary + birthday rewards services.

---

## The Strategy: Visible Karma Score

**The single most important v1 feature is making the Karma Score visible to OTHER apps.** This is the unlock.

Currently Karma is a silo. A user volunteers, gets Karma points, never sees them outside Karma app. That's the wrong shape.

v1 makes the Karma Score a **read-only public signal** that any other app can query:
- RisaLife: "Karim has Karma 850 (12 verified events) — verified helper badge"
- Go4Food: "Volunteer-run restaurant, Karma 4.8⭐"
- StayOwn: "This hotel runs a verified ESG program, Karma 920"
- BuzzLocal: place detail shows Karma activity in the area

This turns Karma from a service into **infrastructure for trust**.

---

## v1 Scope (4 weeks) — Polish + Expose, don't add

### 3 things only
1. **Verify all 6 services actually run** (per honest CLAUDE.md, many may be scaffolds)
2. **Expose Karma Score as a public API** — `GET /api/v1/users/:id/karma-score` returns `{ score, tier, verifiedEvents, lastEventAt }`
3. **Publish `KarmaImpactLogged` events to Sync Engine** when a user volunteers, donates, etc.

### Hard cuts
- ❌ Don't add 10 more services
- ❌ Don't rebuild NGO partnership system from scratch
- ❌ Don't ship corporate CSR dashboards in v1 (v2)
- ❌ Don't add impact certificates (v2)
- ❌ Don't add policy integration (v3)

---

## v1 Karma Score (the spec)

```typescript
type KarmaScore = {
  userId: string;
  score: number;              // 0-1000
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Impact Hero';
  verifiedEvents: number;     // count of verified volunteer/impact events
  categories: {
    education: number;
    healthcare: number;
    environment: number;
    community: number;
    disasterRelief: number;
    womenEmpowerment: number;
    foodDonation: number;
    sustainability: number;
  };
  lastEventAt: Date;
  visibility: 'public' | 'friends' | 'private';
};
```

**Score decay:** -2 points/month if inactive (keeps score fresh, prevents stale bragging)

**Verification:** events from verified NGOs only. Self-reported events count at 0.1x.

---

## Why Karma Score visible everywhere is the moat

A RisaLife user sees two runners in their leaderboard:
- Karim: Karma 850, verified 12 events
- Asif: Karma 0

That's not a social feed feature. That's a **trust signal at the point of comparison.** It changes behavior:
- Users volunteer to boost their visible score
- Users prefer services with Karma Scores
- NGOs get free distribution through other apps

**This is what makes Karma infrastructure, not an app.**

---

## Sync Engine integration

### Publish
| Event | When | Payload |
|-------|------|---------|
| `KarmaImpactLogged` | Volunteer event completed | type, hours, ngo, verified |
| `KarmaMilestoneReached` | New tier | tier, scoreAt |
| `KarmaDecayed` | Monthly decay | oldScore, newScore |

### Read
- Nothing in v1 (Karma is mostly a publisher in v1, becomes a reader in v2)

---

## v1 mobile app screens (polish, don't add)

The existing app is well-scoped. Verify, polish, expose Karma Score prominently.

Critical screens:
1. **Home** — Karma Score, current tier, progress to next tier
2. **My Events** — list of past volunteer/impact events with verification status
3. **Discover** — find NGOs, events, opportunities nearby
4. **My Score** — detailed breakdown by category, decay warning
5. **Visibility Settings** — public / friends / private

**Add to Karma app:** a "My Score QR" feature — show a QR code with your score that other apps can scan to verify.

---

## Success criteria for v1

- 5,000 Karma Scores visible in other apps (RisaLife, Go4Food, BuzzLocal)
- 1 verifiable case: a user volunteers to boost their visible Karma Score in another app
- < 1% fake events detected (NGO verification + manual review)
- 30% D7 retention (this is a low-frequency app, not a daily app)

---

## What I would NOT do

- Don't add 5 more services.
- Don't rebuild NGO verification.
- Don't add corporate dashboards in v1.
- Don't try to make Karma a daily app (it's not — volunteers don't volunteer daily).
- Don't add impact certificates in v1.
