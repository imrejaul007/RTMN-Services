/**
 * Blueprint Compiler — Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  replaceTokens,
  buildRenderVars,
  TOKENS
} from '../src/render.js';
import {
  buildManifest,
  buildCapability
} from '../src/manifest.js';
import {
  createCompileJob,
  getCompileJob,
  getAllJobs,
  CompileState
} from '../src/compiler.js';

describe('Blueprint Compiler — Render', () => {

  test('should have all expected tokens', () => {
    assert.ok(TOKENS.includes('PROJECT_NAME'));
    assert.ok(TOKENS.includes('PROJECT_TITLE'));
    assert.ok(TOKENS.includes('TEMPLATE'));
    assert.ok(TOKENS.includes('REGION'));
    assert.ok(TOKENS.includes('AGENTS_JSON'));
  });

  test('should replace known tokens', () => {
    const vars = {
      PROJECT_NAME: 'maya-collective',
      PROJECT_TITLE: 'Maya Collective'
    };
    const result = replaceTokens('Hello {{PROJECT_NAME}}!', vars);
    assert.strictEqual(result, 'Hello maya-collective!');
  });

  test('should leave unknown tokens intact', () => {
    const vars = { PROJECT_NAME: 'maya' };
    const result = replaceTokens('Hello {{UNKNOWN}}!', vars);
    assert.strictEqual(result, 'Hello {{UNKNOWN}}!');
  });

  test('should replace multiple tokens', () => {
    const vars = {
      PROJECT_NAME: 'maya',
      PROJECT_TITLE: 'Maya',
      REGION: 'ap-south'
    };
    const result = replaceTokens('{{PROJECT_TITLE}} in {{REGION}}', vars);
    assert.strictEqual(result, 'Maya in ap-south');
  });

  test('should build render vars from blueprint', () => {
    const blueprint = {
      config: {
        name: 'Maya Collective',
        slug: 'maya-collective',
        type: 'marketplace',
        regions: ['ap-south', 'me'],
        languages: ['en', 'hi', 'ar']
      },
      agents: [
        { name: 'Sales Agent' },
        { name: 'Procurement Agent' }
      ]
    };

    const vars = buildRenderVars(blueprint);

    assert.strictEqual(vars.PROJECT_NAME, 'maya-collective');
    assert.strictEqual(vars.PROJECT_TITLE, 'Maya Collective');
    assert.strictEqual(vars.TEMPLATE, 'marketplace');
    assert.strictEqual(vars.REGION, 'ap-south');
    assert.strictEqual(vars.LANGUAGES_JSON, '["en","hi","ar"]');
    assert.strictEqual(vars.AGENTS_COMMA, 'Sales Agent, Procurement Agent');
  });

});

describe('Blueprint Compiler — Manifest', () => {

  test('should build manifest from blueprint', () => {
    const blueprint = {
      id: 'bp_123',
      config: {
        name: 'Maya Collective',
        slug: 'maya-collective',
        type: 'marketplace',
        regions: ['ap-south'],
        languages: ['en', 'hi'],
        currency: 'INR',
        marketSize: 'national',
        commerce: true,
        commerceType: 'yes-full',
        platforms: ['web', 'mobile-ios'],
        federation: true,
        industries: ['fashion']
      },
      idea: 'D2C fashion brand for Indian women',
      agents: [
        { name: 'Sales Agent' },
        { name: 'Finance Agent' }
      ]
    };

    const manifest = buildManifest(blueprint, 'proj_123');

    assert.ok(manifest.projectId);
    assert.strictEqual(manifest.name, 'maya-collective');
    assert.strictEqual(manifest.template, 'marketplace');
    assert.ok(manifest.sdkDependencies.includes('@hojai/foundation'));
    assert.ok(manifest.sdkDependencies.includes('@hojai/sutar'));
    assert.ok(manifest.sdkDependencies.includes('@hojai/nexha'));
    assert.ok(manifest.sdkDependencies.includes('@hojai/commerce'));
  });

  test('should include nexha config when federation enabled', () => {
    const blueprint = {
      config: {
        name: 'Test',
        type: 'company',
        regions: ['us-east'],
        languages: ['en'],
        currency: 'USD',
        marketSize: 'local',
        commerce: false,
        platforms: ['web'],
        federation: true
      }
    };

    const manifest = buildManifest(blueprint);
    assert.strictEqual(manifest.nexha.enabled, true);
  });

  test('should disable nexha when federation disabled', () => {
    const blueprint = {
      config: {
        name: 'Test',
        type: 'company',
        regions: ['us-east'],
        languages: ['en'],
        currency: 'USD',
        marketSize: 'local',
        commerce: false,
        platforms: ['web'],
        federation: false
      }
    };

    const manifest = buildManifest(blueprint);
    assert.strictEqual(manifest.nexha.enabled, false);
  });

});

describe('Blueprint Compiler — Capability', () => {

  test('should build capability from blueprint', () => {
    const blueprint = {
      config: {
        name: 'Maya Collective',
        type: 'marketplace',
        industries: ['fashion'],
        regions: ['ap-south'],
        languages: ['en', 'hi'],
        compliance: ['india-dpdp'],
        commerce: true,
        commerceType: 'yes-full',
        platforms: ['web', 'whatsapp'],
        federation: true
      },
      agents: [
        { name: 'Sales Agent', type: 'merchant', capabilities: ['rfq', 'quote'] }
      ]
    };

    const cap = buildCapability(blueprint);

    assert.ok(cap.capabilityId);
    assert.strictEqual(cap.name, 'Maya Collective');
    assert.strictEqual(cap.type, 'company');
    assert.ok(cap.capabilities.includes('marketplace'));
    assert.ok(cap.capabilities.includes('commerce'));
    assert.ok(cap.capabilities.includes('cart'));
    assert.ok(cap.capabilities.includes('whatsapp-commerce'));
    assert.ok(cap.compliance.includes('india-dpdp'));
  });

  test('should include correct capabilities for company type', () => {
    const blueprint = {
      config: {
        name: 'Test',
        type: 'company',
        industries: ['general'],
        regions: ['us-east'],
        languages: ['en'],
        compliance: [],
        commerce: false,
        platforms: ['web'],
        federation: false
      }
    };

    const cap = buildCapability(blueprint);
    assert.ok(cap.capabilities.includes('company-os'));
    assert.ok(cap.capabilities.includes('hr'));
    assert.ok(cap.capabilities.includes('finance'));
  });

});

describe('Blueprint Compiler — Jobs', () => {

  test('should create a compile job', () => {
    const blueprint = {
      config: {
        name: 'Test Company',
        type: 'company',
        regions: ['us-east'],
        languages: ['en'],
        currency: 'USD',
        marketSize: 'local',
        commerce: false,
        platforms: ['web'],
        federation: false
      }
    };

    const result = createCompileJob(blueprint);

    assert.ok(result.jobId);
    assert.ok(result.projectId);
    assert.strictEqual(result.state, CompileState.PENDING);
  });

  test('should reject invalid blueprint', () => {
    assert.throws(() => {
      createCompileJob({});
    }, /Invalid blueprint/);
  });

  test('should get a compile job', () => {
    const blueprint = {
      config: {
        name: 'Test Company',
        type: 'company',
        regions: ['us-east'],
        languages: ['en'],
        currency: 'USD',
        marketSize: 'local',
        commerce: false,
        platforms: ['web'],
        federation: false
      }
    };

    const result = createCompileJob(blueprint);
    const job = getCompileJob(result.jobId);

    assert.ok(job);
    assert.strictEqual(job.id, result.jobId);
  });

  test('should track job state', () => {
    const blueprint = {
      config: {
        name: 'Test Company',
        type: 'company',
        regions: ['us-east'],
        languages: ['en'],
        currency: 'USD',
        marketSize: 'local',
        commerce: false,
        platforms: ['web'],
        federation: false
      }
    };

    const result = createCompileJob(blueprint);

    // Job should start in pending state
    const job = getCompileJob(result.jobId);
    assert.ok([CompileState.PENDING, CompileState.COMPILING].includes(job.state));
  });

});

console.log('Running Blueprint Compiler tests...');
