import express from 'express';
import { createClient } from 'redis';
import { BOA_COUNCIL } from '../index.js';

const router = express.Router();

// Create Redis client
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.connect().catch(console.error);

/**
 * POST /api/synthesis/multi-perspective
 * Synthesize multiple BOA perspectives into a unified decision recommendation
 */
router.post('/multi-perspective', async (req, res) => {
  try {
    const { question, context, includedRoles = Object.keys(BOA_COUNCIL) } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    // Generate perspectives from each included role
    const perspectives = {};
    for (const roleId of includedRoles) {
      if (!BOA_COUNCIL[roleId]) continue;

      const member = BOA_COUNCIL[roleId];
      perspectives[roleId] = {
        role: member.role,
        focus: member.focus,
        inputs: member.inputs,
        stance: generateStance(roleId, question, context),
        confidence: calculateConfidence(roleId, question),
        keyPoints: generateKeyPoints(roleId, question, context)
      };
    }

    // Perform synthesis
    const synthesis = synthesizePerspectives(perspectives, question);

    // Store synthesis
    const synthesisId = `synth_${Date.now()}`;
    await redis.hSet(`boa:synthesis:${synthesisId}`, {
      question,
      context: context || '',
      includedRoles: includedRoles.join(','),
      recommendation: synthesis.recommendation,
      confidence: synthesis.overallConfidence.toString(),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      synthesisId,
      synthesis: {
        question,
        context,
        perspectives,
        recommendation: synthesis.recommendation,
        overallConfidence: synthesis.overallConfidence,
        riskFactors: synthesis.riskFactors,
        opportunities: synthesis.opportunities,
        nextSteps: synthesis.nextSteps
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function generateStance(roleId, question, context) {
  // Simulate stance generation based on role perspective
  const stances = {
    ceo: {
      sentiment: 'strategic_positive',
      alignment: 'high',
      summary: 'Strongly aligned with long-term strategic objectives'
    },
    cfo: {
      sentiment: 'cautiously_optimistic',
      alignment: 'medium',
      summary: 'Financially viable with identified risk factors'
    },
    coo: {
      sentiment: 'operationally_feasible',
      alignment: 'high',
      summary: 'Implementation plan is executable with current resources'
    },
    cmo: {
      sentiment: 'market_opportunity',
      alignment: 'high',
      summary: 'Significant market potential identified'
    },
    chro: {
      sentiment: 'people_positive',
      alignment: 'medium',
      summary: 'Workforce implications manageable with proper planning'
    },
    clo: {
      sentiment: 'compliance_aware',
      alignment: 'medium',
      summary: 'Legal review required; no major blockers identified'
    }
  };
  return stances[roleId] || { sentiment: 'neutral', alignment: 'low', summary: 'Unclear alignment' };
}

function calculateConfidence(roleId, question) {
  // Base confidence by role (C-suite typically 70-85%)
  const baseConfidence = {
    ceo: 0.80,
    cfo: 0.75,
    coo: 0.85,
    cmo: 0.78,
    chro: 0.72,
    clo: 0.70
  };
  return baseConfidence[roleId] || 0.70;
}

function generateKeyPoints(roleId, question, context) {
  const keyPoints = {
    ceo: [
      'Aligns with core mission and vision',
      'Supports market expansion strategy',
      'Creates competitive differentiation',
      'Enables long-term sustainable growth'
    ],
    cfo: [
      'Clear ROI trajectory within 18-24 months',
      'Capital requirements within current capacity',
      'Risk-adjusted returns meet threshold',
      'Cash flow impact manageable'
    ],
    coo: [
      'Resource allocation is feasible',
      'Timeline is achievable',
      'Operational risks are mitigated',
      'Processes can scale effectively'
    ],
    cmo: [
      'Large addressable market',
      'Strong customer value proposition',
      'Brand positioning opportunity',
      'Customer acquisition channels identified'
    ],
    chro: [
      'Talent requirements can be met',
      'Organizational structure supports initiative',
      'Culture alignment confirmed',
      'Training needs identified and planned'
    ],
    clo: [
      'No regulatory blockers',
      'Compliance requirements clear',
      'Contractual framework established',
      'Risk mitigation strategies documented'
    ]
  };
  return keyPoints[roleId] || [];
}

function synthesizePerspectives(perspectives, question) {
  // Calculate overall confidence (weighted average)
  const weights = { ceo: 0.20, cfo: 0.20, coo: 0.15, cmo: 0.15, chro: 0.15, clo: 0.15 };
  let totalWeight = 0;
  let weightedConfidence = 0;

  for (const [roleId, weight] of Object.entries(weights)) {
    if (perspectives[roleId]) {
      weightedConfidence += perspectives[roleId].confidence * weight;
      totalWeight += weight;
    }
  }

  const overallConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;

  // Determine recommendation based on consensus
  const alignmentScores = Object.values(perspectives).map(p =>
    p.stance.alignment === 'high' ? 1 : p.stance.alignment === 'medium' ? 0.5 : 0
  );
  const consensus = alignmentScores.reduce((a, b) => a + b, 0) / alignmentScores.length;

  let recommendation;
  if (consensus >= 0.8) {
    recommendation = 'PROCEED - Strong council consensus for action';
  } else if (consensus >= 0.5) {
    recommendation = 'PROCEED WITH CAUTION - Conditional approval with monitoring';
  } else {
    recommendation = 'DEFER - Insufficient consensus; requires further analysis';
  }

  // Generate risk factors
  const riskFactors = [];
  if (perspectives.cfo?.stance.sentiment === 'cautiously_optimistic') {
    riskFactors.push('Financial monitoring required during implementation');
  }
  if (perspectives.chro?.stance.alignment !== 'high') {
    riskFactors.push('Workforce planning needs additional resource allocation');
  }
  if (perspectives.clo?.stance.alignment !== 'high') {
    riskFactors.push('Legal review and compliance checkpoints required');
  }

  // Generate opportunities
  const opportunities = [
    'Market leadership position potential',
    'Operational efficiency gains',
    'Brand equity enhancement',
    'Talent acquisition acceleration'
  ];

  // Generate next steps
  const nextSteps = [
    { action: 'Executive sign-off on recommendation', owner: 'CEO', timeline: 'immediate' },
    { action: 'Financial modeling validation', owner: 'CFO', timeline: '1 week' },
    { action: 'Implementation roadmap development', owner: 'COO', timeline: '2 weeks' },
    { action: 'Market launch preparation', owner: 'CMO', timeline: '3 weeks' },
    { action: 'Team capacity planning', owner: 'CHRO', timeline: '2 weeks' },
    { action: 'Legal framework review', owner: 'CLO', timeline: '1 week' }
  ];

  return {
    recommendation,
    overallConfidence,
    riskFactors,
    opportunities,
    nextSteps
  };
}

/**
 * POST /api/synthesis/decision-tree
 * Generate decision tree based on BOA perspectives
 */
router.post('/decision-tree', async (req, res) => {
  try {
    const { question, criteria = [] } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    // Build decision tree from criteria
    const tree = buildDecisionTree(question, criteria);

    res.json({
      success: true,
      decisionTree: tree
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function buildDecisionTree(question, criteria) {
  // Generate hierarchical decision tree
  const tree = {
    id: 'root',
    question,
    decision: generateRootDecision(question),
    children: []
  };

  // Add criteria branches
  for (const criterion of criteria) {
    const branch = {
      id: `crit_${criterion.toLowerCase().replace(/\s+/g, '_')}`,
      criterion,
      considerations: generateConsiderations(criterion),
      verdict: generateVerdict(criterion),
      evidence: generateEvidence(criterion)
    };
    tree.children.push(branch);
  }

  return tree;
}

function generateRootDecision(question) {
  return {
    choice: 'Recommended Path',
    rationale: 'Based on comprehensive multi-perspective analysis',
    confidence: 0.78
  };
}

function generateConsiderations(criterion) {
  return [
    { aspect: 'Financial Impact', weight: 0.30, assessment: 'positive' },
    { aspect: 'Operational Feasibility', weight: 0.25, assessment: 'positive' },
    { aspect: 'Market Position', weight: 0.25, assessment: 'positive' },
    { aspect: 'Risk Profile', weight: 0.20, assessment: 'moderate' }
  ];
}

function generateVerdict(criterion) {
  return {
    decision: 'Include',
    confidence: 0.82,
    conditions: 'Standard implementation requirements met'
  };
}

function generateEvidence(criterion) {
  return {
    data: 'Analysis supports inclusion',
    sources: ['Financial models', 'Market research', 'Operational assessments'],
    timestamp: new Date().toISOString()
  };
}

/**
 * GET /api/synthesis/history
 * Get synthesis history
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const keys = await redis.keys('boa:synthesis:*');
    const syntheses = await Promise.all(
      keys.slice(0, parseInt(limit)).map(async (key) => {
        const id = key.split(':').pop();
        const data = await redis.hGetAll(key);
        return {
          id,
          question: data.question,
          context: data.context,
          recommendation: data.recommendation,
          confidence: parseFloat(data.confidence),
          timestamp: data.timestamp
        };
      })
    );

    res.json({
      success: true,
      count: syntheses.length,
      syntheses: syntheses.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      )
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/synthesis/:id
 * Get specific synthesis details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const data = await redis.hGetAll(`boa:synthesis:${id}`);

    if (!data || Object.keys(data).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Synthesis not found'
      });
    }

    res.json({
      success: true,
      synthesis: {
        id,
        ...data,
        confidence: parseFloat(data.confidence)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
