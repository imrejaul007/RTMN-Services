/**
 * Scorer: substring-absence
 *
 * Passes iff NONE of the substrings in `expectedNotContains` appear in the
 * output (case-insensitive). Useful for catching hallucinated phrases,
 * forbidden tokens, or known failure modes.
 *
 * score = 1 if all absent, 0 if any present; fractional if some present.
 *
 * @param {{output: string, testCase: object}} ctx
 * @returns {{score: number, passed: boolean, details: object}}
 */
function score({ output, testCase }) {
  const forbidden = Array.isArray(testCase.expectedNotContains) ? testCase.expectedNotContains : [];
  const haystack = (output || '').toLowerCase();
  if (forbidden.length === 0) {
    return {
      score: 1,
      passed: true,
      details: { scorer: 'substring-absence', note: 'no expectedNotContains provided; vacuously true' }
    };
  }
  const present = forbidden.filter(n => haystack.includes(String(n).toLowerCase()));
  const scoreVal = 1 - present.length / forbidden.length;
  const passed = present.length === 0;
  return {
    score: scoreVal,
    passed,
    details: {
      scorer: 'substring-absence',
      forbidden,
      present,
      absent: forbidden.filter(n => !present.includes(n))
    }
  };
}

module.exports = {
  type: 'substring-absence',
  description: 'Output must NOT contain any substring in expectedNotContains (case-insensitive). Score is 1 minus the fraction present.',
  score
};
