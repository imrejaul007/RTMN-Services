/**
 * Analysis Routes - Deep thinking and analysis
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /analyze/swot
 * SWOT Analysis
 */
router.post('/analyze/swot', async (req, res) => {
  const { userId, topic, strengths, weaknesses, opportunities, threats, context } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  // Generate structured SWOT
  const swot = {
    strengths: strengths || generateStrengths(topic),
    weaknesses: weaknesses || generateWeaknesses(topic),
    opportunities: opportunities || generateOpportunities(topic),
    threats: threats || generateThreats(topic)
  };

  // Generate cross-analysis
  const crossAnalysis = [
    { pair: 'SO', strategy: 'Use strengths to maximize opportunities' },
    { pair: 'ST', strategy: 'Use strengths to counter threats' },
    { pair: 'WO', strategy: 'Use opportunities to overcome weaknesses' },
    { pair: 'WT', strategy: 'Minimize weaknesses to avoid threats' }
  ];

  // Generate actionable insights
  const insights = generateSwotInsights(swot);

  res.json({
    success: true,
    topic,
    swot,
    crossAnalysis,
    insights,
    recommendations: insights.recommendations
  });
});

/**
 * POST /analyze/root-cause
 * Root Cause Analysis (5 Whys)
 */
router.post('/analyze/root-cause', async (req, res) => {
  const { userId, problem, depth } = req.body;

  if (!problem) {
    return res.status(400).json({ success: false, error: 'Problem is required' });
  }

  const maxDepth = depth || 5;
  const whys = [];
  let current = { question: `Why does ${problem}?`, answer: null };
  whys.push({ level: 1, ...current });

  // Generate 5 whys chain
  for (let i = 2; i <= maxDepth; i++) {
    const previousAnswer = whys[i - 2].answer || problem;
    current = {
      question: `Why does ${previousAnswer}?`,
      answer: generateRootCauseAnswer(previousAnswer, i)
    };
    whys.push({ level: i, ...current });

    // If we've reached a fundamental cause, stop
    if (isFundamentalCause(current.answer)) break;
  }

  // Generate actionable solutions
  const solutions = generateSolutions(whys);

  res.json({
    success: true,
    problem,
    whys,
    solutions,
    summary: `The root cause of "${problem}" is: ${whys[whys.length - 1].answer}`
  });
});

/**
 * POST /analyze/first-principles
 * First Principles Thinking
 */
router.post('/analyze/first-principles', async (req, res) => {
  const { userId, problem, assumption } = req.body;

  if (!problem) {
    return res.status(400).json({ success: false, error: 'Problem is required' });
  }

  // Break down into fundamental truths
  const fundamentals = decomposeToFundamentals(problem);

  // Challenge each assumption
  const assumptions = challengeAssumptions(fundamentals.assumptions);

  // Rebuild from ground up
  const reconstruction = reconstructFromFundamentals(assumptions, problem);

  res.json({
    success: true,
    problem,
    fundamentals,
    assumptionsChallenged: assumptions,
    reconstruction,
    insight: reconstruction.newApproach
  });
});

/**
 * POST /analyze/cost-benefit
 * Cost-Benefit Analysis
 */
router.post('/analyze/cost-benefit', async (req, res) => {
  const { userId, title, costs, benefits, timeline } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }

  const analysis = {
    title,
    costs: costs || [],
    benefits: benefits || [],
    timeline: timeline || '1 year',
    roi: calculateROI(costs, benefits),
    payback: calculatePayback(costs, benefits),
    recommendation: null
  };

  // Generate recommendation
  const totalCosts = (costs || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalBenefits = (benefits || []).reduce((sum, b) => sum + (b.amount || 0), 0);

  if (totalBenefits > totalCosts) {
    analysis.recommendation = 'strongly_positive';
    analysis.reason = `Net value of ₹${(totalBenefits - totalCosts).toLocaleString()} over ${timeline}`;
  } else {
    analysis.recommendation = 'requires_review';
    analysis.reason = `Costs exceed benefits by ₹${(totalCosts - totalBenefits).toLocaleString()}`;
  }

  res.json({ success: true, analysis });
});

/**
 * POST /analyze/compare
 * Compare options
 */
router.post('/analyze/compare', async (req, res) => {
  const { userId, options, criteria, weights } = req.body;

  if (!options || options.length < 2) {
    return res.status(400).json({ success: false, error: 'At least 2 options required' });
  }

  const defaultCriteria = [
    { name: 'Cost', type: 'negative' },
    { name: 'Time to implement', type: 'negative' },
    { name: 'Risk', type: 'negative' },
    { name: 'Impact', type: 'positive' },
    { name: 'Effort', type: 'negative' }
  ];

  const c = criteria || defaultCriteria;

  // Score each option
  const scored = options.map(option => {
    const scores = {};
    let totalScore = 0;
    let totalWeight = 0;

    c.forEach((criteria, i) => {
      const weight = weights?.[i] || 1;
      totalWeight += weight;
      const rawScore = option.scores?.[criteria.name] || 5;
      const normalizedScore = criteria.type === 'negative' ? 10 - rawScore : rawScore;
      scores[criteria.name] = { raw: rawScore, normalized: normalizedScore, weight };
      totalScore += normalizedScore * weight;
    });

    return {
      option: option.name,
      scores,
      totalScore: Math.round((totalScore / totalWeight) * 10) / 10,
      summary: option.summary || ''
    };
  });

  // Sort by score
  scored.sort((a, b) => b.totalScore - a.totalScore);

  res.json({
    success: true,
    options: scored,
    criteria: c,
    winner: scored[0],
    analysis: `Based on ${c.length} criteria, "${scored[0].option}" scores highest at ${scored[0].totalScore}/10`
  });
});

// Helper functions
function generateStrengths(topic) {
  return [
    `Unique expertise in ${topic}`,
    `Strong market positioning`,
    `Experienced team with relevant skills`,
    `Access to necessary resources`
  ];
}

function generateWeaknesses(topic) {
  return [
    `Limited initial resources`,
    `Learning curve involved`,
    `Potential skill gaps in early stages`,
    `Time-intensive to establish`
  ];
}

function generateOpportunities(topic) {
  return [
    `Growing demand in the market`,
    `Potential partnerships or collaborations`,
    `Technology advancements enabling growth`,
    `Underserved customer segments`
  ];
}

function generateThreats(topic) {
  return [
    `Established competitors`,
    `Market volatility`,
    `Regulatory changes`,
    `Economic downturns`
  ];
}

function generateSwotInsights(swot) {
  const recommendations = [];

  if (swot.strengths.length > swot.weaknesses.length) {
    recommendations.push('Leverage your strengths to build competitive advantage');
  }

  if (swot.opportunities.length > swot.threats.length) {
    recommendations.push('The opportunities outweigh threats - consider aggressive expansion');
  }

  recommendations.push('Focus on converting strengths into opportunities');

  return {
    keyInsight: 'Balance your strengths with opportunities while mitigating threats',
    recommendations
  };
}

function generateRootCauseAnswer(context, level) {
  const answers = [
    'because resources are limited',
    'because of lack of clear processes',
    'because of competing priorities',
    'because of insufficient skills or knowledge',
    'because of unclear goals or expectations',
    'because of communication gaps',
    'because of external dependencies',
    'because of systemic issues in the organization'
  ];
  return answers[Math.floor(Math.random() * answers.length)];
}

function isFundamentalCause(answer) {
  const fundamental = ['fundamental', 'core', 'basic', 'root'];
  return fundamental.some(f => answer.toLowerCase().includes(f));
}

function generateSolutions(whys) {
  const rootCause = whys[whys.length - 1].answer;
  return [
    { action: `Address the root cause: ${rootCause}`, priority: 'high' },
    { action: 'Implement systematic monitoring', priority: 'medium' },
    { action: 'Create prevention mechanisms', priority: 'medium' }
  ];
}

function decomposeToFundamentals(problem) {
  return {
    problem,
    assumptions: [
      'The current approach is the only viable option',
      'The problem is inherently difficult',
      'Limited resources prevent better solutions',
      'Time constraints require shortcuts'
    ],
    facts: [
      'What is the absolute minimum required?',
      'What do we know for certain?',
      'What has worked before in similar situations?',
      'What would we do with unlimited resources?'
    ]
  };
}

function challengeAssumptions(fundamentals) {
  return fundamentals.map(a => ({
    assumption: a,
    challenged: `What if "${a}" is NOT true?`,
    alternative: `Consider that the opposite might be possible`
  }));
}

function reconstructFromFundamentals(assumptions, problem) {
  return {
    newApproach: `By challenging assumptions about "${problem}", we can explore unconventional solutions that might be more effective`,
    nextSteps: [
      'Validate which assumptions are truly constraints',
      'Brainstorm solutions without the assumed limitations',
      'Test the new approach on a small scale'
    ]
  };
}

function calculateROI(costs, benefits) {
  const totalCosts = (costs || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalBenefits = (benefits || []).reduce((sum, b) => sum + (b.amount || 0), 0);

  if (totalCosts === 0) return 0;
  return Math.round(((totalBenefits - totalCosts) / totalCosts) * 100);
}

function calculatePayback(costs, benefits) {
  const totalCosts = (costs || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  const monthlyBenefit = (benefits || []).reduce((sum, b) => sum + (b.monthlyAmount || b.amount || 0), 0);

  if (monthlyBenefit === 0) return null;
  return Math.round(totalCosts / monthlyBenefit);
}

export default router;
