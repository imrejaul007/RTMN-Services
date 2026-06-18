import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Synchronizer } from '../services/synchronizer';
import { AuditLog } from '../services/auditLog';
import { SyncSource, SyncEvent, generateChecksum } from '../models/Sync';
import { IncomingWebhook } from 'express';

const router = Router();
const SOURCE: SyncSource = 'salesmind';

/**
 * Initialize SalesMind routes
 */
export default function salesmindRoutes(
  synchronizer: Synchronizer,
  auditLog: AuditLog,
  logger: any
) {
  // Health check for SalesMind integration
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const apiUrl = process.env.SALESMIND_API_URL || 'http://localhost:4250';
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

  // Get all leads from SalesMind
  router.get('/leads', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.SALESMIND_API_URL || 'http://localhost:4250';
      const apiKey = process.env.SALESMIND_API_KEY;

      const response = await fetch(`${apiUrl}/api/leads`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`SalesMind API error: ${response.status}`);
      }

      const data = await response.json();
      const leads = data.leads || data;

      // Create sync event for each lead
      const syncEvents: SyncEvent[] = leads.map((lead: any) => ({
        id: uuidv4(),
        type: 'sync.record_updated' as const,
        source: SOURCE,
        target: 'salesos' as SyncSource,
        entityType: 'lead',
        entityId: lead.id,
        timestamp: new Date(),
        data: lead,
        metadata: { source: SOURCE }
      }));

      // Publish events for synchronization
      for (const event of syncEvents) {
        await synchronizer.queueEvent(event);
      }

      await auditLog.log({
        action: 'leads.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'lead',
        entityId: 'batch',
        details: { count: leads.length },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({
        success: true,
        source: SOURCE,
        count: leads.length,
        leads
      });
    } catch (error: any) {
      logger.error('Error fetching SalesMind leads', { error: error.message });
      await auditLog.log({
        action: 'leads.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'lead',
        entityId: 'batch',
        details: { error: error.message },
        status: 'failure',
        errorMessage: error.message,
        duration: Date.now() - startTime,
        requestId
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Get single lead
  router.get('/leads/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.SALESMIND_API_URL || 'http://localhost:4250';
      const apiKey = process.env.SALESMIND_API_KEY;

      const response = await fetch(`${apiUrl}/api/leads/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`SalesMind API error: ${response.status}`);
      }

      const lead = await response.json();

      await auditLog.log({
        action: 'lead.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'lead',
        entityId: id,
        details: { leadId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, lead });
    } catch (error: any) {
      logger.error('Error fetching SalesMind lead', { error: error.message, leadId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Create lead in SalesMind
  router.post('/leads', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;
    const { lead } = req.body;

    if (!lead) {
      return res.status(400).json({ error: 'Lead data required' });
    }

    try {
      const apiUrl = process.env.SALESMIND_API_URL || 'http://localhost:4250';
      const apiKey = process.env.SALESMIND_API_KEY;

      const response = await fetch(`${apiUrl}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(lead)
      });

      if (!response.ok) {
        throw new Error(`SalesMind API error: ${response.status}`);
      }

      const createdLead = await response.json();

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_created',
        source: SOURCE,
        target: 'salesos',
        entityType: 'lead',
        entityId: createdLead.id,
        timestamp: new Date(),
        data: createdLead,
        metadata: { source: SOURCE }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'lead.created',
        source: 'local',
        target: SOURCE,
        entityType: 'lead',
        entityId: createdLead.id,
        details: { lead: createdLead },
        beforeState: null,
        afterState: createdLead,
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.status(201).json({ success: true, lead: createdLead });
    } catch (error: any) {
      logger.error('Error creating SalesMind lead', { error: error.message });
      await auditLog.log({
        action: 'lead.created',
        source: 'local',
        target: SOURCE,
        entityType: 'lead',
        entityId: 'unknown',
        details: { error: error.message },
        status: 'failure',
        errorMessage: error.message,
        duration: Date.now() - startTime,
        requestId
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Update lead in SalesMind
  router.put('/leads/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const { lead } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    if (!lead) {
      return res.status(400).json({ error: 'Lead data required' });
    }

    try {
      const apiUrl = process.env.SALESMIND_API_URL || 'http://localhost:4250';
      const apiKey = process.env.SALESMIND_API_KEY;

      // Get current state for audit
      const currentResponse = await fetch(`${apiUrl}/api/leads/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const beforeState = currentResponse.ok ? await currentResponse.json() : null;

      const response = await fetch(`${apiUrl}/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(lead)
      });

      if (!response.ok) {
        throw new Error(`SalesMind API error: ${response.status}`);
      }

      const updatedLead = await response.json();

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_updated',
        source: SOURCE,
        target: 'salesos',
        entityType: 'lead',
        entityId: id,
        timestamp: new Date(),
        data: updatedLead,
        metadata: { source: SOURCE, beforeState }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'lead.updated',
        source: 'local',
        target: SOURCE,
        entityType: 'lead',
        entityId: id,
        details: { lead: updatedLead },
        beforeState,
        afterState: updatedLead,
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, lead: updatedLead });
    } catch (error: any) {
      logger.error('Error updating SalesMind lead', { error: error.message, leadId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Delete lead from SalesMind
  router.delete('/leads/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.SALESMIND_API_URL || 'http://localhost:4250';
      const apiKey = process.env.SALESMIND_API_KEY;

      const response = await fetch(`${apiUrl}/api/leads/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`SalesMind API error: ${response.status}`);
      }

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_deleted',
        source: SOURCE,
        target: 'salesos',
        entityType: 'lead',
        entityId: id,
        timestamp: new Date(),
        data: { deleted: true },
        metadata: { source: SOURCE }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'lead.deleted',
        source: 'local',
        target: SOURCE,
        entityType: 'lead',
        entityId: id,
        details: { deletedId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, message: 'Lead deleted' });
    } catch (error: any) {
      logger.error('Error deleting SalesMind lead', { error: error.message, leadId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook endpoint for inbound events from SalesMind
  router.post('/webhook', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { event, data } = req.body;

    try {
      const syncEvent: SyncEvent = {
        id: uuidv4(),
        type: event || 'sync.record_updated',
        source: SOURCE,
        target: 'salesos',
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
      logger.error('Error processing SalesMind webhook', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger sync from SalesMind to other systems
  router.post('/sync', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { targets = ['salesos', 'customerops', 'brandpulse'] } = req.body;
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
      logger.error('Error triggering sync from SalesMind', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export { router };
