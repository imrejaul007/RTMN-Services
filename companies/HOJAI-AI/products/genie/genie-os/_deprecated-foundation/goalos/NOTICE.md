# ⚠️ DEPRECATED — 2026-06-21

This `goalos` service has been superseded by the canonical HOJAI AI GoalOS implementation.

## Use instead

**Canonical:** [`companies/HOJAI-AI/platform/flow/goal-os/`](../../../../../platform/flow/goal-os/)
**Port:** 4242
**Status:** ⚠️ Restart pending (code is in place, see Phase 1)

## Why deprecated

- **206 LOC vs 97 LOC** — the canonical version has 2× more code and is in the `platform/flow/` naming family.
- The SUTAR gateway at port 4140 already expects `goalOS` on port 4242.
- A third duplicate also existed at `services/goal-os-canonical/` (port 4157, 93 LOC) — that one has also been deprecated.

## What's preserved

All code, `package.json`, `node_modules`, tests, and logs remain here for reference. Do **not** start this service.

## Related cleanup

See `_deprecated-foundation/` for sibling deprecations. See `services/_deprecated-canonical-stubs/goal-os-canonical/` for the third duplicate.