# HOJAI-AI-restored - Recovery Snapshot

> ⚠️ **This is a historical snapshot, not the canonical code location.**

## What This Is

This directory contains the **original HOJAI AI codebase** that was deleted from the repo in commit `181299206` on 2026-06-17. It was restored on 2026-06-18 from the parent commit `08a6bf87e` ("feat(FinanceOS): Complete FinanceOS Suite - 11 Services") so the source wouldn't be lost forever.

## Why Was It Deleted?

The deletion happened in a single `chore:` commit by the "ReZ Team" author — the same author as your other commits. The commit message said "Complete hojai-ai services and company features", but it actually removed ~80 source files across 6 services.

A separate folder at `../HOJAI-AI/` (uppercase, with slash) was added around the same time. That replacement folder had:
- ✅ Markdown docs (CLAUDE.md, README.md, CATALOG.md)
- ✅ Compiled `dist/` output (mock Express scaffolds, no real AI)
- ❌ No source code
- ❌ No running services

So the deletion was likely a side-effect of a rename/migration that wasn't fully completed. The new folder's docs were hand-written, the source was lost, and only the compiled mock scaffolds remained.

## What's In Here

| Service | Source files | Real port | What it does |
|---|---|---|---|
| [hojai-intelligence/](./hojai-intelligence/) | 11 .ts + 4 config | 4881 | Multi-agent AI: Intent, Sentiment, Retrieval, Prediction, Recommendation. Uses OpenAI, Mongoose, Redis. |
| [hojai-customer-intelligence/](./hojai-customer-intelligence/) | 16 .ts + 4 config | 4885 | Mongoose models (Customer, IdentityLink, RiskEvent), identity resolution, risk scoring, segmentation. |
| [hojai-agent-copilot/](./hojai-agent-copilot/) | 4 .ts + 4 config | 4895 | AI copilot agent + types. |
| [hojai-notification-service/](./hojai-notification-service/) | 7 .ts + 3 config | 4520 | Notification service. |
| [hojai-integration-hub/](./hojai-integration-hub/) | 8 .ts + 3 config | (varies) | Integration hub for cross-service orchestration. |
| [services/hojai-action-registry/](./services/hojai-action-registry/) | 3 .ts + 3 config | 4887 | Action registry with Mongoose models (Action, ActionLog). |
| [services/hojai-workflow-engine/](./services/hojai-workflow-engine/) | 4 .ts + 3 config | (varies) | Workflow engine with Workflow + WorkflowInstance models and executor. |
| [genie-memory-service/](./genie-memory-service/) | 0 source + 1 doc | (n/a) | Only had a CLAUDE.md. |
| [CLAUDE.md](./CLAUDE.md), [FEATURES.md](./FEATURES.md) | 2 top-level docs | (n/a) | v4.0 platform documentation. |

**Total: 59 TypeScript source files, ~13,380 LOC.**

`node_modules/` and `package-lock.json` were intentionally **not** restored (run `npm install` per-service to recreate them).

## What To Do With This

You have three options:

### Option 1: Keep as reference (current state)
- Use this directory as a historical snapshot
- The canonical runtime services live in `/services/` at the RTMN root, under RTMN branding
- This folder is here "just in case" you need to revive a feature

### Option 2: Promote to /services/
- Move/copy the real services into `/services/` (e.g. `/services/hojai-intelligence/`)
- Update import paths and port assignments to match what's not already taken in `/services/`
- Note: `/services/ai-intelligence/` (port 4881) and `/services/customer-intelligence/` (port 4885) are already thinly-implemented single-file versions on the same ports — promoting the restored versions would replace them

### Option 3: Delete
- If you're confident you don't need the recovered code, `rm -rf ../HOJAI-AI-restored/`
- The code is also still in git history (commit `08a6bf87e`), so it's not truly lost even if you delete the folder
- But the working-tree copy is much easier to recover from than git

## How To Verify This Is The Real Code

```bash
# Compare any file in this folder to the git history version
git show 08a6bf87e:companies/hojai-ai/hojai-customer-intelligence/src/index.ts
# vs
cat hojai-customer-intelligence/src/index.ts
```

They should match byte-for-byte.

## Recovery Command (for reference)

If you ever need to redo this recovery:

```bash
cd /Users/rejaulkarim/Documents/RTMN
mkdir -p companies/HOJAI-AI-restored
git ls-tree -r --name-only 08a6bf87e -- 'companies/hojai-ai/' \
  | grep -v 'node_modules/' | grep -v 'package-lock.json' \
  | while read src; do
      dst="${src/companies\/hojai-ai\//companies\/HOJAI-AI-restored/}"
      mkdir -p "$(dirname "$dst")"
      git show "08a6bf87e:$src" > "$dst"
    done
```

---

*Recovered 2026-06-18 from commit `08a6bf87e`*
*Original deletion: commit `181299206` ("chore: Complete hojai-ai services and company features")*
