# NeXha Runbook

> **Date:** 2026-06-21
> **Audience:** On-call operators and anyone deploying NeXha L1 to Render + Vercel.
> **Companion to:** [DEPLOY.md](DEPLOY.md) (deploy guide), [SECURITY.md](SECURITY.md) (threat model).

---

## Health checks

| URL | Service |
|---|---|
| `https://nexha-commerce-identity.onrender.com/health` | commerce-identity |
| `https://nexha-sutar-mock.onrender.com/health` | sutar-mock |
| `https://nexha-portal.vercel.app` | portal (HTTP 200 = up) |

If `/health` returns non-200:
1. Check the Render dashboard for the service — `Manual Deploy` to restart
2. Pull logs from the Render dashboard
3. If `connection refused` on `localhost:27017` (Mongo), check the
   `MONGODB_URI` env var and the database provider's status page

---

## Secret rotation

If this codebase (or any deploy derived from it) was ever deployed with the
**default placeholder secrets** from `commerce-identity/.env.example`
(`JWT_SECRET=dev-secret-change-me-in-production-please`,
`INTERNAL_API_KEY=change-me-in-production`), you must rotate:

### 1. `JWT_SECRET`
Generates new JWTs; invalidates all existing tokens (every user must re-login).

```bash
# Generate
openssl rand -hex 32

# In Render dashboard:
#   nexha-commerce-identity → Environment → JWT_SECRET
# Replace value, save, and the service will auto-redeploy.
```

### 2. `INTERNAL_API_KEY`
Invalidates all service-to-service auth. If any downstream caller
(RTMN Industry OS, RisaCare dental integration, etc.) uses the old key,
update it simultaneously.

```bash
openssl rand -hex 32
```

### 3. `MONGODB_URI` password
If the password was ever published (including in any committed `.env`),
rotate at the database provider (MongoDB Atlas → Database Access → Edit User)
and update the URI.

### 4. WhatsApp credentials
Meta / Twilio access tokens can be rotated in their respective dashboards.

### 5. Audit any logs / backups
That may have captured the old values and consider them compromised.

---

## Common issues

### CORS error in browser console
Symptom: "Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy"

Fix:
1. Set `ALLOWED_ORIGINS` in Render dashboard to the actual Vercel URL
   (e.g. `https://nexha-portal.vercel.app`)
2. Save → service auto-redeploys
3. Hard-refresh the browser (Cmd+Shift+R)

### OTP not received (in dev mode)
1. Check Render service logs for the line `[DEV] WhatsApp OTP → +91...`
2. Check the SUTAR mock: `curl https://nexha-sutar-mock.onrender.com/events?topic=nexha.whatsapp.otp.dev` — the OTP is published there in dev mode
3. If neither shows it, the WhatsApp provider isn't configured (this is the expected dev-mode behavior)

### OTP not received (in prod)
1. Confirm `WHATSAPP_PROVIDER` is `meta` or `twilio` (not empty)
2. Check the provider's webhook for delivery status
3. Verify the `WHATSAPP_ACCESS_TOKEN` / `TWILIO_AUTH_TOKEN` hasn't expired
4. Check Render logs for the WhatsApp service call's response

### GSTIN validation failed
The backend validates format AND mod-36 checksum. Common causes:
- Typo in the GSTIN (check the 15-char length and last char `Z`)
- State code in positions 1-2 (must be 01-35; not all state codes are valid)
- PAN in positions 3-12 (uppercase letters/digits, 10 chars)

### "Invalid credentials" but password is correct
The backend hashes the password with bcrypt on `setPassword` / `register`
and stores it in `metadata.passwordHash`. If the document was created before
the password was set, the hash is missing. Re-run the registration flow.

### MongoDB connection failed (Render)
1. Verify `MONGODB_URI` is correct
2. Atlas: Database Access → confirm user has the right permissions
3. Atlas: Network Access → confirm Render's IP ranges are allowed (or `0.0.0.0/0` for any IP)
4. Password special chars in the URI must be URL-encoded (`@` → `%40`)

### Portal shows "loading..." forever
1. Open browser dev tools → Network tab
2. Find the `/api/auth/me` call — does it 401?
3. If yes, the session cookie is missing or expired → log in again
4. If the call never fires, the page wasn't updated to use `getMe()` —
   check `portal/app/{page}/page.tsx` and ensure it imports from `@/lib/api`

### "Cannot POST /api/..." from the portal
The route doesn't exist in the backend. Either:
- The backend version is older than the portal expects (redeploy backend)
- The portal was updated to call an unimplemented endpoint
- Check `commerce-identity/src/app.ts` for the actual mount paths

---

## Monitoring

L1 does not have Prometheus / OpenTelemetry / log aggregation. The minimum
operational visibility is:

- **Render dashboard**: service status, request count, CPU, memory, recent deploys
- **Render logs**: stdout/stderr (Winston JSON logs) — searchable, retention 30 days
- **Vercel dashboard**: portal deploys, edge function logs, request counts
- **sutar-mock `/stats`**: trust link count, trust records count, events count
- **MongoDB Atlas**: connection count, slow queries, disk usage

For production-grade observability, deploy the services with
`LOG_LEVEL=info` and pipe Render logs to an external aggregator (Datadog,
Loggly, etc.). Not configured in L1.

---

## Backups

L1 does not have automated backups. The recommended approach:

```bash
# Daily mongodump (run from any host that can reach the MongoDB)
mongodump --uri="$MONGODB_URI" --out=/backup/$(date +%Y-%m-%d)

# Restore
mongorestore --uri="$MONGODB_URI" /backup/2026-06-21
```

For Render-hosted MongoDB, run the dump from a cron-job service or a CI
pipeline. For Atlas, configure automated backups in the Atlas dashboard
(Atlas free tier includes daily backups; production should use point-in-time).

---

## Repo split — **DONE 2026-06-21**

The cleaned L1 stack has been pushed to a separate branch on
`github.com/imrejaul007/NeXha.git`:

- Branch: `integrate/clean-l1-onto-nexha-main`
- Commits: `1fb2892` (node_modules cleanup) + `b5235f6` (cleaned L1)
- Status: ready to merge into `main` (or to open as a PR)

The RTMN monorepo still has the L1 at `companies/Nexha/` (branch
`refactor/nexha-deep-audit`). To fully remove Nexha from RTMN, the
operators should:

1. Merge `integrate/clean-l1-onto-nexha-main` → `main` on `imrejaul007/NeXha`
2. On Render: update each service's `repo` and `branch` to point at
   `imrejaul007/NeXha` (main)
3. On RTMN: delete `companies/Nexha/` (or keep as a thin README pointer
   to the new repo)
4. Update external integrations that reference `NEXHA_PROCEMENT` env var
   (RisaCare dental) — these do NOT need updates; the public Render URLs
   don't change

The 6 individual phase commits (`70a6cf028` through `0004890db`) live on
RTMN's `refactor/nexha-deep-audit` branch for the audit trail. They
operate on `companies/Nexha/` paths so they cannot be rebased directly
onto the NeXha repo (different file layout). The corresponding change
is captured as a single squash-style commit on the NeXha side.

---

## SUTAR mock in production

The `sutar-mock` is in-memory. If you deploy it to production
(Render will build it from the same `render.yaml`), every restart loses
all trust links, trust records, and events. The intent is that production
uses real SUTAR endpoints:

- Set `SUTAR_BASE_URL=https://sutar.example.com` (or wherever real SUTAR lives)
- The per-service URLs auto-derive from this base
- The mock continues to be deployed only for staging / preview environments
  where the public SUTAR isn't available

If you need a persistent mock, consider:
- Switching the mock to use Redis or a MongoDB collection
- Running it as a sidecar with a persistent disk
- Using the production SUTAR's pre-prod environment

---

## Support escalation

1. Check the relevant doc ([DEPLOY.md](DEPLOY.md), [SECURITY.md](SECURITY.md), this file)
2. Check Render service logs (most issues surface there within 30s)
3. Check `AUDIT-NOTES.md` for known issues
4. File an issue on the `RTNM-Group/nexha` GitHub repo (post-Phase 7)

---

*Last updated: 2026-06-21 (Phase 6 of NEXHA-DEEP-AUDIT.md)*
