/**
 * Scorer: substring-match
 *
 * Passes iff every required substring in `expectedContains` appears somewhere
 * in the output (case-insensitive). Multiple substrings are AND-combined.
 *
 * score = matchedCount / totalSubstrings (1.0 if no substrings defined).
 *
 * @param {{output: string, testCase: object}} ctx
 * @returns {{score: number, passed: boolean, details: object}}
 */
function score({ output, testCase }) {
  const needles = Array.isArray(testCase.expectedContains) ? testCase.expectedContains : [];
  const haystack = (output || '').toLowerCase();
  if (needles.length === 0) {
    return {
      score: 1,
      passed: true,
      details: { scorer: 'substring-match', note: 'no expectedContains provided; vacuously true' }
    };
  }
  const matched = needles.filter(n => haystack.includes(String(n).toLowerCase()));
  const scoreVal = matched.length / needles.length;
  const passed = matched.length === needles.length;
  return {
    score: scoreVal,
    passed,
    details: {
      scorer: 'substring-match',
      required: needles,
      matched,
      missing: needles.filter(n => !matched.includes(n))
    }
  };
}

module.exports = {
  type: 'substring-match',
  description: 'Output must contain every substring in expectedContains (case-insensitive). Score is the fraction matched.',
  score
};
