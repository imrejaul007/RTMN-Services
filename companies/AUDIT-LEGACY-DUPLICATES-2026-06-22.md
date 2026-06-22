# Legacy-Audit Duplicates & Sync Audit Report

> **Date:** 2026-06-22
> **Scope:** All 19 `legacy-audit/` directories across the RTMN ecosystem
> **Goal:** Verify sync between legacy-audit content and canonical top-level repos, identify duplicates

---

## Executive Summary

| Finding | Count | Impact |
|---------|------:|--------|
| **Total legacy-audit files** | ~57,000 | Preserved correctly |
| **Truly identical duplicate services** (safe to remove) | **306** | ~200-400 MB reclaimable |
| **Different-content services** (must keep) | ~600 | Legacy/older versions |
| **Duplicate root files** (identical in both places) | ~430 | Safe to remove |
| **Duplicate root files** (different content) | ~95 | Must review |
| **Git tracking** | **NOT tracked in any repo** | Need to commit |
| **Git repo status** | 14/19 are proper repos | 5 live in RTMN-Services monorepo |

---

## 🔴 CRITICAL FINDINGS

### 1. Legacy-audit is NOT tracked in git (50,889 untracked files)

Across all 14 separate git repos, the new `legacy-audit/` directories are completely untracked. This means:
- ❌ If you `git push` now, the legacy content will NOT be in the remote
- ❌ If a teammate clones, they won't get the legacy content
- ⚠️ **Action needed**: Either `git add legacy-audit/` and commit, OR add `legacy-audit/` to `.gitignore`

### 2. 306 truly-identical duplicate services should be removed

These exist in BOTH `legacy-audit/legacy-services/<name>/` AND `<Company>/<name>/` with byte-identical content. They add no historical value and just waste space.

| Company | Identical Dups | Reclaimable Space |
|---------|---:|---:|
| RABTUL-Technologies | **115** | ~50MB |
| AdBazaar | **105** | ~30MB |
| RisaCare | **52** | ~15MB |
| REZ-Merchant | **16** | ~5MB |
| AssetMind | 5 | ~2MB |
| Axom | 5 | ~2MB |
| CorpPerks | 2 | ~1MB |
| HOJAI-AI | 2 | ~1MB |
| KHAIRMOVE | 2 | ~1MB |
| RisnaEstate | 2 | ~1MB |
| Others (8) | 0 | — |
| **TOTAL** | **306** | **~110MB** |

### 3. 5 companies don't have their own git repo

| Company | Lives In |
|---------|----------|
| HOJAI-AI | Standalone repo (separate) |
| LawGens | RTMN-Services monorepo |
| Nexha | RTMN-Services monorepo |
| RTNM-Digital | RTMN-Services monorepo |
| RTNM-Group | RTMN-Services monorepo |

For these 4 monorepo companies, `legacy-audit/` lives inside RTMN-Services and needs to be tracked there.

---

## Per-Company Detailed Audit

### AdBazaar (7.3G top | 75M legacy)
- **Total legacy files:** 9,331
- **Tracked in git:** 0 ❌
- **Uncommitted changes:** 1 (legacy-audit/)
- **Root-level dupes:** 104 identical files + 12 different files
- **Service-level dupes:** 297 names in both, **105 truly identical** (safe to remove)
- **Other uncommitted:** none
- **Status:** ⚠️ Needs `git add legacy-audit/` + cleanup of 105 identical services

### AssetMind (21M top | 7.1M legacy)
- **Total legacy files:** 995
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 19 identical + 2 different
- **Service-level dupes:** 7 names in both, **5 truly identical**
- **Status:** ⚠️ Cleanup of 5 identical services needed

### Axom (1.5G top | 11M legacy)
- **Total legacy files:** 1,159
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 19 identical + 0 different
- **Service-level dupes:** 25 names in both, **5 truly identical**
- **Other uncommitted:** 11 modified files in buzzlocal-app/, buzzlocal-services/ (NOT from migration - pre-existing)
- **Status:** ⚠️ Cleanup of 5 identical services + review pre-existing buzzlocal changes

### CorpPerks (4.8G top | 29M legacy)
- **Total legacy files:** 3,087
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 26 identical + 5 different
- **Service-level dupes:** 61 names in both, **2 truly identical**
- **Other uncommitted:** workforce-os/ (untracked, NOT from migration)
- **Status:** ⚠️ Cleanup of 2 identical services

### HOJAI-AI (2.8G top | 114M legacy)
- **Total legacy files:** 1,500+
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 0
- **Service-level dupes:** 13 names in both (docs/products/scripts/shared), **2 truly identical**
- **Note:** hojai-ai is a separate standalone repo, content was restored from zip
- **Status:** ⚠️ Cleanup of 2 identical services

### KHAIRMOVE (4.7G top | 18M legacy)
- **Total legacy files:** 1,063
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 22 identical + 2 different
- **Service-level dupes:** 23 names in both, **2 truly identical**
- **Status:** ⚠️ Cleanup of 2 identical services

### Karma-Foundation (1.7G top | 2.5M legacy)
- **Total legacy files:** 296
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 2 identical + 3 different
- **Service-level dupes:** 4 names in both, **0 truly identical**
- **Status:** ⚠️ All legacy content is unique

### LawGens (1.9G top | 5.3M legacy)
- **Total legacy files:** 818
- **Tracked in git:** 0 ❌ (lives in RTMN-Services monorepo)
- **Root-level dupes:** 0
- **Service-level dupes:** 5 names in both, **0 truly identical**
- **Status:** ⚠️ All legacy content is unique

### Nexha (953M top | 4.8M legacy)
- **Total legacy files:** 512
- **Tracked in git:** 0 ❌ (lives in RTMN-Services monorepo)
- **Root-level dupes:** 0 identical + 4 different
- **Service-level dupes:** 11 names in both, **0 truly identical**
- **Status:** ⚠️ All legacy content is unique

### RABTUL-Technologies (2.7G top | 38M legacy)
- **Total legacy files:** 5,107
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 84 identical + 5 different
- **Service-level dupes:** 203 names in both, **115 truly identical** ⚠️
- **Status:** 🔴 Largest dup cleanup needed - 115 identical services

### REZ-Consumer (7.8G top | 88M legacy)
- **Total legacy files:** 6,744
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 0 identical + 5 different
- **Service-level dupes:** 35 names in both, **0 truly identical**
- **Other uncommitted:** family-support-service/ (NOT from migration)
- **Status:** ⚠️ All legacy content is unique

### REZ-Merchant (27G top | 111M legacy)
- **Total legacy files:** 11,605
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 44 identical + 5 different
- **Service-level dupes:** 72 names in both, **16 truly identical**
- **Other uncommitted:** 11 untracked service dirs (REZ-support-tools-hub, bpo-manager, commerce-os, etc. - NOT from migration, these were Phase 9 moves)
- **Status:** ⚠️ Cleanup of 16 identical services

### REZ-Workspace (479M top | 524K legacy)
- **Total legacy files:** 44
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 0 identical + 12 different
- **Service-level dupes:** 3 names in both, **0 truly identical**
- **Other uncommitted:** 60,853 changes ⚠️ (massive pre-existing)
- **Status:** ⚠️ Massive pre-existing uncommitted changes unrelated to migration

### RTNM-Digital (1.0G top | 1.0M legacy)
- **Total legacy files:** 116
- **Tracked in git:** 0 ❌ (lives in RTMN-Services monorepo)
- **Root-level dupes:** 0
- **Service-level dupes:** 6 names in both, **0 truly identical**
- **Status:** ⚠️ All legacy content is unique

### RTNM-Group (35M top | 30M legacy)
- **Total legacy files:** 3,057
- **Tracked in git:** 0 ❌ (lives in RTMN-Services monorepo)
- **Root-level dupes:** 0
- **Service-level dupes:** 7 names in both, **2 truly identical**
- **Status:** ⚠️ Cleanup of 2 identical services

### RidZa (2.7G top | 1.6M legacy)
- **Total legacy files:** 229
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 0 identical + 4 different
- **Service-level dupes:** 6 names in both, **0 truly identical**
- **Other uncommitted:** finance-cfo/, finance-os/, ridza-islamic-finance/, ridza-remittance/ (NOT from migration)
- **Status:** ⚠️ All legacy content is unique

### RisaCare (920M top | 8.7M legacy)
- **Total legacy files:** 972
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 43 identical + 2 different
- **Service-level dupes:** 84 names in both, **52 truly identical**
- **Status:** ⚠️ Cleanup of 52 identical services

### RisnaEstate (347M top | 4.6M legacy)
- **Total legacy files:** 680
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 3 identical + 7 different
- **Service-level dupes:** 14 names in both, **2 truly identical**
- **Status:** ⚠️ Cleanup of 2 identical services

### StayOwn-Hospitality (2.8G top | 170M legacy)
- **Total legacy files:** 3,934
- **Tracked in git:** 0 ❌
- **Root-level dupes:** 0 identical + 4 different
- **Service-level dupes:** 39 names in both, **0 truly identical**
- **Other uncommitted:** apps/, hotel-pms/ (NOT from migration)
- **Status:** ⚠️ All legacy content is unique (largest legacy size)

---

## Recommended Actions

### Priority 1: Git tracking (CRITICAL)
For each company with a separate git repo:
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/<Company>
# Option A: Track the legacy content
git add legacy-audit/MIGRATION-README.md legacy-audit/legacy-services/
git commit -m "chore: archive pre-consolidation legacy content"
git push

# Option B: Ignore it (if you don't want it in git)
echo "legacy-audit/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore legacy-audit/"
git push
```

### Priority 2: Remove identical duplicates (cleanup)
For each company, remove the 306 truly-identical service duplicates from `legacy-audit/legacy-services/`. These add no value because they exist byte-identically at the top level.

**Top offenders to clean:**
1. RABTUL-Technologies: 115 duplicates
2. AdBazaar: 105 duplicates
3. RisaCare: 52 duplicates
4. REZ-Merchant: 16 duplicates
5. AssetMind, Axom: 5 each

### Priority 3: Review "different content" files
The ~95 "different content" root files (e.g. CLAUDE.md, README.md) are likely older versions. Review and decide which version is canonical.

### Priority 4: Pre-existing uncommitted changes
Several repos have uncommitted changes NOT related to this migration:
- **REZ-Workspace: 60,853 uncommitted changes** (huge!)
- REZ-Merchant: 11 untracked service dirs (Phase 9 moves)
- Axom: 11 modified buzzlocal-* files
- REZ-Consumer: 1 untracked service dir
- RidZa: 4 untracked service dirs
- StayOwn-Hospitality: 2 untracked service dirs

These are out of scope for this audit but worth noting.

---

## Verification Commands

```bash
# See all legacy-audit sizes
du -sh /Users/rejaulkarim/Documents/RTMN/companies/*/legacy-audit/

# Count untracked legacy files
for c in /Users/rejaulkarim/Documents/RTMN/companies/*/legacy-audit; do
  echo "$c: $(find $c -type f | wc -l) files"
done

# Find truly-identical duplicates (run the script)
# /tmp/find-identical-dups2.sh <CompanyName>
```

---

*Audit completed 2026-06-22 by Claude Code*
*Total: 19 legacy-audit directories audited, 306 identical dups identified for removal*