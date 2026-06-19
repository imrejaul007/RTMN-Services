/**
 * Scorer: json-schema-match
 *
 * Parses the output as JSON and validates it against `expectedJsonSchema`.
 * The schema format is a minimal subset:
 *   {
 *     type: 'object' | 'array' | 'string' | 'number' | 'boolean',
 *     required: ['field1', 'field2'],      // for objects
 *     properties: { field1: { type: 'string' } },
 *     items: { type: 'number' },           // for arrays
 *     enum: ['a', 'b'],                    // exact-match values
 *     pattern: '^[A-Z]+$'                  // regex for strings
 *   }
 *
 * Score 1.0 if every declared rule passes, 0.0 if the JSON is invalid or
 * any rule fails. The details object lists every check that was run.
 *
 * @param {{output: string, testCase: object}} ctx
 * @returns {{score: number, passed: boolean, details: object}}
 */
function validateValue(value, schema, path, errors) {
  if (!schema || typeof schema !== 'object') return; // no rule

  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    if (schema.type !== actualType) {
      errors.push({ path, expectedType: schema.type, actualType, reason: 'type-mismatch' });
      return;
    }
  }

  if (schema.enum && Array.isArray(schema.enum)) {
    if (!schema.enum.includes(value)) {
      errors.push({ path, reason: 'enum-mismatch', allowed: schema.enum, actual: value });
    }
  }

  if (schema.pattern && typeof value === 'string') {
    try {
      const re = new RegExp(schema.pattern);
      if (!re.test(value)) errors.push({ path, reason: 'pattern-mismatch', pattern: schema.pattern });
    } catch (e) {
      errors.push({ path, reason: 'invalid-pattern', pattern: schema.pattern });
    }
  }

  if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in value)) errors.push({ path: path + '.' + key, reason: 'missing-required' });
      }
    }
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [k, sub] of Object.entries(schema.properties)) {
        if (k in value) validateValue(value[k], sub, path + '.' + k, errors);
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    value.forEach((item, i) => validateValue(item, schema.items, path + '[' + i + ']', errors));
  }
}

function score({ output, testCase }) {
  const schema = testCase.expectedJsonSchema;
  if (!schema) {
    return {
      score: 1,
      passed: true,
      details: { scorer: 'json-schema-match', note: 'no expectedJsonSchema provided; vacuously true' }
    };
  }

  // Try to locate JSON in the output (models sometimes wrap it in prose).
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(output);
  } catch (e1) {
    // Try to extract the first {...} or [...] block.
    const m = output && output.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) {
      try {
        parsed = JSON.parse(m[1]);
      } catch (e2) {
        parseError = e2.message;
      }
    } else {
      parseError = e1.message;
    }
  }

  if (parseError || parsed === null) {
    return {
      score: 0,
      passed: false,
      details: { scorer: 'json-schema-match', parseError: parseError || 'unable to extract JSON' }
    };
  }

  const errors = [];
  validateValue(parsed, schema, '$', errors);
  const passed = errors.length === 0;
  return {
    score: passed ? 1 : 0,
    passed,
    details: {
      scorer: 'json-schema-match',
      parsed,
      errors
    }
  };
}

module.exports = {
  type: 'json-schema-match',
  description: 'Parse output as JSON and validate against expectedJsonSchema (type / required / properties / enum / pattern / items).',
  score
};
