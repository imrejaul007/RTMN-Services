import { Router } from 'express';
import crmWriteback from '../services/crmWriteback.js';
import { randomDelay } from '../utils/helpers.js';

const router = Router();

// POST /api/crm/sync/lead - Sync lead to HubSpot
router.post('/sync/lead', async (req, res) => {
  try {
    const { lead } = req.body;

    if (!lead) {
      return res.status(400).json({ error: 'Lead data is required' });
    }

    if (!lead.name || !lead.email) {
      return res.status(400).json({ error: 'Lead name and email are required' });
    }

    await randomDelay(200, 800);

    const result = await crmWriteback.syncLeadToHubSpot(lead);

    if (result.success) {
      res.json({
        success: true,
        hubspotId: result.hubspotId,
        message: 'Lead synced to HubSpot successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to sync lead'
      });
    }
  } catch (error: any) {
    console.error('Lead sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync lead' });
  }
});

// POST /api/crm/sync/deal - Sync deal to HubSpot
router.post('/sync/deal', async (req, res) => {
  try {
    const { deal } = req.body;

    if (!deal) {
      return res.status(400).json({ error: 'Deal data is required' });
    }

    if (!deal.dealName) {
      return res.status(400).json({ error: 'Deal name is required' });
    }

    await randomDelay(200, 800);

    const result = await crmWriteback.syncDealToHubSpot(deal);

    if (result.success) {
      res.json({
        success: true,
        hubspotId: result.hubspotId,
        message: 'Deal synced to HubSpot successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to sync deal'
      });
    }
  } catch (error: any) {
    console.error('Deal sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync deal' });
  }
});

// POST /api/crm/sync/activity - Log activity
router.post('/sync/activity', async (req, res) => {
  try {
    const { activity } = req.body;

    if (!activity) {
      return res.status(400).json({ error: 'Activity data is required' });
    }

    if (!activity.type || !activity.contactId || !activity.description) {
      return res.status(400).json({ error: 'Activity type, contactId, and description are required' });
    }

    await randomDelay(100, 400);

    const result = await crmWriteback.logActivity({
      type: activity.type,
      contactId: activity.contactId,
      description: activity.description,
      timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
      metadata: activity.metadata
    });

    res.json({
      success: result.success,
      hubspotId: result.hubspotId,
      message: result.success ? 'Activity logged successfully' : 'Failed to log activity'
    });
  } catch (error: any) {
    console.error('Activity sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to log activity' });
  }
});

// POST /api/crm/sync/call - Log call with transcription
router.post('/sync/call', async (req, res) => {
  try {
    const { call, transcription } = req.body;

    if (!call) {
      return res.status(400).json({ error: 'Call data is required' });
    }

    if (!call.id || !call.leadId) {
      return res.status(400).json({ error: 'Call ID and leadId are required' });
    }

    await randomDelay(300, 1000);

    const success = await crmWriteback.syncCallWithTranscription(call, transcription);

    res.json({
      success,
      message: success ? 'Call logged successfully' : 'Failed to log call',
      call: {
        id: call.id,
        leadId: call.leadId,
        duration: call.duration,
        transcriptionIncluded: !!transcription
      }
    });
  } catch (error: any) {
    console.error('Call sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to log call' });
  }
});

// GET /api/crm/sync/status - Get sync status
router.get('/sync/status', async (req, res) => {
  try {
    const status = crmWriteback.getSyncStatus();
    const webhooks = crmWriteback.getWebhookCallbacks();

    res.json({
      success: true,
      sync: status,
      webhooks: {
        count: webhooks.length,
        recent: webhooks.slice(-5)
      }
    });
  } catch (error: any) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get sync status' });
  }
});

// POST /api/crm/deal/stage - Update deal stage
router.post('/deal/stage', async (req, res) => {
  try {
    const { hubspotId, stage } = req.body;

    if (!hubspotId || !stage) {
      return res.status(400).json({ error: 'HubSpot ID and stage are required' });
    }

    await randomDelay(100, 300);

    const success = await crmWriteback.updateDealStage(hubspotId, stage);

    res.json({
      success,
      message: success ? 'Deal stage updated' : 'Failed to update deal stage'
    });
  } catch (error: any) {
    console.error('Update deal stage error:', error);
    res.status(500).json({ error: error.message || 'Failed to update deal stage' });
  }
});

// POST /api/crm/task - Create task
router.post('/task', async (req, res) => {
  try {
    const { subject, description, dueDate, contactId, ownerId } = req.body;

    if (!subject) {
      return res.status(400).json({ error: 'Task subject is required' });
    }

    await randomDelay(100, 400);

    const result = await crmWriteback.createTask({
      subject,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      contactId,
      ownerId
    });

    res.json({
      success: result.success,
      taskId: result.taskId,
      message: result.success ? 'Task created successfully' : 'Failed to create task'
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
});

// GET /api/crm/search - Search contacts
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    await randomDelay(200, 600);

    const contacts = await crmWriteback.searchContacts(q as string);

    res.json({
      success: true,
      contacts,
      count: contacts.length
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

// POST /api/crm/contact/update - Update contact
router.post('/contact/update', async (req, res) => {
  try {
    const { hubspotId, properties } = req.body;

    if (!hubspotId || !properties) {
      return res.status(400).json({ error: 'HubSpot ID and properties are required' });
    }

    await randomDelay(100, 400);

    const success = await crmWriteback.updateHubSpotContact(hubspotId, properties);

    res.json({
      success,
      message: success ? 'Contact updated successfully' : 'Failed to update contact'
    });
  } catch (error: any) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: error.message || 'Failed to update contact' });
  }
});

export { router as crmRoutes };
