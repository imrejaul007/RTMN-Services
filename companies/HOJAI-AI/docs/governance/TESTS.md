# Governance Platform — Test Suite

> What's covered, how to run it, what the thresholds are.

## Test inventory

| Suite | Service | File | Count | What it checks |
|---|---|---|---:|---|
| Smoke (legacy) | policy-os | `platform/flow/policy-os/tests/smoke.sh` | 12+ | Health + every GET endpoint |
| E2E (legacy) | policy-os | `platform/flow/policy-os/tests/e2e.sh` | 8+ | Policy lifecycle, approvals, exceptions |
| Expression | policy-os | `platform/flow/policy-os/tests/expression.test.sh` | 10+ | Expression evaluator edge cases |
| Persistence | policy-os | `platform/flow/policy-os/tests/persistence.test.sh` | 6+ | Survives restart |
| Load | policy-os | `platform/flow/policy-os/tests/load.test.sh` | 1 run | 32 RPS, 79ms avg, 100% success |
| **Webhook + analytics (Phase 4)** | policy-os | `platform/flow/policy-os/tests/webhook-analytics.test.sh` | 12 | HMAC delivery, counters, denial reasons |
| **Phase 6** | policy-os | `platform/flow/policy-os/tests/phase6.test.sh` | 14 | Validation, time-bounds, bulk, composition |
| Policy fail mode | flow-orchestrator | `platform/flow/flow-orchestrator/tests/policy-fail-mode.test.sh` | 6+ | fail-closed by default |
| **Compliance engine** | compliance-engine | `platform/flow/compliance-engine/tests/smoke.sh` | 18 | Frameworks, mapping, coverage, snapshot, evidence, attestations |
| **Consent engine** | consent-engine | `platform/flow/consent-engine/tests/smoke.sh` | 13 | Grant, withdraw, check fail-closed, bulk, summary |
| **Governance SDK** | shared | `shared/lib/governance-sdk.test.sh` | 9 | End-to-end SDK against all 3 services |

**Total: 110+ assertions across 11 test files. All pass on the current build.**

---

## Running the full suite

```bash
# 1. Start all four services
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
./start-all.sh   # or start them manually

# 2. Run each suite
for f in \
  platform/flow/policy-os/tests/smoke.sh \
  platform/flow/policy-os/tests/e2e.sh \
  platform/flow/policy-os/tests/expression.test.sh \
  platform/flow/policy-os/tests/persistence.test.sh \
  platform/flow/policy-os/tests/webhook-analytics.test.sh \
  platform/flow/policy-os/tests/phase6.test.sh \
  platform/flow/flow-orchestrator/tests/policy-fail-mode.test.sh \
  platform/flow/compliance-engine/tests/smoke.sh \
  platform/flow/consent-engine/tests/smoke.sh \
  shared/lib/governance-sdk.test.sh
do
  echo "==== $f ===="
  bash "$f" 2>&1 | tail -3
done
```

---

## Load test details

`platform/flow/policy-os/tests/load.test.sh` is a bash+curl test, not a real load framework. For real load testing use `k6`, `wrk`, or `autocannon`.

Thresholds (intentionally lenient for bash+curl):

| Metric | Threshold | Latest run |
|---|---|---|
| Success rate | ≥ 99% | 100% |
| Average latency | < 500ms | 79ms |
| P99 latency | < 2000ms | ~180ms |
| RPS | ≥ 5 | 32 |

The 5 RPS floor is realistic for bash+curl; a real load driver would push hundreds of RPS.

---

## CI integration

Add to `.github/workflows/governance-tests.yml`:

```yaml
name: governance-tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Install
        run: |
          cd companies/HOJAI-AI
          for d in platform/flow/{policy-os,flow-orchestrator,compliance-engine,consent-engine} shared; do
            [ -f "$d/package.json" ] && (cd "$d" && npm ci)
          done
      - name: Start services
        run: |
          cd companies/HOJAI-AI
          # start in background, capture tokens
          for s in policy-os:4254 flow-orchestrator:4244 compliance-engine:4261 consent-engine:4262; do
            name=${s%%:*}; port=${s##*:}
            (cd platform/flow/$name && PORT=$port node src/index.js > /tmp/$name.log 2>&1 &)
          done
          sleep 5
      - name: Test
        run: |
          cd companies/HOJAI-AI
          bash platform/flow/policy-os/tests/phase6.test.sh
          bash platform/flow/policy-os/tests/webhook-analytics.test.sh
          bash platform/flow/compliance-engine/tests/smoke.sh
          bash platform/flow/consent-engine/tests/smoke.sh
          bash shared/lib/governance-sdk.test.sh
```

---

## Adding a new test

1. **Pick the right suite.** Webhook changes go in `webhook-analytics.test.sh`. Composition changes go in `phase6.test.sh`. New services get their own `tests/smoke.sh`.

2. **Use the existing patterns.** Copy a `run()` or `assert_json()` helper from any existing test. Don't reinvent auth handling — let `SERVICE_TOKEN` be picked up from the log.

3. **Be re-runnable.** Always clean up (hard-delete) what you create. Use unique names with timestamps so reruns don't conflict.

4. **Print pass/fail counts at the end** so it's greppable in CI logs.

---

## Known gaps

- No fuzz testing on the expression evaluator (the AST-based parser is safe by construction, but more coverage is welcome)
- No concurrent-write race test (single-process PersistentStore; the write queue serializes)
- No multi-region replication test (not implemented)
- No kill-during-write test (graceful shutdown is best-effort, not atomic)

These are good candidates for Phase 9+.
