/**
 * REZ SalesMind - Sales Copilot Routes
 * REST API endpoints for AI-powered sales copilot
 */

import { Router, Request, Response } from 'express';
import { salesCopilot } from '../services/copilot.js';

const router = Router();

// ==================== Next Best Action ====================

/**
 * POST /api/copilot/next-action
 * Get next best action for a lead
 */
router.post('/next-action', async (req: Request, res: Response) => {
  try {
    const { leadId, context } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    const action = await salesCopilot.suggestNextBestAction(leadId, context);
    res.json({ success: true, data: action });
  } catch (error: any) {
    console.error('Next action error:', error);
    res.status(500).json({ error: error.message || 'Failed to get next action' });
  }
});

// ==================== Sales Scripts ====================

/**
 * POST /api/copilot/script
 * Generate sales script for a scenario
 */
router.post('/script', async (req: Request, res: Response) => {
  try {
    const { leadId, scenario } = req.body;

    if (!scenario || !scenario.type) {
      return res.status(400).json({ error: 'Scenario with type is required' });
    }

    const script = await salesCopilot.generateSalesScript(leadId, scenario);
    res.json({ success: true, data: script });
  } catch (error: any) {
    console.error('Generate script error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate script' });
  }
});

// ==================== Call Preparation ====================

/**
 * POST /api/copilot/prepare-call
 * Prepare call briefing for a lead
 */
router.post('/prepare-call', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    const preparation = await salesCopilot.prepareForCall(leadId);
    res.json({ success: true, data: preparation });
  } catch (error: any) {
    console.error('Prepare call error:', error);
    res.status(500).json({ error: error.message || 'Failed to prepare call' });
  }
});

// ==================== Call Analysis ====================

/**
 * POST /api/copilot/analyze-call
 * Analyze call transcript
 */
router.post('/analyze-call', async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const analysis = await salesCopilot.analyzeCallTranscript(transcript);
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error('Analyze call error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze call' });
  }
});

// ==================== Objection Handling ====================

/**
 * POST /api/copilot/objection-response
 * Get suggested objection response
 */
router.post('/objection-response', async (req: Request, res: Response) => {
  try {
    const { objection, product } = req.body;

    if (!objection) {
      return res.status(400).json({ error: 'Objection text is required' });
    }

    const response = await salesCopilot.suggestObjectionResponse(objection, product);
    res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('Objection response error:', error);
    res.status(500).json({ error: error.message || 'Failed to get objection response' });
  }
});

// ==================== Sales Reports ====================

/**
 * POST /api/copilot/report
 * Generate sales report
 */
router.post('/report', async (req: Request, res: Response) => {
  try {
    const { period } = req.body;

    const validPeriods = ['day', 'week', 'month', 'quarter'];
    if (!period || !validPeriods.includes(period)) {
      return res.status(400).json({ error: `Period must be one of: ${validPeriods.join(', ')}` });
    }

    const report = await salesCopilot.generateSalesReport(period);
    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

// ==================== Coaching ====================

/**
 * POST /api/copilot/coach
 * Get coaching feedback
 */
router.post('/coach', async (req: Request, res: Response) => {
  try {
    const { performance } = req.body;

    const feedback = await salesCopilot.coachSalesperson(performance || {});
    res.json({ success: true, data: feedback });
  } catch (error: any) {
    console.error('Coaching error:', error);
    res.status(500).json({ error: error.message || 'Failed to get coaching feedback' });
  }
});

// ==================== Deal Prediction ====================

/**
 * POST /api/copilot/predict-deal
 * Predict deal outcome
 */
router.post('/predict-deal', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.body;

    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    const prediction = await salesCopilot.predictDealOutcome(dealId);
    res.json({ success: true, data: prediction });
  } catch (error: any) {
    console.error('Predict deal error:', error);
    res.status(500).json({ error: error.message || 'Failed to predict deal outcome' });
  }
});

// ==================== Pricing ====================

/**
 * POST /api/copilot/pricing
 * Get pricing recommendation
 */
router.post('/pricing', async (req: Request, res: Response) => {
  try {
    const { product, customerSegment } = req.body;

    if (!product) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const recommendation = await salesCopilot.recommendPricing(
      product,
      customerSegment || 'mid-market'
    );
    res.json({ success: true, data: recommendation });
  } catch (error: any) {
    console.error('Pricing recommendation error:', error);
    res.status(500).json({ error: error.message || 'Failed to get pricing recommendation' });
  }
});

// ==================== Competitive Analysis ====================

/**
 * POST /api/copilot/competitive-analysis
 * Generate competitive analysis
 */
router.post('/competitive-analysis', async (req: Request, res: Response) => {
  try {
    const { competitor } = req.body;

    if (!competitor) {
      return res.status(400).json({ error: 'Competitor name is required' });
    }

    const analysis = await salesCopilot.generateCompetitiveAnalysis(competitor);
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error('Competitive analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate competitive analysis' });
  }
});

// ==================== Dashboard ====================

/**
 * GET /api/copilot/dashboard
 * Get copilot dashboard data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = await salesCopilot.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to get dashboard' });
  }
});

// ==================== Objection Library ====================

/**
 * GET /api/copilot/objections
 * Get common objections and responses
 */
router.get('/objections', async (req: Request, res: Response) => {
  try {
    const objections = [
      {
        objection: 'Your price is too high',
        category: 'price',
        responses: [
          'I understand price is important. Let me share that our customers typically see a 300% ROI within the first year.',
          'What would make the investment worthwhile for your company?',
        ],
      },
      {
        objection: 'We don\'t have budget for this',
        category: 'budget',
        responses: [
          'I hear you. Budget constraints are common. If budget weren\'t a concern, would this solution solve your problem?',
          'Is there budget allocated for next quarter we could plan for?',
        ],
      },
      {
        objection: 'We\'re already evaluating your competitor',
        category: 'competitor',
        responses: [
          'That\'s great - it means you\'re serious about solving this problem. Would it be helpful to see a side-by-side comparison?',
          'What\'s most important to you in the evaluation?',
        ],
      },
      {
        objection: 'The timing isn\'t right',
        category: 'timing',
        responses: [
          'I understand timing is important. Can you help me understand what would need to change for the timing to be right?',
          'What\'s the cost of waiting?',
        ],
      },
      {
        objection: 'I need to get buy-in from leadership',
        category: 'stakeholder',
        responses: [
          'That makes sense for an initiative like this. What would help you make the case to leadership?',
          'Can I join a call to answer leadership\'s questions directly?',
        ],
      },
      {
        objection: 'We need to think about it',
        category: 'stalling',
        responses: [
          'Absolutely. What specifically do you need to think through?',
          'Can I address any concerns that would help with your decision?',
        ],
      },
    ];

    res.json({ success: true, data: objections });
  } catch (error: any) {
    console.error('Get objections error:', error);
    res.status(500).json({ error: error.message || 'Failed to get objections' });
  }
});

// ==================== Script Templates ====================

/**
 * GET /api/copilot/scripts/templates
 * Get available script templates
 */
router.get('/scripts/templates', async (req: Request, res: Response) => {
  try {
    const templates = [
      {
        type: 'cold_outreach',
        name: 'Cold Outreach',
        description: 'Initial contact with a cold prospect',
        bestFor: 'New leads, referrals, inbound inquiries',
      },
      {
        type: 'follow_up',
        name: 'Follow Up',
        description: 'Follow up on previous communication',
        bestFor: 'Unresponsive leads, post-meeting follow-up',
      },
      {
        type: 'demo',
        name: 'Demo Invitation',
        description: 'Schedule and prepare for a product demo',
        bestFor: 'Qualified leads, evaluation stage',
      },
      {
        type: 'proposal',
        name: 'Proposal Follow Up',
        description: 'Follow up after sending a proposal',
        bestFor: 'Post-proposal, decision stage',
      },
      {
        type: 'negotiation',
        name: 'Negotiation',
        description: 'Handle pricing and terms negotiation',
        bestFor: 'Negotiation stage, final stretch',
      },
      {
        type: 'objection_handling',
        name: 'Objection Handling',
        description: 'Respond to specific objections',
        bestFor: 'Any stage where objections arise',
      },
    ];

    res.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Get script templates error:', error);
    res.status(500).json({ error: error.message || 'Failed to get script templates' });
  }
});

// ==================== Talk Tracks ====================

/**
 * GET /api/copilot/talk-tracks
 * Get pre-built talk tracks
 */
router.get('/talk-tracks', async (req: Request, res: Response) => {
  try {
    const talkTracks = [
      {
        name: 'Value Proposition',
        script: 'Our solution helps companies like yours achieve [specific outcome] in [timeframe]. We do this by [key differentiator].',
        whenToUse: 'Early in the conversation to establish value',
      },
      {
        name: 'Social Proof',
        script: '[Company X], a [company type] similar to yours, achieved [specific result] within [timeframe] of implementing our solution.',
        whenToUse: 'When establishing credibility and trust',
      },
      {
        name: 'Question-Based',
        script: 'What would it mean for your team if you could [desired outcome]? What\'s stopping you from achieving that today?',
        whenToUse: 'Discovery and needs identification',
      },
      {
        name: 'ROI Focus',
        script: 'On average, our customers see [X]% improvement in [metric] within [timeframe]. For a company your size, that translates to approximately [dollar amount] in value.',
        whenToUse: 'When discussing investment and value',
      },
      {
        name: 'Authority Close',
        script: 'Based on what you\'ve shared, our solution is a great fit. I\'d recommend we move forward with [specific next step]. Does that work for you?',
        whenToUse: 'When ready to advance the deal',
      },
    ];

    res.json({ success: true, data: talkTracks });
  } catch (error: any) {
    console.error('Get talk tracks error:', error);
    res.status(500).json({ error: error.message || 'Failed to get talk tracks' });
  }
});

export { router as copilotRoutes };
export default router;
