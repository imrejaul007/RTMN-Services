/**
 * Scorer: numeric-tolerance
 *
 * For numeric answers. Both `output` and `expectedOutput` are coerced to
 * numbers; if the absolute difference is <= tolerance, the test passes.
 *
 * Looks for `expectedTolerance` on the test case (default 0.01).
 * The output may be a raw number, or a number embedded in prose — we
 * try to extract the first number from the string.
 *
 * Score is 1 if within tolerance, 0 otherwise. No partial credit: either
 * the number is right or it isn't.
 *
 * @param {{output: string, testCase: object}} ctx
 * @returns {{score: number, passed: boolean, details: object}}
 */
function extractNumber(s) {
  if (typeof s === 'number') return s;
  if (typeof s !== 'string') return null;
  const m = s.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  return m ? parseFloat(m[0]) : null;
}

function score({ output, testCase }) {
  const expected = extractNumber(testCase.expectedOutput);
  const actual = extractNumber(output);
  const tolerance = typeof testCase.expectedTolerance === 'number' ? testCase.expectedTolerance : 0.01;

  if (expected === null) {
    return {
      score: 0,
      passed: false,
      details: { scorer: 'numeric-tolerance', reason: 'expectedOutput is not numeric' }
    };
  }
  if (actual === null) {
    return {
      score: 0,
      passed: false,
      details: {
        scorer: 'numeric-tolerance',
        reason: 'could not extract number from output',
        rawOutput: String(output).slice(0, 200)
      }
    };
  }
  const diff = Math.abs(actual - expected);
  const passed = diff <= tolerance;
  return {
    score: passed ? 1 : 0,
    passed,
    details: {
      scorer: 'numeric-tolerance',
      expected,
      actual,
      difference: diff,
      tolerance,
      withinTolerance: passed
    }
  };
}

module.exports = {
  type: 'numeric-tolerance',
  description: 'Extracts a number from output and checks it is within ±expectedTolerance of expectedOutput (default 0.01).',
  score
};
