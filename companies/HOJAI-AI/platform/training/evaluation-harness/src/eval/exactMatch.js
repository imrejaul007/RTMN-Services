/**
 * Scorer: exact-match
 *
 * Passes iff the output string is exactly equal to the expected output
 * (after trimming whitespace). Useful for short factual answers, classification
 * labels, and deterministic commands.
 *
 * score = 1 if matched, 0 otherwise.
 *
 * @param {{output: string, testCase: object}} ctx
 * @returns {{score: number, passed: boolean, details: object}}
 */
function score({ output, testCase }) {
  const expected = (testCase.expectedOutput || '').trim();
  const actual = (output || '').trim();
  const matched = actual === expected;
  return {
    score: matched ? 1 : 0,
    passed: matched,
    details: {
      scorer: 'exact-match',
      expected,
      actual,
      caseSensitive: true
    }
  };
}

module.exports = {
  type: 'exact-match',
  description: 'Output string (trimmed) must exactly equal expectedOutput. Score 1 on match, 0 otherwise.',
  score
};
