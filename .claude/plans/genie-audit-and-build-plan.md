# Genie Audit + Build Plan (2026-06-26)

## What I Found

### Critical Issues

1. **Port 4736 conflict** — NOT real. `genie-accounts` has no PORT env (no port assigned), `genie-memory-inbox` defaults to 4710 (its own port). The audit claim of conflict was wrong. Both are fine.

2. **RTMN Hub integration** — Genie services (ports 4701, 4709, 4712-4744, 4767-4769) are NOT wired into RTMN Hub at `services/unified-os-hub/src/routes/`. The `genie-os` runtime (7100) is the main entry point.

3. **Most services not running** — 38/40 specialist services are installed but not started. genie-os has a startup script (`infrastructure/scripts/start-all.js`) that handles this.

### What's Real vs Stub

**FULLY REAL services** (~2,000-6,000 LOC each):
- `genie-os` runtime (7100) — 2,241 LOC main brain + MongoDB
- `genie-gateway` (4701) — 542 LOC
- `genie-learning-os` (4722) — real LMS with languages, business school, skills, curriculum routes
- `genie-money-os` (4724) — real finance with budget/expenses/savings/investments/goals/insights
- `genie-wellness-os` (4723) — real wellness with health/sleep/nutrition/mental/fitness/insights
- `genie-research` (4740) — real research agent with LLM + multi-source synthesis
- `genie-teacher` — real LMS with courses/lessons/enrollments/progress/quizzes
- `genie-founder` — real founder dashboard with KPIs/milestones/OKRs/AI board advisor
- `genie-creator-agent` — real content workspace with drafts/templates/publishing calendar
- All voice services (wake-word, listening-modes, device-integration)
- Phase 21 multi-modal services (91 tests, all passing)

**LEAN but FUNCTIONAL services** (CJS pattern, 100-300 LOC):
- genie-accounts — OAuth stub with 10 provider mocks, clearly documented as "Phase A stubs"
- genie-memory-inbox (4710) — real universal capture with 12 memory types
- genie-calendar-service (4709), genie-briefing-service (4712), genie-universal-search (4713), genie-serendipity-service (4714), genie-smart-forgetting-service (4715), genie-companion-service (4716), genie-memory-graph (4717), genie-thinking-engine (4719), genie-life-gps (4721), genie-execution-engine (4726)

**UI screens** (all 24 exist in genie-os frontend):
- AdminScreen has 5 tabs: Users, Usage, Audit, Metrics, Services
- All domain screens exist: Calendar, Finance, Health, Learning, Relationships, etc.

---

## What Is Actually Missing

### Tier 1 — Must Do (this session)

1. **RTMN Hub routes** for Genie — wire genie-os (7100) into Hub at `/api/genie/*`
2. **Admin missing screens** — OrgManagement, SSO, RBAC, AgentConfig tabs in AdminScreen
3. **Onboarding gaps** — mic/camera permission prompts, voice greeting, accessibility (ARIA labels), org onboarding
4. **SDKs** — iOS (Swift), Android (Kotlin), Flutter scaffolds + proper npm package for TypeScript

### Tier 2 — Next (follow-up sessions)

5. **Phase 25 AR/VR** — WebXR prototype using React-Three-Fiber for 3D Genie workspace
6. **Fatten genie-accounts** — Real OAuth flows for Gmail, Google Calendar, Apple Health
7. **Named agents** — Travel Agent (genie-travel-agent), Finance Advisor (money-os is lean), Health Coach (wellness-os is lean)

---

## Implementation Plan

### Step 1: RTMN Hub routes for Genie
Add routes in `services/unified-os-hub/src/routes/` for genie-os at port 7100:
- `GET/POST /api/genie/ask` → ask endpoint
- `GET /api/genie/health` → health
- `GET /api/genie/briefing/:userId`
- `GET /api/genie/calendar/:userId`
- Wire into existing Hub route index

### Step 2: Admin missing screens
Add 4 new tabs to AdminScreen.tsx:

**OrgManagementTab** — CRUD for organizations:
- List orgs, create new, edit name/domain, deactivate
- Backend: `GET/POST /api/admin/orgs`, `PUT/DELETE /api/admin/orgs/:id`

**SSOTab** — SAML/OIDC config:
- Form with IdP URL, client ID, client secret fields
- "Test connection" button → calls `/api/admin/sso/test`
- Backend: `POST /api/admin/sso/configure`

**RBACTab** — Role and permission matrix:
- Table of roles × permissions (read/write/admin/super_admin)
- Toggle cells to grant/revoke permissions
- Backend: `GET /api/admin/rbac/roles`, `PUT /api/admin/rbac/roles/:role/permissions`

**AgentConfigTab** — Toggle specialist services per org:
- List of 23 specialist services with on/off toggles
- Per-org enable/disable
- Backend: `GET /api/admin/orgs/:id/agents`, `PUT /api/admin/orgs/:id/agents`

### Step 3: Onboarding gaps
Add to `OnboardingFlow.tsx`:

- **Permissions step** (between Goals and Done):
  - Request microphone: `navigator.mediaDevices.getUserMedia({ audio: true })`
  - Request camera: `navigator.mediaDevices.getUserMedia({ video: true })`
  - Handle denied/granted states with clear UI
  - Skip option if denied

- **Voice greeting** (at start of Welcome step):
  - Use Web Speech API (`speechSynthesis.speak()`) to say "Welcome to Genie. I'm your personal AI assistant."
  - Plays once on mount, "Skip" button available

- **Accessibility**:
  - Add `aria-label` to all inputs and buttons
  - Add `role` and keyboard handlers for the step navigation
  - Screen reader announcements for step transitions

- **Org onboarding** (optional step after individual setup):
  - Company name, admin email fields
  - Creates org via `POST /api/admin/orgs`
  - Links user as org_admin

### Step 4: Mobile SDKs

**iOS SDK** (`genie-sdk-ios/`):
- Swift Package with GenieClient class
- Methods: ask(message), capture(content, type), getBriefing(userId), calendar(userId), health(userId)
- WebSocket support for voice streaming
- Publish to Swift Package Registry

**Android SDK** (`genie-sdk-android/`):
- Kotlin library with same GenieClient interface
- Build.gradle publish to MavenCentral

**Flutter SDK** (`genie-sdk-flutter/`):
- Dart package wrapping iOS/Android SDKs
- `GenieClient` class with async methods

**npm package** (`@hojai/genie-client`):
- Publish `frontend/web/src/services/api.ts` as a proper npm package
- Add package.json, README.md, TypeScript types
- `npm publish --access public`

### Step 5: Phase 25 AR/VR

**React-Three-Fiber prototype** (`genie-spatial/`):
- 3D floating cards representing Genie screens (Briefing, Calendar, Memory, etc.)
- OrbitControls for camera rotation
- WebXR integration for VR headset support
- "Enter VR" button using `@react-three/xr`
- Floating Genie avatar (simple 3D mesh or animated sprite)
- Spatial audio for notifications

Tech stack: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/xr`

### Step 6: Fatten stubs

**genie-travel-agent** — build real travel agent:
- API integrations: Skyscanner/Amadeus for flights, Booking.com for hotels
- Trip planning: destination → flights + hotels + itinerary
- Expense tracking during trip
- Destination info via LLM + web search

**genie-accounts** — real OAuth:
- Google Calendar: OAuth2 flow, sync events
- Gmail: OAuth2, read/compose emails
- Apple Health: HealthKit integration
- Bank (via Plaid): account linking, transaction sync

---

## Priority Order

1. RTMN Hub routes for Genie (5 min)
2. Admin screens (OrgManagement + SSO + RBAC + AgentConfig) (45 min)
3. Onboarding gaps (voice greeting + permissions + accessibility + org onboarding) (30 min)
4. npm package publish + SDK scaffolds (30 min)
5. Phase 25 AR/VR prototype (60 min)
6. Fatten stubs (follow-up)

---

## Effort Estimate

| Task | Time | Notes |
|------|------|-------|
| RTMN Hub routes | 10 min | 4-5 routes + Hub update |
| Admin screens | 60 min | 4 tabs × ~15 min each |
| Onboarding gaps | 45 min | 4 features × ~10 min |
| SDKs (iOS + Android + Flutter + npm) | 90 min | Templates + npm publish |
| AR/VR prototype | 120 min | R3F + WebXR setup |
| Fatten stubs | 120+ min | Per-service OAuth integrations |

**Total this session: ~5 hours**
