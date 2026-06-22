# Changelog

All notable changes to genie-os.

## 2026-06-22 (later)

### Fixed

- **Service-to-service auth: specialists rejected x-internal-token.**
  The `requireAuth` middleware in `shared/auth/index.cjs` and `index.js`
  only checked Bearer / API-Key, never `x-internal-token`. Added the
  `x-internal-token` check to BOTH the CJS mirror and the ESM source
  in the CJS auth factory. Genie runtime can now call specialists with
  `x-internal-token: $INTERNAL_SERVICE_TOKEN` and the request passes
  through.

- **Web super-app blocked anonymous browsing.** `app.use(requireAuth)`
  enforced auth on every request including `/api/health`, making the
  web a closed system. Changed to `createAuthMiddleware({required: false})`
  so the web is public — anyone can browse and call `/api/health`,
  `/api/specialists/<key>/*`, and `/api/<product>/*` without a token.
  Auth is still enforced at the deep endpoints (e.g. `/api/ask` in the
  genie runtime) where the data is private.

- **Port conflict: `genie-memory-inbox` vs `organization-twin`** on 4710.
  Moved genie-memory-inbox to **4810**.

- **Port conflict: `genie-consultant-agent` vs `product-twin`** on 4720.
  Moved genie-consultant-agent to **4820**.

- **`genie-money-os` and `genie-wellness-os` HTML "Cannot GET" leak.**
  These are stubs that return HTML 404 for non-existent endpoints
  (`/api/budget`, `/api/wellness/today`). The runtime's
  `isUsable` check (`moneyRes.error?.code !== 'NOT_FOUND'`) didn't
  catch this because the response is a string, not an error object.
  Added a `typeof moneyRes === 'object'` type guard so the runtime
  gracefully falls back to a helpful message instead of leaking HTML
  into the user-facing answer.

- **Wellness intent not recognized.** The wellness keywords were
  `health | sleep | workout | mood` — but the user-facing word is
  "wellness". Added `wellness` to the keyword list.

- **Money/wellness port defaults wrong.** `GENIE_MONEY_URL` defaulted
  to 4715 (taken by `genie-smart-forgetting-service`),
  `GENIE_WELLNESS_URL` to 4717 (taken by `genie-memory-graph`). Fixed
  defaults to 4724 and 4723.

- **Syntax error in `genie-memory-inbox/src/services/classifier.js`**
  caused by unescaped apostrophe in `'don't forget'` (single-quoted
  string). Changed to double-quoted string.

- **`start-specialists.js` (NEW)** starts all 23 sibling Genie
  services from the parent folder, sets
  `INTERNAL_SERVICE_TOKEN`/`JWT_SECRET`/`MONGODB_URI` from `.env` (with
  sensible defaults), and logs to `genie-os/logs/specialists/<name>.log`.

### Verified

- All 23 sibling Genie specialists start and respond to `/health`.
- 6/6 intent delegation matrix passes (shopping, calendar, money,
  wellness, goal, remember).
- 7/7 E2E routing checks pass (web → thin client → external repo for
  DO, Nexha, Salar, Genie).

## 2026-06-22 (earlier)

### Fixed

- **Web routing: `/api/health` returned HTML "Cannot GET"** because the catch-all
  `app.use('/api/', ...)` was registered before the explicit `app.get('/api/health', ...)`
  route. Moved the explicit route above the catch-all. Now `/api/health` returns
  the aggregated JSON health response.

- **Thin client forwarding: `/api/salar/<path>` was not reaching Salar** because
  the web server used `req.url` (which Express strips of the mount-point prefix)
  instead of `req.originalUrl`. Switched to `req.originalUrl` so the full path
  flows through to the thin client, which then strips `/api/<product>/` and
  forwards to the upstream service.

- **Auth bypass bug on signup/login**: `runtime/genie/src/index.js` had
  `app.post('/api/auth/signup', requireAuth, ...)` — but signup/login are
  the routes that *issue* tokens, so they cannot require auth themselves.
  Removed the misplaced `requireAuth` middleware from both routes. Signup
  and login now issue tokens as designed.

- **Shopping agent delegation: genie called `/api/session` (singular)** but
  the actual endpoint is `/api/shop`. Fixed the URL in
  `runtime/genie/src/index.js`.

### Added

- **`npm run test:routing`** — E2E test that verifies the full web → thin
  client → external repo chain for DO, Nexha, Salar, and Genie. 7 checks,
  all pass. Run with the full stack up.

- **External service log directory** at
  `genie-os/logs/external-services/` for archiving `/tmp/*.log` files
  produced when starting external repos.

### Cleanup

- **Deleted** old `/Users/rejaulkarim/Documents/genie-os/` (27MB, fully
  superseded by `RTMN/companies/HOJAI-AI/products/genie/genie-os/`).

- **Cleared** stale foundation service logs and pids in `genie-os/logs/`
  (the foundation services moved to `_deprecated-foundation/` on 2026-06-21).

- **Updated** QUICKSTART.md, ARCHITECTURE.md, SERVICES.md to reflect
  the 7-service model (3 runtime + 3 clients + 1 web) and the
  foundation move.

## 2026-06-21

- **Foundation services deprecated.** All 7 (corpid, twinos, memoryos,
  goalos, policyos, skillos, flowos) moved to `_deprecated-foundation/`.
  Canonical implementations live in `companies/HOJAI-AI/platform/*`.
  See each service's `NOTICE.md` for the move rationale.

- **genie-os moved** from `/Users/rejaulkarim/Documents/genie-os/` to
  `RTMN/companies/HOJAI-AI/products/genie/genie-os/`. The old location
  was a temporary working directory.

- **Web super-app routing** rewritten to use `req.originalUrl` instead
  of `req.url` for thin client forwarding.

## Earlier

- 23 specialized Genie services live in
  `RTMN/companies/HOJAI-AI/products/genie/` as siblings of `genie-os/`.
  See [README.md](../README.md) for the full list.
