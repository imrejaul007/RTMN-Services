# HOJAI-AI Build Status

> **Company:** HOJAI-AI (single company inside RTMN)  
> **Repo:** `git@github.com:imrejaul007/hojai-ai.git`  
> **Local path:** `companies/HOJAI-AI/` (inside RTMN monorepo at `/Users/rejaulkarim/Documents/RTMN/`)  
> **Default branch:** `main`

## Git Structure

```
/Users/rejaulkarim/Documents/RTMN/   ← RTMN root (separate repo)
├── companies/
│   └── HOJAI-AI/                    ← HOJAI-AI submodule repo (this file lives here)
│       ├── STATUS.md                ← this status
│       ├── platform/
│       │   ├── flow/
│       │   │   └── policy-os/       ← PolicyOS with PHASES_STATUS.md
│       │   │       └── PHASES_STATUS.md
│       │   ├── intelligence/
│       │   ├── memory/
│       │   ├── studio/
│       │   ├── twin/
│       │   ├── ...
│       └── products/
├── shared/                          ← @rtmn/shared
├── docs/
└── ...
```

## Quick Commands
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI

# Run all policy-os tests
node platform/flow/policy-os/__tests__/unit/*.test.mjs | tail -5

# Single test file
node platform/flow/policy-os/__tests__/unit/cache.test.mjs

# Git workflow
git status
git add -A
git commit -m "feat: <description>"
git push origin main
```

## Branch Strategy
- **`main`** — Production-ready code only
- Feature branches for development → merge to main
- Always commit to the **branch you are on**, never `force-push` to main

## Services by Domain
| Domain | Service | Status |
|--------|---------|--------|
| PolicyOS | `policy-os/src/services/` | 30+ services |
| Twin | `platform/twins/twin-registry` | ✅ |
| Memory | `platform/memory/memory-lifecycle` | ✅ |
| Voice | `products/voice-os` | ✅ |
| SUTAR OS | `platform/sutar-os/core/` | 37 services |
| Loop OS | `platform/flow/loop-os` | 17 services |
| Company OS | `platform/company-os` | ✅ |
| Intelligence | `platform/intelligence/` | 12 services |
| Memory OS | `platform/memory/` | 30 services |
| Studio | `platform/studio/` | 8 services |
| Industry OS | `platform/company-os/industry-extensions/` | 26 |

## PolicyOS Status
- **P0** Persistent Storage ✅ (448 tests pass)
- **P1** GitOps + Formal Verification ✅
- **P2** Distributed Cache ✅ (19 tests pass)
- **P3** Monitoring ✅ (8 tests pass)
- **P4** Incident Response ✅ (17 tests pass)
- **P5–P9** Extensions, Compliance, DR, Analytics, Multi-tenant ✅

See `platform/flow/policy-os/PHASES_STATUS.md` for details.

## Linter Rules
- No temp files (`/tmp/*.txt`, `/tmp/*.mjs`)
- All commits must reference what changed
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`

## Key Dates & Versions
- 2026-06-28: PolicyOS P0 Persistent Storage complete
- 2026-06-29: PolicyOS P1–P9 complete
- 2026-06-30: HOJAI Studio v2.0 launched
- 2026-07-01: RTMN v5.27 architecture
