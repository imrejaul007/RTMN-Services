import { NexhaConnection } from '/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/core/unified-fabric/src/connections/nexha.js';

// Install mock BEFORE calling the connection
const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async (url, init) => {
  calls++;
  console.log('mock fetch called, calls:', calls, 'url:', url);
  return {
    ok: true,
    status: 200,
    json: async () => ({ items: [{ id: 'x' }], total: 1 }),
  };
};

const c = new NexhaConnection({});
console.log('about to call searchCompanies...');
const res = await c.searchCompanies({ q: 'test' });
console.log('result:', JSON.stringify(res), 'calls:', calls);

globalThis.fetch = originalFetch;
