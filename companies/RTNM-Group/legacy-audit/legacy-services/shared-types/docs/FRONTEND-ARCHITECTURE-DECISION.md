# REZ Ecosystem — Frontend Architecture Decision

**Decision:** Keep separate frontends with shared component library
**Date:** 2026-04-30

---

## Decision: Keep Two Hotel Frontends Separate

After analysis, **keep hotel-panel and hotel-pms as separate applications** for these reasons:

| Factor | hotel-panel (Next.js) | hotel-pms (React) | Verdict |
|--------|---------------------|------------------|---------|
| **User Type** | Hotel owners | Hotel staff | Different users |
| **Auth** | OAuth2 + OTP | Session + PIN | Different auth flows |
| **Frequency** | Occasional (daily) | Constant (all-day) | Different UX needs |
| **Features** | Analytics, payouts | Bookings, housekeeping | Non-overlapping |
| **Bundle size** | Lightweight | Heavy (MUI) | Merging adds complexity |

---

## Rationale

### 1. Different User Personas

**Hotel Panel (owners)**
- Check analytics 1-2x/day
- Need quick overview widgets
- Mobile-first design
- Simple interactions

**Hotel PMS (staff)**
- Used 8+ hours/day
- Dense data tables
- Keyboard shortcuts
- Bulk operations

### 2. Authentication Differences

| hotel-panel | hotel-pms |
|------------|-------------|
| REZ OAuth2 SSO | Session + PIN |
| Partner verification | Staff accounts |
| Cookie-based session | Server-side session |

### 3. Bundle Size

hotel-pms includes:
- 422 components
- 213 pages
- Heavy charting (recharts, d3)
- PDF generation (jspdf)

Merging would slow hotel-panel for owners.

---

## Implementation Plan

### 1. Extract Shared Components

Create `@rez/hotel-ui` package:

```
packages/
  hotel-ui/
    Button/
    Card/
    Table/
    Modal/
    DatePicker/
    hooks/
    utils/
```

### 2. Share Authentication Logic

```
packages/
  hotel-auth/
    useAuth.ts      # Shared hook
    AuthProvider.tsx  # Context
    ProtectedRoute.tsx
```

### 3. Document API Contract

Both frontends call same API - document it in OpenAPI spec.

---

## Alternative Considered

### Option A: Merge into One App

**Pros:**
- Single codebase
- Shared state

**Cons:**
- Larger bundle
- More complex auth
- Different deployment cadences
- Conflicting dependencies
- Longer builds

### Option B: Micro-Frontend

**Pros:**
- Independent deployments
- Shared shell

**Cons:**
- Complexity overhead
- Shared state challenges
- Build system complexity

**Decision:** Not worth the complexity for 2 apps.

---

## Action Items

- [x] Decision documented
- [ ] Extract `@rez/hotel-ui` package
- [ ] Document API contract
- [ ] Create shared auth package
- [ ] Deprecate duplicate components

---

## Timeline

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Extract shared UI components | 1 week |
| 2 | Create shared auth package | 2 days |
| 3 | Document API | 1 day |
| 4 | Deprecate duplicates | 1 week |

**Total: ~3 weeks** (vs 4-6 weeks for merge)
