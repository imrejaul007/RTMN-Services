# Bug Fix Evidence — 2026-06-23

> **Context:** 4 pre-existing service bugs were found (SADA Trust, Trust Engine, Decision Engine, Graph Database) that prevented `npm start` from working despite the services being "productionized" in earlier phases. All 4 were fixed and committed.
>
> **Commits:**
> - HOJAI `df23a6e4` — SADA Trust (4190)
> - HOJAI `90afaec3` — Trust Engine (4291)
> - HOJAI `36bfe9bb` — Decision Engine (4290) + Graph Database (4783)
> - root `22073384c` — STATUS-AND-REMAINING-WORK.md updated with Phase J

## What's in this folder

| File | What it proves |
|---|---|
| `01-decision-engine-4290-boot.log` | Decision Engine boots cleanly with `tsx src/index.ts` and `/health` returns 200 |
| `02-graph-database-4783-boot.log` | Graph Database seeds 7 nodes + 10 edges and `/api/health` returns 200 |
| `03-full-stack-demo-127pass.txt` | Full `demos/full-stack-demo.sh` output — 127 PASS, 0 FAIL, 15 SKIP |
| `04-dev-stack-status-35up.txt` | `scripts/dev-stack.sh status` — 35/35 services UP, 0 DOWN |
| `05-full-stack-demo-127pass-detailed.log` | Earlier demo run with timing data |
| `06-full-stack-demo-127pass-clean.txt` | Earlier demo run, clean output |
| `runtime-logs/*.log` | 51 service runtime logs from the dev-stack (Hub, SADA, Trust, Decision, Nexha, Foundation, Intelligence, etc.) |
| `persistent-state-after-fix/hojai-graph-database/` | Graph Database's PersistentMap state **AFTER** the Bug 4 fix — label-index.json now contains arrays of node IDs (not `{}` from broken Set serialization) |

## How to verify the fixes still work

```bash
# Boot test
bash scripts/dev-stack.sh start
# 35/35 UP

# End-to-end test
bash demos/full-stack-demo.sh
# 127 PASS, 0 FAIL
```

## Related docs

- [`STATUS-AND-REMAINING-WORK.md`](../../STATUS-AND-REMAINING-WORK.md) — Phase J section
- [`SERVICES-AUDIT-2026-06-22.md`](../../SERVICES-AUDIT-2026-06-22.md) — context on the cleanup that preceded this fix
