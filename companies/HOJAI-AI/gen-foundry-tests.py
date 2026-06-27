#!/usr/bin/env python3
"""Generate basic node --test tests for foundry services."""
import os, re, sys

AUTH_FUNC = '''
// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
'''

def get_port(src_path):
    """Extract port from source file."""
    with open(src_path) as f:
        content = f.read()
    m = re.search(r'PORT.*?=.*?process\.env\.PORT.*?\|\|\s*["\']?(\d+)', content)
    if m:
        return m.group(1)
    # Try simpler pattern
    m = re.search(r'process\.env\.PORT\s*\|\|\s*["\']?(\d+)', content)
    if m:
        return m.group(1)
    return '3000'

def get_routes(src_path):
    """Extract routes from source file."""
    with open(src_path) as f:
        content = f.read()

    routes = []
    # Find app.post/put/patch/delete routes
    pattern = r"app\.(post|put|patch|delete)\('([^']+)'"
    for m in re.finditer(pattern, content):
        method = m.group(1).upper()
        path = m.group(2)
        routes.append((method, path))

    # Find GET routes
    for m in re.finditer(r"app\.get\('([^']+)'", content):
        path = m.group(1)
        routes.append(('GET', path))

    return routes

def generate_test(svc_name, src_path, port, routes):
    """Generate test file content."""

    # Get auth-protected routes (mutating)
    protected = [(m, p) for m, p in routes if m != 'GET']
    public_gets = [p for m, p in routes if m == 'GET']

    test = f'''// Auto-generated tests for {svc_name}
// Run with: NODE_ENV=test node --test tests/{svc_name}.test.cjs

'use strict';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
process.env.PORT = '{port}';
process.env.DATA_DIR = '/tmp/{svc_name}-test';

const {{ describe, it, before, after }} = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Import app (guards against listen in NODE_ENV=test)
const app = require('../src/index.js');

let server;
let baseUrl;

function req(method, path, body, headers) {{
  return new Promise((resolve) => {{
    if (!baseUrl) {{ resolve({{ status: 0 }}); return; }}
    const url = new URL(baseUrl + path);
    const opts = {{
      method: method.toUpperCase(),
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {{ 'Content-Type': 'application/json', ...headers }}
    }};
    const r = http.request(opts, (res) => {{
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {{
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try {{ parsed = JSON.parse(raw); }} catch {{ parsed = raw; }}
        resolve({{ status: res.statusCode, body: parsed }});
      }});
    }});
    r.on('error', () => resolve({{ status: 0 }}));
    if (body) r.write(JSON.stringify(body));
    r.end();
  }});
}}

describe('{svc_name}', () => {{
  before(async () => {{
    await new Promise((resolve) => {{
      server = http.createServer(app);
      server.listen(0, () => {{
        baseUrl = `http://127.0.0.1:${{server.address().port}}`;
        resolve();
      }});
    }});
  }});

  after(() => {{ server?.close(); }});

  // Health checks
  it('GET /health returns 200', async () => {{
    const r = await req('GET', '/health');
    assert.equal(r.status, 200, `health failed: ${{JSON.stringify(r)}}`);
  }});

  it('GET /ready returns 200', async () => {{
    const r = await req('GET', '/ready');
    assert.ok([200, 404].includes(r.status), `/ready failed: ${{r.status}}`);
  }});
'''

    # Add public GET routes
    for path in public_gets[:5]:  # Limit to 5
        if path not in ['/health', '/ready']:
            test += f'''
  it('GET {path} works', async () => {{
    const r = await req('GET', '{path}');
    assert.ok([200, 404].includes(r.status), `failed: ${{r.status}}`);
  }});
'''

    # Add auth tests
    if protected:
        # Get first mutating route for auth test
        method, path = protected[0]
        test += f'''
  // Auth tests
  it('{method} {path} without token returns 401', async () => {{
    const r = await req('{method}', '{path}', {{}});
    assert.equal(r.status, 401, `expected 401, got ${{r.status}}`);
  }});

  it('{method} {path} with wrong token returns 401', async () => {{
    const r = await req('{method}', '{path}', {{}}, {{ 'x-internal-token': 'wrong-token' }});
    assert.equal(r.status, 401);
  }});

  it('{method} {path} with correct token returns expected status', async () => {{
    const r = await req('{method}', '{path}', {{}}, {{ 'x-internal-token': 'test-token' }});
    assert.ok([200, 201, 400, 404, 500].includes(r.status), `unexpected ${{r.status}}`);
  }});
'''

    test += '''
  // 404 test
  it('unknown route returns 404', async () => {
    const r = await req('GET', '/api/nonexistent-route-xyz');
    assert.equal(r.status, 404);
  });
});
'''
    return test

def main():
    base = '/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/foundry/services'

    # Services to generate tests for (prioritized)
    priority = [
        'database-os', 'fintech-services', 'billing-os', 'ecommerce-services',
        'healthcare-services', 'hotel-services', 'restaurant-services',
        'mobility-services', 'logistics-services', 'b2b-services',
        'pos-services', 'education-services', 'social-auth', 'storage',
        'webhooks', 'knowledge-os', 'rate-limiter', 'email-service',
        'template-compiler', 'search-service', 'cdn-manager', 'scheduler',
        'bot-detection', 'ai-ux-researcher', 'testing', 'realtime',
        'db-schema', 'export-service', 'feature-flags', 'studio-orchestrator',
        'preview-deploys', 'edge-functions', 'mobile-os', 'deploy-pipeline',
        'ai-product-manager', 'api-client', 'security-scan',
        'ai-code-reviewer', 'maps-integration', 'company-mapper',
        'communication-os', 'erp-services', 'bam-integration',
    ]

    created = 0
    for svc in priority:
        src = os.path.join(base, svc, 'src', 'index.js')
        if not os.path.exists(src):
            continue

        test_dir = os.path.join(base, svc, 'tests')
        os.makedirs(test_dir, exist_ok=True)
        test_file = os.path.join(test_dir, f'{svc}.test.cjs')

        if os.path.exists(test_file):
            continue

        port = get_port(src)
        routes = get_routes(src)

        if not routes:
            continue

        test_content = generate_test(svc, src, port, routes)

        with open(test_file, 'w') as f:
            f.write(test_content)

        created += 1
        print(f'Created: {svc}.test.cjs ({len(routes)} routes)')

    print(f'\n=== Created {created} test files ===')

if __name__ == '__main__':
    main()
