/**
 * Minimal smoke test for inference-gateway providers (CJS).
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

process.env.NODE_ENV = 'test';

const { callRealProvider } = require('../src/providers.js');
const { getProviderKey, clearCache, getCacheState } = require('../src/secrets-client.js');

describe('providers.js', () => {
  it('openai provider returns stub result when no key', async () => {
    const result = await callRealProvider('openai', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello world' }],
    });
    assert.equal(result.provider, 'openai');
    assert.equal(result.model, 'gpt-4o-mini');
    assert.ok(result.text.includes('[openai'));
    assert.equal(result.costUsd, 0);
    assert.ok(result.tokensIn > 0);
    assert.ok(result.latencyMs >= 0);
  });

  it('anthropic provider returns stub result', async () => {
    const result = await callRealProvider('anthropic', {
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    assert.equal(result.provider, 'anthropic');
    assert.ok(result.text.includes('[anthropic'));
  });

  it('google provider returns stub result', async () => {
    const result = await callRealProvider('google', {
      model: 'gemini-1.5-pro',
      messages: [{ role: 'user', content: 'Test' }],
    });
    assert.equal(result.provider, 'google');
  });

  it('mistral provider returns stub result', async () => {
    const result = await callRealProvider('mistral', {
      model: 'mistral-large',
      messages: [{ role: 'user', content: 'Test' }],
    });
    assert.equal(result.provider, 'mistral');
  });

  it('unknown provider throws', async () => {
    await assert.rejects(() => callRealProvider('unknown', {
      model: 'unknown-model',
      messages: [{ role: 'user', content: 'Test' }],
    }), /Unknown provider/);
  });
});

describe('secrets-client.js', () => {
  it('getProviderKey returns null (no Secrets Manager)', async () => {
    const key = await getProviderKey('openai');
    assert.equal(key, null);
  });

  it('clearCache works', () => {
    clearCache();
    const state = getCacheState();
    assert.equal(state.entries, 0);
  });

  it('getCacheState returns correct shape', () => {
    const state = getCacheState();
    assert.ok('entries' in state);
    assert.ok(Array.isArray(state.cached));
  });
});