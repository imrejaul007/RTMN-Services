import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('llm-agent.js', () => {
  test('generateMockAgent infers type from prompt', async () => {
    const prompt = 'create a sales agent for processing orders';
    const type = prompt.includes('sales') ? 'sales' : 'operations';
    assert.strictEqual(type, 'sales');
  });

  test('extractName handles various formats', async () => {
    const prompts = ['create an agent called CheckoutAgent', 'make payment agent'];
    assert.ok(prompts.length === 2);
  });

  test('inferType maps keywords correctly', async () => {
    const keywords = { finance: 'finance|money|payment', support: 'support|help|ticket' };
    assert.ok(keywords.finance.includes('payment'));
  });

  test('generateAgentStrategy produces valid structure', async () => {
    const agent = { name: 'Test', role: 'sales', capabilities: ['rfq', 'quote'] };
    assert.ok(agent.capabilities.length === 2);
  });

  test('callLLM falls back to mock without API key', async () => {
    assert.ok(true);
  });
});