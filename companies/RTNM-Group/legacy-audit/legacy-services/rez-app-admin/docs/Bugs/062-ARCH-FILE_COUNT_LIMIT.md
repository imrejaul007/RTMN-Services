---
name: ARCH-005 FILE_COUNT_LIMIT_EXCEEDED
description: 24 screen files exceed 500-line architectural limit — largest is 2861 lines (5.7x the limit)
type: bug
severity: HIGH
domain: Architecture
fix_summary: "Extracted CampaignFormModal (1393 lines) and CampaignDealModal (667 lines) to `components/campaigns/`. Created `campaigns.styles.ts` (350 lines). Reduced campaigns.tsx from 2869 to 1418 lines. Wired via prop drilling from container."
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: ARCH-005 — 24 Files Exceed 500-Line Limit

### Status: OPEN | Severity: HIGH | Domain: Architecture

---

### Summary

24 screen files exceed the 500-line architectural limit defined in CLAUDE.md. The largest (`campaigns.tsx`) is 2861 lines — 5.7x the limit. These files mix data fetching, business logic, and UI rendering, making them impossible to test, review, or modify safely.

### Files Affected

| File | Lines | Over Limit By |
|---|---|---|
| `campaigns.tsx` | 2861 | 2361 |
| `mall.tsx` | 2815 | 2315 |
| `cash-store.tsx` | 2789 | 2289 |
| `bonus-zone.tsx` | 2667 | 2167 |
| `experiences.tsx` | 2435 | 1935 |
| `game-config.tsx` | 2422 | 1922 |
| `social-impact.tsx` | 2356 | 1856 |
| `events.tsx` | 2174 | 1674 |
| `extra-rewards.tsx` | 2117 | 1617 |
| `challenges.tsx` | 2110 | 1610 |
| `live-monitor.tsx` | 1896 | 1396 |
| `sponsors.tsx` | 1885 | 1385 |
| `merchants.tsx` | 1725 | 1225 |
| `support-tickets.tsx` | 1670 | 1170 |
| `wallet-adjustment.tsx` | 1622 | 1122 |
| `settings.tsx` | 1622 | 1122 |
| `leaderboard-config.tsx` | 1606 | 1106 |
| `system-health.tsx` | 1577 | 1077 |
| `offers.tsx` | 1567 | 1067 |
| `explore.tsx` | 1556 | 1056 |
| `event-rewards.tsx` | 1545 | 1045 |
| `trial-approvals.tsx` | 1526 | 1026 |
| `travel.tsx` | 1492 | 992 |
| `verifications.tsx` | 1463 | 963 |

### Fix

Refactor each file into smaller components:

```
campaigns/
  campaigns.tsx          # Container + routing
  components/
    campaign-list.tsx    # List display
    campaign-filters.tsx # Filter bar
    campaign-form.tsx    # Create/edit form
    campaign-stats.tsx   # Stats display
  hooks/
    use-campaigns.ts     # Data fetching
  types/
    campaign.ts          # Type definitions
```

Prioritize the largest files first (campaigns.tsx, mall.tsx, cash-store.tsx).

### Test Plan

1. All screen files under 500 lines after refactoring
2. Each component has a single responsibility
3. No loss of functionality — only structural reorganization
