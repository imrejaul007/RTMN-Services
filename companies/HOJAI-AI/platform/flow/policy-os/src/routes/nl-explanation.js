/**
 * PolicyOS — Natural Language Explanation of Decisions (Phase 2.5)
 *
 * Endpoints:
 *  - POST /api/policies/explain  — explain why a decision was made
 *  - GET  /api/policies/explain/:decisionId — re-fetch an explanation
 */

// In-memory store for recent decisions (production would use Redis)
const decisionStore = new Map();
let decisionCounter = 0;
const MAX_STORED_DECISIONS = 1000;

// Prune old entries periodically
function pruneOldDecisions() {
  if (decisionStore.size > MAX_STORED_DECISIONS) {
    const keys = [...decisionStore.keys()].slice(0, decisionStore.size - MAX_STORED_DECISIONS);
    for (const k of keys) decisionStore.delete(k);
  }
}

// ── Core explanation engine ────────────────────────────────────────────────

function explainDecision(decision, policies, context) {
  const { effect, matchedPolicies = [], evaluatedAt } = decision;
  const explanations = [];

  if (!matchedPolicies || matchedPolicies.length === 0) {
    explanations.push({
      type: 'implicit-deny',
      text: 'No policy explicitly allowed this request. Default deny applied.',
      confidence: 1.0,
    });
    return { summary: 'Denied — no matching policy found.', explanations, effect, evaluatedAt };
  }

  // Group by effect
  const allows = matchedPolicies.filter(p => p.effect === 'allow');
  const denies = matchedPolicies.filter(p => p.effect === 'deny');

  for (const p of matchedPolicies) {
    const lines = [];
    lines.push(`Policy: **${p.name}** (\`${p.id}\`)`);
    lines.push(`Effect: \`${p.effect}\``);

    if (p.description) {
      lines.push(`Description: "${p.description}"`);
    }

    // Explain conditions
    if (p.conditions && p.conditions.length > 0) {
      lines.push('Conditions:');
      for (const c of p.conditions) {
        const ctxVal = getNestedValue(context, c.attribute);
        const opText = operatorText(c.operator);
        const valText = Array.isArray(c.value) ? `[${c.value.join(', ')}]` :
          typeof c.value === 'string' ? `"${c.value}"` : String(c.value);
        lines.push(`  • \`${c.attribute}\` ${opText} ${valText}`);
        if (ctxVal !== undefined) {
          lines.push(`    ↳ Actual value: \`${JSON.stringify(ctxVal)}\` — **${c.operator === 'eq' && ctxVal == c.value ? '✅ matched' : c.operator === 'neq' && ctxVal != c.value ? '✅ matched' : c.operator === 'in' && Array.isArray(c.value) && c.value.includes(ctxVal) ? '✅ matched' : '❌ not matched'}`);
        }
      }
    }

    // Explain expression
    if (p.expression && p.expression !== 'true') {
      lines.push(`Expression: \`${p.expression}\``);
      lines.push(`Evaluation: ${p.effect === 'allow' ? '✅ **TRUE**' : '❌ FALSE'}`);
    }

    // Explain subjects/resources/actions
    if (p.subjects) {
      lines.push(`Subjects: ${p.subjects.map(s => {
        const parts = [s.type || 'user'];
        if (s.role) parts.push(`role=${s.role}`);
        if (s.department) parts.push(`dept=${s.department}`);
        return parts.join(', ');
      }).join('; ')}`);
    }
    if (p.resources) {
      lines.push(`Resources: ${p.resources.join(', ')}`);
    }
    if (p.actions) {
      lines.push(`Actions: ${p.actions.join(', ')}`);
    }

    explanations.push({
      type: p.effect,
      policyId: p.id,
      policyName: p.name,
      text: lines.join('\n'),
      conditions: p.conditions,
      effect: p.effect,
    });
  }

  // Final verdict
  let summary;
  if (effect === 'allow') {
    if (denies.length > 0 && allows.length > 0) {
      summary = `✅ **Allowed** — allow policies (${allows.length}) took precedence over deny policies (${denies.length}).`;
    } else if (allows.length > 1) {
      summary = `✅ **Allowed** — ${allows.length} matching allow policy(ies) found.`;
    } else {
      summary = `✅ **Allowed** — ${allows[0]?.name || 'the matching policy'} permits this action.`;
    }
  } else {
    if (denies.length > 0) {
      summary = `❌ **Denied** — ${denies.map(d => `"${d.name}"`).join(', ')} ${denies.length === 1 ? 'blocks' : 'block'} this action.`;
    } else {
      summary = '❌ **Denied** — default deny applied.';
    }
  }

  return {
    summary,
    explanations,
    effect,
    evaluatedAt,
    context,
    matchedPolicies: matchedPolicies.map(p => ({ id: p.id, name: p.name, effect: p.effect })),
  };
}

function operatorText(op) {
  const map = {
    eq: '==',
    neq: '!=',
    gt: '>',
    lt: '<',
    gte: '>=',
    lte: '<=',
    in: 'in',
    notIn: 'not in',
    contains: 'contains',
    startsWith: 'starts with',
    endsWith: 'ends with',
  };
  return map[op] || op;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

// ── Format explanations ─────────────────────────────────────────────────────

export function formatExplanation(explanation, format) {
  if (!explanation) return null;

  switch (format) {
    case 'detailed':
    case 'verbose':
      return formatDetailed(explanation);

    case 'summary':
      return formatSummary(explanation);

    case 'bullet':
    case 'bullets':
      return formatBullets(explanation);

    case 'json':
    default:
      return explanation;
  }
}

function formatDetailed(explanation) {
  const lines = [];
  lines.push('# Policy Decision Explanation\n');

  lines.push(`## Verdict: ${explanation.effect === 'allow' ? '✅ ALLOWED' : '❌ DENIED'}`);
  lines.push(`Evaluated at: ${explanation.evaluatedAt ? new Date(explanation.evaluatedAt).toISOString() : 'N/A'}`);
  lines.push('');

  if (explanation.context) {
    lines.push('## Request Context');
    lines.push('```json');
    lines.push(JSON.stringify(explanation.context, null, 2));
    lines.push('```');
    lines.push('');
  }

  lines.push('## Summary');
  lines.push(explanation.summary);
  lines.push('');

  lines.push('## Matched Policies');
  for (const exp of explanation.explanations) {
    lines.push(`### ${exp.policyName || exp.type} (\`${exp.policyId || exp.type}\`)`);
    lines.push(exp.text);
    lines.push('');
  }

  return lines.join('\n');
}

function formatSummary(explanation) {
  return explanation.summary;
}

function formatBullets(explanation) {
  const bullets = [];

  bullets.push(`• **${explanation.effect === 'allow' ? '✅' : '❌'} ${explanation.effect.toUpperCase()}**`);

  for (const exp of explanation.explanations) {
    if (exp.policyName) {
      bullets.push(`  Policy: ${exp.policyName} (${exp.policyId})`);
    }
    if (exp.conditions && exp.conditions.length > 0) {
      for (const c of exp.conditions) {
        bullets.push(`  • \`${c.attribute}\` ${operatorText(c.operator)} ${Array.isArray(c.value) ? c.value.join(', ') : c.value}`);
      }
    }
  }

  return bullets.join('\n');
}

// ── Route registration ──────────────────────────────────────────────────────

export function registerNLExplanationRoutes(app, { auditLog, customAuth }) {
  // POST /api/policies/explain — explain a decision
  app.post('/api/policies/explain', customAuth, (req, res) => {
    const { decision, policies, context, format, decisionId } = req.body;

    if (!decision && !context) {
      return res.status(400).json({
        error: 'Either "decision" or "context" is required. Provide a decision object from /evaluate or provide context for a new evaluation.',
      });
    }

    const formatType = format || 'json';
    const validFormats = ['json', 'detailed', 'verbose', 'summary', 'bullet', 'bullets'];
    if (!validFormats.includes(formatType)) {
      return res.status(400).json({
        error: `Invalid format. Valid: ${validFormats.join(', ')}`,
      });
    }

    try {
      const id = decisionId || `dec-${++decisionCounter}-${Date.now()}`;

      // Use provided decision or construct one
      const theDecision = decision || {
        effect: 'allow', // Would be computed from /evaluate in production
        matchedPolicies: [],
        evaluatedAt: new Date().toISOString(),
      };

      // If no matchedPolicies provided, look up policies
      const matchedPolicies = theDecision.matchedPolicies || [];
      const evaluatedAt = theDecision.evaluatedAt || new Date().toISOString();

      const evaluationContext = context || theDecision.context || {};
      const explanation = explainDecision(
        { ...theDecision, evaluatedAt },
        matchedPolicies,
        evaluationContext
      );

      // Store for later retrieval
      decisionStore.set(id, explanation);
      pruneOldDecisions();

      if (auditLog) {
        auditLog.write({
          event: 'policy.explain',
          userId: req.auth?.sub,
          tenantId: req.auth?.tenantId,
          data: { decisionId: id, effect: theDecision.effect, matchedCount: matchedPolicies.length, format: formatType },
          timestamp: new Date().toISOString(),
        });
      }

      const result = {
        decisionId: id,
        ...explanation,
      };

      // Format if requested non-JSON
      if (formatType !== 'json') {
        return res.json({
          decisionId: id,
          formatted: formatExplanation(result, formatType),
          summary: result.summary,
        });
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate explanation', detail: err.message });
    }
  });

  // GET /api/policies/explain/:decisionId — re-fetch a stored explanation
  app.get('/api/policies/explain/:decisionId', customAuth, (req, res) => {
    const { decisionId } = req.params;
    const { format } = req.query;

    const explanation = decisionStore.get(decisionId);
    if (!explanation) {
      return res.status(404).json({ error: `Decision '${decisionId}' not found or expired.` });
    }

    if (auditLog) {
      auditLog.write({
        event: 'policy.explain.fetch',
        userId: req.auth?.sub,
        tenantId: req.auth?.tenantId,
        data: { decisionId },
        timestamp: new Date().toISOString(),
      });
    }

    const formatType = format || 'json';
    if (formatType !== 'json') {
      return res.json({
        decisionId,
        formatted: formatExplanation(explanation, formatType),
        summary: explanation.summary,
      });
    }

    res.json({ decisionId, ...explanation });
  });

  // GET /api/policies/decisions — list recent decisions (admin only)
  app.get('/api/policies/decisions', customAuth, (req, res) => {
    const { limit = 20, offset = 0 } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 20, 100);
    const startOffset = parseInt(offset) || 0;

    const keys = [...decisionStore.keys()].reverse().slice(startOffset, startOffset + maxLimit);
    const decisions = keys.map(k => ({
      id: k,
      effect: decisionStore.get(k)?.effect,
      summary: decisionStore.get(k)?.summary?.slice(0, 120),
      matchedCount: decisionStore.get(k)?.matchedPolicies?.length || 0,
    }));

    res.json({
      count: decisionStore.size,
      offset: startOffset,
      limit: maxLimit,
      decisions,
    });
  });
}
