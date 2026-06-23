import { NexhaConnection } from '/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/core/unified-fabric/src/connections/nexha.js';

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  console.log('fetch called with:', url);
  console.log('init:', JSON.stringify(init));
  try {
    return {
      ok: true,
      status: 200,
      json: async () => ({ items: [{ id: 'x' }], total: 1 }),
    };
  } catch (e) {
    console.log('caught:', e.message);
    throw e;
  }
};

const c = new NexhaConnection({ logger: console });
try {
  const res = await c.searchCompanies({ q: 'test' });
  console.log('result:', JSON.stringify(res));
} catch (e) {
  console.log('outer error:', e.message, e.stack);
}

globalThis.fetch = originalFetch;
