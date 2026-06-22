import express from 'express';
import { createClient } from 'redis';
import { BOA_COUNCIL, BOA_ROLES } from '../index.js';

const router = express.Router();

// Create Redis client
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.connect().catch(console.error);

// Initialize council state
async function initializeCouncil() {
  const exists = await redis.exists('boa:council:state');
  if (!exists) {
    await redis.hSet('boa:council:state', {
      status: 'active',
      initializedAt: new Date().toISOString(),
      activeMembers: Object.keys(BOA_COUNCIL).join(','),
      lastSynthesis: ''
    });
  }
}
initializeCouncil();

/**
 * GET /api/council
 * Get full BOA Council overview
 */
router.get('/', async (req, res) => {
  try {
    const state = await redis.hGetAll('boa:council:state');
    const members = Object.entries(BOA_COUNCIL).map(([key, data]) => ({
      id: key,
      role: data.role,
      focus: data.focus,
      inputs: data.inputs,
      status: 'active'
    }));

    res.json({
      success: true,
      council: {
        name: 'RTMN Executive Council',
        description: 'Multi-perspective decision synthesis for RTMN platform',
        status: state.status || 'active',
        initializedAt: state.initializedAt,
        memberCount: members.length,
        members
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/council/members
 * List all BOA members with their roles and focus areas
 */
router.get('/members', async (req, res) => {
  try {
    const { role } = req.query;

    let members = Object.entries(BOA_COUNCIL).map(([key, data]) => ({
      id: key,
      role: data.role,
      fullTitle: `${data.role} Officer`,
      focus: data.focus,
      inputs: data.inputs,
      outputs: getOutputsForRole(key)
    }));

    if (role) {
      members = members.filter(m =>
        m.role.toLowerCase().includes(role.toLowerCase())
      );
    }

    res.json({
      success: true,
      count: members.length,
      members
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getOutputsForRole(roleKey) {
  const outputs = {
    ceo: ['strategic_direction', 'vision_statement', 'investment_priorities', 'risk_tolerance'],
    cfo: ['financial_projections', 'budget_allocations', 'roi_analysis', 'risk_assessment'],
    coo: ['operational_plans', 'efficiency_metrics', 'resource_requirements', 'timeline_estimates'],
    cmo: ['market_analysis', 'growth_strategies', 'brand_positioning', 'customer_insights'],
    chro: ['workforce_plan', 'culture_metrics', 'talent_requirements', 'compensation_frameworks'],
    clo: ['risk_analysis', 'compliance_requirements', 'contract_frameworks', 'liability_assessment']
  };
  return outputs[roleKey] || [];
}

/**
 * GET /api/council/member/:id
 * Get specific BOA member details
 */
router.get('/member/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const member = BOA_COUNCIL[id];

    if (!member) {
      return res.status(404).json({
        success: false,
        error: `BOA member '${id}' not found`
      });
    }

    // Get recent activity for this member
    const activities = await redis.lRange(`boa:activities:${id}`, 0, 9);

    res.json({
      success: true,
      member: {
        id,
        ...member,
        outputs: getOutputsForRole(id),
        recentActivity: activities.map(a => JSON.parse(a))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/council/perspective/:id
 * Get a specific perspective for a question
 */
router.get('/perspective/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { context } = req.query;

    if (!BOA_COUNCIL[id]) {
      return res.status(404).json({
        success: false,
        error: `BOA member '${id}' not found`
      });
    }

    const member = BOA_COUNCIL[id];

    // Generate perspective based on context
    const perspective = {
      id,
      role: member.role,
      focus: member.focus,
      perspective: generatePerspective(id, context),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      perspective
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function generatePerspective(roleId, context) {
  const perspectives = {
    ceo: `From a CEO perspective${context ? ` regarding "${context}"` : ''}, the strategic implications center on market positioning, competitive advantage, and long-term value creation. Key considerations include alignment with overall vision, potential for scale, and strategic fit within the RTMN ecosystem.`,
    cfo: `From a CFO perspective${context ? ` regarding "${context}"` : ''}, financial viability and risk-adjusted returns are paramount. Analysis focuses on capital requirements, projected revenues, cost structures, cash flow implications, and ROI timelines.`,
    coo: `From a COO perspective${context ? ` regarding "${context}"` : ''}, operational feasibility and execution efficiency are key. This includes resource allocation, process design, timeline feasibility, and operational risk factors.`,
    cmo: `From a CMO perspective${context ? ` regarding "${context}"` : ''}, market opportunity and customer value drive decisions. Analysis centers on market size, competitive differentiation, brand impact, and customer acquisition potential.`,
    chro: `From a CHRO perspective${context ? ` regarding "${context}"` : ''}, people and organizational impact are central. This includes talent requirements, cultural implications, workforce planning, and organizational design considerations.`,
    clo: `From a CLO perspective${context ? ` regarding "${context}"` : ''}, legal, compliance, and risk factors dominate. Key areas include regulatory requirements, contractual implications, liability assessment, and risk mitigation strategies.`
  };
  return perspectives[roleId] || 'Perspective not available';
}

/**
 * POST /api/council/consult
 * Consult the council on a specific question
 */
router.post('/consult', async (req, res) => {
  try {
    const { question, context, scope = 'all' } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    // Determine which members to consult
    const membersToConsult = scope === 'all'
      ? Object.keys(BOA_COUNCIL)
      : scope.split(',').filter(s => BOA_COUNCIL[s]);

    // Generate perspectives from each member
    const perspectives = await Promise.all(
      membersToConsult.map(async (memberId) => {
        const member = BOA_COUNCIL[memberId];
        const agent = await import(`../agents/${memberId}-agent.js`);

        return {
          memberId,
          role: member.role,
          focus: member.focus,
          perspective: await agent.default.analyze({ question, context }),
          timestamp: new Date().toISOString()
        };
      })
    );

    // Store consultation in history
    const consultationId = `consult_${Date.now()}`;
    await redis.hSet(`boa:consultation:${consultationId}`, {
      question,
      context: context || '',
      scope,
      perspectivesCount: perspectives.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      consultationId,
      question,
      context,
      perspectives
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/council/consultations
 * Get recent council consultations
 */
router.get('/consultations', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const keys = await redis.keys('boa:consultation:*');
    const consultations = await Promise.all(
      keys.slice(0, parseInt(limit)).map(async (key) => {
        const id = key.split(':').pop();
        const data = await redis.hGetAll(key);
        return { id, ...data };
      })
    );

    res.json({
      success: true,
      count: consultations.length,
      consultations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/council/state
 * Get council state and health
 */
router.get('/state', async (req, res) => {
  try {
    const state = await redis.hGetAll('boa:council:state');
    const health = {
      redis: redis.isReady ? 'connected' : 'disconnected',
      status: state.status || 'unknown',
      uptime: state.initializedAt
        ? Math.floor((Date.now() - new Date(state.initializedAt).getTime()) / 1000)
        : 0,
      lastSynthesis: state.lastSynthesis || 'never'
    };

    res.json({
      success: true,
      state: {
        ...health,
        memberCount: Object.keys(BOA_COUNCIL).length,
        activeMembers: state.activeMembers?.split(',') || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
