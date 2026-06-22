/**
 * Scorer: token-overlap
 *
 * Tokenizes output and expectedOutput into word-ish tokens (lowercased,
 * punctuation stripped), then computes Jaccard similarity:
 *     |A ∩ B| / |A ∪ B|
 *
 * Score ∈ [0, 1]. Useful for open-ended generation where exact wording
 * varies but the topic/keywords should overlap.
 *
 * Returns 0 if expectedOutput is missing.
 *
 * @param {{output: string, testCase: object}} ctx
 * @returns {{score: number, passed: boolean, details: object}}
 */
function tokenize(s) {
  if (!s) return [];
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function score({ output, testCase }) {
  const expected = testCase.expectedOutput;
  if (!expected) {
    return {
      score: 0,
      passed: false,
      details: { scorer: 'token-overlap', reason: 'no expectedOutput to compare against' }
    };
  }
  const a = new Set(tokenize(output));
  const b = new Set(tokenize(expected));
  if (a.size === 0 && b.size === 0) {
    return { score: 1, passed: true, details: { scorer: 'token-overlap', note: 'both empty' } };
  }
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  const jaccard = union === 0 ? 0 : intersection / union;
  const passed = jaccard >= 0.5; // conventional threshold; tune as needed
  return {
    score: jaccard,
    passed,
    details: {
      scorer: 'token-overlap',
      tokensOutput: a.size,
      tokensExpected: b.size,
      intersection,
      union,
      jaccard,
      threshold: 0.5
    }
  };
}

module.exports = {
  type: 'token-overlap',
  description: 'Jaccard similarity over word tokens of output vs expectedOutput. Passes at >= 0.5.',
  score
};
