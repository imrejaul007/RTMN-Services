/**
 * SUTAR OS — Founder OS
 *
 * AI-powered decision support for founders and executives.
 * Strategic analysis, competitive intelligence, and decision frameworks.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());
setupSecurity(app, { serviceName: 'sutar-founder-os' });

const PORT = process.env.FOUNDER_PORT || 4260;

const decisions = [];
const strategies = [];
const MAX_DECISIONS = 5000;
const MAX_STRATEGIES = 1000;

function analyzeDecision(params) {
  const id = uuidv4();
  const analysis = runDecisionAnalysis(params);
  const recommendation = generateRecommendation(analysis, params.riskAppetite);
  const decision = {
    id, title: params.title, description: params.description,
    type: params.type || 'strategic', urgency: params.urgency || 'medium',
    options: params.options || [], criteria: params.criteria || [],
    riskAppetite: params.riskAppetite || 'balanced',
    analysis, recommendation,
    confidence: calculateConfidence(analysis),
    decision: recommendation.choice,
    createdAt: new Date().toISOString(),
    decidedBy: params.createdBy || null,
  };
  decisions.push(decision);
  while (decisions.length > MAX_DECISIONS) decisions.shift();
  return decision;
}

function runDecisionAnalysis(params) {
  const options = params.options || [];
  if (options.length === 0) return { error: 'No options provided' };

  const scores = options.map((opt, i) => {
    let score = 50;
    const factors = [];
    for (const criterion of params.criteria || []) {
      const optValue = opt[criterion.field] || 0;
      const weight = criterion.weight || 1;
      const normalized = normalizeValue(optValue, criterion.min || 0, criterion.max || 100);
      score += (normalized - 50) * weight;
      factors.push({ criterion: criterion.name, contribution: Math.round(normalized * weight) });
    }
    if (params.riskAppetite === 'conservative') score -= (opt.risk || 0) * 0.3;
    if (params.riskAppetite === 'aggressive') score += (opt.upside || 0) * 0.2;
    return {
      option: opt.name || opt.title || 'Option ' + (i + 1),
      score: Math.round(Math.max(0, Math.min(100, score))),
      factors, risk: opt.risk || 0, upside: opt.upside || 0,
    };
  });

  scores.sort((a, b) => b.score - a.score);
  const spread = scores.length > 1 ? scores[0].score - scores[1].score : 0;
  let consensus = 'no_consensus';
  if (spread > 30) consensus = 'clear_winner';
  else if (spread > 10) consensus = 'contested';

  return {
    options: scores, winner: scores[0]?.option,
    runnerUp: scores[1]?.option,
    margin: spread, consensus,
  };
}

function normalizeValue(value, min, max) {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function generateRecommendation(analysis, riskAppetite) {
  const winner = analysis.options?.[0];
  if (!winner) return { choice: null, reason: 'No options analyzed' };
  let reason = 'Option "' + winner.option + '" scores ' + winner.score + '/100';
  if (analysis.consensus === 'clear_winner') reason += ' — clear winner';
  else if (analysis.consensus === 'contested') reason += ' — margin is narrow';
  return {
    choice: winner.option, score: winner.score, reason,
    confidence: analysis.margin > 20 ? 'high' : analysis.margin > 10 ? 'medium' : 'low',
  };
}

function calculateConfidence(analysis) {
  if (!analysis.options?.length) return 0;
  if (analysis.consensus === 'clear_winner') return 90;
  if (analysis.consensus === 'contested') return 70;
  return 50;
}

function generateStrategicOptions(params) {
  const id = uuidv4();
  const { stage, challenge } = params;
  const options = [];

  if (stage === 'startup') {
    options.push({ id: uuidv4(), name: 'Product-Led Growth', description: 'Viral product features and organic loops', effort: 'high', timeline: 'medium', risk: 'medium' });
    options.push({ id: uuidv4(), name: 'Sales-Led Growth', description: 'Enterprise sales team for logo-driven revenue', effort: 'high', timeline: 'short', risk: 'high' });
  } else if (stage === 'scaleup') {
    options.push({ id: uuidv4(), name: 'Market Expansion', description: 'New geographic markets or segments', effort: 'high', timeline: 'long', risk: 'high' });
    options.push({ id: uuidv4(), name: 'Product Diversification', description: 'Expand product suite', effort: 'medium', timeline: 'medium', risk: 'medium' });
  }

  if (challenge === 'customer_acquisition') {
    options.push({ id: uuidv4(), name: 'Content Marketing Engine', description: 'SEO + thought leadership', effort: 'medium', timeline: 'medium', risk: 'low' });
  }
  if (challenge === 'retention') {
    options.push({ id: uuidv4(), name: 'Customer Success Program', description: 'Proactive retention', effort: 'medium', timeline: 'short', risk: 'low' });
  }

  options.push({ id: uuidv4(), name: 'Strategic Partnership', description: 'Partner for co-sell', effort: 'low', timeline: 'short', risk: 'low' });

  const strategy = { id, name: params.title || 'Strategic Options', createdAt: new Date().toISOString(), options };
  strategies.push(strategy);
  while (strategies.length > MAX_STRATEGIES) strategies.shift();
  return strategy;
}

function analyzeCompetition(params) {
  const competitors = params.competitors || [];
  const swot = {
    strengths: params.yourStrengths || [],
    weaknesses: params.yourWeaknesses || [],
    opportunities: (params.marketTrends || []).filter(t => t.type === 'opportunity').map(t => t.description),
    threats: (params.marketTrends || []).filter(t => t.type === 'threat').map(t => t.description),
  };
  const positioning = competitors.length === 0 ? { category: 'Pioneer' }
    : competitors.length < 3 ? { category: 'Challenger' }
    : { category: 'Fast Follower' };
  return {
    id: uuidv4(), createdAt: new Date().toISOString(),
    swot, positioning,
    recommendations: [
      { priority: 'critical', action: 'Differentiate on ' + (params.yourStrengths?.[0] || 'your key strength') },
      { priority: 'high', action: 'Build moat through network effects or data' },
    ],
  };
}

function getFrameworks() {
  return {
    frameworks: [
      { id: 'opp_cost', name: 'Opportunity Cost Analysis', description: 'Compare decision against best alternative use of resources', when: 'When resources are limited', steps: ['Define decision', 'List all options', 'Calculate ROI for each', 'Compare against opportunity cost'] },
      { id: 'regret_min', name: 'Minimize Regret', description: 'Choose option with lowest maximum regret', when: 'High-stakes with uncertainty', steps: ['List scenarios', 'Estimate regret per option per scenario', 'Choose lowest max regret'] },
      { id: 'first_principles', name: 'First Principles', description: 'Break problem to fundamentals and rebuild', when: 'When conventional wisdom may be wrong', steps: ['State problem', 'Break into fundamentals', 'Challenge assumptions', 'Build new solution'] },
      { id: 'reversibility', name: 'Reversibility Test', description: 'Prioritize reversible decisions', when: 'When overwhelmed with decisions', steps: ['Can this be reversed?', 'Reversible: decide quickly', 'Irreversible: deep analysis'] },
      { id: 'four_ds', name: "Four D's", description: 'Drop, Delegate, Defer, or Do', when: 'When overwhelmed', steps: ['Drop: Worth doing at all?', 'Delegate: Can someone else?', 'Defer: Need your attention now?', 'Do: Execute if yes to all'] },
    ],
  };
}

app.post('/api/decisions', requireAuth, (req, res) => {
  const decision = analyzeDecision(req.body);
  res.status(201).json(decision);
});

app.get('/api/decisions', requireAuth, (req, res) => {
  const list = [...decisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ total: decisions.length, returned: Math.min(list.length, 100), decisions: list });
});

app.post('/api/strategies', requireAuth, (req, res) => {
  const strategy = generateStrategicOptions(req.body);
  res.status(201).json(strategy);
});

app.get('/api/competitive', requireAuth, (req, res) => {
  res.json(analyzeCompetition(req.body || {}));
});

app.get('/api/frameworks', (req, res) => {
  res.json(getFrameworks());
});

app.post('/api/advice', requireAuth, (req, res) => {
  const { question, context } = req.body || {};
  res.json({ question, advice: 'Consider applying the First Principles framework.', frameworks: ['first_principles', 'reversibility'], timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sutar-founder-os', port: PORT, decisions: decisions.length, strategies: strategies.length });
});

const server = app.listen(PORT, () => { console.log('[sutar-founder-os] listening on :' + PORT); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
