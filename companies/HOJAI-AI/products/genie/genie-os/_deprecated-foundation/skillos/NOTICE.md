# ⚠️ DEPRECATED — 2026-06-21

This `skillos` service has been superseded by the canonical HOJAI AI SkillOS implementation.

## Use instead

**Canonical:** [`companies/HOJAI-AI/platform/skills/skill-os/`](../../../../../platform/skills/skill-os/)
**Port:** 4743
**Status:** ✅ Running (verified 2026-06-21, 6 pre-seeded skills + 6 categories)

## Why deprecated

- **624 LOC vs 112 LOC** — the canonical version has 5.5× more code, 20 features vs 4 endpoints:
  - Registry, Runtime, Discovery, Marketplace, Composition, Learning, Versioning, Permissions, Analytics, Templates, Dependencies, Events, Policies, Memory Integration, Twin Integration, Flow Integration, AI Integration, Testing, Monitoring, SDK
- 6 pre-seeded skills (one per category) for instant value.
- VM-based code sandbox for safe execution of untrusted skill code.

## One feature this version had that the canonical didn't

**MongoDB persistence.** The canonical version uses in-memory `Map` storage which loses skills on restart. As part of this cleanup, the Mongoose schema from this implementation is being ported INTO the canonical version (Phase 2 of the cleanup).

## What's preserved

All code, `package.json`, `node_modules`, tests, and logs remain here for reference. Do **not** start this service.

## Related cleanup

See `_deprecated-foundation/` for sibling deprecations.