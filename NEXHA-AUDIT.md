# Nexha Structural / Port / Scope Audit

> **Date:** 2026-06-21
> **Scope:** AdBazaar-style structural + port + scope audit of every "Nexha"-named location in the RTMN repo.
> **Status:** 🔴 **Read-only investigation.** No files modified. Recommendations + phase plan only.
> **Companion to:** [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md), [CANONICAL-PORT-REGISTRY.md](CANONICAL-PORT-REGISTRY.md), [ARCHITECTURE-AUDIT.md](ARCHITECTURE-AUDIT.md).

---

## Executive Summary

Nexha is a **B2B commerce platform** (distribution, franchise, procurement, manufacturing, trade-finance, intelligence + portal + gateway) that is **part of the RTMN group of companies**. Its real implementation lives in `companies/REZ-Workspace/companies/Nexha/` (16 services), with a deprecated clone in `companies/REZ-Workspace/companies/RTNM-Group/nexha/` and a deployment slice in `companies/Nexha/`. A separate `@hojai/company-intelligence-nexha` (HOJAI AI jewelry template service on port 4159) is misnamed — it shares the codename but is not part of the Nexha product.

| Finding | Severity | Action |
|---|---|---|
| Nexha code split across 3 on-disk trees (L1, L2, L3) | 🔴 Critical | Phase N3 — pick survivor, delete other |
| `ecosystem-connector` claims port **4399** — RTMN Unified Hub's canonical port | 🔴 Critical | Phase N2 — move to 4380 |
| `nexha-commerce-network/start.sh` hardcodes port **4600** — clashes with `business-copilot` | 🔴 Critical | Phase N1/N2 — delete or move |
| Root `CLAUDE.md` classifies Nexha as **external client** (wrong) | 🟠 High | Phase N7 — correct |
| RTMN Unified Hub has **zero `/api/nexha/*` routes** | 🟠 High | Phase N6 — add routes |
| `companies/RTNM-Group/nexha/` is empty + gitignored but every deployment doc points at it | 🟠 High | Phase N5 — populate or remove |
| `companies/Nexha/CLAUDE.md` describes 10 services that **none of them exist in that directory** | 🟠 High | Phase N1/N7 — reconcile |
| `CANONICAL-PORT-REGISTRY.md` has **zero Nexha entries** | 🟡 Medium | Phase N7 — add Nexha section |
| 15 critical/high bugs across L2 (duplicate routes, absolute paths, hardcoded tokens) | 🟠 High | Phase N1 — fix |
| Empty stub `services/flow-os-canonical/services/company-intelligence-nexha/` | 🟡 Low | Phase N5 — `rm -rf` |
| Mis-named `@hojai/company-intelligence-nexha` (jewelry templates, not Nexha) | 🟡 Medium | Phase N5 — keep under `@hojai/` or rename per risacare-independence precedent |

---

## 1. The 6 Nexha Locations

| ID | Path | Services | Real? | One-line description |
|---|---|---:|---|---|
| **L1** | `companies/Nexha/` | 3 | Yes (subset) | User's intended canonical home; deployable Render+Vercel slice |
| **L2** | `companies/REZ-Workspace/companies/Nexha/` | 16 | Yes (fullest) | Largest Nexha tree: full monorepo + mobile + nextabizz + 17 K8s manifests |
| **L3** | `companies/REZ-Workspace/companies/RTNM-Group/nexha/` | 9 | Yes (degraded) | Self-declared "deprecated, kept for reference"; CLAUDE.md and SOT.md disagree with README |
| **L4** | `companies/RTNM-Group/nexha/` | 0 | **Empty placeholder** | Gitignored by blanket `companies/*`; never tracked; all deployment docs reference this path |
| **L5** | `services/company-intelligence-nexha/` | 1 | Yes (different product) | `@hojai/company-intelligence-nexha` — HOJAI AI jewelry vertical templates on port 4159 |
| **L6** | `services/flow-os-canonical/services/company-intelligence-nexha/` | 0 | Empty stub | Untracked scratch; matches risacare-independence.md precedent for removal |

---

## 2. Dedup Matrix

Columns = locations. Cells: ✅ present · ❌ absent · 🔵 unique to this location.

| Service / Concept | Port | L1 | L2 | L3 | L4 | L5 | L6 |
|---|---:|:-:|:-:|:-:|:-:|:-:|:-:|
| distribution-os | 4300 | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| franchise-os | 4310 | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| procurement-os | 4320 | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| manufacturing-os | 4330 | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| trade-finance | 4340 | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| intelligence-layer | 4350 | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| portal (Next.js) | 4388 | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| ecosystem-connector | 4399 | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| nexha-gateway | 5002 | ❌ | 🔵 | ❌ | ❌ | ❌ | ❌ |
| nexha-corpid-sync | 4390 | ❌ | ❌ | 🔵 | ❌ | ❌ | ❌ |
| nextabizz (apps+services) | 3000/3001 | ❌ | 🔵 | ❌ | ❌ | ❌ | ❌ |
| mobile (Expo) | n/a | ❌ | 🔵 | ❌ | ❌ | ❌ | ❌ |
| commerce-identity | 8000 | 🔵 | ❌ | ❌ | ❌ | ❌ | ❌ |
| sutar-mock | 4799 | 🔵 | ❌ | ❌ | ❌ | ❌ | ❌ |
| portal (Next.js) | 3000 | 🔵 | (nextabizz/apps/web) | ❌ | ❌ | ❌ | ❌ |
| nexha-commerce-network (stub) | 4600 | ❌ | 🔵 | ❌ | ❌ | ❌ | ❌ |
| shared libraries | — | ❌ | ✅ (6) | ✅ (4) | ❌ | ❌ | ❌ |
| K8s manifests | — | ❌ | ✅ (17) | ✅ (4) | ❌ | ❌ | ❌ |
| Tests (.test.ts) | — | ❌ | ✅ (7) | ❌ | ❌ | ❌ | ❌ |
| `@hojai/company-intelligence-nexha` | 4159 | ❌ | ❌ | ❌ | ❌ | 🔵 | ❌ |
| Empty flow-os-canonical stub | — | ❌ | ❌ | ❌ | ❌ | ❌ | 🔵 |
| RTMN Hub `/api/nexha/*` routes | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Key observation:** L2 and L3 are near-duplicates (8 services + shared libs at the same names + ports). The only service unique to L3 is `nexha-corpid-sync@4390` — and it's the one that wires to RTMN CorpID@4702.

---

## 3. Port Claim Analysis

| Port | Declared by | RTMN canonical owner | Clash? |
|---:|---|---|:-:|
| 3000 | L1 portal, L2 nextabizz/apps/web | (no canonical) | No |
| 4159 | L5 (`@hojai/company-intelligence-nexha`) | doc claims `sutar-revenue-sharing` (ghost) | **Doc clash only** |
| 4300 | L2 + L3 distribution-os | (no canonical) | No (L2 ≡ L3 dup) |
| 4310 | L2 + L3 franchise-os | (no canonical) | No (L2 ≡ L3 dup) |
| 4320 | L2 + L3 procurement-os | (no canonical) | No (L2 ≡ L3 dup) |
| 4330 | L2 + L3 manufacturing-os | (no canonical) | No (L2 ≡ L3 dup) |
| 4340 | L2 + L3 trade-finance | (no canonical) | No (L2 ≡ L3 dup) |
| 4350 | L2 + L3 intelligence | (no canonical) | No (L2 ≡ L3 dup) |
| 4388 | L2 + L3 portal | (no canonical) | No (L2 ≡ L3 dup); L1 CLAUDE.md says portal=4388 but actual=3000 |
| 4390 | L3 nexha-corpid-sync | (no canonical) | No (unique) |
| **4399** | L2 + L3 ecosystem-connector | **RTMN Unified Hub** | **🔴 HARD CLASH** |
| **4600** | L2 nexha-commerce-network/start.sh | **business-copilot** | **🔴 HARD CLASH** (also a stub with no package.json) |
| 4799 | L1 sutar-mock | (no canonical) | No |
| 5002 | L2 nexha-gateway | (none in CANONICAL; PORT-REGISTRY lists it) | No |
| 5140 | L2 nexha-gateway HOJAI env | **home-services-os** | Soft clash (env-only, no live calls) |
| 8000 | L1 commerce-identity | (no canonical) | No |

**3 hard clashes with RTMN canonicals.** None of Nexha's claimed ports (4300-4388, 5002) clash with each other or with RTMN canonicals — only 4399, 4600, and the 4159 doc-only conflict.

---

## 4. Doc Drift Inventory

| # | Disagreement | Source A | Source B |
|---|---|---|---|
| D1 | Nexha is **external client** (NOT a member of RTMN group) | root `CLAUDE.md` External Clients Policy; `STATUS-AND-REMAINING-WORK.md:4,82,167` | User clarification (Nexha is RTMN-internal) |
| D2 | `companies/Nexha/` contains 10 services | L1 `CLAUDE.md` | Reality: 0 of those 10 live in L1 |
| D3 | Portal port = 4388 vs 3000 | L1 `CLAUDE.md` says 4388 | L1 actual Next.js port = 3000; L2/L3 portal = 4388 |
| D4 | Version 3.0.0 vs 4.0.0 | L1 `CLAUDE.md` (3.0.0) | L1 `FEATURES-LIST.md` (4.0.0) |
| D5 | `RTNM-Group/nexha/` status | L3 `README.md` ("MOVED, kept for reference only") | L3 `CLAUDE.md` and `SOT.md` (treat as canonical/production) |
| D6 | `nexha-corpid-sync` token | L3 `src/index.ts:36` hardcodes `'corpid-internal-token'` | Should read `CORPID_TOKEN` env or fail-fast |
| D7 | Port 4159 owner | `RTNM-PRODUCTS-FEATURES-AUDIT.md:654` (`sutar-revenue-sharing`) | Actual = `@hojai/company-intelligence-nexha` |
| D8 | Umbrella URL | L1 CLAUDE.md: `https://nexha.onrender.com` | L1 render.yaml: per-service subdomains only |
| D9 | Quick Start `cd RTNM-Group/nexha` | L1 `CLAUDE.md:20-25` | L4 is empty + gitignored; L1 has no root package.json |
| D10 | Workspace inclusion | L2 `package.json` + `pnpm-workspace.yaml` | Both omit `nexha-gateway`, `nexha-commerce-network`, `mobile`, `portal` |
| D11 | RTMN Hub "67/92 healthy" | root `CLAUDE.md` top banner | Superseded by "AUDIT & CLEANUP STATUS" section (Phase 5-10) |
| D12 | `sutar-mock` SUTAR_IDENTITY_URL | L1 `.env` = `:4799` | L1 code default = `:4702` (real CorpID) |
| D13 | `company-intelligence-*` ownership | `companies/HOJAI-AI/CLAUDE.md:100,130` (5 verticals including Nexha) | `companies/Nexha/` has zero awareness of L5 |
| D14 | Nextabizz `outputFileTracingRoot` | L2 `nextabizz/apps/web/next.config.ts` hardcodes `/Users/rejaulkarim/Documents/ReZ Full App/nextabizz` | Real L2 path = `companies/REZ-Workspace/companies/Nexha/nextabizz/` — makes nextabizz unbuildable elsewhere |

---

## 5. Scope Pollution Findings

1. **L3 masquerades as canonical** despite its own README admitting it's deprecated. CLAUDE.md and SOT.md contradict the README. Treat as pollution until removed.
2. **L4 is a phantom canonical** — empty directory, blanket-gitignored, but every Nexha deployment doc says `cd RTNM-Group/nexha` and `github.com/RTNM-Group/nexha`.
3. **L5 mis-categorized** under `services/` — it's a `@hojai/` AI vertical-template service (jewelry), not part of the Nexha standalone product.
4. **L6 is pure scratch** — one of 5 empty stubs created 2026-06-20 in a single batch. Matches risacare-independence.md precedent for `rm -rf`.
5. **`nexha-commerce-network` stub in L2** has only a `start.sh` that calls `npm run dev` (no `package.json`). Hardcodes port 4600 → clashes with `business-copilot@4600`.
6. **Two `@rez/nexha-*` namespaces paralleled by `@nexha/commerce-identity` in L1** — namespace split without a documented reason.
7. **Nextabizz self-nested `nextabizz/nextabizz/`** directory contains only `.env.example`/`.github`/`.gitignore` — accidental second clone.
8. **L2 shared libs = 6, L3 shared libs = 4** — neither is the source of truth; a merge will lose or duplicate code unless explicitly tracked.

---

## 6. Critical Bugs & Broken References

| # | Severity | Location | Bug |
|---|---|---|---|
| B1 | 🔴 | `companies/REZ-Workspace/companies/Nexha/nexha-gateway/src/index.ts` | `app.post('/api/van-sales', …)` registered twice (lines 226 & 243); stray `});` at line 499 |
| B2 | 🔴 | `companies/REZ-Workspace/companies/Nexha/nextabizz/apps/web/next.config.ts` | `outputFileTracingRoot: '/Users/rejaulkarim/Documents/ReZ Full App/nextabizz'` — absolute path, breaks for every other developer |
| B3 | 🟠 | 6 of 7 backend `.env.example` files in L2 | All claim `PORT=3000` — first one to start wins, others collide |
| B4 | 🟠 | `companies/REZ-Workspace/companies/RTNM-Group/nexha/nexha-corpid-sync/src/index.ts:36` | `CORPID_TOKEN \|\| 'corpid-internal-token'` — silent fallback to a hardcoded string |
| B5 | 🟠 | L2 `nexha-commerce-network/` | No `package.json`, no `src/`. `start.sh` calls `npm run dev` which will fail. Port 4600 hardcoded = clash with `business-copilot` |
| B6 | 🟠 | L2 `shared/event-types/src/` | Empty; package.json declares a `main` entry that doesn't exist |
| B7 | 🟠 | L2 `nextabizz/services/integrations/rez-merchant/src/` and `hotel-pms/src/` | Empty; same pattern |
| B8 | 🟡 | L1 `companies/Nexha/commerce-identity/.env` | `SUTAR_IDENTITY_URL=http://localhost:4799` (mock) overrides code default `:4702` (real CorpID) — production wiring gap |
| B9 | 🟡 | L2 K8s manifests (17) | All `containerPort: 4000` with `PORT=4000` env-injected — overrides every TS default of `43xx`. K8s Service ports are the only thing keeping them apart |
| B10 | 🟡 | L3 K8s manifests | `containerPort: 4000` but ingress points at `port: 8080`; no service in tree runs on either, manifests are unreconciled with code |
| B11 | 🟡 | L2 `pnpm-workspace.yaml` + root `package.json` `workspaces` | Both omit `nexha-gateway`, `nexha-commerce-network`, `mobile`, `portal` — those won't install with the workspace |
| B12 | 🟡 | L3 `package.json` `workspaces` | Omits `trade-finance`, `intelligence-layer`, `portal`; no `pnpm-workspace.yaml`/`pnpm-lock.yaml`/`turbo.json`; some members lack `tsconfig.json` |
| B13 | 🟢 | L1 `companies/Nexha/` | No root `package.json`; Quick Start `cd RTNM-Group/nexha` doesn't work from L1's actual path |
| B14 | 🟢 | RTMN Hub | `services copy/unified-os-hub/src/routes/index.js` has **zero** `/api/nexha/*` routes — no Hub exposure of Nexha at all (the Ecosystem Connector at 4399 is Nexha's own, not the RTMN one) |
| B15 | 🟢 | L2 `nexha-gateway` | Proxies `/api/hojai/products` → `http://localhost:5140/api/products`; `HOJAI_BRIDGE_URL=localhost:5140` in env, but no TypeScript code actually calls it |

---

## 7. Phase Plan (AdBazaar-style)

### N1 — Foundation fixes
**Goal:** Make the candidate canonical Nexha tree buildable and the docs tell the same story.
- **Scope:** L1, L2, L3 files only.
- **Actions:**
  1. Fix B1 — duplicate `/api/van-sales POST` registration + stray brace in `nexha-gateway/src/index.ts`.
  2. Fix B2 — replace absolute `outputFileTracingRoot` in `nextabizz/apps/web/next.config.ts` with `path.join(__dirname, '../../..')`.
  3. Fix B3 — set per-service canonical ports in all 7 backend `.env.example` files (matching each TS default).
  4. Fix B4 — fail-fast if `CORPID_TOKEN` is unset in `nexha-corpid-sync/src/index.ts:36`.
  5. Fix B6/B7 — either delete empty `src/` dirs (`shared/event-types/`, `nextabizz/services/integrations/{rez-merchant,hotel-pms}/`) or stub with `index.ts` + README.
  6. Reconcile L1 doc-drift items D2, D3, D4, D8, D9.
- **Outcome:** `pnpm install && pnpm build` at L2 succeeds with no parse errors and no port collisions on local startup. L1 docs match its actual 3-package contents.

### N2 — Port collision resolution (Nexha vs RTMN canonicals)
**Goal:** Zero Nexha service on a port RTMN owns.
- **Scope:** All Nexha-declared ports vs `CANONICAL-PORT-REGISTRY.md`.
- **Actions:**
  1. Move L2 ecosystem-connector off 4399 → suggested **4380** (kept in the 43xx-Nexha block).
  2. Delete `nexha-commerce-network/start.sh` (B5 phantom service) OR move to 4690 if retained.
  3. Resolve L5 port 4159 doc claim: confirm `@hojai/company-intelligence-nexha` IS the legitimate 4159 owner; update `RTNM-PRODUCTS-FEATURES-AUDIT.md:654` to remove the ghost `sutar-revenue-sharing` line.
  4. Add Nexha ports to `CANONICAL-PORT-REGISTRY.md` in a dedicated "Nexha (RTMN-internal)" section so L1/L2/L3 stops being implicit.
- **Outcome:** 0 clashes with RTMN canonicals; the port registry has a Nexha block.

### N3 — Merge L2 + L3 into a single clean tree under L1
**Goal:** One canonical Nexha tree, no L2/L3 leftovers.
- **Scope:** L2, L3, L1.
- **Actions:**
  1. Build a fresh clean tree at `companies/Nexha/` with the union of L2 + L3 unique services:
     - From L2: `distribution-os@4300`, `franchise-os@4310`, `procurement-os@4320`, `manufacturing-os@4330`, `trade-finance@4340`, `intelligence@4350`, `portal@4388`, `nexha-gateway@5002`, `mobile`, `nextabizz` (sub-workspace)
     - From L3: `nexha-corpid-sync@4390`
  2. Resolve port clashes before merge (per N2): move `ecosystem-connector` off 4399 → 4380; drop or move `nexha-commerce-network/start.sh` (phantom).
  3. Reconcile shared-lib count (L2=6 vs L3=4) by unioning the missing two (`auth-middleware`, `event-types`) into the merged tree.
  4. Add a single root `package.json` + `pnpm-workspace.yaml` + `turbo.json` (currently inconsistent across L2/L3); include EVERY package.
  5. Port the 3 L1 services (`commerce-identity@8000`, `portal@3000`, `sutar-mock@4799`) into the new tree, rename to `@nexha/*` to match the merged namespace.
  6. Delete L2 and L3 entirely (commit + push).
  7. Move 17 L2 K8s manifests + 4 L3 K8s manifests into the merged tree; reconcile the 4000/8080 inconsistencies during the merge.
  8. Migrate audit docs (NETWORK-AUDIT.md, BUYER-SELLER-AUDIT.md, COMPANIES-AUDIT.md, PRODUCTION-AUDIT-REPORT.md, RTNM-COMPANIES-AUDIT.md, RTNM-PRODUCTS-FEATURES-AUDIT.md) into `companies/Nexha/docs/`; rewrite to reflect the merged scope.
- **Outcome:** Exactly one `companies/Nexha/` tree on disk with the union of L2+L3 unique services, a coherent workspace config, and zero per-service port clashes. L2 and L3 paths are deleted.

### N4 — Scope annotations (mark what's where)
**Goal:** Every Nexha file knows which tree it belongs to and whether it's canonical.
- **Scope:** All 6 locations L1-L6.
- **Actions:**
  1. Add a `CANONICAL-HOME: companies/Nexha/...` banner comment to the top of every L1/L2/L3/L5 service `index.ts`.
  2. Create `companies/Nexha/SCOPE-AUDIT.md` listing L5 as a `@hojai/` service (not part of standalone Nexha) and L6 as scratch.
  3. Update root `CLAUDE.md` External Clients Policy to remove Nexha (per user clarification); reconcile with `STATUS-AND-REMAINING-WORK.md`.
- **Outcome:** A reader of any single file can answer "is this part of the Nexha product?" without cross-referencing.

### N5 — Scope cleanup (physical moves + L4 resolution)
**Goal:** Consolidate to one canonical home + resolve L4 placeholder.
- **Scope:** L1 (already rebuilt by N3), L4, L5, L6.
- **Actions:**
  1. L4 (`companies/RTNM-Group/nexha/`): After audit, L4 was confirmed empty, never tracked, no tooling touches it. Deployment docs in L2's DEPLOY.md and README.md reference it as the future separate-GitHub-repo home. **Recommendation:** Leave L4 as a placeholder for now (the separate-repo intent is plausible), but add a `README.md` explaining intent + re-include in `.gitignore` whitelist so it stops being silently ignored. Re-decide later.
  2. `rm -rf services/flow-os-canonical/services/` (removes all 5 stubs including nexha — matches risacare-independence.md precedent; safe because dir is untracked).
  3. L5 stays at `services/company-intelligence-nexha/` — it's a legitimate `@hojai/` member. **No move.** Just add a `CANONICAL-HOME: companies/HOJAI-AI/services/...` banner per N4 (only if HOJAI claims it; otherwise leave).
  4. Delete the rejected L2/L3 leftover (already done by N3 step 6).
- **Outcome:** All real Nexha standalone code lives in L1 (`companies/Nexha/`); L4 is documented as a placeholder; L6 is gone; L5 untouched.

### N6 — RTMN Hub wiring
**Goal:** Nexha is reachable through the RTMN Hub.
- **Scope:** `services copy/unified-os-hub/src/routes/index.js`.
- **Actions:**
  1. Add `/api/nexha/*` routes for each surviving Nexha service (distribution, franchise, procurement, manufacturing, trade-finance, intelligence, portal, corpid-sync, gateway).
  2. Add a `/api/nexha/health` aggregate endpoint.
  3. Update `services copy/unified-os-hub/` service registry JSON to list Nexha.
- **Outcome:** `curl http://localhost:4399/api/nexha/services` returns the live registry.

### N7 — Final docs & dedup candidates
**Goal:** Truth in docs; clear next-actions list.
- **Scope:** All `.md` files referencing Nexha.
- **Actions:**
  1. Rewrite root `CLAUDE.md` "External Clients" section to remove Nexha; add a "RTMN Group Companies" section that lists Nexha.
  2. Update `STATUS-AND-REMAINING-WORK.md` to reflect the new Nexha canonical home.
  3. Create `companies/Nexha/DEDUP-CANDIDATES.md` listing: L5 vs L6, L2 vs L3 candidates resolved, `nexha-gateway` vs `nexha-ecosystem-connector` overlap question.
  4. Reconcile `RTNM-PRODUCTS-FEATURES-AUDIT.md` port 4159 (D7).
  5. Reconcile `CANONICAL-PORT-REGISTRY.md` Nexha block (per N2 step 4).
- **Outcome:** A new reader of root `CLAUDE.md` will find a single, correct Nexha entry that points to L1.

### N8 — Verification & sign-off
**Goal:** Confirm the audit's claims.
- **Scope:** Whole monorepo.
- **Actions:**
  1. `pnpm install` at L1 succeeds.
  2. `pnpm --filter @nexha/* build` produces binaries for every service.
  3. Hub route loader accepts the new `/api/nexha/*` routes.
  4. `grep -r "RTNM-Group/nexha" .` returns zero hits (or only intentional references to L4 if user chose to populate it).
  5. `grep -r "nexha.onrender.com" .` matches only the umbrella deployment, not per-service URLs.
- **Outcome:** All Phase N1-N7 changes are mechanically verified.

---

## 8. Resolved Decisions (2026-06-21)

| # | Decision | Resolution |
|---|---|---|
| 1 | **L2 vs L3** | **Merge L2 + L3 into a fresh clean tree** under `companies/Nexha/` (per Phase N3). Delete both L2 and L3. |
| 2 | **L4 empty dir** | **Document as a placeholder.** L4 is genuinely empty, never tracked, never deleted, no tooling touches it. Deployment docs in L2's DEPLOY.md and README.md reference it as the future separate-GitHub-repo home. Leave in place + add a README explaining intent + re-include in `.gitignore` whitelist so it stops being silently ignored. |
| 3 | **L5 scope fix** | **Keep `services/company-intelligence-nexha/` as-is.** Fix only the port 4159 doc entry (`RTNM-PRODUCTS-FEATURES-AUDIT.md:654`). No move, no rename. |

## 9. Still Open (deferred)

1. **Umbrella `nexha.onrender.com`.** Options:
   - (a) Deploy a real Caddy umbrella at render.com
   - (b) Keep per-service subdomains and update the docs
   - (c) Drop the umbrella claim entirely
2. **External-client classification in root CLAUDE.md.** User confirmed Nexha is RTMN-internal. Confirm we want to:
   - (a) Edit External Clients Policy (precedent for future corrections)
   - (b) Treat Nexha as a one-off correction (add an inline note)

---

## 10. Honest Verdict

Nexha is a B2B commerce platform (distribution, franchise, procurement, manufacturing, trade-finance, intelligence) with a real Next.js portal and a real Express API — but its 16 services are split across three on-disk trees (L1 partially populated, L2 the full monorepo, L3 a deprecated clone), its **port 4399 hard-clashes with RTMN's own Unified Hub**, and **the RTMN Hub has zero `/api/nexha/*` routes** so Nexha is invisible from the platform's own gateway. The biggest immediate risk is **silent confusion**: a new contributor reading root `CLAUDE.md` learns Nexha is an external client, finds `companies/Nexha/`, sees 3 packages, reads CLAUDE.md describing 10 services that don't exist there, and has no way to discover the real code in `REZ-Workspace/`. The second-biggest risk is **the port 4399 clash**: if any developer runs both `unified-os-hub` and `nexha-ecosystem-connector`, the second one to start will silently fail or take over the wrong service, and the failure mode is indistinguishable from "RTMN is down." Fixing the port collisions and consolidating to a single canonical tree (N1-N3) is the highest-leverage cleanup; the rest of the phases are documentation and Hub wiring.

---

## Appendix A — Files Cited

- `/Users/rejaulkarim/Documents/RTMN/CLAUDE.md` (root) — External Clients Policy, doc drift source
- `/Users/rejaulkarim/Documents/RTMN/STATUS-AND-REMAINING-WORK.md` — lines 4, 82, 167 (external-client claim)
- `/Users/rejaulkarim/Documents/RTMN/CANONICAL-PORT-REGISTRY.md` — port canon (no Nexha entries)
- `/Users/rejaulkarim/Documents/RTMN/PORT-REGISTRY.md` — line 799-803 (Nexha@5002 in older doc)
- `/Users/rejaulkarim/Documents/RTMN/RTNM-PRODUCTS-FEATURES-AUDIT.md` — line 654 (ghost `sutar-revenue-sharing@4159`)
- `/Users/rejaulkarim/Documents/RTMN/ARCHITECTURE-AUDIT.md` — line 24 (Nexha Portal@3000)
- `/Users/rejaulkarim/Documents/RTMN/industry-os/render.yaml` — line 33 (`NEXHA_URL=https://nexha.onrender.com`)
- `/Users/rejaulkarim/Documents/RTMN/services copy/unified-os-hub/src/routes/index.js` — Hub routes (no `/api/nexha/*`)
- `/Users/rejaulkarim/Documents/RTMN/.gitignore` — lines 43-50, 97 (whitelist + blanket `companies/*`)
- `/Users/rejaulkarim/Documents/RTMN/.claude/plans/risacare-independence.md` — risacare removal precedent
- `/Users/rejaulkarim/Documents/RTMN/companies/Nexha/CLAUDE.md` — describes 10 services (none here)
- `/Users/rejaulkarim/Documents/RTMN/companies/Nexha/{render.yaml,docker-compose.yml,Caddyfile}` — L1 deploy configs
- `/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/Nexha/` — L2 (16 svcs, 17 K8s)
- `/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/Nexha/nexha-gateway/src/index.ts` — B1 duplicate route
- `/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/Nexha/nextabizz/apps/web/next.config.ts` — B2 absolute path
- `/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/Nexha/{shared/event-types,nextabizz/services/integrations/{rez-merchant,hotel-pms}}/src/` — B6/B7 empty dirs
- `/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/RTNM-Group/nexha/` — L3 (deprecated; unique nexha-corpid-sync@4390)
- `/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/RTNM-Group/nexha/nexha-corpid-sync/src/index.ts:36` — B4 hardcoded token
- `/Users/rejaulkarim/Documents/RTMN/companies/RTNM-Group/nexha/` — L4 (empty placeholder)
- `/Users/rejaulkarim/Documents/RTMN/services/company-intelligence-nexha/` — L5 (`@hojai/` jewelry templates @4159)
- `/Users/rejaulkarim/Documents/RTMN/services/flow-os-canonical/services/company-intelligence-nexha/` — L6 (empty stub)
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/CLAUDE.md` — lines 100, 130 (5 verticals)
- `/Users/rejaulkarim/Documents/RTMN/companies/RisaCare/risa-care-dental-inventory-service/src/services/nexha-integration.js` — integration reference

---

*Audit performed by structural scouts on 2026-06-21. No files were modified.*
*See also: [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md), [CANONICAL-PORT-REGISTRY.md](CANONICAL-PORT-REGISTRY.md), [ARCHITECTURE-AUDIT.md](ARCHITECTURE-AUDIT.md)*

---

## Appendix B — User-Decision Audit Trail

Three clarifying questions were asked during the audit to scope the work. Resolutions:

| Question | Answer | Implication |
|---|---|---|
| Is Nexha external or in-group? | **In-group (RTMN company)** | Root `CLAUDE.md` External Clients Policy needs correction (Phase N7) |
| Canonical home? | `companies/Nexha/` (L1), fill from REZ-Workspace | Phase N3 rebuilds L1 by merging L2 + L3 |
| `company-intelligence-nexha` — mis-named or shared codename? | Investigate first | Scout found it shares only the codename; verdict (A) mis-named HOJAI service — but user overrode and chose **(keep as-is, fix doc only)** |
| L2 vs L3? | **Audit and merge** (don't delete either) | Phase N3 builds a new clean tree; both L2 and L3 get deleted as part of the merge |
| L4 empty? | **Audit properly** | Scout confirmed empty + never tracked + no tooling + deployment docs reference it as separate-repo staging → N5 step 1: leave as placeholder, add README, fix `.gitignore` whitelist |
| L5 scope? | **Keep as-is, fix port doc only** | N5 step 3: no move, no rename. N7: fix `RTNM-PRODUCTS-FEATURES-AUDIT.md:654` |

## Appendix C — Notes for the Implementer

If you run Phase N3 manually (rather than as part of a workflow), the order matters:

1. **N1 first** (foundation fixes) — B1, B2, B4 are merge blockers (B1 would break TS compilation; B2 would break nextabizz builds for anyone else; B4 is a security hole)
2. **N2 next** (port collisions) — pick 4380 for ecosystem-connector BEFORE the merge so the destination tree has clean ports
3. **N3** (merge) — biggest single chunk; expect ~30 min of file moves + workspace config reconciliation
4. **N4** (banners + SCOPE-AUDIT.md) — cheap, do it during N3
5. **N5** (physical moves) — `rm -rf services/flow-os-canonical/services/` is the single highest-leverage command (5 stubs in one go, untracked, no risk)
6. **N6** (Hub routes) — independent of N1-N5; can run anytime after N3
7. **N7** (final docs) — do last so you only have to write the corrected docs once
