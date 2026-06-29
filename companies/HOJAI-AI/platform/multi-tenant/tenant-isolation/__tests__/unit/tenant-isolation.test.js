'use strict';
var http = require('http');
var server;
var base = 'http://localhost:4904';

function httpReq(method, path, body) {
  return new Promise(function(resolve, reject) {
    var opts = { hostname: 'localhost', port: 4904, path: path, method: method, headers: {} };
    if (body) { var json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    var req = http.request(opts, function(res) { var data = ''; res.on('data', function(c) { data += c; }); res.on('end', function() { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, body: data }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

var vitest = require('vitest');
var describe = vitest.describe, it = vitest.it, beforeAll = vitest.beforeAll, afterAll = vitest.afterAll, expect = vitest.expect;

describe('Tenant Isolation OS', function() {
  beforeAll(function(done) { server = require('../src/index.js'); setTimeout(done, 300); });
  afterAll(function() { if (server && server.close) server.close(); });

  it('GET /health', function() { return httpReq('GET', '/health').then(function(r) { vitest.expect(r.status).toBe(200); vitest.expect(r.body.status).toBe('healthy'); }); });
  it('GET /ready', function() { return httpReq('GET', '/ready').then(function(r) { vitest.expect(r.status).toBe(200); vitest.expect(r.body.ready).toBe(true); }); });

  it('POST /api/regions', function() { return httpReq('POST', '/api/regions', { name: 'US East', code: 'us-east-1', provider: 'aws', compliance: ['SOC2'] }).then(function(r) { vitest.expect(r.status).toBe(201); vitest.expect(r.body.id).toBeTruthy(); vitest.expect(r.body.code).toBe('us-east-1'); }); });
  it('POST /api/regions -> 400 without name', function() { return httpReq('POST', '/api/regions', { code: 'x' }).then(function(r) { vitest.expect(r.status).toBe(400); }); });
  it('GET /api/regions', function() { return httpReq('GET', '/api/regions').then(function(r) { vitest.expect(r.status).toBe(200); vitest.expect(r.body.regions).toBeTruthy(); }); });
  it('GET /api/regions/:id', function() { return httpReq('POST', '/api/regions', { name: 'EU West', code: 'eu-west-1' }).then(function(r) { return httpReq('GET', '/api/regions/' + r.body.id); }).then(function(r) { vitest.expect(r.status).toBe(200); vitest.expect(r.body.name).toBe('EU West'); }); });
  it('DELETE /api/regions/:id', function() { return httpReq('POST', '/api/regions', { name: 'ToDelete', code: 'del-1' }).then(function(r) { return httpReq('DELETE', '/api/regions/' + r.body.id); }).then(function(r) { vitest.expect(r.status).toBe(200); vitest.expect(r.body.deleted).toBe(true); }); });

  it('POST /api/assignments', function() { return httpReq('POST', '/api/regions', { name: 'R1', code: 'r1' }).then(function(region) { return httpReq('POST', '/api/assignments', { tenantId: 'tenant-001', regionId: region.body.id, dataResidency: 'primary' }); }).then(function(r) { vitest.expect(r.status).toBe(201); vitest.expect(r.body.tenantId).toBe('tenant-001'); }); });
  it('GET /api/assignments/:tenantId', function() { return httpReq('GET', '/api/assignments/tenant-001').then(function(r) { vitest.expect(r.status).toBe(200); vitest.expect(r.body.tenantId).toBe('tenant-001'); }); });
  it('POST /api/failover/:tenantId', function() { return httpReq('POST', '/api/regions', { name: 'FailoverR', code: 'fail-r' }).then(function(region) { var r2 = region.body; return httpReq('POST', '/api/assignments', { tenantId: 'tenant-002', regionId: 'old-region', failoverRegion: r2.id }).then(function() { return httpReq('POST', '/api/failover/tenant-002'); }); }).then(function(r) { vitest.expect(r.status).toBe(200); vitest.expect(r.body.failedOver).toBe(true); }); });
  it('GET /api/compliance/:tenantId', function() { return httpReq('GET', '/api/compliance/tenant-001').then(function(r) { vitest.expect(r.status).toBe(200); vitest.expect(r.body).toHaveProperty('compliance'); }); });
  it('GET /api/stats', function() { return httpReq('GET', '/api/stats').then(function(r) { vitest.expect(r.status).toBe(200); vitest.expect(r.body).toHaveProperty('totalRegions'); vitest.expect(r.body).toHaveProperty('totalTenants'); }); });
});
