# TwinOS Operations Runbook

**Audience:** SRE / platform engineers running TwinOS in production.
**Scope:** Day-to-day operations, incident response, and routine maintenance.

---

## Quick Reference

| Need | Command |
|------|---------|
| Start all 15 twins | `bash /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/start-twins.sh` |
| Restart all 15 twins | `bash /tmp/restart-twins.sh` |
| Smoke test Phase 5 | `bash /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/scripts/phase5-smoke-test.sh` |
| View logs | `tail -f /tmp/hojai-twins/logs/<service>.log` |
| Check health | `curl http://localhost:<port>/health` |
| Check readiness | `curl http://localhost:<port>/ready` |

**Service ports** (canonical):

| Service | Port | Service | Port |
|---------|------|---------|------|
| twinos-hub | 4705 | inventory-twin | 4887 |
| organization-twin | 4710 | merchant-twin | 4888 |
| product-twin | 4720 | user-twin | 4889 |
| employee-twin | 4730 | asset-twin | 4890 |
| voice-twin | 4876 | partner-twin | 4892 |
| order-twin | 4885 | lead-twin | 4894 |
| payment-twin | 4886 | customer-twin | 4895 |
| | | wallet-twin | 4896 |

---

## 1. Startup & Shutdown

### Start all twins

```bash
bash /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/start-twins.sh
```

Output (truncated):
```
[twinos-hub] starting on port 4705 ... ✓ (PID 12345, healthy)
[organization-twin] starting on port 4710 ... ✓ (PID 12346, healthy)
...
═══════════════════════════════════════════════════════
Started: 15 / Failed: 0
═══════════════════════════════════════════════════════
```

**Required env vars** (set in start-twins.sh with safe dev defaults):
- `JWT_SECRET` — must be ≥64 chars in production
- `JWT_ISSUER` — `rtmn-corpid` so CorpID tokens are accepted
- `SERVICE_NAME` — twin name, used in logs

### Restart one twin

```bash
PORT=4888
PID=$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t | head -1)
[ -n "$PID" ] && kill -TERM $PID
sleep 1

cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/merchant-twin
PORT=$PORT JWT_SECRET="..." JWT_ISSUER="rtmn-corpid" SERVICE_NAME="merchant-twin" \
  nohup node src/index.js > /tmp/hojai-twins/logs/merchant-twin.log 2>&1 &
```

### Graceful shutdown

Each twin calls `installGracefulShutdown(server, phase5Cleanup)` at boot.
On SIGTERM/SIGINT the process:

1. Stops accepting new connections
2. Flushes persistent stores to disk
3. Closes SSE client connections cleanly
4. Publishes `service.shutdown` event
5. Exits 0

**Always use `kill -TERM` (not `-9`)** to trigger graceful shutdown.

### Restart all twins (scripted)

```bash
bash /tmp/restart-twins.sh
```

---

## 2. Health Checks

### Liveness vs readiness

```bash
# Liveness — "is the process alive?"
curl http://localhost:4888/health
# → 200 { status: "healthy", service: "merchant-twin", version: "2.0.0" }

# Readiness — "can it serve traffic?"
curl http://localhost:4888/ready
# → 200 { status: "ready", ... }
# → 503 { status: "not_ready", checks: [...] } if any dep is down
```

**Liveness** failure → Kubernetes restarts the pod.
**Readiness** failure → Kubernetes removes pod from load balancer but doesn't restart.

### Smoke test

```bash
bash /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/scripts/phase5-smoke-test.sh
```

Runs 70 probes (14 twins × 5 endpoints). Should report `70 / 70 passed`.

---

## 3. Common Incidents

### "Twin returns 404 on /api/twins/merge or /api/twins/:id/lifecycle"

**Cause:** The twin was started before Phase 5 was wired (or before the latest lifecycle.js update that added `/archive` and `/restore`).

**Fix:** Restart the twin:
```bash
PORT=4888  # the affected port
PID=$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t | head -1)
kill -TERM $PID
sleep 1
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/<name>
PORT=$PORT JWT_SECRET="..." JWT_ISSUER="rtmn-corpid" SERVICE_NAME="<name>" \
  nohup node src/index.js > /tmp/hojai-twins/logs/<name>.log 2>&1 &
```

Verify with:
```bash
grep "phase5_lifecycle_merge_installed" /tmp/hojai-twins/logs/<name>.log
```

### "Twin logs 'phase5_skipped_lifecycle_merge' reason='no store provided'"

**Cause:** The `store` variable referenced in `installPhase5({store: ...})` is not declared in `src/index.js`. This happens when the store lives in a separate module (e.g., `lead-twin` uses `services/store.js`).

**Fix:** Edit `src/index.js` and import the store:
```js
import { leads as leadsStore } from './services/store.js';

const phase5Cleanup = installPhase5(app, {
  // ...
  store: typeof leadsStore !== 'undefined' ? leadsStore : null,
  stats: () => ({ count: leadsStore.size })
});
```

### "Persistent store flushes fail on shutdown"

**Cause:** Disk full, permission denied, or file-locked by another process.

**Fix:**
```bash
# Check disk
df -h /tmp/hojai-twins/data/

# Check file locks
lsof /tmp/hojai-twins/data/<service>/*.json

# Check permissions
ls -la /tmp/hojai-twins/data/<service>/
```

The store is best-effort on shutdown — if flush fails, on next boot the store reloads from the last successful flush. Data loss is bounded by the time since the last successful write.

### "JWT 401 on inter-service calls"

**Cause:** Token issuer mismatch.

**Fix:** Ensure both services use the same `JWT_SECRET` and `JWT_ISSUER`. CorpID (port 4702) issues tokens with `issuer: 'rtmn-corpid'`. Twin services must accept `JWT_ISSUER='rtmn-corpid'`.

```bash
grep "JWT_ISSUER" /tmp/hojai-twins/logs/<service>.log | head -1
```

### "Twin process won't die with SIGTERM"

**Cause:** Stuck in synchronous work (e.g., a long PersistentStore flush on a slow disk).

**Fix:** Wait 30s then escalate:
```bash
kill -TERM <PID>
sleep 30
kill -KILL <PID>  # last resort, may corrupt unflushed data
```

---

## 4. Lifecycle Operations

### Archive a twin

```bash
TOKEN=$(node -e "
const jwt = require('/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/twinos-shared/node_modules/jsonwebtoken');
console.log(jwt.sign({ sub: 'ops', role: 'admin', type: 'access' }, '<JWT_SECRET>', { issuer: 'rtmn-corpid', expiresIn: '1h' }));
")

curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4888/api/twins/mer-abc123/lifecycle/archive
```

### Restore from archive

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4888/api/twins/mer-abc123/lifecycle/restore
```

### Transition to a specific status

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"to":"paused","reason":"scheduled maintenance"}' \
  http://localhost:4888/api/twins/mer-abc123/lifecycle/transition
```

### View transition history

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4888/api/twins/mer-abc123/lifecycle/history
```

---

## 5. Merging Twins

### Dry-run a merge (preview)

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sourceId":"mer-abc","targetId":"mer-def","strategy":"combine","dryRun":true}' \
  http://localhost:4888/api/twins/merge
```

### Execute a merge

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sourceId":"mer-abc","targetId":"mer-def","strategy":"combine"}' \
  http://localhost:4888/api/twins/merge
```

After merge, source is `archived` with `mergedInto: <targetId>`.

### Roll back a merge (restore source)

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4888/api/twins/mer-abc/lifecycle/restore
```

⚠️ This restores the source but the target retains the merged data. Use only if you need to inspect what was lost in the merge.

---

## 6. SSE Real-Time Stream (Opt-in)

SSE is opt-in per twin. To enable, edit `src/index.js`:

```js
const phase5Cleanup = installPhase5(app, {
  serviceName: 'merchant-twin',
  twinType: 'merchant',
  store: merchants,
  sse: {
    enabled: true,
    eventBusUrl: 'http://localhost:4254'  // SUTAR event-bus
  }
});
```

Subscribe to events:
```bash
curl -N http://localhost:4888/api/events/stream
```

Hub stats:
```bash
curl http://localhost:4888/api/events/stats
# → { connectedClients: 1, backlogSize: 12, uptime: 3600 }
```

---

## 7. Logs

**Location:** `/tmp/hojai-twins/logs/<service>.log`

**Format:** Structured JSON (one event per line) + Morgan access logs interleaved.

Example:
```json
{"timestamp":"2026-06-22T02:36:17.667Z","level":"info","service":"@rtmn/twinos-shared","message":"Merchant Twin Service running on port 4888"}
{"timestamp":"2026-06-22T02:36:17.736Z","level":"info","service":"@rtmn/twinos-shared","message":"phase5_lifecycle_merge_installed","serviceName":"merchant-twin","twinType":"merchant","mount":"/api/twins"}
```

Filter by message type:
```bash
grep "phase5_" /tmp/hojai-twins/logs/merchant-twin.log
grep "ERROR\|FATAL" /tmp/hojai-twins/logs/*.log
grep "http_request" /tmp/hojai-twins/logs/merchant-twin.log | tail -20
```

---

## 8. Data Files

**Location:** `/tmp/hojai-twins/data/<service>/*.json`

**Format:** JSON-serialized PersistentStore dump. Safe to inspect with `jq`:
```bash
cat /tmp/hojai-twins/data/merchant-twin/merchants.json | jq '.["mer-abc123"]'
```

**Backup:**
```bash
tar czf /tmp/twin-backup-$(date +%Y%m%d).tar.gz /tmp/hojai-twins/data/
```

**Restore:**
```bash
tar xzf /tmp/twin-backup-20260622.tar.gz -C /
# Then restart the affected twins
```

---

## 9. Monitoring Checklist

Daily:
- [ ] All 15 `/health` endpoints return 200
- [ ] All 15 `/ready` endpoints return 200
- [ ] No `ERROR` lines in last 24h of logs
- [ ] Disk usage on `/tmp/hojai-twins/` below 80%

Weekly:
- [ ] Phase 5 smoke test passes (70/70)
- [ ] Cross-service test passes (Phase 4)
- [ ] Backup `/tmp/hojai-twins/data/` to durable storage

Monthly:
- [ ] Rotate `JWT_SECRET`
- [ ] Update `@rtmn/twinos-shared` to latest version
- [ ] Review lifecycle transition logs for anomalies

---

*Last Updated: 2026-06-22*