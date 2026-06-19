/**
 * Decision Routes - Decision making support
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /decide/pros-cons
 * Pros and Cons analysis
 */
router.post('/decide/pros-cons', async (req, res) => {
  const { userId, decision, pros, cons, criteria } = req.body;

  if (!decision) {
    return res.status(400).json({ success: false, error: 'Decision is required' });
  }

  const prosList = pros || generatePros(decision);
  const consList = cons || generateCons(decision);

  // Calculate scores
  const prosScore = prosList.length * 10;
  const consScore = consList.length * 10;
  const netScore = prosScore - consScore;

  let recommendation;
  if (netScore > 20) recommendation = 'strongly_yes';
  else if (netScore > 0) recommendation = 'yes';
  else if (netScore === 0) recommendation = 'neutral';
  else if (netScore > -20) recommendation = 'no';
  else recommendation = 'strongly_no';

  res.json({
    success: true,
    decision,
    analysis: {
      pros: prosList,
      cons: consList,
      prosScore,
      consScore,
      netScore
    },
    recommendation,
    recommendationText: {
      strongly_yes: 'This looks like a great decision! Go for it.',
      yes: 'The pros outweigh the cons. Consider moving forward.',
      neutral: 'This is a tough call. More analysis needed.',
      no: 'The cons outweigh the pros. Maybe reconsider.',
      strongly_no: 'This seems like a bad decision. Avoid.'
    }[recommendation],
    questions: generateFollowUpQuestions(decision, consList)
  });
});

/**
 * POST /decide/scenario
 * Scenario planning
 */
router.post('/decide/scenario', async (req, res) => {
  const { userId, decision, scenarios } = req.body;

  if (!decision) {
    return res.status(400).json({ success: false, error: 'Decision is required' });
  }

  const defaultScenarios = [
    {
      name: 'Best Case',
      probability: 0.25,
      description: 'Everything goes better than expected',
      outcomes: generateBestCaseOutcomes(decision)
    },
    {
      name: 'Expected Case',
      probability: 0.50,
      description: 'Most likely outcome',
      outcomes: generateExpectedOutcomes(decision)
    },
    {
      name: 'Worst Case',
      probability: 0.25,
      description: 'Things go wrong',
      outcomes: generateWorstCaseOutcomes(decision)
    }
  ];

  // Calculate expected value
  const expectedValue = defaultScenarios.reduce((sum, s) => sum + s.probability * (s.outcomes.value || 50), 0);

  res.json({
    success: true,
    decision,
    scenarios: scenarios || defaultScenarios,
    expectedValue: Math.round(expectedValue),
    recommendation: expectedValue > 50 ? 'Proceed with caution' : 'Consider alternatives',
    riskAssessment: assessRisk(defaultScenarios)
  });
});

/**
 * POST /decide/go-no-go
 * Go/No-Go decision framework
 */
router.post('/decide/go-no-go', async (req, res) => {
  const { userId, initiative, criteria } = req.body;

  if (!initiative) {
    return res.status(400).json({ success: false, error: 'Initiative is required' });
  }

  const defaultCriteria = [
    { name: 'Strategic Fit', weight: 3, score: null, description: 'Does it align with goals?' },
    { name: 'Resource Availability', weight: 2, score: null, description: 'Do we have resources?' },
    { name: 'Market Opportunity', weight: 3, score: null, description: 'Is timing right?' },
    { name: 'Competitive Advantage', weight: 2, score: null, description: 'Does it create moat?' },
    { name: 'Risk Level', weight: 2, score: null, description: 'Is risk acceptable?' }
  ];

  // Score criteria (would come from user in real implementation)
  const scored = criteria || defaultCriteria.map(c => ({
    ...c,
    score: Math.floor(Math.random() * 5) + 6 // 6-10 default
  }));

  const totalScore = scored.reduce((sum, c) => sum + c.score * c.weight, 0);
  const maxScore = scored.reduce((sum, c) => sum + 10 * c.weight, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  let decision;
  if (percentage >= 75) decision = 'go';
  else if (percentage >= 50) decision = 'conditional_go';
  else decision = 'no_go';

  res.json({
    success: true,
    initiative,
    criteria: scored,
    analysis: {
      totalScore,
      maxScore,
      percentage,
      decision
    },
    recommendation: {
      go: '✅ GO - This initiative meets the bar',
      conditional_go: '⚠️ CONDITIONAL GO - Proceed with modifications',
      no_go: '❌ NO GO - Not ready, revisit criteria'
    }[decision],
    actionItems: generateActionItems(decision, scored)
  });
});

// Helper functions
function generatePros(decision) {
  return [
    'Potential for growth and expansion',
    'Improves customer experience',
    'Creates competitive advantage',
    'Aligns with long-term strategy'
  ];
}

function generateCons(decision) {
  return [
    'Requires significant investment',
    'Implementation challenges likely',
    'May face regulatory hurdles'
  ];
}

function generateFollowUpQuestions(decision, cons) {
  return cons.map(c => `What would you do to mitigate "${c}"?`).slice(0, 2);
}

function generateBestCaseOutcomes(decision) {
  return {
    value: 100,
    description: 'Exceeds all expectations with 3x returns',
    timeline: '3 months'
  };
}

function generateExpectedOutcomes(decision) {
  return {
    value: 70,
    description: 'Meets expectations with positive returns',
    timeline: '6 months'
  };
}

function generateWorstCaseOutcomes(decision) {
  return {
    value: 20,
    description: 'Falls short, possible partial loss',
    timeline: 'Ongoing challenges'
  };
}

function assessRisk(scenarios) {
  const worst = scenarios.find(s => s.name === 'Worst Case');
  return {
    level: worst.probability > 0.3 ? 'high' : worst.probability > 0.15 ? 'medium' : 'low',
    mitigation: 'Plan for worst case, aim for best case'
  };
}

function generateActionItems(decision, criteria) {
  if (decision === 'go') {
    return ['Proceed with planning', 'Allocate resources', 'Set milestones'];
  } else if (decision === 'conditional_go') {
    return ['Address weak criteria', 'Revisit in 30 days', 'Modify scope'];
  } else {
    return ['Re-evaluate assumptions', 'Strengthen weak areas', 'Consider alternatives'];
  }
}

export default router;
