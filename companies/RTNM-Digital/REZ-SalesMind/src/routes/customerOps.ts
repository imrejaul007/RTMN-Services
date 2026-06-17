/**
 * Customer Operations Routes
 *
 * Integrates SalesMind with all Customer Operations services:
 * - CRM Engine, Live Chat, BPO Manager, Social Hub
 * - Voice Twin, Organization Twin, Product Twin
 * - Executive Dashboard
 */

import { Router, Request, Response } from 'express';
import { customerOpsIntegration } from '../services/customerOpsIntegration.js';
import { generateId } from '../utils/helpers.js';

const router = Router();

// ==================== Customer 360 ====================

/**
 * GET /api/customer-ops/customer360/:contactId
 * Get complete 360 view of a customer
 */
router.get('/customer360/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    const result = await customerOpsIntegration.getCustomer360(contactId);

    if (result.success && result.customer360) {
      res.json({
        success: true,
        customer360: result.customer360,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get customer 360',
      });
    }
  } catch (error: any) {
    console.error('Get customer 360 error:', error);
    res.status(500).json({ error: error.message || 'Failed to get customer 360' });
  }
});

/**
 * GET /api/customer-ops/customerJourney/:contactId
 * Get customer journey timeline
 */
router.get('/customerJourney/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    const result = await customerOpsIntegration.getCustomerJourney(contactId);

    if (result.success) {
      res.json({
        success: true,
        journey: result.journey,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get customer journey',
      });
    }
  } catch (error: any) {
    console.error('Get customer journey error:', error);
    res.status(500).json({ error: error.message || 'Failed to get customer journey' });
  }
});

/**
 * GET /api/customer-ops/upsell/:contactId
 * Get upsell opportunities for a contact
 */
router.get('/upsell/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    const result = await customerOpsIntegration.getUpsellOpportunities(contactId);

    if (result.success) {
      res.json({
        success: true,
        opportunities: result.opportunities,
        totalPotential: result.totalPotential,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get upsell opportunities',
      });
    }
  } catch (error: any) {
    console.error('Get upsell opportunities error:', error);
    res.status(500).json({ error: error.message || 'Failed to get upsell opportunities' });
  }
});

// ==================== CRM Integration ====================

/**
 * POST /api/customer-ops/crm/sync-lead
 * Sync a lead to CRM Engine
 */
router.post('/crm/sync-lead', async (req: Request, res: Response) => {
  try {
    const { lead } = req.body;

    if (!lead) {
      return res.status(400).json({ error: 'Lead data is required' });
    }

    if (!lead.name || !lead.email || !lead.company) {
      return res.status(400).json({ error: 'Lead name, email, and company are required' });
    }

    const result = await customerOpsIntegration.syncLeadToCRM(lead);

    if (result.success) {
      res.json({
        success: true,
        contactId: result.contactId,
        accountId: result.accountId,
        message: 'Lead synced to CRM successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to sync lead',
      });
    }
  } catch (error: any) {
    console.error('CRM lead sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync lead' });
  }
});

/**
 * POST /api/customer-ops/crm/sync-deal
 * Sync a deal to CRM Engine
 */
router.post('/crm/sync-deal', async (req: Request, res: Response) => {
  try {
    const { deal } = req.body;

    if (!deal) {
      return res.status(400).json({ error: 'Deal data is required' });
    }

    if (!deal.dealName || !deal.contactId || !deal.accountId) {
      return res.status(400).json({ error: 'Deal name, contactId, and accountId are required' });
    }

    const result = await customerOpsIntegration.syncDealToCRM(deal);

    if (result.success) {
      res.json({
        success: true,
        dealId: result.dealId,
        message: 'Deal synced to CRM successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to sync deal',
      });
    }
  } catch (error: any) {
    console.error('CRM deal sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync deal' });
  }
});

/**
 * GET /api/customer-ops/crm/accounts
 * Get all CRM accounts
 */
router.get('/crm/accounts', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await customerOpsIntegration.getCRMAccounts({ page, limit, search });

    if (result.success) {
      res.json({
        success: true,
        accounts: result.accounts,
        total: result.total,
        page: result.page,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get CRM accounts',
      });
    }
  } catch (error: any) {
    console.error('Get CRM accounts error:', error);
    res.status(500).json({ error: error.message || 'Failed to get CRM accounts' });
  }
});

/**
 * GET /api/customer-ops/crm/contacts
 * Get all CRM contacts
 */
router.get('/crm/contacts', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const accountId = req.query.accountId as string;

    const result = await customerOpsIntegration.getCRMContacts({ page, limit, accountId });

    if (result.success) {
      res.json({
        success: true,
        contacts: result.contacts,
        total: result.total,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get CRM contacts',
      });
    }
  } catch (error: any) {
    console.error('Get CRM contacts error:', error);
    res.status(500).json({ error: error.message || 'Failed to get CRM contacts' });
  }
});

/**
 * PATCH /api/customer-ops/crm/deal/:id/stage
 * Update deal stage in CRM
 */
router.patch('/crm/deal/:id/stage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    if (!id || !stage) {
      return res.status(400).json({ error: 'Deal ID and stage are required' });
    }

    const result = await customerOpsIntegration.updateDealStage(id, stage);

    if (result.success) {
      res.json({
        success: true,
        message: 'Deal stage updated',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to update deal stage',
      });
    }
  } catch (error: any) {
    console.error('Update deal stage error:', error);
    res.status(500).json({ error: error.message || 'Failed to update deal stage' });
  }
});

// ==================== Live Chat ====================

/**
 * GET /api/customer-ops/chat/conversations/:contactId
 * Get chat conversations for a contact
 */
router.get('/chat/conversations/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    const result = await customerOpsIntegration.getChatConversations(contactId);

    if (result.success) {
      res.json({
        success: true,
        conversations: result.conversations,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get chat conversations',
      });
    }
  } catch (error: any) {
    console.error('Get chat conversations error:', error);
    res.status(500).json({ error: error.message || 'Failed to get chat conversations' });
  }
});

/**
 * GET /api/customer-ops/chat/messages/:conversationId
 * Get messages from a conversation
 */
router.get('/chat/messages/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    const result = await customerOpsIntegration.getChatMessages(conversationId);

    if (result.success) {
      res.json({
        success: true,
        messages: result.messages,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get chat messages',
      });
    }
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to get chat messages' });
  }
});

/**
 * POST /api/customer-ops/chat/send
 * Send a chat message
 */
router.post('/chat/send', async (req: Request, res: Response) => {
  try {
    const { conversationId, message, sender } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({ error: 'Conversation ID and message are required' });
    }

    const result = await customerOpsIntegration.sendChatMessage(
      conversationId,
      message,
      sender || 'agent'
    );

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Message sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send message',
      });
    }
  } catch (error: any) {
    console.error('Send chat message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

/**
 * POST /api/customer-ops/chat/ticket
 * Create a chat ticket
 */
router.post('/chat/ticket', async (req: Request, res: Response) => {
  try {
    const { contactId, subject, message } = req.body;

    if (!contactId || !subject || !message) {
      return res.status(400).json({ error: 'Contact ID, subject, and message are required' });
    }

    const result = await customerOpsIntegration.createChatTicket(contactId, subject, message);

    if (result.success) {
      res.json({
        success: true,
        ticketId: result.ticketId,
        conversationId: result.conversationId,
        message: 'Chat ticket created successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to create chat ticket',
      });
    }
  } catch (error: any) {
    console.error('Create chat ticket error:', error);
    res.status(500).json({ error: error.message || 'Failed to create chat ticket' });
  }
});

// ==================== Support Tickets ====================

/**
 * GET /api/customer-ops/tickets
 * Get all SLA tickets
 */
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const priority = req.query.priority as string;

    const result = await customerOpsIntegration.getSLATickets({ status, priority });

    if (result.success) {
      res.json({
        success: true,
        tickets: result.tickets,
        summary: result.summary,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get tickets',
      });
    }
  } catch (error: any) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: error.message || 'Failed to get tickets' });
  }
});

/**
 * POST /api/customer-ops/tickets
 * Create a support ticket
 */
router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const { contactId, subject, priority } = req.body;

    if (!contactId || !subject || !priority) {
      return res.status(400).json({ error: 'Contact ID, subject, and priority are required' });
    }

    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Priority must be low, medium, high, or critical' });
    }

    const result = await customerOpsIntegration.createTicket(contactId, subject, priority);

    if (result.success) {
      res.json({
        success: true,
        ticketId: result.ticketId,
        message: 'Ticket created successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to create ticket',
      });
    }
  } catch (error: any) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: error.message || 'Failed to create ticket' });
  }
});

/**
 * PATCH /api/customer-ops/tickets/:id
 * Update ticket status
 */
router.patch('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: 'Ticket ID and status are required' });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status must be open, in_progress, resolved, or closed' });
    }

    const result = await customerOpsIntegration.updateTicket(id, status);

    if (result.success) {
      res.json({
        success: true,
        message: 'Ticket updated successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to update ticket',
      });
    }
  } catch (error: any) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: error.message || 'Failed to update ticket' });
  }
});

/**
 * GET /api/customer-ops/sla
 * Get SLA dashboard summary
 */
router.get('/sla', async (req: Request, res: Response) => {
  try {
    const result = await customerOpsIntegration.getSLATickets();

    if (result.success) {
      res.json({
        success: true,
        summary: result.summary,
        tickets: result.tickets,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get SLA summary',
      });
    }
  } catch (error: any) {
    console.error('Get SLA error:', error);
    res.status(500).json({ error: error.message || 'Failed to get SLA summary' });
  }
});

/**
 * GET /api/customer-ops/agents
 * Get agent status
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const result = await customerOpsIntegration.getAgentStatus();

    if (result.success) {
      res.json({
        success: true,
        agents: result.agents,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get agent status',
      });
    }
  } catch (error: any) {
    console.error('Get agent status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get agent status' });
  }
});

// ==================== Social ====================

/**
 * GET /api/customer-ops/social/mentions
 * Get social mentions
 */
router.get('/social/mentions', async (req: Request, res: Response) => {
  try {
    const keyword = req.query.keyword as string;
    const platform = req.query.platform as string;

    const result = await customerOpsIntegration.getSocialMentions({ keyword, platform });

    if (result.success) {
      res.json({
        success: true,
        mentions: result.mentions,
        summary: result.summary,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get social mentions',
      });
    }
  } catch (error: any) {
    console.error('Get social mentions error:', error);
    res.status(500).json({ error: error.message || 'Failed to get social mentions' });
  }
});

/**
 * GET /api/customer-ops/social/engagement/:accountId
 * Get social engagement for an account
 */
router.get('/social/engagement/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const result = await customerOpsIntegration.getSocialEngagement(accountId);

    if (result.success) {
      res.json({
        success: true,
        engagement: result.engagement,
        topPosts: result.topPosts,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get social engagement',
      });
    }
  } catch (error: any) {
    console.error('Get social engagement error:', error);
    res.status(500).json({ error: error.message || 'Failed to get social engagement' });
  }
});

/**
 * POST /api/customer-ops/social/track
 * Track a social prospect
 */
router.post('/social/track', async (req: Request, res: Response) => {
  try {
    const { socialId, leadId } = req.body;

    if (!socialId || !leadId) {
      return res.status(400).json({ error: 'Social ID and Lead ID are required' });
    }

    const result = await customerOpsIntegration.trackSocialProspect(socialId, leadId);

    if (result.success) {
      res.json({
        success: true,
        trackingId: result.trackingId,
        message: 'Social prospect tracked successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to track social prospect',
      });
    }
  } catch (error: any) {
    console.error('Track social prospect error:', error);
    res.status(500).json({ error: error.message || 'Failed to track social prospect' });
  }
});

/**
 * POST /api/customer-ops/social/campaign
 * Create a social campaign
 */
router.post('/social/campaign', async (req: Request, res: Response) => {
  try {
    const { name, channels } = req.body;

    if (!name || !channels || !Array.isArray(channels)) {
      return res.status(400).json({ error: 'Campaign name and channels array are required' });
    }

    const result = await customerOpsIntegration.createSocialCampaign(name, channels);

    if (result.success) {
      res.json({
        success: true,
        campaignId: result.campaignId,
        message: 'Social campaign created successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to create social campaign',
      });
    }
  } catch (error: any) {
    console.error('Create social campaign error:', error);
    res.status(500).json({ error: error.message || 'Failed to create social campaign' });
  }
});

// ==================== Organization ====================

/**
 * GET /api/customer-ops/org/chart/:companyId
 * Get org chart for a company
 */
router.get('/org/chart/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await customerOpsIntegration.getOrgChart(companyId);

    if (result.success) {
      res.json({
        success: true,
        orgChart: result.orgChart,
        company: result.company,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get org chart',
      });
    }
  } catch (error: any) {
    console.error('Get org chart error:', error);
    res.status(500).json({ error: error.message || 'Failed to get org chart' });
  }
});

/**
 * GET /api/customer-ops/org/buying-committee/:companyId
 * Get buying committee for a company
 */
router.get('/org/buying-committee/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await customerOpsIntegration.getBuyingCommittee(companyId);

    if (result.success) {
      res.json({
        success: true,
        buyingCommittee: result.buyingCommittee,
        recommendedApproach: result.recommendedApproach,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get buying committee',
      });
    }
  } catch (error: any) {
    console.error('Get buying committee error:', error);
    res.status(500).json({ error: error.message || 'Failed to get buying committee' });
  }
});

/**
 * GET /api/customer-ops/org/stakeholders/:companyId
 * Get key stakeholders for a company
 */
router.get('/org/stakeholders/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await customerOpsIntegration.getKeyStakeholders(companyId);

    if (result.success) {
      res.json({
        success: true,
        stakeholders: result.stakeholders,
        relationshipScore: result.relationshipScore,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get stakeholders',
      });
    }
  } catch (error: any) {
    console.error('Get stakeholders error:', error);
    res.status(500).json({ error: error.message || 'Failed to get stakeholders' });
  }
});

// ==================== Products ====================

/**
 * GET /api/customer-ops/products/recommendations/:companyId
 * Get product recommendations for a company
 */
router.get('/products/recommendations/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await customerOpsIntegration.getProductRecommendations(companyId);

    if (result.success) {
      res.json({
        success: true,
        recommendations: result.recommendations,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get product recommendations',
      });
    }
  } catch (error: any) {
    console.error('Get product recommendations error:', error);
    res.status(500).json({ error: error.message || 'Failed to get product recommendations' });
  }
});

/**
 * GET /api/customer-ops/products/competitive/:companyId
 * Get competitive products for a company
 */
router.get('/products/competitive/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await customerOpsIntegration.getCompetitiveProducts(companyId);

    if (result.success) {
      res.json({
        success: true,
        competitiveProducts: result.competitiveProducts,
        battleCards: result.battleCards,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get competitive products',
      });
    }
  } catch (error: any) {
    console.error('Get competitive products error:', error);
    res.status(500).json({ error: error.message || 'Failed to get competitive products' });
  }
});

// ==================== Voice ====================

/**
 * GET /api/customer-ops/voice/profile/:contactId
 * Get voice profile for a contact
 */
router.get('/voice/profile/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    const result = await customerOpsIntegration.getVoiceProfile(contactId);

    if (result.success) {
      res.json({
        success: true,
        profile: result.profile,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get voice profile',
      });
    }
  } catch (error: any) {
    console.error('Get voice profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to get voice profile' });
  }
});

/**
 * GET /api/customer-ops/voice/calls/:contactId
 * Get call history for a contact
 */
router.get('/voice/calls/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    const result = await customerOpsIntegration.getCallHistory(contactId);

    if (result.success) {
      res.json({
        success: true,
        calls: result.calls,
        summary: result.summary,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get call history',
      });
    }
  } catch (error: any) {
    console.error('Get call history error:', error);
    res.status(500).json({ error: error.message || 'Failed to get call history' });
  }
});

/**
 * POST /api/customer-ops/voice/recording
 * Sync call recording
 */
router.post('/voice/recording', async (req: Request, res: Response) => {
  try {
    const { contactId, recordingUrl, duration, direction, outcome } = req.body;

    if (!contactId || !recordingUrl) {
      return res.status(400).json({ error: 'Contact ID and recording URL are required' });
    }

    const result = await customerOpsIntegration.syncCallRecording(contactId, recordingUrl, {
      duration,
      direction,
      outcome,
    });

    if (result.success) {
      res.json({
        success: true,
        recordingId: result.recordingId,
        message: 'Recording synced successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to sync recording',
      });
    }
  } catch (error: any) {
    console.error('Sync recording error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync recording' });
  }
});

// ==================== Analytics ====================

/**
 * GET /api/customer-ops/analytics/revenue
 * Get revenue analytics
 */
router.get('/analytics/revenue', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string;

    const result = await customerOpsIntegration.getRevenueAnalytics({ period });

    if (result.success) {
      res.json({
        success: true,
        analytics: result.analytics,
        breakdown: result.breakdown,
        trends: result.trends,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get revenue analytics',
      });
    }
  } catch (error: any) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get revenue analytics' });
  }
});

/**
 * GET /api/customer-ops/analytics/pipeline
 * Get pipeline reports
 */
router.get('/analytics/pipeline', async (req: Request, res: Response) => {
  try {
    const result = await customerOpsIntegration.getPipelineReports();

    if (result.success) {
      res.json({
        success: true,
        pipeline: result.pipeline,
        stages: result.stages,
        atRisk: result.atRisk,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get pipeline reports',
      });
    }
  } catch (error: any) {
    console.error('Get pipeline reports error:', error);
    res.status(500).json({ error: error.message || 'Failed to get pipeline reports' });
  }
});

/**
 * GET /api/customer-ops/analytics/forecasts
 * Get sales forecasts
 */
router.get('/analytics/forecasts', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as 'quarterly' | 'monthly' | 'weekly';

    const result = await customerOpsIntegration.getSalesForecasts({ period });

    if (result.success) {
      res.json({
        success: true,
        forecast: result.forecast,
        commits: result.commits,
        momentum: result.momentum,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get sales forecasts',
      });
    }
  } catch (error: any) {
    console.error('Get sales forecasts error:', error);
    res.status(500).json({ error: error.message || 'Failed to get sales forecasts' });
  }
});

// ==================== Integration Status ====================

/**
 * GET /api/customer-ops/status
 * Get integration service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const result = await customerOpsIntegration.getServiceStatus();

    if (result.success) {
      res.json({
        success: true,
        services: result.services,
        overall: result.overall,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get service status',
      });
    }
  } catch (error: any) {
    console.error('Get service status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get service status' });
  }
});

// ==================== Event Handlers ====================

/**
 * POST /api/customer-ops/events/deal-closed
 * Handle deal close event - Create all required records
 */
router.post('/events/deal-closed', async (req: Request, res: Response) => {
  try {
    const { deal } = req.body;

    if (!deal || !deal.dealId || !deal.contactName || !deal.contactEmail || !deal.companyName) {
      return res.status(400).json({ error: 'Deal data with dealId, contactName, contactEmail, and companyName are required' });
    }

    const result = await customerOpsIntegration.onDealClosed(deal);

    res.json({
      success: result.success,
      results: result.results,
      errors: result.errors,
      message: result.success ? 'Deal closed and all records created' : 'Deal closed with some errors',
    });
  } catch (error: any) {
    console.error('Deal close event error:', error);
    res.status(500).json({ error: error.message || 'Failed to process deal close event' });
  }
});

/**
 * POST /api/customer-ops/events/lead-converted
 * Handle lead conversion event
 */
router.post('/events/lead-converted', async (req: Request, res: Response) => {
  try {
    const { lead } = req.body;

    if (!lead || !lead.id || !lead.name || !lead.email || !lead.company) {
      return res.status(400).json({ error: 'Lead data with id, name, email, and company are required' });
    }

    const result = await customerOpsIntegration.onLeadConverted(lead);

    res.json({
      success: result.success,
      results: result.results,
      errors: result.errors,
      message: result.success ? 'Lead converted and all records created' : 'Lead conversion completed with some errors',
    });
  } catch (error: any) {
    console.error('Lead conversion event error:', error);
    res.status(500).json({ error: error.message || 'Failed to process lead conversion event' });
  }
});

export { router as customerOpsRoutes };
