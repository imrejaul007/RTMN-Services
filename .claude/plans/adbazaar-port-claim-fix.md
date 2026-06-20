# AdBazaar Port Claim Fix — Phase 11

**Date:** 2026-06-20
**Scope:** Fix the lying port table in `ADBAZAAR-COMPLETE-SOURCE-OF-TRUTH.md` (and possibly other docs) so the documentation matches reality.

---

## Goal

`ADBAZAAR-COMPLETE-SOURCE-OF-TRUTH.md` currently contains a 93-row port table that:
- **Lists ports for services that no longer exist in AdBazaar** (e.g., REZ-marketing, REZ-crm-hub, REZ-voice-cart-recovery, REZ-rto-engine, REZ-communications-platform, etc. — all moved to other companies in Phase 9)
- **Has wrong port values** for services that DO still exist (e.g., `audience-twin-service: 4841` in doc but source says `4805`)

After this phase, the doc will reflect what's actually in AdBazaar today.

---

## Strategy

1. **Don't try to fix the existing broken table** — it's so stale that patching is harder than rewriting.
2. **Generate a fresh, accurate port table** from the source code (use the existing `audit-ports.js` scan logic).
3. **Replace the lying table** in `ADBAZAAR-COMPLETE-SOURCE-OF-TRUTH.md` with the fresh one.
4. **Add a header note** explaining the Phase 9 move and where to find the moved services.

---

## Implementation

### Step 1 — Generate the real port table

Reuse the audit-ports.js scan logic. Output format: `port | service | file | description`

```javascript
// Generate from current AdBazaar source
// For each port: list all services that claim it + their default-port
// For services that don't have port claims: mark as "no default port"
```

Output: `/tmp/adbazaar-real-ports.md` — a markdown table with all 299 services and their actual ports.

### Step 2 — Replace the bad table

`ADBAZAAR-COMPLETE-SOURCE-OF-TRUTH.md` has sections like "Core Marketing (Ports 4000-4059)" with port tables. The right move:

- **Keep** the doc structure (it's still useful as a "what AdBazaar has" overview)
- **Replace** the port tables with the fresh ones
- **Add** a banner at the top: "**Port table regenerated 2026-06-20 from source. 44 services were moved out in Phase 9; this table reflects what remains.**"

### Step 3 — Other docs

`ADBAZAAR-2.0-BUILT-SERVICES.md`, `ADBAZAAR-FEATURES.md`, etc. also have stale port claims. To keep scope manageable:
- Update `ADBAZAAR-COMPLETE-SOURCE-OF-TRUTH.md` (canonical source of truth)
- Add a note in other docs: "See `ADBAZAAR-COMPLETE-SOURCE-OF-TRUTH.md` for current ports"

### Step 4 — Append to CLAUDE.md

AdBazaar CLAUDE.md has a section listing platform moats with ports. Add a reference to the new authoritative source.

---

## Verification

- All port values in the new table match source code (use the existing audit script as the verifier)
- The new table has ~299 services (matches `Distinct services with port claims: 299` from initial scan)
- The 44 moved services do NOT appear in the new table

---

## Files modified

1. `ADBAZAAR-COMPLETE-SOURCE-OF-TRUTH.md` — port table replaced, banner added
2. `ADBAZAAR-2.0-BUILT-SERVICES.md` — note added pointing to canonical source
3. `ADBAZAAR-FEATURES.md` — note added (if it has port claims)
4. `CLAUDE.md` (AdBazaar) — note appended

---

## What I will NOT do

- Will NOT modify any code
- Will NOT delete any docs (even if stale)
- Will NOT add port claims for services that don't have one in source (those are marked "no default port" instead)
- Will NOT fix the lying CLAUDE.md audit text from earlier audits (out of scope)

---

## Estimated effort

- Step 1: 10 min (port table generation script)
- Step 2: 15 min (table replacement, banner)
- Step 3: 10 min (notes in other docs)
- Step 4: 5 min (CLAUDE.md appendix)
- Verification: 5 min

**Total: ~45 min.**
