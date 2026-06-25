# Architecture

{{PROJECT_TITLE}} is a marketplace built on HOJAI Foundry's `marketplace` starter.

## High-level

```
Browser  ──►  Frontend (:3000)  ──proxy /api/*──►  Backend (:4001)
                                                    │
                                                    ├── In-memory store (v0)
                                                    ├── SUTAR agent registry
                                                    └── /api/nexha/* (CapabilityOS)
```

## HOJAI services used

| Concern | SDK | v0 status |
|---|---|---|
| Identity | `@hojai/foundation` | stub |
| Memory | `@hojai/foundation` | stub |
| Twins | `@hojai/foundation` | stub |
| Trust / SADA | `@hojai/foundation` | stub |
| Agent runtime | `@hojai/sutar` | stub agents (5) |
| Nexha network | `@hojai/nexha` | profile + capability declaration |
| Commerce | `@hojai/commerce` | in-memory catalog |
| Payments | `@hojai/payment` | webhook receiver |
| Logistics | `@hojai/logistics` | webhook receiver |
| Reputation | `@hojai/reputation` | stub |
| Discovery | `@hojai/discovery` | stub |

Replace each `stub` with a real SDK call as you build out your business.
