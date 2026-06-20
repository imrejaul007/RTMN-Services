# Plan: Extract Do App to Independent Repo `imrejaul007/do-app`

> **Goal:** Move the canonical Do App out of the RTMN monorepo into its own git repo so it can be developed, versioned, and deployed independently. Do App becomes a self-contained consumer of RTMN services (via the Unified Hub at port 4399), not a submodule of it.
>
> **Per the user:** Extract completely. Source of truth = REZ-Consumer/do (canonical, has 1 critical bug to fix later). Local folder lives at `RTMN/companies/do-app/`. REZ-Workspace fork is **kept as-is** for reference / feature ideas (not deleted).

---

## 0. Current State (verified)

| Location | Tracked by RTMN git? | What it is |
|----------|---------------------|------------|
| `companies/REZ-Consumer/do/` | ✅ Yes (in REZ-Consumer submodule) | Canonical Do App — backend + mobile. Has 1 critical `passwordHash` bug. 3 git commits: `4c7978f`, `e8f6f01`, `402c869` |
| `companies/REZ-Workspace/companies/REZ-Consumer/do/` | ❌ No (submodule, not in RTMN's tracked tree) | Ambitious fork — kept for feature reference per user |
| `companies/*` blanket gitignore (line 88) | — | Currently hides everything under `companies/`; new `do-app/` will need an exception |

**Key facts:**
- RTMN remote: `https://github.com/imrejaul007/RTMN-Services.git` (active branch: `refactor/consolidate-hojai-ai`)
- Only one submodule: `companies/HOJAI-AI` (points to `imrejaul007/hojai-ai.git`)
- GitHub auth: `imrejaul007` with `repo` scope (can create private repos)
- Target new repo: `imrejaul007/do-app` (private)
- RTMN `.gitignore` line 88: `companies/*` — need to add `!companies/do-app/` exception

---

## 1. Target Repo Structure

```
imrejaul007/do-app/                         (github.com/imrejaul007/do-app, private)
├── README.md                               ← rewritten, RTMN-aware
├── LICENSE                                 ← MIT (default)
├── .gitignore                              ← node/expo/express
├── package.json                            ← workspace root (npm workspaces)
├── render.yaml                             ← backend deploy to Render
├── eas.json                                ← mobile build to EAS
├── .github/
│   └── workflows/
│       ├── backend-ci.yml                  ← test + lint + build
│       └── mobile-ci.yml                   ← typecheck (EAS handles builds)
│
├── backend/                                ← from REZ-Consumer/do/do-backend/
│   ├── src/
│   ├── __tests__/
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── mobile/                                 ← from REZ-Consumer/do/app/
│   ├── app/
│   ├── src/
│   ├── assets/                             ← (if any — none in REZ-Consumer version)
│   ├── app.json
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md                     ← what the app does, why
│   ├── DEPLOYMENT.md                       ← Render + EAS + App Store / Play Store
│   ├── INTEGRATION-WITH-RTMN.md            ← how it calls the RTMN Unified Hub
│   └── SECURITY-AUDIT.md                   ← moved from REZ-Consumer/do
│
└── scripts/
    ├── setup.sh                            ← one-shot dev setup
    └── generate-icons.mjs                  ← (if exists)
```

**Why this structure:**
- `backend/` and `mobile/` are independent — backend is Express, mobile is Expo Router. npm workspaces allow shared scripts.
- `docs/` consolidates all the design docs (currently scattered in REZ-Consumer root).
- `INTEGRATION-WITH-RTMN.md` is critical — makes the contract with RTMN explicit (this is now an *external* consumer, not a child service).

---

## 2. Architecture: How Do App Talks to RTMN After Extraction

```
┌──────────────────────────────────────────────┐
│   imrejaul007/do-app (independent repo)      │
│   github.com/imrejaul007/do-app              │
│                                              │
│   mobile/ (Expo Router 53)                   │
│     └─► HTTP POST /api/auth/signup           │
│     └─► HTTP POST /api/auth/login            │
│     └─► HTTP GET  /api/genie/dashboard/:id   │
│                                              │
│   backend/ (Express + MongoDB, port 3001)    │
│     └─► HTTP POST http://hub.rtmn.local:4399 │
│     └─► HTTP GET  http://genie-gateway:4701  │
└──────────────────┬───────────────────────────┘
                   │ HTTPS / LAN
                   ▼
┌──────────────────────────────────────────────┐
│      RTMN (imrejaul007/RTMN-Services)        │
│      Unified Hub on :4399                   │
│        /api/auth/*   → CorpID (4702)        │
│        /api/genie/*  → Genie Gateway (4701) │
│        /api/twins/*  → TwinOS Hub (4705)    │
│        /api/identity/* → CorpID (4702)      │
└──────────────────────────────────────────────┘
```

The Do backend already uses these URL patterns (see `do-backend/src/config.ts` lines 70-75):
- `GENIE_GATEWAY_URL` (default `http://localhost:4701`)
- `GENIE_PERSONAL_URL` (default `http://localhost:4708`)
- `GENIE_WHATSAPP_URL` (default `http://localhost:4718`)
- `CORPID_URL` (default `http://localhost:4300`)

For production, these env vars get set to RTMN's public URLs. **No code changes needed.**

---

## 3. Step-by-Step Execution

### Phase 1: Create GitHub repo (no local changes yet)

```bash
# From anywhere
gh repo create imrejaul007/do-app --private --description "Do App — AI-powered chat commerce for the REZ ecosystem. Mobile + backend, RTMN consumer."
```

**Expected output:** Empty repo at `github.com/imrejaul007/do-app`.

### Phase 2: Create local folder structure

```bash
# From RTMN root (/Users/rejaulkarim/Documents/RTMN)
mkdir -p companies/do-app/backend companies/do-app/mobile companies/do-app/docs companies/do-app/scripts companies/do-app/.github/workflows
```

### Phase 3: Copy canonical code (preserving history of source files via git mv in new repo)

```bash
# Copy backend (do-backend/ → do-app/backend/)
cp -R companies/REZ-Consumer/do/do-backend/. companies/do-app/backend/
# Remove the lockfile from copy — will be regenerated
rm -f companies/do-app/backend/package-lock.json
# Remove the dist/ folder (rebuild on first install)
rm -rf companies/do-app/backend/dist
# Remove the local node_modules
rm -rf companies/do-app/backend/node_modules

# Copy mobile (do/app/ → do-app/mobile/)
cp -R companies/REZ-Consumer/do/app/. companies/do-app/mobile/
# Remove the doubly-nested app/app/ (mobile/app/app/ exists, we want mobile/app/)
# We do NOT auto-fix this — flagged in migration notes; fix in a later commit
rm -f companies/do-app/mobile/package-lock.json
rm -rf companies/do-app/mobile/node_modules
```

**Note:** `cp -R` does NOT preserve git history — it just copies files. Git history preservation requires `git filter-repo` on the REZ-Consumer submodule (a separate operation). Since the source is 3 commits and they're recent, this is acceptable for v1; if you want history later, we can do a follow-up.

### Phase 4: Write the new repo's scaffolding

Files to create:

**`do-app/.gitignore`** — node, expo, express, os junk
```
node_modules/
**/node_modules/
dist/
**/dist/
.expo/
**/.expo/
*.log
.env
.env.local
.env.*.local
.DS_Store
*.apk
*.aab
*.ipa
coverage/
```

**`do-app/package.json`** — npm workspace root
```json
{
  "name": "do-app",
  "version": "1.0.0",
  "private": true,
  "description": "Do App — AI-powered chat commerce (mobile + backend)",
  "workspaces": ["backend", "mobile"],
  "scripts": {
    "dev:backend": "npm run dev --workspace=backend",
    "dev:mobile":  "npm run start --workspace=mobile",
    "build": "npm run build --workspaces --if-present",
    "test":  "npm run test --workspaces --if-present",
    "lint":  "npm run lint --workspaces --if-present"
  },
  "engines": { "node": ">=20" }
}
```

**`do-app/README.md`** — rewritten from scratch, RTMN-aware

**`do-app/render.yaml`** — copied from `do/do-backend/render.yaml` (if exists, else scaffold one)

**`do-app/eas.json`** — copied from `do/app/eas.json` (if exists, else scaffold)

**`do-app/docs/INTEGRATION-WITH-RTMN.md`** — new file explaining how Do App calls RTMN

**`do-app/docs/DEPLOYMENT.md`** — new file with Render + EAS instructions

**`do-app/.github/workflows/backend-ci.yml`** — test + lint + build
```yaml
name: Backend CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  test:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

**`do-app/.github/workflows/mobile-ci.yml`** — typecheck only (EAS handles native builds)
```yaml
name: Mobile CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  typecheck:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: mobile } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit
```

### Phase 5: Initialize git in `do-app/` and push

```bash
cd companies/do-app
git init
git checkout -b main
git add .
git commit -m "Initial extraction from REZ-Consumer submodule (commit 402c869)

- backend/: Express + MongoDB + JWT (port 3001)
- mobile/:  Expo Router 53 (port 8081)
- docs/:    Architecture, deployment, RTMN integration notes
- CI:       GitHub Actions for backend test/build, mobile typecheck

Known issues to fix in follow-up commits:
- backend routes/auth.ts:53-59: passwordHash vs password mismatch (auth broken)
- mobile app/app/: doubly-nested; routes will not register with Expo Router
- Backend Genie URLs default to localhost:47xx; set env vars for production

Source: companies/REZ-Consumer/do @ imrejaul007/REZ-Consumer@402c869
Tracking: imrejaul007/do-app"
git remote add origin git@github.com:imrejaul007/do-app.git
git push -u origin main
```

### Phase 6: Make RTMN aware (but not track) the new folder

Edit RTMN's root `.gitignore` to add the exception. The current line 88 says `companies/*` (ignore everything). Add a new exception block above the `companies/*` line:

```gitignore
# Exception: do-app (separate repo at github.com/imrejaul007/do-app)
# Lives at companies/do-app/ for convenience but has its own .git
!companies/do-app/
companies/do-app/backend/node_modules/
companies/do-app/backend/dist/
companies/do-app/mobile/node_modules/
companies/do-app/mobile/.expo/
```

**Where to insert:** after the `companies/REZ-Merchant/...` block (around line 82), before the `companies/*` line at 88.

This tells RTMN's git to:
- Track the `do-app/` folder's contents (so changes show up in `git status`)
- But exclude the heavy `node_modules/`, `dist/`, `.expo/` folders (those are in the sub-repo's own .gitignore anyway, but belt-and-suspenders)
- The folder has its own `.git/` so RTMN's git treats it as a gitlink, not as regular files

Then commit on RTMN:
```bash
cd /Users/rejaulkarim/Documents/RTMN
git add .gitignore companies/do-app/   # if not detected as gitlink
git commit -m "Track companies/do-app/ (extracted to imrejaul007/do-app)"
```

### Phase 7: Remove Do App from REZ-Consumer submodule

This is a destructive step on the REZ-Consumer submodule. It must be done carefully.

```bash
cd companies/REZ-Consumer
# In the REZ-Consumer repo (imrejaul007/REZ-Consumer)
git rm -r do/
git commit -m "BREAKING: Remove Do App folder (extracted to imrejaul007/do-app)

The do/ folder has been moved to its own repository at
github.com/imrejaul007/do-app. Update your imports to reference
the new repo. This is a breaking change for any consumer
that imports from companies/REZ-Consumer/do.

See: https://github.com/imrejaul007/do-app for the new home."
git push origin main
```

Then in RTMN root:
```bash
cd /Users/rejaulkarim/Documents/RTMN
git add companies/REZ-Consumer
git commit -m "Submodule bump: REZ-Consumer removed do/ folder"
```

### Phase 8: Update RTMN docs

Files to update in RTMN:
- `CLAUDE.md` — remove Do App mentions under "REZ-Consumer" section, add a new section "Do App (separate repo)" pointing to `github.com/imrejaul007/do-app`
- `RTMN-COMPLETE-AUDIT.md` — remove "DO Backend" service entries
- `RTNM-COMPANIES-AUDIT.md` — update
- `PORT-REGISTRY.md` / `CANONICAL-PORT-REGISTRY.md` — keep port 3001 entry but mark as "external, see imrejaul007/do-app"
- `STATUS-AND-REMAINING-WORK.md` — add "Do App extracted" milestone

This is **documentation sync only** — no code changes.

### Phase 9: Open issues on new repo for the bugs

In `imrejaul007/do-app`, open GitHub issues for the known bugs from the audit:
- `bug: passwordHash vs password mismatch in routes/auth.ts:53-59` (P0)
- `bug: doubly-nested app/app/ folder breaks Expo Router` (P0)
- `chore: migrate from npm to yarn` (P3, optional)
- `feat: add 5+ real backend tests` (P1)
- `docs: write INTEGRATION-WITH-RTMN.md` (P1)
- `feat: add /api/do/* route to RTMN Unified Hub` (P1, requires RTMN change)

---

## 4. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking other RTMN services that import from `companies/REZ-Consumer/do/` | Medium — could break builds | grep RTMN for any imports; if found, route them to the deployed Do backend URL or add a shim |
| Doubly-nested `app/app/` in mobile makes `npm start` fail immediately | High | Document in README, add to known issues list, fix in a follow-up commit |
| Password bug means `npm run dev:backend` + `POST /auth/signup` will crash | High | Document in README, add to known issues, fix in a follow-up commit |
| Submodule pointer desync after `git rm do/` in REZ-Consumer | Medium | Use `git submodule update --init` after the bump commit |
| Submodule `companies/REZ-Consumer` already has uncommitted local changes (`49b1ca1`) | Low | Stash or commit those first before bumping submodule |
| `do-app/backend/package-lock.json` may be huge | Low | Use `npm install` in the new repo to regenerate from package.json; never copy lockfiles across repos |
| `do-app/mobile/package-lock.json` may have Expo-specific paths | Low | Same as above |

---

## 5. What I Will NOT Do (explicit non-goals)

- ❌ **Will not fix the 1 critical password bug** — user said "move as-is, fix later". I'll add it to the known-issues list and create a tracking issue.
- ❌ **Will not fix the doubly-nested `app/app/` folder** — same reason. Document + track.
- ❌ **Will not delete the REZ-Workspace Do fork** — user explicitly said "audit and keep both, i don't want to lose any features". It stays as a reference at `companies/REZ-Workspace/companies/REZ-Consumer/do/`.
- ❌ **Will not port features from the REZ-Workspace fork** — separate concern; can be done in a follow-up repo or as feature PRs to `do-app`.
- ❌ **Will not delete `companies/REZ-Consumer/do/` from RTMN** — the user wants extraction, not deletion. The submodule update in Phase 7 happens in the REZ-Consumer repo, which propagates to RTMN via submodule bump. The folder is removed from REZ-Consumer's tree, not from RTMN's local disk (until you run `git submodule update`).
- ❌ **Will not modify Do App's internal code** — pure migration. Bug fixes are separate commits.
- ❌ **Will not deploy to Render or EAS** — those are env-specific (you need your own accounts); I'll just scaffold the config files.
- ❌ **Will not preserve git history via `git filter-repo`** — added as a Phase 10 follow-up note; not required for v1.

---

## 6. Execution Order (the order I will run things)

1. **Create the GitHub repo** (`gh repo create imrejaul007/do-app --private`)
2. **Scaffold local `companies/do-app/`** (mkdir, copy files, write .gitignore + package.json + README + CI)
3. **Initialize git in `companies/do-app/`**, commit, push
4. **Edit RTMN root `.gitignore`** to track `companies/do-app/`
5. **Commit + push RTMN changes** to add the gitignore exception
6. **Open 6 tracking issues** on `imrejaul007/do-app` for the known bugs and follow-ups
7. **Update RTMN root docs** (CLAUDE.md, RTMN-COMPLETE-AUDIT.md, CANONICAL-PORT-REGISTRY.md, STATUS-AND-REMAINING-WORK.md)
8. **Provide the user with a follow-up checklist** for:
   - The `git rm do/` step in REZ-Consumer (destructive — wants explicit user OK)
   - Setting up Render deploy
   - Setting up EAS build
   - Adding `/api/do/*` route to RTMN Hub (port 4399)
   - History preservation via `git filter-repo` (optional)

---

## 7. Success Criteria

After execution, you should have:

✅ `github.com/imrejaul007/do-app` (private) with backend/ and mobile/ folders
✅ `RTMN/companies/do-app/` tracked by RTMN's git as a gitlink
✅ `RTMN/companies/REZ-Consumer/do/` still on disk (untouched in RTMN) but pending removal in the REZ-Consumer submodule
✅ RTMN's root CLAUDE.md mentions "Do App (separate repo at imrejaul007/do-app)"
✅ 6 tracking issues opened on the new repo
✅ Clear follow-up checklist for the destructive steps (REZ-Consumer submodule cleanup, Render/EAS setup)
✅ No code changes to Do App internals (pure migration)
✅ `npm install` works in both `do-app/backend/` and `do-app/mobile/` (new lockfiles generated)

---

## 8. Estimated Time

- Phase 1 (gh create): 5 seconds
- Phase 2-3 (mkdir, copy): 1-2 minutes
- Phase 4 (write scaffolding): 3-5 minutes
- Phase 5 (git init, commit, push): 30 seconds
- Phase 6 (RTMN .gitignore): 1 minute
- Phase 7 (REZ-Consumer submodule cleanup): SKIPPED (deferred to user)
- Phase 8 (open issues): 1 minute
- Phase 9 (RTMN docs): 3-5 minutes
- **Total: ~15 minutes** for the migration + docs + issues.

Phase 7 (the actual `git rm do/` in the REZ-Consumer repo) is a separate ~2-minute operation that I'll provide as a manual command for you to run when ready.
