/**
 * SUTAR OS — Founder OS
 *
 * AI-powered decision support for founders and executives.
 * Strategic analysis, competitive intelligence, and decision frameworks.
 *
 * Endpoints:
 *   POST /api/decisions          — Analyze a decision
 *   GET  /api/decisions         — List past decisions
 *   POST /api/strategies        — Generate strategic options
 *   GET  /api/competitive      — Competitive analysis
 *   POST /api/scenarios        — Run business scenarios
 *   GET  /api/frameworks       — Decision frameworks
 *   POST /api/advice           — Get AI advice
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());
setupSecurity(app, { serviceName: 'sutar-founder-os' });

const PORT = process.env.FOUNDER_PORT || 4260;

// ---------- In-Memory Stores ----------
const decisions = [];
const strategies = [];
const MAX_DECISIONS = 5000;
const MAX_STRATEGIES = 1000;

// ---------- Decision Analysis ----------
function analyzeDecision(params) {
  const id = uuidv4();
  const decision = {
    id,
    title: params.title,
    description: params.description,
    type: params.type || 'strategic', // strategic, operational, financial, personnel
    urgency: params.urgency || 'medium',
    options: params.options || [],
    criteria: params.criteria || [],
    stakeholders: params.stakeholders || [],
    timeline: params.timeline,
    riskAppetite: params.riskAppetite || 'balanced', // conservative, balanced, aggressive
    analysis: runDecisionAnalysis(params),
    recommendation: null,
    confidence: 0,
    createdAt: new Date().toISOString(),
    decidedBy: params.createdBy || null,
    decision: null,
    rationale: null,
  };

  // Generate recommendation
  decision.recommendation = generateRecommendation(decision.analysis, params.riskAppetite);
  decision.confidence = calculateConfidence(decision.analysis);
  decision.decision = decision.recommendation.choice;

  decisions.push(decision);
  while (decisions.length > MAX_DECISIONS) decisions.shift();
  return decision;
}

function runDecisionAnalysis(params) {
  const options = params.options || [];
  const criteria = params.criteria || [];

  if (options.length === 0) {
    return { error: 'No options provided' };
  }

  const scores = options.map((opt, i) => {
    let score = 50;
    const factors = [];

    for (const criterion of criteria) {
      const optValue = opt[criterion.field] || 0;
      const weight = criterion.weight || 1;
      const normalized = normalizeValue(optValue, criterion.min || 0, criterion.max || 100);
      const contribution = normalized * weight;
      score += contribution - 50;
      factors.push({ criterion: criterion.name, contribution: Math.round(contribution) });
    }

    // Apply risk adjustment
    if (params.riskAppetite === 'conservative') {
      score -= opt.risk * 0.3;
    } else if (params.riskAppetite === 'aggressive') {
      score += opt.upside * 0.2;
    }

    return {
      option: opt.name || opt.title || `Option ${i + 1}`,
      score: Math.round(Math.max(0, Math.min(100, score))),
      factors,
      risk: opt.risk || 0,
      upside: opt.upside || 0,
      timeline: opt.timeline || 'medium',
    };
  });

  scores.sort((a, b) => b.score - a.score);

  return {
    options: scores,
    winner: scores[0]?.option,
    runnerUp: scores[1]?.option,
    margin: scores.length > 1 ? scores[0].score - scores[1].score : 0,
    consensus: calculateConsensus(scores),
  };
}

function normalizeValue(value, min, max) {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function calculateConsensus(scores) {
  if (scores.length < 2) return 'unanimous';
  const spread = scores[0].score - scores[scores.length - 1].score;
  if (spread > 30) return 'clear_winner';
  if (spread > 10) return 'contested';
  return 'no_consensus';
}

function generateRecommendation(analysis, riskAppetite) {
  const winner = analysis.options?.[0];
  if (!winner) return { choice: null, reason: 'No options analyzed' };

  let reason = `Option "${winner.option}" scores ${winner.score}/100`;
  if (analysis.consensus === 'clear_winner') {
    reason += ` with a ${analysis.margin}pt margin — clear winner`;
  } else if (analysis.consensus === 'contested') {
    reason += ` but margin is narrow (${analysis.margin}pts) — consider more analysis`;
  } else {
    reason += ` but options are close — recommend additional due diligence`;
  }

  return {
    choice: winner.option,
    score: winner.score,
    reason,
    confidence: analysis.margin > 20 ? 'high' : analysis.margin > 10 ? 'medium' : 'low',
    alternative: analysis.runnerUp ? { option: analysis.runnerUp, reason: `Fallback if ${winner.option} is not feasible` } : null,
  };
}

function calculateConfidence(analysis) {
  if (!analysis.options || analysis.options.length === 0) return 0;
  if (analysis.consensus === 'clear_winner') return 90;
  if (analysis.consensus === 'contested') return 70;
  if (analysis.consensus === 'no_consensus') return 50;
  return 75;
}

// ---------- Strategic Options ----------
function generateStrategicOptions(params) {
  const id = uuidv4();
  const { businessType, stage, challenge, competitiveLandscape } = params;

  const options = [];

  // Core strategies
  if (stage === 'startup') {
    options.push({
      id: uuidv4(),
      name: 'Product-Led Growth',
      description: 'Focus on viral product features and organic adoption loops',
      effort: 'high',
      timeline: 'medium',
      risk: 'medium',
      expectedOutcome: '10x user growth in 12 months',
      keyMetrics: ['DAU', 'NPS', 'Viral Coefficient'],
    });
    options.push({
      id: uuidv4(),
      name: 'Sales-Led Growth',
      description: 'Build enterprise sales team to close logo-driven revenue',
      effort: 'high',
      timeline: 'short',
      risk: 'high',
      expectedOutcome: '$1M ARR in 6 months',
      keyMetrics: ['CAC', 'LTV', 'Enterprise Contracts'],
    });
  } else if (stage === 'scaleup') {
    options.push({
      id: uuidv4(),
      name: 'Market Expansion',
      description: 'Enter new geographic markets or segments',
      effort: 'high',
      timeline: 'long',
      risk: 'high',
      expectedOutcome: '3x revenue in 18 months',
      keyMetrics: ['TAM', 'Market Penetration', 'Localization Cost'],
    });
    options.push({
      id: uuidv4(),
      name: 'Product Diversification',
      description: 'Expand product suite to serve adjacent needs',
      effort: 'medium',
      timeline: 'medium',
      risk: 'medium',
      expectedOutcome: '40% revenue diversification',
      keyMetrics: ['Revenue per Product', 'Cross-sell Rate'],
    });
  }

  // Challenge-based strategies
  if (challenge === 'customer_acquisition') {
    options.push({
      id: uuidv4(),
      name: 'Content Marketing Engine',
      description: 'Build SEO + thought leadership to drive inbound',
      effort: 'medium',
      timeline: 'medium',
      risk: 'low',
      expectedOutcome: '50% reduction in CAC',
      keyMetrics: ['Organic Traffic', 'MQLs', 'CAC'],
    });
  }
  if (challenge === 'retention') {
    options.push({
      id: uuidv4(),
      name: 'Customer Success Program',
      description: 'Dedicated CS team + automation for proactive retention',
      effort: 'medium',
      timeline: 'short',
      risk: 'low',
      expectedOutcome: '20% improvement in retention',
      keyMetrics: ['NRR', 'Churn Rate', 'Time to Value'],
    });
  }

  // Always include partnership strategy
  options.push({
    id: uuidv4(),
    name: 'Strategic Partnership',
    description: 'Partner with complementary product to co-sell and share channels',
    effort: 'low',
    timeline: 'short',
    risk: 'low',
    expectedOutcome: '20% revenue from partnerships',
    keyMetrics: ['Partner Revenue', 'Channel Efficiency'],
  });

  const strategy = { id, name: params.title || 'Strategic Options Analysis', createdAt: new Date().toISOString(), options };
  strategies.push(strategy);
  while (strategies.length > MAX_STRATEGIES) strategies.shift();
  return strategy;
}

// ---------- Competitive Analysis ----------
function analyzeCompetition(params) {
  const { competitors, yourStrengths, marketTrends } = params;

  const analysis = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    swot: {},
    positioning: {},
    threats: [],
    opportunities: [],
    recommendations: [],
  };

  // SWOT
  analysis.swot = {
    strengths: yourStrengths || [],
    weaknesses: params.yourWeaknesses || [],
    opportunities: marketTrends?.filter(t => t.type === 'opportunity').map(t => t.description) || [],
    threats: marketTrends?.filter(t => t.type === 'threat').map(t => t.description) || [],
  };

  // Positioning
  const competitorCount = (competitors || []).length;
  if (competitorCount === 0) {
    analysis.positioning = { category: 'Pioneer', description: 'First mover in this space — set the standard' };
  } else if (competitorCount < 3) {
    analysis.positioning = { category: 'Challenger', description: 'Established competitors — differentiate on a key dimension' };
  } else {
    analysis.positioning = { category: 'Fast Follower', description: 'Crowded market — find a niche and build moat' };
  }

  // Threats and opportunities
  analysis.threats = [
    ...(params.marketTrends || []).filter(t => t.type === 'threat').map(t => t.description),
    ...(competitors || []).filter(c => c.threat === 'high').map(c => `Direct competitor: ${c.name}`),
  ];
  analysis.opportunities = [
    ...(params.marketTrends || []).filter(t => t.type === 'opportunity').map(t => t.description),
    { type: 'expansion', description: 'Adjacent market segment worth $XM' },
    { type: 'partnership', description: 'Integration with platform could unlock $XM revenue' },
  ];

  // Recommendations
  analysis.recommendations = [
    { priority: 'critical', action: `Differentiate on ${yourStrengths?.[0] || 'your key strength'}` },
    { priority: 'high', action: 'Build moat through network effects or data advantage' },
    { priority: 'medium', action: 'Monitor competitor pricing and positioning' },
  ];

  return analysis;
}

// ---------- Decision Frameworks ----------
function getFrameworks() {
  return {
    frameworks: [
      {
        id: 'opp_cost',
        name: 'Opportunity Cost Analysis',
        description: 'Compare decision against best alternative use of resources',
        when: 'When resources are limited and choices are mutually exclusive',
        steps: ['Define the decision', 'List all options', 'Calculate ROI for each', 'Compare against opportunity cost'],
      },
      {
        id: 'regret_min',
        name: 'Minimize Regret',
        description: 'Choose the option that minimizes maximum possible regret',
        when: 'High-stakes decisions with uncertainty',
        steps: ['List scenarios', 'For each option, estimate regret in each scenario', 'Choose option with lowest maximum regret'],
      },
      {
        id: 'first_principles',
        name: 'First Principles',
        description: 'Break down problem to fundamental truths and rebuild',
        when: 'When conventional wisdom may be wrong',
        steps: ['State the problem', 'Break into fundamental parts', 'Challenge assumptions', 'Build new solution from ground up'],
      },
      {
        id: 'reversibility',
        name: 'Reversibility Test',
        description: 'Prioritize reversible decisions, spend more time on irreversible',
        when: 'When facing many decisions with limited time',
        steps: ['Ask: can this decision be easily reversed?', 'Reversible: decide quickly', 'Irreversible: deep analysis'],
      },
      {
        id: 'four_d',
        name: 'Four D\'s',
        description: 'Drop, Delegate, Defer, or Do',
        when: 'When overwhelmed with decisions',
        steps: ['Drop: Is this worth doing at all?', 'Delegate: Can someone else do it?', 'Defer: Does it need your attention now?', 'Do: Execute if yes to all above'],
      },
    ]
  };
}

// ---------- Routes ----------
app.post('/api/decisions', requireAuth, (req, res) => {
  const decision = analyzeDecision(req.body);
  res.status(201).json(decision);
});

app.get('/api/decisions', requireAuth, (req, res) => {
  const { type, status, limit } = req.query;
  let list = [...decisions];
  if (type) list = list.filter(d => d.type === type);
  if (status) list = list.filter(d => d.decision ? 'decided' : 'pending' === status);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ total: decisions.length, returned: Math.min(list.length, parseInt(limit) || 100), decisions: list.slice(0, parseInt(limit) || 100) });
});

app.post('/api/strategies', requireAuth, (req, res) => {
  const strategy = generateStrategicOptions(req.body);
  res.status(201).json(strategy);
});

app.get('/api/competitive', requireAuth, (req, res) => {
  res.json(analyzeCompetition(req.body || {}));
});

app.get('/api/frameworks', (_req, res) => {
  res.json(getFrameworks());
});

app.post('/api/advice', requireAuth, (req, res) => {
  const { question, context } = req.body;
  res.json({
    question,
    advice: `Based on ${context?.type || 'your input'}, consider applying the First Principles framework.`,
    frameworks: ['first_principles', 'reversibility'],
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sutar-founder-os', port: PORT, layer: 'Decision + Execution', decisions: decisions.length, strategies: strategies.length, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => { console.log(`[sutar-founder-os] listening on :${PORT}`); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
