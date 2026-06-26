# CorpID Consolidation Plan — 2026-06-27

## Situation

CorpID (Universal Identity, port 4702) is fragmented across 6 locations, not running, and not wired properly.
The RTMN Hub (4399) already has a `/api/identity` route pointing to port 4702 — but nothing is listening there.

## Discovery Findings

### Current State
| # | Location | Port | Code | Storage | Wired to Hub? | Running? |
|---|----------|------|------|---------|---------------|----------|
| 1 | `companies/HOJAI-AI/platform/identity/corpid-service/` | **4702** | 2,347 LOC | PersistentMap + @rtmn/shared | ❌ No | ❌ |
| 2 | `companies/REZ-Workspace/services/corpid-service/` | **4702** | ~250 LOC | Redis | ❌ No | ❌ |
| 3 | `companies/CorpPerks/corpid/` (15 microservices) | various | ~15k LOC | MongoDB | ❌ No | ❌ |
| 4 | `companies/CorpPerks/corpid-profile-bridge/` | — | 3,173 LOC | — | ❌ No | ❌ |
| 5 | `companies/REZ-Consumer/corpid-shield-app/` | — | mobile | React Native | ❌ No | ❌ |
| 6 | `companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/` (22 sub-services) | — | ~10k LOC | MongoDB | ❌ No | ❌ |
| **Canonical path** | `services/corpid-service/` | 4702 | — | — | ✅ | ❌ |

### What Actually Works
- **Hub route exists**: `REZ-ecosystem-connector` at port 4399 already has `app.use('/api/identity', ...)` → `http://localhost:4702`. ✅
- **Startup script knows it**: `scripts/dev-stack.sh` has `CORP_ID_CMD` pointing to `HOJAI-AI/platform/identity/corpid-service` on port 4702. ✅
- **dev-stack.sh starts it**: `start_service "corp-id" "$CORP_ID_CMD" 4702`. ✅
- **TwinOS Hub references it**: `twinos-hub` defines `'corpid.identity': { service: 'corpid-os', port: 4702 }`. ✅
- **REZ-SalesMind uses it**: `TRUST_SERVICE_URL=http://localhost:4702`. ✅
- **Salar OS uses it**: `CORPID_SERVICE_URL=http://localhost:4702`. ✅

### What's Broken
1. `services/corpid-service/` doesn't exist — canonical path in CANONICAL-PORT-REGISTRY.md is wrong
2. Port-collision: both HOJAI-AI and REZ-Workspace declare port 4702 — only one can win
3. HOJAI-AI `index.js` uses in-memory storage (`PersistentMap`) — data lost on restart
4. HOJAI-AI `index.persistent.js` uses `@rtmn/shared` PersistentStore — better but not the default startup
5. `package.json` `start` script runs `index.persistent.js` — good, but startup logs "CorpID v3.0" while Hub routes go to `/api/identity` which doesn't exist as a standalone path in the service
6. No unit tests (vitest)
7. `corpID-cloud/` (22 microservices) is completely separate/unused

### Why Nothing is Running
- `dev-stack.sh` starts CorpID on port 4702, but `npm start` fails because `@rtmn/shared` is a workspace package that may not resolve correctly from the HOJAI-AI path
- The `package.json` has `"@rtmn/shared": "file:../../../shared"` — relative symlink that needs `npm install` from that directory

---

## Implementation Plan

### Step 1: Fix canonical path in CANONICAL-PORT-REGISTRY.md
Change `services/corpid-service/` → `companies/HOJAI-AI/platform/identity/corpid-service/`.

### Step 2: Consolidate — Keep ONE service at port 4702
**Decision: Keep HOJAI-AI** as the canonical CorpID because:
- It has `index.persistent.js` (MongoDB persistence, survives restarts)
- It has the best security posture (L-1 through L-5 security fixes)
- It has `corpID-cloud/` with 22 enterprise sub-services (KYC, Federation, Consent, Twin, etc.)
- `dev-stack.sh` already references it
- TwinOS Hub and Salar OS expect it

**Action:** Deprecate `REZ-Workspace/services/corpid-service/` (Redis-based, 10 entity types) as "CorpID-Lite" with a note that it should merge into the canonical service. Move it to `REZ-Workspace/services/corpid-lite/` and add a `DEPRECATED.md` note.

### Step 3: Make `index.persistent.js` the proper default
The `package.json` already points `start` to `index.persistent.js` — this is correct. But add a startup script that:
1. Waits for MongoDB
2. Seeds default data
3. Logs startup success with version + stats

Also update `src/index.js` to redirect to `src/index.persistent.js` with a helpful message.

### Step 4: Add Hub-compatible route prefix
The Hub routes `/api/identity/*` → `http://localhost:4702`. The service serves its routes at:
- `/auth/*` (login, register, refresh, logout, me)
- `/api/users/*`
- `/api/businesses/*`
- `/api/profile/*`
- `/api/trust/*`
- `/api/namespaces/*`
- `/api/api-keys/*`
- `/health`, `/ready`

The Hub strips `/api/identity` and appends the rest to `CORPID_URL + req.originalUrl`.
So `GET /api/identity/auth/me` → `http://localhost:4702/api/identity/auth/me` — **404**.

**Fix:** Mount all routes under `/api/identity/` prefix in `index.persistent.js`. Use an `identityRouter` that all routes are mounted under.

### Step 5: Add vitest unit tests
Add tests for:
- Auth flow (register, login, refresh, logout)
- User CRUD
- Business CRUD
- Trust scores
- Rate limiting
- Account lockout
- Input sanitization

### Step 6: Update startup script path
No changes needed — `dev-stack.sh` already points to the right path.

### Step 7: Create CorpID Cloud integration plan
`corpID-cloud/` (22 microservices) is a separate, unused codebase. Map it as "Phase 2" — it should be wired under the same port 4702 as a separate module, or moved to its own port range (e.g., 4702-4724).

### Step 8: Flag CorpPerks as separate
15 microservices at `CorpPerks/corpid/` are an independent enterprise identity suite. Flag as "External to RTMN Core" in CLAUDE.md, with note that they complement CorpID-Lite.

---

## Files to Change

| File | Change |
|------|--------|
| `CANONICAL-PORT-REGISTRY.md` | Fix path: `services/corpid-service/` → `companies/HOJAI-AI/platform/identity/corpid-service/` |
| `companies/HOJAI-AI/platform/identity/corpid-service/src/index.persistent.js` | Add `/api/identity/` route prefix |
| `companies/HOJAI-AI/platform/identity/corpid-service/package.json` | Add vitest config, test script |
| `companies/HOJAI-AI/platform/identity/corpid-service/__tests__/` (new) | Add unit tests |
| `companies/REZ-Workspace/services/corpid-service/` | Move to `corpId-lite/` + add DEPRECATED.md |
| `.claude/plans/corpid-consolidation-plan.md` (this file) | Plan document |

---

## Post-Fix Expected State

| Item | After |
|------|-------|
| Canonical path | `companies/HOJAI-AI/platform/identity/corpid-service/` ✅ |
| Port | 4702 ✅ |
| Running | Yes — started by `dev-stack.sh` ✅ |
| Hub route | `/api/identity/*` → CorpID ✅ |
| Data persistence | MongoDB via `@rtmn/shared` PersistentStore ✅ |
| Security | L-1 through L-5 fixes applied ✅ |
| Route prefix | `/api/identity/*` (Hub-compatible) ✅ |
| Tests | vitest unit tests ✅ |
| Port collision | Resolved — REZ-Workspace copy moved to `corpId-lite/` ✅ |
