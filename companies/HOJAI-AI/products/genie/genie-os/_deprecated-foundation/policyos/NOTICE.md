# ⚠️ DEPRECATED — 2026-06-21

This `policyos` service has been superseded by the canonical HOJAI AI PolicyOS implementation.

## Use instead

**Canonical:** [`companies/HOJAI-AI/platform/flow/policy-os/`](../../../../../platform/flow/policy-os/)
**Port:** 4254
**Status:** ✅ Running (verified 2026-06-21, has 17 policies + 31 audit entries)

## Why deprecated

- **1551 LOC vs 113 LOC** — the canonical version has 14× more code, full policy engine with priorities, conditions, allow/deny effects, role system, approvals workflow, audit log.
- Three other implementations also existed:
  - This one (`genie-os/foundation/policyos/` @ port 7005, 113 LOC) — moved here
  - `services/policy-os-canonical/` @ port 4155 (93 LOC, actually running sutar-agent-network on that port) — also deprecated
- The canonical port 4254 is NOT yet listed in `CANONICAL-PORT-REGISTRY.md` — see Phase 4 of the cleanup.

## What's preserved

All code, `package.json`, `node_modules`, tests, and logs remain here for reference. Do **not** start this service.

## Related cleanup

See `_deprecated-foundation/` and `services/_deprecated-canonical-stubs/`.