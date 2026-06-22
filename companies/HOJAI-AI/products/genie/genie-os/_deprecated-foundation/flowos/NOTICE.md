# ⚠️ DEPRECATED — 2026-06-21

This `flowos` service has been superseded by the canonical HOJAI AI FlowOS implementation.

## Use instead

**Canonical:** [`companies/HOJAI-AI/platform/flow/flow-orchestrator/`](../../../../../platform/flow/flow-orchestrator/)
**Port:** 4244
**Status:** ⚠️ Restart pending (code is in place, see Phase 1)

## Why deprecated

- **1455 LOC vs 235 LOC** — the canonical version has 6× more code, full orchestration engine.
- The SUTAR gateway at port 4140 already expects `flowOS` on port 4244.
- A third duplicate also existed at `services/flow-os-canonical/` (port 4156, 146 LOC) — that one has also been deprecated.

## What's preserved

All code, `package.json`, `node_modules`, tests, and logs remain here for reference. Do **not** start this service.

## Related cleanup

See `_deprecated-foundation/` and `services/_deprecated-canonical-stubs/flow-os-canonical/`.