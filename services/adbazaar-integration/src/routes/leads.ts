import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { TwinSync } from '../services/twinSync';
import { AdBazaarLead } from '../models/AdBazaarProfile';

export default function leadsRoutes(
  customerOpsBridge: CustomerOpsBridge,
  twinSync: TwinSync,
  logger: any
): Router {
  const router = Router();

  /**
   * POST /api/leads
   * Create a new lead
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const lead: AdBazaarLead = {
        ...req.body,
        id: req.body.id || uuidv4(),
        createdAt: req.body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Sync to Lead Twin
      const leadTwinResult = await twinSync.syncToLeadTwin({
        sourceId: lead.id,
        source: 'lead-intelligence',
        profile: {
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          jobTitle: lead.jobTitle,
          industry: lead.industry,
          leadScore: lead.score,
          leadStatus: lead.status,
          temperature: lead.temperature,
          priority: lead.priority,
          tags: lead.tags,
          metadata: lead.metadata
        }
      });

      // Send to Customer Operations
      await customerOpsBridge.syncLeadToCustomerOps({
        source: 'lead-intelligence',
        lead: {
          externalId: lead.id,
          name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          jobTitle: lead.jobTitle,
          industry: lead.industry,
          score: lead.score,
          status: lead.status,
          priority: lead.priority,
          tags: lead.tags
        }
      });

      logger.info('Lead created from Lead Intelligence', {
        leadId: lead.id,
        leadTwinId: leadTwinResult?.id
      });

      res.status(201).json({
        success: true,
        lead: {
          id: lead.id,
          leadTwinId: leadTwinResult?.id
        },
        message: 'Lead synced to Lead Twin and Customer Operations'
      });
    } catch (error) {
      logger.error('Failed to create lead', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: 'Failed to create lead'
      });
    }
  });

  /**
   * GET /api/leads/:id
   * Get a lead by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get from Lead Twin
      const leadTwin = await twinSync.getLeadTwinBySourceId(id, 'lead-intelligence');

      res.json({
        success: true,
        lead: {
          id,
          leadTwin
        }
      });
    } catch (error) {
      logger.error('Failed to get lead', { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get lead'
      });
    }
  });

  /**
   * PATCH /api/leads/:id
   * Update a lead
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      // Sync updates to Lead Twin
      await twinSync.syncToLeadTwin({
        sourceId: id,
        source: 'lead-intelligence',
        profile: {
          id,
          ...updates
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('lead.updated', {
        source: 'lead-intelligence',
        leadId: id,
        updates
      });

      logger.info('Lead updated', { leadId: id });

      res.json({
        success: true,
        message: 'Lead updated',
        leadId: id
      });
    } catch (error) {
      logger.error('Failed to update lead', { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update lead'
      });
    }
  });

  /**
   * POST /api/leads/:id/score
   * Update lead score
   */
  router.post('/:id/score', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { score, factors, reason } = req.body;

      // Update Lead Twin with new score
      await twinSync.syncToLeadTwin({
        sourceId: id,
        source: 'lead-intelligence',
        profile: {
          id,
          leadScore: score,
          leadScoreFactors: factors,
          leadScoreReason: reason
        }
      });

      // Send to Customer Operations
      await customerOpsBridge.notifyCustomerOps('lead.scoreUpdated', {
        source: 'lead-intelligence',
        leadId: id,
        newScore: score,
        factors,
        reason
      });

      logger.info('Lead score updated', { leadId: id, score });

      res.json({
        success: true,
        leadId: id,
        newScore: score
      });
    } catch (error) {
      logger.error('Failed to update lead score', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update lead score'
      });
    }
  });

  /**
   * POST /api/leads/:id/qualify
   * Qualify or disqualify a lead
   */
  router.post('/:id/qualify', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, qualificationCriteria, notes } = req.body;

      // Update Lead Twin
      await twinSync.syncToLeadTwin({
        sourceId: id,
        source: 'lead-intelligence',
        profile: {
          id,
          leadStatus: status,
          qualificationCriteria,
          qualifiedAt: status === 'qualified' ? new Date().toISOString() : undefined,
          qualifiedNotes: notes
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('lead.qualified', {
        source: 'lead-intelligence',
        leadId: id,
        status,
        qualificationCriteria
      });

      logger.info('Lead qualification status changed', { leadId: id, status });

      res.json({
        success: true,
        leadId: id,
        status
      });
    } catch (error) {
      logger.error('Failed to qualify lead', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to qualify lead'
      });
    }
  });

  /**
   * POST /api/leads/:id/convert
   * Convert a lead to customer
   */
  router.post('/:id/convert', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { customerId, conversionData } = req.body;

      // Update Lead Twin
      await twinSync.syncToLeadTwin({
        sourceId: id,
        source: 'lead-intelligence',
        profile: {
          id,
          leadStatus: 'converted',
          convertedAt: new Date().toISOString(),
          convertedToCustomerId: customerId
        }
      });

      // Send conversion event to Customer Operations
      await customerOpsBridge.notifyCustomerOps('lead.converted', {
        source: 'lead-intelligence',
        leadId: id,
        customerId,
        conversionData,
        convertedAt: new Date().toISOString()
      });

      // Sync to Customer Twin
      await twinSync.syncToCustomerTwin({
        sourceId: id,
        source: 'lead-intelligence',
        customer: {
          id: customerId,
          originalLeadId: id,
          conversionSource: 'lead-intelligence',
          conversionData
        }
      });

      logger.info('Lead converted to customer', { leadId: id, customerId });

      res.json({
        success: true,
        leadId: id,
        customerId
      });
    } catch (error) {
      logger.error('Failed to convert lead', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to convert lead'
      });
    }
  });

  /**
   * POST /api/leads/:id/assign
   * Assign lead to owner
   */
  router.post('/:id/assign', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { ownerId, ownerType, reason } = req.body;

      // Update Lead Twin
      await twinSync.syncToLeadTwin({
        sourceId: id,
        source: 'lead-intelligence',
        profile: {
          id,
          assignedTo: ownerId,
          ownerType
        }
      });

      // Notify Customer Operations
      await customerOpsBridge.notifyCustomerOps('lead.assigned', {
        source: 'lead-intelligence',
        leadId: id,
        ownerId,
        ownerType,
        reason
      });

      logger.info('Lead assigned', { leadId: id, ownerId });

      res.json({
        success: true,
        leadId: id,
        ownerId
      });
    } catch (error) {
      logger.error('Failed to assign lead', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to assign lead'
      });
    }
  });

  /**
   * GET /api/leads/search
   * Search leads
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { query, status, score, company, industry, limit = 50, offset = 0 } = req.query;

      // Search in Lead Twin
      const leads = await twinSync.searchLeadTwins({
        query: query as string,
        status: status as string,
        minScore: score ? parseInt(score as string) : undefined,
        company: company as string,
        industry: industry as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        leads,
        count: leads.length,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error('Failed to search leads', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to search leads'
      });
    }
  });

  /**
   * GET /api/leads/stats/summary
   * Get lead statistics
   */
  router.get('/stats/summary', async (req: Request, res: Response) => {
    try {
      const stats = await twinSync.getLeadTwinStats();

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Failed to get lead stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get lead statistics'
      });
    }
  });

  return router;
}
