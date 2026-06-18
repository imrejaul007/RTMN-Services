import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Synchronizer } from '../services/synchronizer';
import { AuditLog } from '../services/auditLog';
import { SyncSource, SyncEvent } from '../models/Sync';

const router = Router();
const SOURCE: SyncSource = 'salesos';

/**
 * Initialize Sales OS routes
 */
export default function salesosRoutes(
  synchronizer: Synchronizer,
  auditLog: AuditLog,
  logger: any
) {
  // Health check for Sales OS integration
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const apiUrl = process.env.SALESOS_API_URL || 'http://localhost:5055';
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        res.json({
          status: 'connected',
          source: SOURCE,
          url: apiUrl,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'disconnected',
          source: SOURCE,
          url: apiUrl,
          error: `HTTP ${response.status}`
        });
      }
    } catch (error: any) {
      res.status(503).json({
        status: 'disconnected',
        source: SOURCE,
        error: error.message
      });
    }
  });

  // Get all opportunities from Sales OS
  router.get('/opportunities', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.SALESOS_API_URL || 'http://localhost:5055';
      const apiKey = process.env.SALESOS_API_KEY;

      const response = await fetch(`${apiUrl}/api/opportunities`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Sales OS API error: ${response.status}`);
      }

      const data = await response.json();
      const opportunities = data.opportunities || data;

      // Queue sync events
      for (const opp of opportunities) {
        const event: SyncEvent = {
          id: uuidv4(),
          type: 'sync.record_updated',
          source: SOURCE,
          target: 'salesmind',
          entityType: 'opportunity',
          entityId: opp.id,
          timestamp: new Date(),
          data: opp,
          metadata: { source: SOURCE }
        };
        await synchronizer.queueEvent(event);
      }

      await auditLog.log({
        action: 'opportunities.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'opportunity',
        entityId: 'batch',
        details: { count: opportunities.length },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({
        success: true,
        source: SOURCE,
        count: opportunities.length,
        opportunities
      });
    } catch (error: any) {
      logger.error('Error fetching Sales OS opportunities', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get single opportunity
  router.get('/opportunities/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.SALESOS_API_URL || 'http://localhost:5055';
      const apiKey = process.env.SALESOS_API_KEY;

      const response = await fetch(`${apiUrl}/api/opportunities/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Sales OS API error: ${response.status}`);
      }

      const opportunity = await response.json();

      await auditLog.log({
        action: 'opportunity.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'opportunity',
        entityId: id,
        details: { opportunityId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, opportunity });
    } catch (error: any) {
      logger.error('Error fetching Sales OS opportunity', { error: error.message, opportunityId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Create opportunity in Sales OS
  router.post('/opportunities', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;
    const { opportunity } = req.body;

    if (!opportunity) {
      return res.status(400).json({ error: 'Opportunity data required' });
    }

    try {
      const apiUrl = process.env.SALESOS_API_URL || 'http://localhost:5055';
      const apiKey = process.env.SALESOS_API_KEY;

      const response = await fetch(`${apiUrl}/api/opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(opportunity)
      });

      if (!response.ok) {
        throw new Error(`Sales OS API error: ${response.status}`);
      }

      const createdOpp = await response.json();

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_created',
        source: SOURCE,
        target: 'salesmind',
        entityType: 'opportunity',
        entityId: createdOpp.id,
        timestamp: new Date(),
        data: createdOpp,
        metadata: { source: SOURCE }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'opportunity.created',
        source: 'local',
        target: SOURCE,
        entityType: 'opportunity',
        entityId: createdOpp.id,
        details: { opportunity: createdOpp },
        beforeState: null,
        afterState: createdOpp,
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.status(201).json({ success: true, opportunity: createdOpp });
    } catch (error: any) {
      logger.error('Error creating Sales OS opportunity', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update opportunity in Sales OS
  router.put('/opportunities/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const { opportunity } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    if (!opportunity) {
      return res.status(400).json({ error: 'Opportunity data required' });
    }

    try {
      const apiUrl = process.env.SALESOS_API_URL || 'http://localhost:5055';
      const apiKey = process.env.SALESOS_API_KEY;

      // Get current state
      const currentResponse = await fetch(`${apiUrl}/api/opportunities/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const beforeState = currentResponse.ok ? await currentResponse.json() : null;

      const response = await fetch(`${apiUrl}/api/opportunities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(opportunity)
      });

      if (!response.ok) {
        throw new Error(`Sales OS API error: ${response.status}`);
      }

      const updatedOpp = await response.json();

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_updated',
        source: SOURCE,
        target: 'salesmind',
        entityType: 'opportunity',
        entityId: id,
        timestamp: new Date(),
        data: updatedOpp,
        metadata: { source: SOURCE, beforeState }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'opportunity.updated',
        source: 'local',
        target: SOURCE,
        entityType: 'opportunity',
        entityId: id,
        details: { opportunity: updatedOpp },
        beforeState,
        afterState: updatedOpp,
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, opportunity: updatedOpp });
    } catch (error: any) {
      logger.error('Error updating Sales OS opportunity', { error: error.message, opportunityId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Delete opportunity from Sales OS
  router.delete('/opportunities/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.SALESOS_API_URL || 'http://localhost:5055';
      const apiKey = process.env.SALESOS_API_KEY;

      const response = await fetch(`${apiUrl}/api/opportunities/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Sales OS API error: ${response.status}`);
      }

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_deleted',
        source: SOURCE,
        target: 'salesmind',
        entityType: 'opportunity',
        entityId: id,
        timestamp: new Date(),
        data: { deleted: true },
        metadata: { source: SOURCE }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'opportunity.deleted',
        source: 'local',
        target: SOURCE,
        entityType: 'opportunity',
        entityId: id,
        details: { deletedId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, message: 'Opportunity deleted' });
    } catch (error: any) {
      logger.error('Error deleting Sales OS opportunity', { error: error.message, opportunityId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Get sales pipeline
  router.get('/pipeline', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.SALESOS_API_URL || 'http://localhost:5055';
      const apiKey = process.env.SALESOS_API_KEY;

      const response = await fetch(`${apiUrl}/api/pipeline`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Sales OS API error: ${response.status}`);
      }

      const pipeline = await response.json();

      await auditLog.log({
        action: 'pipeline.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'pipeline',
        entityId: 'pipeline',
        details: {},
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, pipeline });
    } catch (error: any) {
      logger.error('Error fetching Sales OS pipeline', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get sales analytics
  router.get('/analytics', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.SALESOS_API_URL || 'http://localhost:5055';
      const apiKey = process.env.SALESOS_API_KEY;

      const response = await fetch(`${apiUrl}/api/analytics`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Sales OS API error: ${response.status}`);
      }

      const analytics = await response.json();

      await auditLog.log({
        action: 'analytics.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'analytics',
        entityId: 'analytics',
        details: {},
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, analytics });
    } catch (error: any) {
      logger.error('Error fetching Sales OS analytics', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook endpoint for inbound events from Sales OS
  router.post('/webhook', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { event, data } = req.body;

    try {
      const syncEvent: SyncEvent = {
        id: uuidv4(),
        type: event || 'sync.record_updated',
        source: SOURCE,
        target: 'salesmind',
        entityType: data?.entityType || 'unknown',
        entityId: data?.id || 'unknown',
        timestamp: new Date(),
        data: data || req.body,
        metadata: { webhook: true }
      };

      await synchronizer.queueEvent(syncEvent);

      await auditLog.log({
        action: 'webhook.received',
        source: SOURCE,
        target: 'local',
        entityType: syncEvent.entityType,
        entityId: syncEvent.entityId,
        details: { event: syncEvent.type },
        status: 'success',
        duration: Date.now() - startTime
      });

      res.json({ success: true, eventId: syncEvent.id });
    } catch (error: any) {
      logger.error('Error processing Sales OS webhook', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger sync from Sales OS to other systems
  router.post('/sync', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { targets = ['salesmind', 'customerops', 'brandpulse'] } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const results = await synchronizer.syncFromSource(SOURCE, targets as SyncSource[]);

      await auditLog.log({
        action: 'sync.initiated',
        source: SOURCE,
        target: targets.join(','),
        entityType: 'batch',
        entityId: 'batch',
        details: { targets, results },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, results });
    } catch (error: any) {
      logger.error('Error triggering sync from Sales OS', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export { router };
