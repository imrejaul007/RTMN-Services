# Phase 38: AI Studio (Visual Builder) — Audit Report

> **Date:** 2026-06-24
> **Status:** ✅ **ALL 10 SERVICES SHIPPED**
> **Tests:** 83 passing, 0 failures
> **Ports:** 4900-4909

## What Shipped

10 new services in `companies/HOJAI-AI/platform/ai-studio/`:

| Port | Service | Tests |
|---|---|---|
| 4900 | ai-studio-api | 7 |
| 4901 | studio-projects | 10 |
| 4902 | studio-playground | 11 |
| 4903 | studio-workflow | 7 |
| 4904 | studio-agent | 8 |
| 4905 | studio-twin | 8 |
| 4906 | studio-rag | 9 |
| 4907 | studio-eval | 8 |
| 4908 | studio-deployment | 9 |
| 4909 | studio-collab | 8 |
| | **TOTAL** | **83** |

## Smoke Test Results (2026-06-24)

All 10 services booted, all `/health` returned 200, gateway successfully proxied POST /projects with token auth.

```
=== Health probes ===
  ai-studio-api (:4900): 200
  studio-projects (:4901): 200
  studio-playground (:4902): 200
  studio-workflow (:4903): 200
  studio-agent (:4904): 200
  studio-twin (:4905): 200
  studio-rag (:4906): 200
  studio-eval (:4907): 200
  studio-deployment (:4908): 200
  studio-collab (:4909): 200

=== Marketplace via gateway ===
  Templates count: 5

=== Proxy: gateway -> projects (with token) ===
  POST /projects result: {"id":"proj_04f778efecbb","name":"smoke",...}
```

## Key Design Decisions

1. **File-backed JSON storage** — atomic temp+rename writes; one file per service in `$DATA_DIR/`
2. **`X-Internal-Token` auth** — header required on all non-public endpoints; `/`, `/health`, `/ready` are public
3. **Mock LLMs** — deterministic by SHA256(model+prompt+systemPrompt); varies output by model name
4. **Name-to-id mapping pattern** — avoids JSON re-parse double-indexing bug (used in studio-rag, studio-eval, studio-deployment)
5. **`app.use(prefix)` proxy in gateway** — clean forwarding; reads target port dynamically so test/runtime overrides work
6. **No empty body for GET** — even though express.json() populates `req.body = {}` for GET, gateway never writes a body to upstream (avoids 400 from upstreams that don't expect bodies on GET)

## Conventions

Consistent with Phases 32 and 40:
- Storage: file-backed JSON at `$DATA_DIR/*.json`
- Auth: `X-Internal-Token: <shared-token>` (env: `INTERNAL_TOKEN`, default `studio-internal-token`)
- IDs: `crypto.randomBytes(6).toString('hex')` with service-specific prefixes
- Tests: `node --test --test-force-exit --test-concurrency=1 tests/*.test.js`

## Idempotent Code Paths

| Service | Idempotent path |
|---|---|
| studio-projects | Members, tags |
| studio-playground | Favorites (idempotent), tags |
| studio-workflow | Status transitions |
| studio-agent | Tool add (idempotent), clone (always new id) |
| studio-twin | Version bump (always new id) |
| studio-rag | Document add (idempotent) |
| studio-eval | Metric registration (idempotent) |
| studio-deployment | Lock re-acquire by same user |
| studio-collab | Lock re-acquire by same user |

## Known Limitations

- **Frontend not built** — backend only; the React frontend is a separate project
- **Mock LLMs** — real LLM calls would need a separate gateway integration
- **File storage** — not production-ready; should swap to Postgres + S3 for production
- **No CRDT/Yjs** — locks only, no real-time multi-user editing
- **No OAuth/SSO** — uses X-Internal-Token; CorpID OAuth is the gateway's job (not in Phase 38)
- **Base64 secret obfuscation** — not real encryption

## Inter-Service Communication

| From | To | Purpose | Pattern |
|---|---|---|---|
| ai-studio-api | 9 sub-services | All proxied routes | HTTP via `app.use(prefix)` |
| studio-deployment | (Phase 40 agent-deployment 4913) | Deploy hook | Best-effort HTTP POST, swallowed errors |

## Marketplace

5 starter templates seeded:
- `tpl_chatbot_support` (Customer Support Chatbot, 1,240 installs)
- `tpl_workflow_content` (Content Generation Workflow, 870 installs)
- `tpl_eval_suite` (Standard Eval Suite, 530 installs)
- `tpl_twin_customer` (Customer Twin Schema, 410 installs)
- `tpl_rag_kb` (Knowledge Base RAG, 690 installs)

Categories: agent, workflow, eval, twin, rag, playground.

## What's Next

Phase 38 ships the backend. Next:
1. Build the React frontend (separate project — `hojai-ai-studio-web/`)
2. Phase 39 (TBD): real LLM integration replacing mock completions
3. Phase 41 (TBD): production storage swap (Postgres + S3)
