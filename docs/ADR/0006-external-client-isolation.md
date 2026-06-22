# ADR 0006: External Clients Are Isolated From RTMN Audits

**Status:** Accepted (2026-06-22, originally 2026-06-13)
**Context:** Operational policy

## Context and Problem Statement

The RTMN repo root contains code for several external clients of HOJAI AI (Leverge being the primary one). These clients pay for HOJAI services and operate their own codebases, but we keep their code in the RTMN monorepo for convenience.

There's a recurring temptation during audits to "while we're here, fix that bug in Leverge too" or "let's also document what Leverge does". Both are wrong.

## Decision

**External client code in the RTMN monorepo is treated as opaque, third-party code.**

Concretely:

| Action | Allowed? |
|---|---|
| Audit RTMN code | ✅ |
| Audit Leverge code | ❌ unless they ask |
| Modify RTMN code | ✅ |
| Modify Leverge code | ❌ unless they ask |
| Reference Leverge architecture in RTMN docs | ❌ |
| Add Leverge services to RTMN service registry | ❌ unless integrated |
| Run smoke tests against Leverge ports (4761-4765) | ❌ |

The Leverge ports 4761-4765 are reserved in [CANONICAL-PORT-REGISTRY.md](../../CANONICAL-PORT-REGISTRY.md) but explicitly NOT part of the RTMN operational story.

## Why this matters

1. **Liability** — if we audit Leverge and our audit report leaks, we've committed them to changes they didn't ask for
2. **Trust** — Leverge is a paying client. They trust us not to touch their code
3. **Scope creep** — every "while we're here" doubles audit time
4. **Correctness** — we don't fully understand their domain. Our fixes might be subtly wrong

## How to enforce

- Project root `CLAUDE.md` has an `EXTERNAL CLIENTS POLICY` section at the top with the explicit rules
- Linter (future): detect commits that touch `leverge-*` paths in RTMN PRs
- Code review: any PR that adds Leverge code to RTMN docs is rejected

## Exceptions

The only exception is when the client **explicitly requests** a change. Example: "Leverge wants us to add a new SSO endpoint to their service" → that's a real request, scope it as such, do the work, ship it.

The exception is documented by the request, not by our interpretation.

## Verification

```bash
# Quick check that no Leverge code is referenced in RTMN docs
$ grep -rn "leverge" /Users/rejaulkarim/Documents/RTMN/CLAUDE.md | head -5
| **Leverge** (company) | Leverge code is not RTMN |
| **StayOwn-Hospitality** | not RTMN |
| Leverge is an external client of HOJAI AI |

# These mentions are in the "Out of scope" / "External Clients Policy" sections
# — they document the boundary, they don't reference Leverge code

# More importantly:
$ grep -rn "leverge-" /Users/rejaulkarim/Documents/RTMN/services/ 2>/dev/null
# (empty — no RTMN service depends on Leverge code)
```

## Related

- See project `CLAUDE.md` § "⚠️ IMPORTANT - EXTERNAL CLIENTS POLICY" for the rules
- See `companies/HOJAI-AI/CLAUDE.md` for the same policy in the HOJAI submodule context