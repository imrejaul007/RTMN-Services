# ⚠️ DEPRECATED — 2026-06-21

This `memoryos` service has been superseded by the canonical HOJAI AI MemoryOS implementation.

## Use instead

**Canonical:** [`companies/HOJAI-AI/platform/memory/memory-os/`](../../../../../platform/memory/memory-os/)
**Port:** 4703
**Status:** ✅ Running (verified 2026-06-21)

## Why deprecated

- **1286 LOC vs 91 LOC** — the canonical version has 14× more code, including:
  - Vector embeddings (port 4780) for semantic search
  - Working memory + long-term memory + access log
  - Knowledge graph, timelines, summaries
- The canonical version is documented in `CANONICAL-PORT-REGISTRY.md` and `CLAUDE.md`.
- This 91-LOC genie-os version only had create/list/search/delete.

## What's preserved

All code, `package.json`, `node_modules`, tests, and logs remain here for reference. Do **not** start this service.

## Related cleanup

See `_deprecated-foundation/` for sibling deprecations (corpid, twinos, goalos, policyos, skillos, flowos).