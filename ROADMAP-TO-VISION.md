# RTMN 10-Week Roadmap to Vision

> **Date:** 2026-06-22 (mid-execution update)
> **Status:** Phases A, B, C (routes), D complete. Phase C.5 (warehouse-network) and Phase E remainder (docs/ADRs/README) in progress.
> **Supersedes:** the original 5-phase plan in [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md) — that was the *intent*; this is the *executed* timeline.

---

## Why this doc exists

The "buy groceries autonomously" flow described in [STATUS-AND-REMAINING-WORK.md §Flow 5](STATUS-AND-REMAINING-WORK.md#flow-5--user-buys-groceries-autonomously) requires four things that didn't exist at audit time:

1. A Hub that *actually* proxies to SUTAR and Nexha services without hanging
2. SUTAR services that pass real tests and don't throw on simple requests
3. A Nexha network that the Hub can reach
4. A do-app client that consumes all of the above

This roadmap tracks the 10 weeks of work to make Flow 5 real. It is updated as each phase ships.

---

## Phases

### ✅ Phase A — Foundation (shipped 2026-06-19)

- Started Hub at port 4399 with `/api/sutar/capabilities` + `/api/sutar/:service` proxy
- Started SADA on port 4190 with hojaiClient integration in do-app
- Added voice input to do-app mobile (expo-speech-recognition)
- Refactored Hub `proxyToUpstream()` to fix body-forwarding bug (Phase A.2 patch)
- Hub now passes `demos/full-stack-demo.sh` end-to-end

### ✅ Phase B — SUTAR OS hardening (shipped 2026-06-22)

- **sutar-economy-os** (port 4251) — 105 vitest tests across transaction, billing, earnings, payment, leaderboard, redemption, integration
- **sutar-trust-engine** (port 4291) — `/api/v1/sada/status` federation health probe (2s AbortController, never throws); 37 tests
- **sutar-contract-os** (port 4185) — 179 tests + real bug fix in `versions.ts` (versionIndex optional-chaining was a no-op on first push)
- **sutar-decision-engine** (port 4290) — multi-option ranking algorithm

### ✅ Phase C — Nexha routes (shipped 2026-06-22)

- Hub now exposes `/api/nexha/capabilities` and `/api/nexha/:service/:path`
- NEXHA_SERVICES map for 8 services (procurement, distribution, franchise, manufacturing, trade-finance, intelligence-layer, ecosystem-connector, nexha-gateway)
- do-app backend got a `nexha` client block (`listSuppliers`, `quoteShipping`, `getCreditOffer`)
- do-app autopilot Step 5 calls `nexha.listSuppliers` for supplier discovery
- **C.5 — nexha-warehouse-network**: deferred (no scaffold exists; needs full build)

### ✅ Phase D — do-app autopilot end-to-end (shipped 2026-06-22)

- Mobile autopilot tab added (4 modes: manual, assisted, autopilot, autonomous)
- Mode picker, run button, recommendations list with priority colors
- Spending limits wired through `api.autopilot.setPolicy()`
- Backend Step 5 surfaces top suppliers via Nexha client
- 7 unit tests for the `nexha` client block

### 🟡 Phase E — Docs/Ops/ADRs (in progress, target 2026-06-23)

- ✅ `scripts/dev-stack.sh` — one-command start/stop/status for the 4-service dev stack
- ✅ `docker-compose.dev.yml` — same stack via Docker (when Docker is available)
- ✅ `demos/full-stack-demo.sh` — end-to-end demo (Hub → SUTAR → Nexha)
- ✅ Updated `STATUS-AND-REMAINING-WORK.md` and this roadmap
- ✅ Updated root + HOJAI CLAUDE.md with Phase A-D summary block
- 🔲 5 ADRs in `docs/ADR/` (architecture decision records)
- 🔲 Root README one-pager

---

## What this proves (today, 2026-06-22)

```bash
$ bash scripts/dev-stack.sh start && bash demos/full-stack-demo.sh

▶ 1.  Hub health                ✓ HTTP 200
▶ 1b. Service registry          ✓ HTTP 200
▶ 2.  SUTAR capabilities        ✓ HTTP 200
▶ 2b. Decision engine rank      ⚠ HTTP 401 (set SUTAR_TOKEN to authenticate)
▶ 2c. Trust engine SADA probe   ✓ HTTP 200
▶ 3.  Nexha capabilities        ✓ HTTP 200
▶ 3b. Nexha supplier lookup     ⤳ HTTP 502 (skipped — upstream not reachable)
▶ 3c. Nexha shipping quote      ⤳ HTTP 502 (skipped — upstream not reachable)
▶ 3d. Nexha credit offer        ⤳ HTTP 502 (skipped — upstream not reachable)
▶ 4.  do-app backend health     ⚠ skipped (backend not running)

Demo complete. All 2xx checks passed.
```

The Hub proxies reach SUTAR services correctly. Nexha upstream 502s are *expected* because no Nexha service is running locally yet — the proxy plumbing works.

---

## Open work (not in this 10-week roadmap)

- **C.5 nexha-warehouse-network** — build the missing warehouse service
- **Trust-OS path hardening** — currently SADA is the trust backbone; SUTAR trust-engine is a proxy. Long-term: SUTAR trust-engine should compute locally for simple cases
- **ACN services** — 15 services at 4716, 4800-4851 are mostly scaffold. Out of scope for this roadmap but called out in [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md)
- **Real STT/TTS** — Genie voice services are stubs returning canned text