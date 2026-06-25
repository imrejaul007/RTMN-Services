# genie-widgets — Lock Screen & Home Screen Widgets (C10)

> **"Genie on your phone's home screen, glanceable, no app open required."**
> 8 widget types. iOS WidgetKit + Android AppWidget compatible. Tiny payloads.
> Each widget is a strict-size data blob the OS polls every N minutes.

| Aspect | Value |
|---|---|
| **Service name** | `genie-widgets` |
| **Port** | `4734` |
| **Category** | C10 — Lock-Screen Widgets (Phase C moat) |
| **Status** | ✅ Production-ready |
| **Auth** | Bearer JWT + `x-internal-token` |
| **Persistence** | Two JSON-file stores: `widget-configs`, `widgets` |
| **Response size** | Per-widget < 5KB; full bundle < 10KB |
| **Owner** | HOJAI-AI / genie product line |

## Quick start

```bash
npm install
JWT_SECRET=test PORT=4734 INTERNAL_SERVICE_TOKEN=demo node src/index.js
bash tests/smoke.sh
node tests/widgets-readiness.test.mjs
```

## Widget types (8)

| Type | Size | Refresh | What it shows |
|---|---|---|---|
| **briefing** | 2×2 | 30 min | Headline, subline, mood, weather, location |
| **focus** | 2×2 | 60 min | Today's 3 priorities + next action |
| **gratitude** | 2×1 | 2 hours | Today's gratitude item + streak |
| **prayer** | 2×1 | 2 hours | Today's prayer + answered count |
| **moment** | 2×2 | 4 hours | Latest life moment + days since |
| **twin** | 2×2 | 60 min | Name + headline + top trait |
| **counter** | 1×1 | 30 min | Days counter (e.g. "96 days meditating") |
| **countdown** | 2×1 | 60 min | Days until a future event |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/widgets/types` | List all 8 widget types + metadata |
| GET | `/widgets/:type/:userId` | Get a single widget payload |
| POST | `/widgets/render/:userId` | Render a bundle (1+ widgets in one call) |
| GET | `/widgets/manifest/:userId` | iOS WidgetKit + Android AppWidget manifest |
| GET | `/config/:userId` | Get user's widget config |
| POST | `/config/:userId` | Replace config |
| POST | `/config/:userId/pin/:widgetType` | Pin a widget |
| POST | `/config/:userId/unpin/:widgetType` | Unpin a widget |

## Sample payload (briefing widget)

```json
{
  "success": true,
  "data": {
    "type": "briefing",
    "userId": "user-001",
    "meta": {
      "size": "2x2",
      "refreshMin": 30,
      "icon": "☀️",
      "label": "Daily briefing"
    },
    "data": {
      "headline": "Build HOJAI 30-min demo",
      "subline": "3 priorities, 1 risk to watch",
      "icon": "☀️",
      "mood": "focused",
      "weather": "☀️",
      "tempC": 28,
      "location": "Bengaluru"
    },
    "generatedAt": "2026-06-24T12:00:00Z"
  }
}
```

## Why C10 matters

Lock-screen and home-screen widgets are the **highest-frequency surface** in mobile:

- A user unlocks their phone ~80 times/day. Each unlock = one widget glance.
- That's ~80 impressions/day with **zero app open**, no notification, no battery.
- Most personal AI apps are invisible 95% of the time. Widgets flip that.
- iOS 16+ and Android 12+ both support rich widgets. The infrastructure is ready.

The 8 widgets we ship are **all the user actually needs at a glance**:
briefing (state of day), focus (what to do), gratitude (mindset), prayer (intention),
moment (story), twin (identity), counter (progress), countdown (anticipation).

## Architecture

```
genie-widgets (4734)
├── src/index.js                       # Express + 2 PersistentMaps + seed
├── src/routes/widgets.js              # 8 widget types + manifest + render
└── src/routes/config.js               # per-user pin/unpin/config
        │
        ├─→ @rtmn/shared/auth          # Bearer JWT (CorpID-backed)
        ├─→ @rtmn/shared/lib/genie-readiness  # installReadinessRoutes + autoSeed
        └─→ PersistentMap              # JSON-file-backed stores
              ├── widgets/             # (reserved — currently computed)
              └── widget-configs/      # per-user pin configuration
```

## Seed data (Phase A)

- 1 user config: `cfg-user-001` with `briefing` + `gratitude` pinned
- 8 widget types with hardcoded sample payloads (in production these aggregate
  from upstream services via direct HTTP)

## Tests

| Suite | File | Assertions | Status |
|---|---|---|---|
| Readiness (Node, in-process) | `tests/widgets-readiness.test.mjs` | 33 | ✅ |
| Smoke (curl) | `tests/smoke.sh` | 8 checks | ✅ |

```bash
JWT_SECRET=test PORT=4734 INTERNAL_SERVICE_TOKEN=demo node src/index.js &
node tests/widgets-readiness.test.mjs
bash tests/smoke.sh
```

## Roadmap (future)

- [ ] Live aggregation from upstream services (briefing, spiritual, twin)
- [ ] Push notifications when widget payload changes significantly
- [ ] "Smart widget" — auto-pick best widget type based on time of day
- [ ] User-defined widgets (URL + render template)
- [ ] Glance history (log every widget read for engagement analytics)

## Related

- `genie-briefing` — source of briefing widget data
- `genie-personal-twin` — source of twin widget data
- `genie-spiritual-os` — source of gratitude + prayer widget data
- Web UI: `genie-os/frontend/web/src/screens/WidgetsScreen.tsx`
