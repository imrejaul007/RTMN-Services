/**
 * Unit tests for summaryService — no HTTP, just function calls with
 * an injectable fetcher (ADR-0011 Phase 13, 2026-06-23).
 *
 * Usage: npm test
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildSummary,
  checkUpstreams,
  fillPath,
  fetchJson,
  FANOUT_TARGETS,
} from '../../src/services/summaryService.js';

const TENANT = 't_test';

// ─────────────────────────────────────────────────────────────────
// fillPath
// ─────────────────────────────────────────────────────────────────

describe('fillPath', () => {
  it('replaces :tenantId with encoded value', () => {
    expect(fillPath('/api/x?tenantId=:tenantId', 't a/b')).toBe('/api/x?tenantId=t%20a%2Fb');
  });
  it('replaces all occurrences', () => {
    expect(fillPath('/api/:tenantId/x/:tenantId', 't1')).toBe('/api/t1/x/t1');
  });
  it('leaves non-template paths alone', () => {
    expect(fillPath('/api/health', 't1')).toBe('/api/health');
  });
});

// ─────────────────────────────────────────────────────────────────
// fetchJson
// ─────────────────────────────────────────────────────────────────

describe('fetchJson', () => {
  it('returns parsed JSON on 2xx', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    });
    try {
      const data = await fetchJson('http://x/y');
      expect(data).toEqual({ hello: 'world' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on non-2xx', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    try {
      await expect(fetchJson('http://x/y')).rejects.toThrow('HTTP 500');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('aborts on timeout', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    try {
      await expect(fetchJson('http://x/y', { timeoutMs: 50 })).rejects.toThrow('aborted');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// buildSummary — happy path
// ─────────────────────────────────────────────────────────────────

describe('buildSummary — happy path', () => {
  it('fans out to all configured sources and merges', async () => {
    const fakeFetcher = vi.fn(async (url) => {
      if (url.includes('nexha-business-directory')) {
        return { companies: [{ companyId: 'co_1', name: 'Acme', industry: 'retail', trustScore: 80 }], total: 1 };
      }
      if (url.includes('nexha-mission-planner')) {
        return { missions: [{ missionId: 'm_1', name: 'Deploy', status: 'in_progress', progress: 0.5 }], total: 1 };
      }
      if (url.includes('sutar-tenant-instances')) {
        return { instances: [{ instanceId: 'si_1', status: 'ACTIVE', isolationLevel: 'DEDICATED', region: 'us-east-1' }], total: 1 };
      }
      // default empty response for other targets
      return { total: 0 };
    });

    const summary = await buildSummary({ tenantId: TENANT, hubUrl: 'http://h', fetcher: fakeFetcher });

    expect(summary.tenantId).toBe(TENANT);
    expect(summary.summary.totalSources).toBe(FANOUT_TARGETS.length);
    expect(summary.summary.okCount).toBe(FANOUT_TARGETS.length);
    expect(summary.summary.errorCount).toBe(0);
    expect(summary.summary.health).toBe('healthy');
    expect(summary.errors).toBeUndefined();

    expect(summary.sections.directory.data.total).toBe(1);
    expect(summary.sections.directory.data.companies[0].companyId).toBe('co_1');
    expect(summary.sections.missions.data.missions[0].missionId).toBe('m_1');
    expect(summary.sections.sutarInstances.data.instances[0].instanceId).toBe('si_1');
  });

  it('truncates upstream results to 10 entries', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ companyId: `co_${i}`, name: `Co ${i}`, industry: 'x', trustScore: 50 }));
    const fakeFetcher = vi.fn(async (url) => {
      if (url.includes('nexha-business-directory')) return { companies: many, total: 25 };
      return { total: 0 };
    });
    const summary = await buildSummary({ tenantId: TENANT, hubUrl: 'http://h', fetcher: fakeFetcher });
    expect(summary.sections.directory.data.companies).toHaveLength(10);
    expect(summary.sections.directory.data.total).toBe(25);
  });

  it('builds the correct hub URL for each target', async () => {
    const seenUrls = [];
    const fakeFetcher = vi.fn(async (url) => { seenUrls.push(url); return { total: 0 }; });
    await buildSummary({ tenantId: TENANT, hubUrl: 'http://h', fetcher: fakeFetcher });
    expect(seenUrls.length).toBe(FANOUT_TARGETS.length);
    for (const url of seenUrls) {
      expect(url.startsWith('http://h/api/')).toBe(true);
      expect(url).toContain(`tenantId=${encodeURIComponent(TENANT)}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// buildSummary — failure isolation
// ───────────────────────────────────────���─────────────────────────

describe('buildSummary — failure isolation', () => {
  it('one failing source does not block the others', async () => {
    const fakeFetcher = vi.fn(async (url) => {
      if (url.includes('nexha-business-directory')) throw new Error('connection refused');
      return { total: 0 };
    });
    const summary = await buildSummary({ tenantId: TENANT, hubUrl: 'http://h', fetcher: fakeFetcher });
    expect(summary.summary.okCount).toBe(FANOUT_TARGETS.length - 1);
    expect(summary.summary.errorCount).toBe(1);
    expect(summary.summary.health).toBe('partial');
    expect(summary.errors.directory.message).toBe('connection refused');
    expect(summary.sections.directory.error).toBeDefined();
    expect(summary.sections.directory.data).toBeUndefined();
  });

  it('all-upstream failure yields health=degraded', async () => {
    const fakeFetcher = vi.fn(async () => { throw new Error('down'); });
    const summary = await buildSummary({ tenantId: TENANT, hubUrl: 'http://h', fetcher: fakeFetcher });
    expect(summary.summary.okCount).toBe(0);
    expect(summary.summary.errorCount).toBe(FANOUT_TARGETS.length);
    expect(summary.summary.health).toBe('degraded');
    expect(summary.errors).toBeDefined();
    expect(Object.keys(summary.errors)).toHaveLength(FANOUT_TARGETS.length);
  });

  it('timeout is reported as TIMEOUT code', async () => {
    const fakeFetcher = vi.fn(async (url) => {
      if (url.includes('nexha-business-directory')) {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      }
      return { total: 0 };
    });
    const summary = await buildSummary({ tenantId: TENANT, hubUrl: 'http://h', fetcher: fakeFetcher, timeoutMs: 50 });
    expect(summary.errors.directory.code).toBe('TIMEOUT');
  });
});

// ─────────────────────────────────────────────────────────────────
// buildSummary — input validation
// ─────────────────────────────────────────────────────────────────

describe('buildSummary — input validation', () => {
  it('rejects missing tenantId', async () => {
    await expect(buildSummary({ hubUrl: 'http://h' })).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
  });

  it('accepts empty string tenantId as missing', async () => {
    await expect(buildSummary({ tenantId: '', hubUrl: 'http://h' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─────────────────────────────────────────────────────────────────
// checkUpstreams
// ─────────────────────────────────────────────────────────────────

describe('checkUpstreams', () => {
  it('returns one entry per configured source', async () => {
    const fakeFetcher = vi.fn(async () => ({}));
    const health = await checkUpstreams({ hubUrl: 'http://h', fetcher: fakeFetcher });
    expect(Object.keys(health.upstreams)).toHaveLength(FANOUT_TARGETS.length);
    expect(health.summary.total).toBe(FANOUT_TARGETS.length);
    expect(health.summary.up).toBe(FANOUT_TARGETS.length);
    expect(health.summary.down).toBe(0);
  });

  it('marks failed upstreams as ok=false', async () => {
    const fakeFetcher = vi.fn(async (url) => {
      if (url.includes('nexha-business-directory')) throw new Error('boom');
      return {};
    });
    const health = await checkUpstreams({ hubUrl: 'http://h', fetcher: fakeFetcher });
    expect(health.upstreams.directory.ok).toBe(false);
    expect(health.upstreams.directory.error).toBe('boom');
    expect(health.summary.down).toBe(1);
    expect(health.summary.up).toBe(FANOUT_TARGETS.length - 1);
  });
});

// ─────────────────────────────────────────────────────────────────
// FANOUT_TARGETS shape
// ────────────────────────────────────────────────���────────────────

describe('FANOUT_TARGETS', () => {
  it('has unique keys', () => {
    const keys = FANOUT_TARGETS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every target has a service, path, method, transform', () => {
    for (const t of FANOUT_TARGETS) {
      expect(t.key).toBeTypeOf('string');
      expect(t.label).toBeTypeOf('string');
      expect(t.service).toBeTypeOf('string');
      expect(t.path).toBeTypeOf('string');
      expect(t.path).toContain(':tenantId');
      expect(['GET', 'POST']).toContain(t.method);
      expect(t.transform).toBeTypeOf('function');
    }
  });

  it('every service is one of the known ADR-0010 services', () => {
    const known = new Set([
      'nexha-business-directory',
      'nexha-acp-messaging',
      'nexha-mission-planner',
      'nexha-partner-graph',
      'nexha-commerce-runtime',
      'sutar-tenant-instances',
      'industry-tenant-instances',
      'nexha-provisioning-engine',
      'nexha-hooks-sdk',
    ]);
    for (const t of FANOUT_TARGETS) {
      expect(known.has(t.service)).toBe(true);
    }
  });
});