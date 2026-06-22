/**
 * CJS smoke test for the tenant-context middleware.
 * Run: node test/tenant-context-cjs.test.js
 *
 * Confirms the CJS mirror in auth/index.cjs exposes the same helpers
 * (createTenantContext, getTenant, requireTenant) and that they behave
 * identically to the ESM version for the simple cases.
 */

const { createTenantContext, getTenant, requireTenant } = require('../auth/index.cjs');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  PASS  ${msg}`); passed++; }
  else      { console.log(`  FAIL  ${msg}`); failed++; }
}

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

console.log('\n== Tenant context CJS ==\n');

{
  let capturedReq;
  const req = { path: '/api/x', auth: { type: 'token', businessId: 'BIZ_CJS' } };
  const res = makeRes();
  createTenantContext()(req, res, () => { capturedReq = req; });
  assert(capturedReq.tenant && capturedReq.tenant.companyId === 'BIZ_CJS', 'CJS: auth-token -> companyId');
  assert(capturedReq.tenant.source === 'auth-token', 'CJS: source = auth-token');
}

{
  const req = { tenant: { companyId: 'X', source: 'jwt-user' } };
  assert(getTenant(req).companyId === 'X', 'CJS: getTenant works');
  assert(getTenant({}) === undefined, 'CJS: getTenant returns undefined when no tenant');
}

{
  const res = makeRes();
  let nextCalled = false;
  requireTenant({}, res, () => { nextCalled = true; });
  assert(nextCalled === false, 'CJS: requireTenant does not call next');
  assert(res.statusCode === 400, 'CJS: requireTenant -> 400');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
