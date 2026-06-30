# InternetOS Quick Reference Card

**June 30, 2026**

---

## STATUS: 15% Built

### ✅ Built
| Component | Path | Status |
|-----------|------|--------|
| Actor Runtime | `platform/internet-os/actor-runtime/` | ✅ 6,561 LOC |
| Watcher Runtime | `platform/internet-os/watcher-runtime/` | ✅ 8,071 LOC |
| 7 Web Actors | `platform/internet-os/actors/*/` | ✅ Google Maps, Zomato, Airbnb, LinkedIn, News, Company Intel, JustDial |
| Knowledge Extraction | `platform/intelligence/knowledge-extraction/` | ✅ NER, entity linking |
| Review Scrapers | `products/review-scrapers/` (port 5456) | ✅ |

### ❌ Missing (Priority Order)
| # | Component | Effort | Why |
|---|-----------|--------|-----|
| 1 | API Server (port 4595) | 1 week | Unblocks everything |
| 2 | MongoDB Storage | 1 week | Persistence |
| 3 | **Skills Framework** | 3 weeks | Value layer |
| 4 | **Lead Gen Skill** | 2 weeks | Primary sell |
| 5 | **Competitor Intel Skill** | 2 weeks | Universal need |
| 6 | 10 more actors | 3 weeks | Shopify, Amazon, Twitter, Reddit, Glassdoor |
| 7 | Web-to-Twin Pipeline | 4 weeks | Knowledge layer |
| 8 | ConnectorOS | 8 weeks | 50+ connectors |
| 9 | Memorizers | 3 weeks | Historical memory |
| 10 | PlaybookOS | 4 weeks | Learning layer |

---

## THE 15-LAYER MODEL

```
L15: Economies (Skill, Department, API subscriptions)
L14: Networks (Nexha federation)
L13: Industries (Waitron, GlamAI, PropFlow, etc.)
L12: Companies (Full business stacks)
L11: Departments (Sales, Marketing, Procurement, Research)
L10: Researchers (Market, Competitor, Policy agents)
L9:  Playbooks (Restaurant Expansion, Sales, HR)
L8:  Skills (Lead Gen, Competitor Analysis) ← PRIMARY VALUE
L7:  Twins (Company, Market, Supplier, Brand) ← KNOWLEDGE
L6:  Memories (Historical timelines)
L5:  Enrichers (Company, People, Location)
L4:  Extractors (Menu, Product, Review, Job)
L3:  Watchers (Price, Review, Competitor, Job, Event)
L2:  Actors (Google Maps, LinkedIn, Amazon, etc.) ← FOUNDATION
L1:  Connectors (API auth, rate limiting)
```

---

## LEVERAGE: THE MULTIPLICATION

```
1 Actor (Google Maps)
    ↓
100 Skills (Lead Gen, Expansion, etc.)
    ↓
50 Employees (Sales Researcher, etc.)
    ↓
20 Departments (Restaurant, Beauty, etc.)
    ↓
10 IndustryOS (Waitron, GlamAI, etc.)
```

**Rule:** Quality > Quantity. 50 excellent actors > 500 mediocre ones.

---

## vs APIFY

| Aspect | Apify | HOJAI InternetOS |
|--------|-------|------------------|
| **What** | Data extraction | Autonomous intelligence |
| **Output** | JSON | Decisions + Actions |
| **Monetization** | $0.001/run | Skills + Subscriptions + APIs |
| **Moat** | Scale | Composition layers |
| **Customer** | Developers | Business users |

---

## IMMEDIATE ACTIONS

### This Week
1. Create API Server at `platform/internet-os/api-server/` (port 4595)
2. Add MongoDB storage layer
3. Add vitest tests for existing actors

### This Month
4. Build 10 actors (Shopify, Amazon, Twitter, Reddit, Glassdoor, Instagram, YouTube, Crunchbase, GitHub, Google Trends)
5. Build Lead Generation Skill
6. Build Competitor Intelligence Skill

### This Quarter
7. Build 20 more actors
8. Build Skills framework
9. Build ConnectorOS foundation
10. Build Web-to-Twin pipeline

---

## KEY DOCS

| Doc | URL |
|-----|-----|
| Executive Summary | `docs/INTERNETOS-EXECUTIVE-SUMMARY.md` |
| Full Audit | `docs/INTERNETOS-AUDIT.md` |
| Build Plan | `docs/INTERNETOS-BUILD-PLAN.md` |
| Gap Analysis | `docs/INTERNETOS-GAP-ANALYSIS.md` |
| Original Doc | `docs/INTERNETOS.md` |

---

## PORT REGISTRY

| Service | Port | Status |
|---------|------|--------|
| InternetOS | 4595 | ❌ Planned (conflict with billing-os) |
| Review Scrapers | 5456 | ✅ Built |
| Knowledge Extraction | 4784 | ✅ Built |

---

## THE POSITIONING

> **Apify extracts the web.**
> **HOJAI turns the web into AI workers, departments, and industry intelligence.**

```
Apify:   Internet → Data → JSON
HOJAI:   Internet → Data → Knowledge → Twins → Agents → Actions → Learning
```

---

*Last Updated: June 30, 2026*
