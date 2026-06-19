/**
 * CorpID Cloud - AI Agent Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../shared/utils/logger.js';
import {
  agents,
  agentKeys,
  agentInteractions,
  AGENT_CAPABILITIES,
  createAgent,
  getAgentById,
  getAgentByAgentId,
  getAgentsByOwner,
  updateAgent,
  updateTrust,
  recordInteraction,
  pauseAgent,
  resumeAgent,
  deprecateAgent
} from '../models/agent.model.js';

const router = express.Router();

/**
 * Get available capabilities
 * GET /api/agents/capabilities
 */
router.get('/capabilities',
  requireAuth(),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      capabilities: AGENT_CAPABILITIES
    });
  })
);

/**
 * Create agent
 * POST /api/agents
 */
router.post('/',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const existing = getAgentByAgentId(req.body.agentId);
    if (existing) {
      throw new AppError('Agent with this ID already exists', 409, 'AGENT_EXISTS');
    }

    const agent = createAgent({
      ...req.body,
      owner: {
        type: 'user',
        id: req.user.id
      }
    });

    dataAudit('agent.created', req, 'agent', agent.id);

    res.status(201).json({
      success: true,
      message: 'Agent created',
      agent: {
        ...agent,
        apiKey: agent.apiKey?.key // Only shown once
      }
    });
  })
);

/**
 * Get agent by ID
 * GET /api/agents/:id
 */
router.get('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const agent = getAgentById(req.params.id);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    res.json({ success: true, agent });
  })
);

/**
 * Get agent by agentId
 * GET /api/agents/by-agent-id/:agentId
 */
router.get('/by-agent-id/:agentId',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const agent = getAgentByAgentId(req.params.agentId);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    res.json({ success: true, agent });
  })
);

/**
 * List user's agents
 * GET /api/agents
 */
router.get('/',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { status, type, category } = req.query;
    let agentList = getAgentsByOwner('user', req.user.id);

    if (status) agentList = agentList.filter(a => a.status === status);
    if (type) agentList = agentList.filter(a => a.type === type);
    if (category) agentList = agentList.filter(a => a.category === category);

    res.json({
      success: true,
      count: agentList.length,
      agents: agentList.map(a => ({
        id: a.id,
        agentId: a.agentId,
        name: a.name,
        displayName: a.displayName,
        type: a.type,
        category: a.category,
        trustScore: a.trust.score,
        status: a.status,
        lastActiveAt: a.lastActiveAt
      }))
    });
  })
);

/**
 * Update agent
 * PUT /api/agents/:id
 */
router.put('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const agent = getAgentById(req.params.id);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    if (agent.owner.id !== req.user.id) {
      throw new AppError('Only the owner can update', 403, 'ACCESS_DENIED');
    }

    const updated = updateAgent(req.params.id, req.body);

    dataAudit('agent.updated', req, 'agent', req.params.id);

    res.json({
      success: true,
      message: 'Agent updated',
      agent: updated
    });
  })
);

/**
 * Update trust score
 * PUT /api/agents/:id/trust
 */
router.put('/:id/trust',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { score, flags } = req.body;
    if (typeof score !== 'number') {
      throw new AppError('Score must be a number', 400, 'VALIDATION_ERROR');
    }

    const agent = getAgentById(req.params.id);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    const updated = updateTrust(req.params.id, score, flags);

    dataAudit('agent.trust_updated', req, 'agent', req.params.id, { score, flags });

    res.json({
      success: true,
      message: 'Trust score updated',
      trust: updated.trust
    });
  })
);

/**
 * Record interaction
 * POST /api/agents/:id/interactions
 */
router.post('/:id/interactions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const agent = getAgentById(req.params.id);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    const interaction = recordInteraction(req.params.id, {
      ...req.body,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Interaction recorded',
      interaction
    });
  })
);

/**
 * Get interactions
 * GET /api/agents/:id/interactions
 */
router.get('/:id/interactions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const agent = getAgentById(req.params.id);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    const { limit = 50 } = req.query;
    const interactions = agentInteractions
      .filter(i => i.agentId === agent.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      count: interactions.length,
      interactions
    });
  })
);

/**
 * Pause agent
 * POST /api/agents/:id/pause
 */
router.post('/:id/pause',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const agent = getAgentById(req.params.id);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    if (agent.owner.id !== req.user.id) {
      throw new AppError('Only the owner can pause', 403, 'ACCESS_DENIED');
    }

    pauseAgent(req.params.id, req.body?.reason);

    dataAudit('agent.paused', req, 'agent', req.params.id);

    res.json({ success: true, message: 'Agent paused' });
  })
);

/**
 * Resume agent
 * POST /api/agents/:id/resume
 */
router.post('/:id/resume',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const agent = getAgentById(req.params.id);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    if (agent.owner.id !== req.user.id) {
      throw new AppError('Only the owner can resume', 403, 'ACCESS_DENIED');
    }

    resumeAgent(req.params.id);

    dataAudit('agent.resumed', req, 'agent', req.params.id);

    res.json({ success: true, message: 'Agent resumed' });
  })
);

/**
 * Deprecate agent
 * POST /api/agents/:id/deprecate
 */
router.post('/:id/deprecate',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const agent = getAgentById(req.params.id);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    if (agent.owner.id !== req.user.id) {
      throw new AppError('Only the owner can deprecate', 403, 'ACCESS_DENIED');
    }

    deprecateAgent(req.params.id, req.body?.replacementId);

    dataAudit('agent.deprecated', req, 'agent', req.params.id);

    res.json({ success: true, message: 'Agent deprecated' });
  })
);

export default router;
