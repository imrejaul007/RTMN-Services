# MyRisa — Women's Health (already 80% built)

**Owner:** RisaCare
**Status:** Mostly built (11 services, ports 4800-4930)
**Positioning:** "Your Health. Understood."
**v1 polish window:** 4 weeks

---

## What's already built (verify before changing)

| Service | Port | Purpose |
|---------|------|---------|
| myrisa-app | 4900 | Consumer interface |
| myrisa-universal-memory | 4800 | All domains memory |
| myrisa-womens-health-service | 4820 | Cycle, fertility, pregnancy |
| myrisa-sexual-wellness-service | 4821 | Libido, contraception |
| myrisa-worklife-service | 4822 | Burnout, energy, PTO |
| myrisa-relationships-service | 4823 | Partner, quality time |
| myrisa-human-twin-service | 4824 | Unified twin |
| myrisa-consultation-copilot | 4825 | Pre/post-visit |
| myrisa-auth-service | 4910 | RABTUL integration |
| myrisa-genie-health | 4920 | AI health assistant |
| myrisa-family-service | 4930 | Shab AI integration |

---

## v1 Scope (4 weeks — polish, don't add)

### 3 things only
1. **Verify all 11 services actually run** (per honest CLAUDE.md, many are scaffolds)
2. **Wire to Sync Engine** — publish `HealthActivityCompleted` events when relevant (e.g., walk for fertility window tracking)
3. **Wire to RisaLife Human Twin** — shared twin across RisaLife + MyRisa

### Pick ONE of: pregnancy OR menopause (don't try both)
**Recommendation: pregnancy** — higher engagement loop (40 weeks of returning), more viral (moms share), better monetization (hospital referrals, baby products).

Menopause can ship in v2.

---

## Hard cuts
- ❌ Don't add 5 more services
- ❌ Don't rebuild existing services from scratch
- ❌ Don't ship beauty / skincare / mother-baby care (v3)
- ❌ Don't add the second lifecycle phase in v1
- ❌ Don't ship a separate mobile app — use `myrisa-mobile-app` and unify with RisaLife app shell if possible

---

## v1 mobile app (polish existing)

**Recommended:** merge `myrisa-mobile-app` and RisaLife into a single `RisaLife + MyRisa` app. Same shell, two tabs:
- RisaLife tab = activity + territory (separate screens)
- MyRisa tab = women's health (separate screens)
- Shared: Human Twin, REZ Wallet, Profile, Settings

This is the "shared app shell" pattern. Don't ship two apps for the same person.

---

## Sync Engine events to publish

| Event | When | Payload |
|-------|------|---------|
| `HealthActivityCompleted` | Walk/run in fertility window | distance, pace, day-of-cycle |
| `PregnancyWeekChanged` | Week rollover | week, dueDate, babySize |
| `ConsultationCompleted` | Visit logged | doctor, notes, prescriptions |

MyRisa reads from sync:
- RisaLife activity within fertile window → boost fertility score
- Place visits (e.g., hospital) → contextualize pregnancy week

---

## What I would NOT do

- Don't add new v1 features. Polish.
- Don't ship a separate app. Unify with RisaLife.
- Don't try to support 7 wellbeing domains at once.
- Don't rebuild services that are working.
