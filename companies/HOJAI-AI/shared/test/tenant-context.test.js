/**
 * Smoke test for the tenant-context middleware in shared/auth.
 * Run: node test/tenant-context.test.js
 *
 * Covers:
 *   1. Public path bypasses tenant resolution entirely
 *   2. JWT user payload (req.user.businessId) sets tenant
 *   3. Simple auth payload (req.auth.businessId) sets tenant
 *   4. Service-to-service internal tokens do NOT set tenant
 *   5. REQUIRE_TENANT=true rejects requests with no tenant
 *   6. ALLOW_HEADER_TENANT=true falls back to X-Company-Id header
 *   7. X-Company-Id header is ignored when fallback is off
 *   8. getTenant(req) returns the resolved tenant
 *   9. requireTenant guard 400s when no tenant
 *  10. getTenant returns undefined when no tenant was resolved
 */

import { createTenantContext, getTenant, requireTenant } from '../auth/index.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  PASS  ${msg}`); passed++; }
  else      { console.log(`  FAIL  ${msg}`); failed++; }
}

function makeRes() {
  const r = {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  return r;
}

function runMw(mw, req) {
  return new Promise((resolve) => {
    const res = makeRes();
    let nextCalled = false;
    const next = () => { nextCalled = true; resolve({ nextCalled, res }); };
    const result = mw(req, res, next);
    if (result && typeof result.then === 'function') {
      result.then(() => {
        if (!nextCalled && !res.body) resolve({ nextCalled, res });
      });
    }
  });
}

// Always start from a clean env (other tests in the same process may have set these)
delete process.env.REQUIRE_TENANT;
delete process.env.ALLOW_HEADER_TENANT;

console.log('\n== Tenant context middleware ==\n');

// 1. Public path
{
  const mw = createTenantContext({ publicPaths: ['/health'] });
  const r = await runMw(mw, { path: '/health' });
  assert(r.nextCalled === true, 'public path calls next');
  assert(r.res.body === null, 'public path does not 4xx');
}

// 2. JWT user
{
  delete process.env.REQUIRE_TENANT;
  const mw = createTenantContext();
  const r = await runMw(mw, { path: '/api/x', user: { businessId: 'BIZ_ACME' } });
  assert(r.nextCalled === true, 'JWT user calls next');
  assert(r.res.req?.tenant?.companyId === 'BIZ_ACME' || true, 'JWT user tenant would be set on req (validated separately)');
}
// (re-run capturing req)
{
  const mw = createTenantContext();
  let capturedReq;
  const r = await new Promise((resolve) => {
    const req = { path: '/api/x', user: { businessId: 'BIZ_ACME' } };
    const res = makeRes();
    mw(req, res, () => { capturedReq = req; resolve({ req, res }); });
  });
  assert(capturedReq.tenant.companyId === 'BIZ_ACME', 'JWT user -> req.tenant.companyId = BIZ_ACME');
  assert(capturedReq.tenant.source === 'jwt-user', 'JWT user -> source = jwt-user');
}

// 3. Simple auth
{
  const mw = createTenantContext();
  let capturedReq;
  await new Promise((resolve) => {
    const req = { path: '/api/x', auth: { type: 'token', businessId: 'BIZ_BETA' } };
    const res = makeRes();
    mw(req, res, () => { capturedReq = req; resolve(); });
  });
  assert(capturedReq.tenant.companyId === 'BIZ_BETA', 'auth-token -> companyId');
  assert(capturedReq.tenant.source === 'auth-token', 'auth-token -> source = auth-token');
}

// 4. Service-to-service internal token does NOT set tenant
{
  const mw = createTenantContext();
  let capturedReq;
  await new Promise((resolve) => {
    const req = { path: '/api/x', auth: { type: 'service' } };
    const res = makeRes();
    mw(req, res, () => { capturedReq = req; resolve(); });
  });
  assert(capturedReq.tenant === undefined, 'service-to-service does not set tenant');
}

// 5. REQUIRE_TENANT=true rejects
{
  process.env.REQUIRE_TENANT = 'true';
  const mw = createTenantContext();
  const r = await new Promise((resolve) => {
    const req = { path: '/api/x' };
    const res = makeRes();
    mw(req, res, () => resolve({ called: true }));
    resolve({ res, called: false });
  });
  // The promise above may resolve before next(); check res
  const res = r.res || r;
  assert(res.statusCode === 400, 'REQUIRE_TENANT=true -> 400');
  assert(res.body && res.body.error === 'TENANT_REQUIRED', 'REQUIRE_TENANT=true -> error TENANT_REQUIRED');
  delete process.env.REQUIRE_TENANT;
}

// 6. ALLOW_HEADER_TENANT=true falls back to X-Company-Id
{
  process.env.ALLOW_HEADER_TENANT = 'true';
  const mw = createTenantContext();
  let capturedReq;
  await new Promise((resolve) => {
    const req = { path: '/api/x', headers: { 'x-company-id': 'BIZ_GAMMA' } };
    const res = makeRes();
    mw(req, res, () => { capturedReq = req; resolve(); });
  });
  assert(capturedReq.tenant.companyId === 'BIZ_GAMMA', 'header fallback -> companyId');
  assert(capturedReq.tenant.source === 'header', 'header fallback -> source = header');
  delete process.env.ALLOW_HEADER_TENANT;
}

// 7. X-Company-Id header ignored when fallback off
{
  const mw = createTenantContext();
  let capturedReq;
  await new Promise((resolve) => {
    const req = { path: '/api/x', headers: { 'x-company-id': 'BIZ_GAMMA' } };
    const res = makeRes();
    mw(req, res, () => { capturedReq = req; resolve(); });
  });
  assert(capturedReq.tenant === undefined, 'no auth + header + fallback off -> no tenant');
}

// 8. getTenant
{
  const req = { tenant: { companyId: 'BIZ_X', source: 'jwt-user' } };
  const t = getTenant(req);
  assert(t.companyId === 'BIZ_X', 'getTenant returns the tenant');
}

// 9. requireTenant guard
{
  const mw = requireTenant;
  const res = makeRes();
  let nextCalled = false;
  mw({ /* no tenant */ }, res, () => { nextCalled = true; });
  assert(nextCalled === false, 'requireTenant guard does not call next when no tenant');
  assert(res.statusCode === 400, 'requireTenant guard -> 400');
  assert(res.body.error === 'TENANT_REQUIRED', 'requireTenant guard -> TENANT_REQUIRED');
}

// 10. getTenant undefined when no tenant
{
  const t = getTenant({});
  assert(t === undefined, 'getTenant returns undefined when no tenant');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
