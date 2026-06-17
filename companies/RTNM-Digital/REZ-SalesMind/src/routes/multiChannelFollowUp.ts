/**
 * REZ SalesMind - Multi-Channel Follow-Up Routes
 * REST API endpoints for follow-up sequence management
 */

import { Router, Request, Response } from 'express';
import { followUpEngine, followUpTemplates, ChannelType } from '../services/multiChannelFollowUp.js';

const router = Router();

// ==================== Sequence Management ====================

/**
 * POST /api/followup/sequence/create
 * Create a new follow-up sequence
 */
router.post('/sequence/create', async (req: Request, res: Response) => {
  try {
    const { name, steps, description, abTest } = req.body;

    if (!name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Missing required fields: name, steps (array)' });
    }

    // Validate steps
    for (const step of steps) {
      if (!step.channel || !step.message || step.delayHours === undefined) {
        return res.status(400).json({ error: 'Each step must have: channel, message, delayHours' });
      }
    }

    const sequence = await followUpEngine.createSequence(name, steps, { description, abTest });
    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('Create sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to create sequence' });
  }
});

/**
 * GET /api/followup/sequence
 * Get all sequences or filter by status
 */
router.get('/sequence', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const sequences = await followUpEngine.getAllSequences(status);
    res.json({ success: true, data: sequences });
  } catch (error: any) {
    console.error('Get sequences error:', error);
    res.status(500).json({ error: error.message || 'Failed to get sequences' });
  }
});

/**
 * GET /api/followup/sequence/:id
 * Get a specific sequence
 */
router.get('/sequence/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sequence = await followUpEngine.getSequence(id);

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('Get sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to get sequence' });
  }
});

/**
 * PUT /api/followup/sequence/:id
 * Update a sequence
 */
router.put('/sequence/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, steps, description, status } = req.body;

    const sequence = await followUpEngine.getSequence(id);
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Update fields
    if (name) sequence.name = name;
    if (description) sequence.description = description;
    if (steps) sequence.steps = steps;
    if (status && ['active', 'paused', 'draft', 'completed'].includes(status)) {
      sequence.status = status;
    }
    sequence.updatedAt = new Date();

    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('Update sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to update sequence' });
  }
});

/**
 * DELETE /api/followup/sequence/:id
 * Delete a sequence
 */
router.delete('/sequence/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sequence = await followUpEngine.getSequence(id);

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Mark as deleted (in production, actually delete)
    sequence.status = 'completed';

    res.json({ success: true, message: 'Sequence deleted' });
  } catch (error: any) {
    console.error('Delete sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete sequence' });
  }
});

// ==================== Sequence Execution ====================

/**
 * POST /api/followup/sequence/:id/execute
 * Execute a sequence for a lead
 */
router.post('/sequence/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { leadId, contactInfo } = req.body;

    if (!leadId || !contactInfo) {
      return res.status(400).json({ error: 'Missing required fields: leadId, contactInfo' });
    }

    // Validate contact info has at least one channel
    const hasChannel = contactInfo.email || contactInfo.phone || contactInfo.whatsapp ||
                       contactInfo.linkedin || contactInfo.instagram;
    if (!hasChannel) {
      return res.status(400).json({ error: 'contactInfo must have at least one channel (email, phone, etc.)' });
    }

    const result = await followUpEngine.executeSequence(id, leadId, contactInfo);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Execute sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute sequence' });
  }
});

/**
 * GET /api/followup/execution/:executionId
 * Get execution status
 */
router.get('/execution/:executionId', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const execution = await followUpEngine.getExecution(executionId);

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({ success: true, data: execution });
  } catch (error: any) {
    console.error('Get execution error:', error);
    res.status(500).json({ error: error.message || 'Failed to get execution' });
  }
});

/**
 * POST /api/followup/execution/:executionId/cancel
 * Cancel an execution
 */
router.post('/execution/:executionId/cancel', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const result = await followUpEngine.cancelExecution(executionId);
    res.json({ success: result.success, message: result.message });
  } catch (error: any) {
    console.error('Cancel execution error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel execution' });
  }
});

// ==================== Sequence Control ====================

/**
 * POST /api/followup/sequence/:id/pause
 * Pause a sequence
 */
router.post('/sequence/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sequence = await followUpEngine.pauseSequence(id);
    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('Pause sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to pause sequence' });
  }
});

/**
 * POST /api/followup/sequence/:id/resume
 * Resume a paused sequence
 */
router.post('/sequence/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sequence = await followUpEngine.resumeSequence(id);
    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('Resume sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to resume sequence' });
  }
});

/**
 * POST /api/followup/sequence/:id/activate
 * Activate a sequence
 */
router.post('/sequence/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sequence = await followUpEngine.getSequence(id);

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    sequence.status = 'active';
    sequence.updatedAt = new Date();

    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('Activate sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to activate sequence' });
  }
});

// ==================== Sequence Status & Analytics ====================

/**
 * GET /api/followup/sequence/:id/status
 * Get sequence execution status
 */
router.get('/sequence/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = await followUpEngine.getSequenceStatus(id);
    res.json({ success: true, data: status });
  } catch (error: any) {
    console.error('Get status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

/**
 * GET /api/followup/sequence/:id/analytics
 * Get sequence analytics
 */
router.get('/sequence/:id/analytics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const analytics = await followUpEngine.getSequenceAnalytics(id);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get analytics' });
  }
});

// ==================== Channel Management ====================

/**
 * POST /api/followup/sequence/:id/add-channel
 * Add a channel to a sequence
 */
router.post('/sequence/:id/add-channel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { channel, step } = req.body;

    if (!channel || !step) {
      return res.status(400).json({ error: 'Missing required fields: channel, step' });
    }

    const validChannels: ChannelType[] = ['email', 'sms', 'whatsapp', 'call', 'linkedin', 'instagram', 'facebook', 'twitter'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` });
    }

    const sequence = await followUpEngine.addChannelToSequence(id, channel, step);
    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('Add channel error:', error);
    res.status(500).json({ error: error.message || 'Failed to add channel' });
  }
});

/**
 * POST /api/followup/sequence/:id/remove-channel
 * Remove a channel from a sequence
 */
router.post('/sequence/:id/remove-channel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { channel } = req.body;

    if (!channel) {
      return res.status(400).json({ error: 'Missing required field: channel' });
    }

    const sequence = await followUpEngine.removeChannelFromSequence(id, channel);
    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('Remove channel error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove channel' });
  }
});

// ==================== Templates ====================

/**
 * GET /api/followup/templates
 * Get pre-built sequence templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = followUpEngine.getTemplates();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: error.message || 'Failed to get templates' });
  }
});

/**
 * POST /api/followup/templates/:index/instantiate
 * Create a sequence from a template
 */
router.post('/templates/:index/instantiate', async (req: Request, res: Response) => {
  try {
    const { index } = req.params;
    const { name, modifications } = req.body;
    const templateIndex = parseInt(index);

    if (isNaN(templateIndex) || templateIndex < 0 || templateIndex >= followUpTemplates.length) {
      return res.status(400).json({ error: 'Invalid template index' });
    }

    const template = followUpTemplates[templateIndex];
    const steps = modifications?.steps || template.steps;

    const sequence = await followUpEngine.createSequence(
      name || `${template.name} - Copy`,
      steps,
      { description: template.description }
    );

    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('Instantiate template error:', error);
    res.status(500).json({ error: error.message || 'Failed to create from template' });
  }
});

// ==================== Dashboard Stats ====================

/**
 * GET /api/followup/stats
 * Get overall follow-up statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const allSequences = await followUpEngine.getAllSequences();

    const stats = {
      totalSequences: allSequences.length,
      activeSequences: allSequences.filter(s => s.status === 'active').length,
      pausedSequences: allSequences.filter(s => s.status === 'paused').length,
      draftSequences: allSequences.filter(s => s.status === 'draft').length,
      totalExecutions: allSequences.reduce((sum, s) => sum + s.executionHistory.length, 0),
      channelBreakdown: {
        email: allSequences.reduce((sum, s) => sum + s.steps.filter(st => st.channel === 'email').length, 0),
        sms: allSequences.reduce((sum, s) => sum + s.steps.filter(st => st.channel === 'sms').length, 0),
        whatsapp: allSequences.reduce((sum, s) => sum + s.steps.filter(st => st.channel === 'whatsapp').length, 0),
        call: allSequences.reduce((sum, s) => sum + s.steps.filter(st => st.channel === 'call').length, 0),
        linkedin: allSequences.reduce((sum, s) => sum + s.steps.filter(st => st.channel === 'linkedin').length, 0),
      },
      avgResponseRate: allSequences.length > 0
        ? allSequences.reduce((sum, s) => sum + s.analytics.responseRate, 0) / allSequences.length
        : 0,
      avgConversionRate: allSequences.length > 0
        ? allSequences.reduce((sum, s) => sum + s.analytics.conversionRate, 0) / allSequences.length
        : 0,
    };

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get stats' });
  }
});

export { router as multiChannelFollowUpRoutes };
export default router;
