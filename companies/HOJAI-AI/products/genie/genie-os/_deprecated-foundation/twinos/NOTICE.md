# ⚠️ DEPRECATED — 2026-06-21

This `twinos` service has been superseded by the canonical HOJAI AI TwinOS implementation.

## Use instead

**Canonical:** [`companies/HOJAI-AI/platform/twins/twinos-hub/`](../../../../../platform/twins/twinos-hub/)
**Port:** 4705
**Status:** ⚠️ Restart pending (code is in place, see Phase 1)

## Why deprecated

- **2104 LOC vs 90 LOC** — the canonical version has a complete Twin Relationship Graph, 24× the code, and is the documented canonical TwinOS.
- This 90-LOC genie-os version was a thin CRUD wrapper.
- Both were not running as of 2026-06-21; the canonical version will be brought up first.

## What's preserved

All code, `package.json`, `node_modules`, tests, and logs remain here for reference. Do **not** start this service.

## Related cleanup

See `_deprecated-foundation/` for sibling deprecations (corpid, memoryos, goalos, policyos, skillos, flowos).