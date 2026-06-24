const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  mockSearch, extractKeyClaim, dedupeClaims, synthesizeText, formatCitation
} = require('../index.js');

test('mockSearch returns requested number of results', () => {
  const r = mockSearch('AI agents', 5, ['web']);
  assert.equal(r.length, 5);
});

test('mockSearch caps results at 10', () => {
  const r = mockSearch('AI', 100, ['web']);
  assert.equal(r.length, 10);
});

test('mockSearch result includes query in title', () => {
  const r = mockSearch('climate change', 3, ['web']);
  assert.ok(r[0].title.includes('climate change'));
});

test('extractKeyClaim takes first sentence', () => {
  const claim = extractKeyClaim({
    snippet: 'This is the first sentence. This is the second. And third.',
    title: 'Test'
  });
  assert.equal(claim.text, 'This is the first sentence');
  assert.equal(claim.source, 'Test');
});

test('extractKeyClaim handles missing snippet', () => {
  const claim = extractKeyClaim({ title: 'No snippet here' });
  assert.equal(claim.text, '');
});

test('dedupeClaims removes near-duplicates', () => {
  const claims = [
    { text: 'AI is transforming industries worldwide. New data shows acceleration.', source: 'a' },
    { text: 'AI is transforming industries worldwide. New data shows acceleration in 2026.', source: 'b' },
    { text: 'Quantum computing is emerging', source: 'c' }
  ];
  const unique = dedupeClaims(claims);
  assert.equal(unique.length, 2);
});

test('synthesizeText produces structured output', () => {
  const text = synthesizeText('AI trends', [
    { text: 'AI adoption is growing 40% annually', source: 'a' },
    { text: 'Enterprise spending on AI reached $50B', source: 'b' }
  ], 100);
  assert.ok(text.includes('AI trends'));
  assert.ok(text.includes('AI adoption'));
  assert.ok(text.includes('Enterprise spending'));
});

test('synthesizeText respects maxWords limit', () => {
  const claims = Array.from({ length: 20 }, (_, i) => ({
    text: `This is claim number ${i + 1} which contains several words to test truncation`,
    source: `s${i}`
  }));
  const text = synthesizeText('test', claims, 30);
  const wc = text.split(/\s+/).length;
  assert.ok(wc <= 31, `should respect 30 word limit, got ${wc}`);
});

test('synthesizeText handles empty claims', () => {
  const text = synthesizeText('nothing here', [], 100);
  assert.ok(text.includes('nothing here'));
});

test('formatCitation — APA style', () => {
  const c = formatCitation({
    author: 'Smith, J.',
    publishedAt: '2024-03-15',
    title: 'AI in Healthcare',
    url: 'https://example.com/ai-health'
  }, 'apa', 1);
  assert.equal(c, '(1) Smith, J. (2024). AI in Healthcare. https://example.com/ai-health');
});

test('formatCitation — MLA style', () => {
  const c = formatCitation({
    author: 'Smith',
    publishedAt: '2024-03-15',
    title: 'AI in Healthcare',
    url: 'https://example.com/ai-health'
  }, 'mla', 1);
  assert.ok(c.includes('Smith'));
  assert.ok(c.includes('"AI in Healthcare."'));
  assert.ok(c.includes('2024'));
});

test('formatCitation — Chicago style', () => {
  const c = formatCitation({
    author: 'Smith',
    publishedAt: '2024-03-15',
    title: 'AI in Healthcare',
    url: 'https://example.com/ai-health'
  }, 'chicago', 1);
  assert.ok(c.includes('Chicago') === false); // No 'Chicago' word, just format
  assert.ok(c.includes('"AI in Healthcare."'));
});

test('formatCitation handles missing fields gracefully', () => {
  const c = formatCitation({ url: 'https://example.com' }, 'apa', 1);
  assert.ok(c.includes('Unknown'));
  assert.ok(c.includes('n.d.') || c.includes('Untitled'));
});

test('formatCitation numbers sequentially starting at 1', () => {
  const c1 = formatCitation({ author: 'A', title: 'T1', url: 'u' }, 'apa', 1);
  const c5 = formatCitation({ author: 'A', title: 'T5', url: 'u' }, 'apa', 5);
  assert.ok(c1.startsWith('(1)'));
  assert.ok(c5.startsWith('(5)'));
});