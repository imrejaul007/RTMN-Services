# Plan: Make RisaCare Independent of RTMN

> **Goal:** Remove all RisaCare leakage from RTMN's tracked code and docs. RisaCare becomes a fully independent client company that **consumes** RTMN/HOJAI services via published APIs — the same way any external client does.

---

## 0. Current State Audit (verified)

| Location | Tracked by RTMN git? | What it is | Action |
|----------|---------------------|------------|--------|
| `companies/RisaCare/` | ❌ No (`companies/*` gitignored, line 88 of `.gitignore`) | RisaCare's own repo (`.git/` present, remote `git@github.com:imrejaul007/RisaCare.git`) | ✅ Leave alone — already independent |
| `services/company-intelligence-risacare/` | ✅ Yes (4 files tracked) | RisaCare-named service with healthcare templates (HIPAA, FHIR, clinical protocols) — **this is HOJAI AI's intelligence offered as a product** | ❌ Move into HOJAI-AI, then delete from RTMN |
| `services/flow-os-canonical/services/company-intelligence-risacare/` | ❌ No (untracked scratch) | Empty stub of the same bridge | 🗑️ Delete outright |
| RTMN root docs (`CLAUDE.md`, `RTNM-*-AUDIT.md`, `PORT-REGISTRY.md`, etc.) | ✅ Yes | 60+ files reference RisaCare in various capacities | ✏️ Strip RisaCare-specific content; keep only connection/bridge references |
| `companies/HOJAI-AI/services/corpid-service/corpID-cloud/universal/src/models/universal.model.js` | ✅ Yes (HOJAI submodule) | Hardcoded `risacare: null` line + `platforms` array | ✏️ Remove risacare-specific entries; replace with generic client slot |
| `companies/HOJAI-AI/services/corpid-service/docs/CORPID_ROADMAP.md` | ✅ Yes | RisaCare mentioned in roadmap | ✏️ Generalize |

---

## 1. Architecture: How RisaCare Becomes a Proper Client

```
┌─────────────────────────────────────────────────────────────┐
│                    RisaCare (independent repo)              │
│  github.com/imrejaul007/RisaCare.git                        │
│  Lives at companies/RisaCare/ (gitignored by RTMN)          │
└────────────────────────┬────────────────────────────────────┘
                         │ consumes as CLIENT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              HOJAI AI (intelligence provider)                │
│  Submodule: companies/HOJAI-AI/                              │
│  github.com/imrejaul007/hojai-ai.git                         │
│                                                               │
│  New service: healthcare-vertical-intelligence               │
│    - HIPAA Consent Gate template                             │
│    - FHIR Resource Mapper template                           │
│    - Triage Routing workflow                                 │
│    - Patient Journey Tracker                                 │
│    - Clinical Protocol Lookup (Diabetes, Hypertension, etc.) │
│    - Port 4160                                                │
│    - Generic vertical templates — no RisaCare branding       │
└─────────────────────────────────────────────────────────────┘
                         ▲
                         │ consumes RTMN industry layer
                         │
┌─────────────────────────────────────────────────────────────┐
│                   RTMN Industry OS (vertical)                │
│  healthcare-os (5020) + RTMN Hub (4399)                      │
└─────────────────────────────────────────────────────────────┘
```

**RisaCare's wrapper layer (in its own repo) calls HOJAI AI's `healthcare-vertical-intelligence` API to get templates, then wraps them in its product UX (MyRisa, etc.). This is exactly how an external SaaS client would integrate.**

---

## 2. Execution Steps

### Step 1 — Audit bridge service contents (read-only)
**Already done.** Findings:
- 80 LOC service (`services/company-intelligence-risacare/src/index.js`)
- 6 endpoints: `/health`, `/ready`, `GET/POST /api/templates`, `GET/POST /api/templates/:id`, `POST /api/templates/:id/run`, `GET/POST /api/protocols?icd10=`
- Seed data: 5 templates (HIPAA Consent Gate, FHIR Resource Mapper, Triage Routing, Patient Journey Tracker, Clinical Protocol Lookup) + 2 protocols (Diabetes Type 2 E11, Hypertension I10)
- Storage: in-memory `Map()` (no DB)
- Port: 4160
- Tests: `tests/e2e.sh`, `tests/smoke.sh` — both shell-based smoke tests
- Dependencies: express, cors, helmet, compression, morgan, uuid
- **Bug to fix during move:** `seed()` line 32 references `created_at` correctly; protocol `seed()` line 38 lacks `company`/`vertical` fields — minor inconsistency.

### Step 2 — Create HOJAI AI's healthcare-vertical-intelligence service
**Location:** `companies/HOJAI-AI/services/healthcare-vertical-intelligence/`

**Files to create (mirror existing HOJAI service structure, look at `services/customer-intelligence/` for the template):**

```
companies/HOJAI-AI/services/healthcare-vertical-intelligence/
├── package.json           # name: "@hojai/healthcare-vertical-intelligence", port 4160
├── README.md              # explains: generic vertical templates, consumed by RisaCare (and any future healthcare client) via API
├── CLAUDE.md              # developer docs
├── src/
│   ├── index.js           # migrated from RTMN, with company/vertical made generic
│   ├── routes/
│   │   ├── templates.js
│   │   └── protocols.js
│   └── data/
│       └── seed.js        # HIPAA, FHIR, Triage, Patient Journey, Clinical Protocol templates
├── tests/
│   ├── smoke.sh           # migrated from RTMN
│   └── e2e.sh             # migrated from RTMN
└── Dockerfile             # standard HOJAI service Dockerfile
```

**Key changes vs. the original bridge:**
- Drop `const COMPANY = 'RisaCare';` → replace with `const VERTICAL = 'healthcare';`
- Service name in logs/responses: `healthcare-vertical-intelligence` (no RisaCare branding)
- Add a `README.md` section titled "Clients" listing RisaCare as the first consumer, with example integration code
- Optionally: accept `?client_id=` query param so multi-tenant usage is possible

**Commit message:** `feat(hojai-ai): add healthcare-vertical-intelligence service (4160) — generic vertical templates for healthcare clients`

### Step 3 — Delete RTMN-internal bridge services

```bash
# From RTMN repo root
git rm -r services/company-intelligence-risacare/
rm -rf services/flow-os-canonical/services/company-intelligence-risacare/
```

The flow-os-canonical subdir is untracked, so a plain `rm -rf` is enough.

**Commit message:** `chore(rtmn): remove company-intelligence-risacare bridge — moved to HOJAI AI as healthcare-vertical-intelligence (4160)`

### Step 4 — Strip RisaCare mentions from RTMN docs

**Rule:** Keep only mentions that describe the **connection/bridge** (e.g., "RisaCare consumes healthcare-vertical-intelligence from HOJAI-AI"). Remove all RisaCare-specific product detail (services, ports, features, MyRisa domains, etc.) — those belong in RisaCare's own repo.

**Files to edit (60 total — see audit list):**

| File | Action |
|------|--------|
| `RTMN-COMPANIES-AUDIT.md` | Replace RisaCare section with one-liner: "RisaCare is an external client. See `companies/RisaCare/` for details." |
| `RTNM-PRODUCTS-FEATURES-AUDIT.md` | Same — collapse RisaCare section |
| `RTMN-MASTER-AUDIT-DOCUMENTATION.md` | Strip RisaCare content |
| `STATUS-AND-REMAINING-WORK.md` | Remove RisaCare from company list (it's external) |
| `PORT-REGISTRY.md` | Remove RisaCare port mappings (4100-4781 etc.) |
| `FULL-DOCUMENTATION.md` | Strip |
| `MASTER-COMPLETE-DOCUMENTATION.md` | Strip |
| `GENIE-AI-SERVICES-AUDIT.md` | Strip |
| `INDUSTRY-AI-COMPANY-PLATFORM.md` | Strip |
| `companies/AdBazaar/*` (8 files reference RisaCare) | Strip — AdBazaar docs should only mention RisaCare if there's an actual integration contract; otherwise remove |

**Files NOT to touch:**
- `companies/RisaCare/` — that's RisaCare's own docs, leave alone
- `companies/HOJAI-AI/` — handled in Step 2 + a separate Step 5

**Commit message:** `docs(rtmn): strip RisaCare-specific content — RisaCare is now an independent external client`

### Step 5 — Clean HOJAI-AI corpid model & roadmap

**File:** `companies/HOJAI-AI/services/corpid-service/corpID-cloud/universal/src/models/universal.model.js`

Current (line 95): `risacare: null,    // Would integrate with RisaCare`
**Replace with:** `// (RisaCare integration handled by healthcare-vertical-intelligence — see HOJAI AI services)`

Current (line 2396): `platforms: ['rez', 'corpperks', 'risacare', 'adbazaar', 'bizora']`
**Replace with:** `platforms: ['rez', 'corpperks', 'adbazaar', 'bizora']` (remove risacare; it lives elsewhere)

**File:** `companies/HOJAI-AI/services/corpid-service/docs/CORPID_ROADMAP.md`
Replace RisaCare-specific roadmap items with generic healthcare-client notes.

**Commit message:** `chore(hojai-ai): remove RisaCare-specific entries from corpid model — RisaCare now consumed as external client`

### Step 6 — Verify

```bash
# From RTMN root
git ls-files | xargs grep -l "risacare\|myrisa\|RisaCare\|MyRisa" 2>/dev/null
# Expected: only files that legitimately mention "RisaCare consumes X via API" (connection-level docs)

# RisaCare folder untouched
ls companies/RisaCare/ | wc -l   # should be ~134 (unchanged)

# HOJAI AI new service exists
ls companies/HOJAI-AI/services/healthcare-vertical-intelligence/
```

---

## 3. Files Touched (Summary)

**Created (5):**
- `companies/HOJAI-AI/services/healthcare-vertical-intelligence/package.json`
- `companies/HOJAI-AI/services/healthcare-vertical-intelligence/README.md`
- `companies/HOJAI-AI/services/healthcare-vertical-intelligence/CLAUDE.md`
- `companies/HOJAI-AI/services/healthcare-vertical-intelligence/src/index.js` (migrated from RTMN)
- `companies/HOJAI-AI/services/healthcare-vertical-intelligence/Dockerfile`
- `companies/HOJAI-AI/services/healthcare-vertical-intelligence/tests/smoke.sh` (migrated)
- `companies/HOJAI-AI/services/healthcare-vertical-intelligence/tests/e2e.sh` (migrated)

**Deleted (RTMN):**
- `services/company-intelligence-risacare/` (entire tracked service)
- `services/flow-os-canonical/services/company-intelligence-risacare/` (untracked scratch)

**Edited (RTMN root, ~9 files):**
- All `RTNM-*AUDIT.md`, `PORT-REGISTRY.md`, `STATUS-AND-REMAINING-WORK.md`, `FULL-DOCUMENTATION.md`, etc.
- ~8 files in `companies/AdBazaar/`

**Edited (HOJAI submodule):**
- `companies/HOJAI-AI/services/corpid-service/corpID-cloud/universal/src/models/universal.model.js`
- `companies/HOJAI-AI/services/corpid-service/docs/CORPID_ROADMAP.md`

**Untouched:**
- `companies/RisaCare/` — entirely independent repo, untouched

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Other RTMN services consume the bridge's API at runtime | Audit found: only the bridge exists in isolation — no other RTMN code imports it. Verified via `git grep`. |
| Git submodule changes are tricky | HOJAI-AI is a submodule — I'll commit changes there first, then update the RTMN submodule pointer in a separate commit. |
| Doc-stripping is error-prone (60 files) | Use `grep -rl` first to list all impacted files, then surgical edits. Don't do bulk find-replace — context matters per file. |
| RisaCare folder is 911MB (mostly node_modules) | Don't move it — already its own repo, just leave in place |
| RTMN `.gitignore` already excludes `companies/*` — does anything need to change? | No. RisaCare was never tracked by RTMN git; nothing to untrack. |

---

## 5. Order of Operations

1. **Read HOJAI service template** — confirm the exact file layout for new HOJAI services (peek at `services/customer-intelligence/`)
2. **Create HOJAI service** with all migrated files
3. **Verify HOJAI service runs** (smoke test locally if possible)
4. **Commit in HOJAI submodule** — push to `hojai-ai` repo
5. **Update RTMN submodule pointer** — point RTMN at new HOJAI commit
6. **Delete RTMN bridge services** — `git rm` and `rm -rf`
7. **Strip RTMN docs** — file-by-file
8. **Edit corpid model** in HOJAI submodule
9. **Final verification** — `git grep` for remaining RisaCare refs, ensure only connection-level mentions remain
10. **Commit everything** — final summary commit

---

## 6. Rollback

If something goes wrong, every step is a separate commit. To roll back:
```bash
git revert <commit-sha>           # for any individual commit
git reset --hard <last-good-sha>  # for full rollback
```

No data loss risk because:
- RisaCare folder is its own repo and untouched
- HOJAI changes are in a separate submodule
- RTMN bridge deletion only affects files that are git-tracked (4 files)

---

## 7. Estimated Effort

- Step 1 (audit): ✅ done
- Step 2 (create HOJAI service): ~20 min
- Step 3 (delete RTMN bridge): ~2 min
- Step 4 (strip RTMN docs, 60 files): ~30 min (with surgical edits)
- Step 5 (corpid cleanup): ~5 min
- Step 6 (verify): ~5 min

**Total: ~1 hour**
