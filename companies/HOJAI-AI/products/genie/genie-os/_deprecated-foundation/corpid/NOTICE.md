# ⚠️ DEPRECATED — 2026-06-21

This `corpid` service has been superseded by the canonical HOJAI AI CorpID implementation.

## Use instead

**Canonical:** [`companies/HOJAI-AI/platform/identity/corpid-service/`](../../../../../platform/identity/corpid-service/)
**Port:** 4702
**Status:** ✅ Running (verified 2026-06-21)

## Why deprecated

- **1323 LOC vs 146 LOC** — the canonical version has 9× more code, persistent storage, JWT auth, session management, role-based access control, and a 23-test suite.
- The canonical version is documented in `CANONICAL-PORT-REGISTRY.md` and `CLAUDE.md`.
- This 146-LOC genie-os version was a thin CRUD wrapper duplicating the same concepts.

## What's preserved

All code, `package.json`, `node_modules`, tests, and logs remain here for reference. Do **not** start this service. It is intentionally not in any startup script.

## Related cleanup

See `_deprecated-foundation/` for sibling deprecations (twinos, memoryos, goalos, policyos, skillos, flowos) and the genie-os audit report at `/tmp/skill-platform-audit.md`.