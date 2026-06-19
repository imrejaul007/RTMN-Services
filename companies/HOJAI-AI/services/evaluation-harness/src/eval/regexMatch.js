/**
 * Scorer: regex-match
 *
 * Tests the output against `expectedRegex` (a string source for a RegExp).
 * The regex is compiled with the `m` flag so ^ and $ match line boundaries.
 *
 * Passes iff the regex matches at least once. Score is 1 on match, 0 otherwise.
 *
 * @param {{output: string, testCase: object}} ctx
 * @returns {{score: number, passed: boolean, details: object}}
 */
function score({ output, testCase }) {
  const pattern = testCase.expectedRegex;
  if (typeof pattern !== 'string' || pattern.length === 0) {
    return {
      score: 1,
      passed: true,
      details: { scorer: 'regex-match', note: 'no expectedRegex provided; vacuously true' }
    };
  }
  let re;
  try {
    re = new RegExp(pattern, 'm');
  } catch (e) {
    return {
      score: 0,
      passed: false,
      details: { scorer: 'regex-match', reason: 'invalid regex', pattern, error: e.message }
    };
  }
  const m = re.exec(String(output || ''));
  const passed = !!m;
  return {
    score: passed ? 1 : 0,
    passed,
    details: {
      scorer: 'regex-match',
      pattern,
      flags: 'm',
      matched: passed,
      matchText: passed ? m[0] : null
    }
  };
}

module.exports = {
  type: 'regex-match',
  description: 'Output must match expectedRegex (multiline flag). Score 1 on first match, 0 otherwise.',
  score
};
