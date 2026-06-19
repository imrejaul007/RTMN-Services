/**
 * Scorer: levenshtein-similarity
 *
 * Computes 1 - editDistance(a, b) / max(|a|, |b|).
 *
 * Robust against single-character typos, extra spaces, and minor formatting
 * drift. Use this when exact-match is too strict but you still expect the
 * output to look "the same" as the expected answer.
 *
 * Score ∈ [0, 1]. Passes at >= 0.8 by default.
 *
 * @param {{output: string, testCase: object}} ctx
 * @returns {{score: number, passed: boolean, details: object}}
 */
function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  // Two-row DP to keep memory at O(min(a,b)).
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost      // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function score({ output, testCase }) {
  const expected = testCase.expectedOutput;
  if (expected === undefined || expected === null) {
    return {
      score: 0,
      passed: false,
      details: { scorer: 'levenshtein-similarity', reason: 'no expectedOutput' }
    };
  }
  const a = String(output || '');
  const b = String(expected);
  const dist = editDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  const sim = maxLen === 0 ? 1 : 1 - dist / maxLen;
  const passed = sim >= 0.8;
  return {
    score: sim,
    passed,
    details: {
      scorer: 'levenshtein-similarity',
      editDistance: dist,
      maxLen,
      similarity: sim,
      threshold: 0.8
    }
  };
}

module.exports = {
  type: 'levenshtein-similarity',
  description: '1 - editDistance(output, expectedOutput) / max(len). Passes at >= 0.8.',
  score
};
