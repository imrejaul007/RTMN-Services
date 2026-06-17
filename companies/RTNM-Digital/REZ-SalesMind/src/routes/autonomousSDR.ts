import { Router } from 'express';
import autonomousSDR from '../services/autonomousSDR.js';
import { randomDelay } from '../utils/helpers.js';

const router = Router();

// POST /api/sdr/autonomous/start - Start autonomous prospecting
router.post('/autonomous/start', async (req, res) => {
  try {
    const {
      name,
      targetLeads,
      criteria,
      channels,
      followUpSequence,
      abTestEnabled
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    if (!channels || channels.length === 0) {
      return res.status(400).json({ error: 'At least one channel is required' });
    }

    await randomDelay(200, 500);

    const workflow = await autonomousSDR.startWorkflow({
      name,
      targetLeads,
      criteria,
      channels,
      followUpSequence: followUpSequence || 3,
      abTestEnabled: abTestEnabled || false
    });

    res.json({
      success: true,
      workflow,
      message: `Autonomous SDR workflow "${name}" started`,
      dashboardUrl: `/api/sdr/autonomous/status/${workflow.id}`
    });
  } catch (error: any) {
    console.error('Start SDR workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to start workflow' });
  }
});

// POST /api/sdr/autonomous/stop - Stop workflow
router.post('/autonomous/stop', async (req, res) => {
  try {
    const { workflowId } = req.body;

    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }

    await randomDelay(100, 300);

    const stopped = await autonomousSDR.stopWorkflow(workflowId);

    if (!stopped) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({
      success: true,
      message: 'Workflow stopped successfully',
      workflowId
    });
  } catch (error: any) {
    console.error('Stop SDR workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop workflow' });
  }
});

// GET /api/sdr/autonomous/status - Get all workflow statuses
router.get('/autonomous/status', async (req, res) => {
  try {
    const workflows = autonomousSDR.getAllWorkflows();

    const summary = {
      total: workflows.length,
      running: workflows.filter(w => w.status === 'running').length,
      idle: workflows.filter(w => w.status === 'idle').length,
      completed: workflows.filter(w => w.status === 'completed').length,
      error: workflows.filter(w => w.status === 'error').length
    };

    const totals = {
      prospectsProcessed: workflows.reduce((sum, w) => sum + w.prospectsProcessed, 0),
      emailsSent: workflows.reduce((sum, w) => sum + w.emailsSent, 0),
      responsesReceived: workflows.reduce((sum, w) => sum + w.responsesReceived, 0),
      meetingsBooked: workflows.reduce((sum, w) => sum + w.meetingsBooked, 0)
    };

    res.json({
      success: true,
      workflows,
      summary,
      totals
    });
  } catch (error: any) {
    console.error('Get SDR status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

// GET /api/sdr/autonomous/status/:id - Get specific workflow status
router.get('/autonomous/status/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const workflow = autonomousSDR.getWorkflowStatus(id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({
      success: true,
      workflow,
      metrics: {
        prospectsProcessed: workflow.prospectsProcessed,
        emailsSent: workflow.emailsSent,
        responsesReceived: workflow.responsesReceived,
        meetingsBooked: workflow.meetingsBooked,
        responseRate: workflow.emailsSent > 0 
          ? ((workflow.responsesReceived / workflow.emailsSent) * 100).toFixed(2) + '%'
          : '0%',
        meetingRate: workflow.responsesReceived > 0
          ? ((workflow.meetingsBooked / workflow.responsesReceived) * 100).toFixed(2) + '%'
          : '0%'
      }
    });
  } catch (error: any) {
    console.error('Get workflow status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get workflow status' });
  }
});

// POST /api/sdr/autonomous/respond - Handle responses
router.post('/autonomous/respond', async (req, res) => {
  try {
    const { leadId, type, content } = req.body;

    if (!leadId || !type) {
      return res.status(400).json({ error: 'Lead ID and response type are required' });
    }

    await randomDelay(200, 800);

    const handling = await autonomousSDR.handleResponse({
      leadId,
      type,
      content
    });

    res.json({
      success: true,
      handling,
      leadId
    });
  } catch (error: any) {
    console.error('Handle response error:', error);
    res.status(500).json({ error: error.message || 'Failed to handle response' });
  }
});

// GET /api/sdr/leads - Get all leads
router.get('/leads', async (req, res) => {
  try {
    const { status, minScore, source, limit = 100, offset = 0 } = req.query;

    let leads = autonomousSDR.getLeads();

    if (status) {
      leads = leads.filter(l => l.status === status);
    }
    if (minScore) {
      leads = leads.filter(l => l.score! >= Number(minScore));
    }
    if (source) {
      leads = leads.filter(l => l.source === source);
    }

    const total = leads.length;
    const paginated = leads.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      leads: paginated,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + paginated.length < total
      },
      summary: {
        total,
        byStatus: {
          new: leads.filter(l => l.status === 'new').length,
          contacted: leads.filter(l => l.status === 'contacted').length,
          qualified: leads.filter(l => l.status === 'qualified').length,
          proposal: leads.filter(l => l.status === 'proposal').length,
          negotiation: leads.filter(l => l.status === 'negotiation').length,
          closed_won: leads.filter(l => l.status === 'closed_won').length,
          closed_lost: leads.filter(l => l.status === 'closed_lost').length
        },
        avgScore: (leads.reduce((sum, l) => sum + (l.score || 0), 0) / leads.length).toFixed(1)
      }
    });
  } catch (error: any) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: error.message || 'Failed to get leads' });
  }
});

// POST /api/sdr/leads - Add a new lead
router.post('/leads', async (req, res) => {
  try {
    const lead = req.body;

    if (!lead.name || !lead.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Note: This would normally create a new lead in the database
    // For now, we'll just return a success response
    await randomDelay(100, 300);

    res.json({
      success: true,
      message: 'Lead created (mock)',
      lead: {
        ...lead,
        id: `lead-${Date.now()}`,
        status: 'new',
        score: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  } catch (error: any) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: error.message || 'Failed to create lead' });
  }
});

// GET /api/sdr/leads/:id - Get lead details
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const leads = autonomousSDR.getLeads();
    const lead = leads.find(l => l.id === id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      success: true,
      lead
    });
  } catch (error: any) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: error.message || 'Failed to get lead' });
  }
});

export { router as autonomousSDRRoutes };
