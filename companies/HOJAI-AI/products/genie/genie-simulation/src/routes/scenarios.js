/**
 * Scenario Routes — run, list, compare simulations
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { llmComplete, isLLMAvailable } = require('@rtmn/shared/lib/llm');

module.exports = function({ scenariosStore }) {
  const router = express.Router();

  /**
   * POST /scenarios/run/:userId
   * body: { title, scenario, variables: {}, useAI?: bool }
   */
  router.post('/run/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { title, scenario, variables = {}, useAI = true } = req.body || {};

      if (!title || title.trim().length < 3) {
        return res.status(400).json({ success: false, error: 'title required (min 3 chars)' });
      }
      if (!scenario) {
        return res.status(400).json({ success: false, error: 'scenario type required (move, job, quit, buy, etc.)' });
      }

      let result;
      let aiUsed = false;

      if (useAI && await isLLMAvailable()) {
        try {
          result = await generateWithAI({ title, scenario, variables });
          aiUsed = true;
        } catch (e) {
          console.warn('[simulation] LLM failed, using template:', e.message);
        }
      }

      if (!result) {
        result = generateWithTemplate({ scenario, variables });
      }

      const sim = {
        id: `sim-${uuidv4().slice(0, 8)}`,
        userId,
        title: title.trim(),
        scenario,
        variables,
        outcomes: result.outcomes,
        pros: result.pros,
        cons: result.cons,
        recommendation: result.recommendation,
        aiUsed,
        createdAt: new Date().toISOString(),
      };
      scenariosStore.set(sim.id, sim);

      res.status(201).json({ success: true, data: sim });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /scenarios/list/:userId
   */
  router.get('/list/:userId', (req, res) => {
    const { userId } = req.params;
    const list = Array.from(scenariosStore.entries())
      .filter(([_, v]) => v.userId === userId)
      .map(([k, v]) => ({ id: k, ...v }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({ success: true, total: list.length, scenarios: list });
  });

  /**
   * GET /scenarios/get/:scenarioId
   */
  router.get('/get/:scenarioId', (req, res) => {
    const { scenarioId } = req.params;
    const sim = scenariosStore.get(scenarioId);
    if (!sim) return res.status(404).json({ success: false, error: 'Scenario not found' });
    res.json({ success: true, data: sim });
  });

  /**
   * POST /scenarios/compare/:userId
   * body: { scenarioIds: [string, string, string?] }
   */
  router.post('/compare/:userId', (req, res) => {
    const { scenarioIds } = req.body || {};
    if (!Array.isArray(scenarioIds) || scenarioIds.length < 2 || scenarioIds.length > 3) {
      return res.status(400).json({ success: false, error: 'scenarioIds must be array of 2-3 ids' });
    }

    const scenarios = scenarioIds.map(id => scenariosStore.get(id)).filter(Boolean);
    if (scenarios.length !== scenarioIds.length) {
      return res.status(404).json({ success: false, error: 'One or more scenarios not found' });
    }

    // Build a comparison matrix
    const comparison = {
      titles: scenarios.map(s => s.title),
      dimensions: ['financial', 'lifestyle', 'career', 'risk', 'relationship'],
      matrix: scenarios.map(s => ({
        scenarioId: s.id,
        title: s.title,
        scores: scoreDimensions(s),
      })),
      pros: scenarios.map(s => ({ title: s.title, pros: s.pros })),
      cons: scenarios.map(s => ({ title: s.title, cons: s.cons })),
      recommendations: scenarios.map(s => s.recommendation),
    };

    res.json({ success: true, data: comparison });
  });

  return router;
};

async function generateWithAI({ title, scenario, variables }) {
  const prompt = `User scenario: "${title}" (type: ${scenario}). Variables: ${JSON.stringify(variables)}.
Generate a thoughtful what-if analysis. Output JSON:
{
  "outcomes": { "financial": "...", "lifestyle": "...", "career": "...", "risk": "...", "relationship": "..." },
  "pros": ["...", "..."],
  "cons": ["...", "..."],
  "recommendation": "2-3 sentence suggestion"
}`;
  const r = await llmComplete({
    messages: [
      {
        role: 'system',
        content: 'You are a thoughtful life-decision analyst. Be balanced, specific, and avoid clichés. Output strictly valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    model: 'claude-3-haiku',
    maxTokens: 800,
    temperature: 0.6,
    metadata: { feature: 'personal-simulation', scenario },
  });

  if (!r.ok || !r.text) throw new Error('LLM did not return text');

  const parsed = parseJson(r.text);
  if (!parsed?.outcomes) throw new Error('LLM response missing outcomes');

  return {
    outcomes: parsed.outcomes,
    pros: parsed.pros || [],
    cons: parsed.cons || [],
    recommendation: parsed.recommendation || '',
  };
}

function generateWithTemplate({ scenario, variables }) {
  const tpl = scenarioTemplates[scenario] || scenarioTemplates.default;
  const outcomes = {};

  for (const dim of tpl.dimensions) {
    outcomes[dim] = tpl.fill(dim, variables);
  }

  return {
    outcomes,
    pros: tpl.pros(variables),
    cons: tpl.cons(variables),
    recommendation: tpl.recommendation(variables),
  };
}

function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (m) try { return JSON.parse(m[1]); } catch {}
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1) try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  return null;
}

function scoreDimensions(sim) {
  // Simple heuristic: count words in each dimension and map to 1-10 score
  const dims = ['financial', 'lifestyle', 'career', 'risk', 'relationship'];
  const scores = {};
  for (const d of dims) {
    const txt = sim.outcomes?.[d] || '';
    // Longer/more nuanced text → higher "fidelity" score, but we want to reflect positivity
    // Use a simple proxy: pros - cons polarity
    const wordCount = txt.split(/\s+/).length;
    scores[d] = Math.min(10, Math.max(1, Math.round(wordCount / 8)));
  }
  // Boost dimensions that are mostly in pros
  const allPros = (sim.pros || []).join(' ').toLowerCase();
  for (const d of ['financial', 'career', 'lifestyle']) {
    if (allPros.includes(d)) scores[d] = Math.min(10, scores[d] + 2);
  }
  const allCons = (sim.cons || []).join(' ').toLowerCase();
  for (const d of ['financial', 'career', 'risk']) {
    if (allCons.includes(d)) scores[d] = Math.max(1, scores[d] - 1);
  }
  return scores;
}

// Template-based scenario generators
const scenarioTemplates = {
  move: {
    dimensions: ['financial', 'lifestyle', 'career', 'risk'],
    fill: (dim, v) => {
      const loc = v.location || 'a new city';
      switch (dim) {
        case 'financial':
          return `Moving to ${loc} will likely involve setup costs (1-3 months of salary), but long-term you may benefit from a stronger currency or higher salary band. Build a 6-month emergency fund before you go.`;
        case 'lifestyle':
          return `${loc} offers a different daily rhythm. Expect 3-6 months to build new routines, find your favorite spots, and form friendships.`;
        case 'career':
          return `Your network will reset in ${loc}. Plan for 6-12 months to rebuild professional connections, but local market access can accelerate specific career paths.`;
        case 'risk':
          return `Top risks: distance from support network, currency fluctuation, visa dependency, and reverse culture shock if you return.`;
        default: return '';
      }
    },
    pros: (v) => [
      `New experiences in ${v.location || 'the new city'}`,
      'Potential salary growth',
      'Personal reinvention opportunity',
    ],
    cons: () => [
      'Distance from existing support network',
      'Setup costs and time',
      'Risk of feeling isolated initially',
    ],
    recommendation: (v) => `A move to ${v.location || 'a new city'} is a high-variance play. Go if you have a clear role or runway, and plan a 12-month check-in to decide whether to stay or move on.`,
  },
  job: {
    dimensions: ['financial', 'career', 'lifestyle', 'risk'],
    fill: (dim, v) => {
      const company = v.company || 'the new company';
      switch (dim) {
        case 'financial':
          return `Compare total comp at ${company} vs. current: salary, equity, bonus, benefits. Don't ignore health insurance, retirement match, and PTO.`;
        case 'career':
          return `Consider: scope of role, learning opportunities, manager quality, and brand-name value of ${company} on your resume.`;
        case 'lifestyle':
          return `Commute, work hours, remote flexibility, and on-call expectations all shape your day-to-day.`;
        case 'risk':
          return `Job security, layoff history, and culture fit matter. Talk to current and former employees.`;
        default: return '';
      }
    },
    pros: (v) => [`Higher comp at ${v.company || 'new role'}`, 'New challenges and learning', 'Career trajectory shift'],
    cons: () => ['Onboarding ramp (3-6 months)', 'Loss of internal momentum', 'New manager dynamics'],
    recommendation: (v) => `If the role at ${v.company || 'the new company'} represents >25% growth in scope or comp AND aligns with 1+ long-term goal, take it. If neither, stay.`,
  },
  quit: {
    dimensions: ['financial', 'career', 'lifestyle', 'risk'],
    fill: (dim, v) => {
      switch (dim) {
        case 'financial':
          return `You need 6-12 months of expenses saved to safely quit. Calculate your monthly burn and divide your savings by it.`;
        case 'career':
          return `Quitting to ${v.next_step || 'pursue something else'} is only valuable if the alternative has clearer upside than your current trajectory.`;
        case 'lifestyle':
          return `Quitting often feels great for 2-4 weeks, then reality sets in. Build structure: gym, social commitments, deadlines.`;
        case 'risk':
          return `Top risk: identity loss when you go from "person with a job" to "person figuring it out". Manage the narrative.`;
        default: return '';
      }
    },
    pros: () => ['Freedom', 'Time to think', 'Energy for new pursuits'],
    cons: () => ['Loss of structure', 'Income gap', 'Re-entry challenge'],
    recommendation: (v) => `Quitting to ${v.next_step || 'something new'} is justified if you have 12+ months of runway AND a clear next milestone (not just "I want to figure it out").`,
  },
  default: {
    dimensions: ['financial', 'lifestyle', 'career', 'risk'],
    fill: (dim) => {
      switch (dim) {
        case 'financial': return 'Consider both short-term costs and long-term financial impact.';
        case 'lifestyle': return 'Think about your daily life and how this changes it.';
        case 'career': return 'Weigh how this affects your long-term professional path.';
        case 'risk': return 'Identify the top 3 things that could go wrong, and how you would respond.';
        default: return '';
      }
    },
    pros: () => ['Potential upside', 'New opportunity', 'Personal growth'],
    cons: () => ['Unknown outcomes', 'Adjustment period', 'Risk of regret'],
    recommendation: () => 'A balanced decision needs 6+ weeks of thinking, talking to people who have done it, and a clear "if X then Y" fallback plan.',
  },
};