#!/usr/bin/env node
/**
 * Generate Tests for All Industry Extensions
 */

const fs = require('fs');
const path = require('path');

const BASE = '/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/company-os/industry-extensions';

const EXTENSIONS = [
  'restaurant', 'beauty', 'hotel', 'retail', 'healthcare', 'education',
  'realestate', 'manufacturing', 'fitness', 'legal', 'construction',
  'automotive', 'logistics', 'fashion', 'sports', 'entertainment',
  'travel', 'government', 'agriculture', 'nonprofit', 'professional',
  'home_services', 'gaming', 'media', 'events', 'exhibitions'
];

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateTests(industry) {
  const dir = path.join(BASE, industry);
  const testsDir = path.join(dir, 'src/__tests__');
  fs.mkdirSync(testsDir, { recursive: true });

  // Read the index.ts to find module names
  const indexPath = path.join(dir, 'src/index.ts');
  let moduleNames = ['item'];

  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const matches = content.match(/Map<string,any>;/g);
    if (matches) {
      moduleNames = matches.map(m => m.replace('Map<string,any>;', '').trim());
    }
  }

  const testContent = `/**
 * ${capitalize(industry)} Extension Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
${moduleNames.map(m => `import request from 'supertest';`).join('\n')}
import app from '../index';

describe('${capitalize(industry)} Extension', () => {
  const tenantId = 'test_${industry}_001';

  beforeEach(() => {
    // Reset between tests if needed
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toContain('${industry}');
    });
  });

${moduleNames.map(m => `  describe('${capitalize(m)} Module', () => {
    it('should require tenant ID', async () => {
      const response = await request(app).get('/api/${m}');
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('X-Tenant-ID');
    });

    it('should list ${m} with tenant header', async () => {
      const response = await request(app)
        .get('/api/${m}')
        .set('X-Tenant-ID', tenantId);
      expect(response.status).toBe(200);
      expect(response.body.${m}).toBeDefined();
      expect(Array.isArray(response.body.${m})).toBe(true);
    });

    it('should create ${m}', async () => {
      const response = await request(app)
        .post('/api/${m}')
        .set('X-Tenant-ID', tenantId)
        .send({ name: 'Test ${capitalize(m)}' });
      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.tenantId).toBe(tenantId);
    });
  });`).join('\n\n')}

  describe('Tenant Isolation', () => {
    it('should isolate data between tenants', async () => {
      // Create in tenant A
      const resA = await request(app)
        .post('/api/${moduleNames[0]}')
        .set('X-Tenant-ID', 'tenant_a')
        .send({ name: 'Tenant A ${capitalize(moduleNames[0])}' });
      expect(resA.status).toBe(201);

      // Tenant B should not see it
      const resB = await request(app)
        .get('/api/${moduleNames[0]}')
        .set('X-Tenant-ID', 'tenant_b');
      expect(resB.status).toBe(200);
      expect(resB.body.${moduleNames[0]}.length).toBe(0);
    });
  });
});
`;

  fs.writeFileSync(path.join(testsDir, `${industry}.test.ts`), testContent);
  fs.writeFileSync(path.join(testsDir, 'vitest.config.ts'), `import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
});
`);

  // Update package.json to include test script
  const pkgPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.test = 'vitest';
  pkg.devDependencies = pkg.devDependencies || {};
  pkg.devDependencies.vitest = '^0.34.0';
  pkg.devDependencies.supertest = '^6.3.3';
  pkg.devDependencies['@types/supertest'] = '^6.0.2';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  console.log(`Tests created for ${industry}`);
}

EXTENSIONS.forEach(generateTests);
console.log(`\nDone! Created tests for ${EXTENSIONS.length} extensions.`);