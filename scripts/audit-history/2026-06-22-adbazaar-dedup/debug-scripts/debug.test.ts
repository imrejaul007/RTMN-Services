const { nexha } = await import('../../src/services/hojaiClient');

test('debug headers', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    console.log('init.headers:', JSON.stringify(init.headers));
    return { ok: true, status: 200, json: async () => ({ success: true, data: { tenantId: 't' } }) };
  };
  await nexha.tenantSummary.build('t_x', { headers: { authorization: 'Bearer abc', 'x-internal-token': 'tok-123' } });
  globalThis.fetch = orig;
});
