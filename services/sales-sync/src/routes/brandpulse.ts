import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Synchronizer } from '../services/synchronizer';
import { AuditLog } from '../services/auditLog';
import { SyncSource, SyncEvent } from '../models/Sync';

const router = Router();
const SOURCE: SyncSource = 'brandpulse';

/**
 * Initialize BrandPulse routes
 */
export default function brandpulseRoutes(
  synchronizer: Synchronizer,
  auditLog: AuditLog,
  logger: any
) {
  // Health check for BrandPulse integration
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const apiUrl = process.env.BRANDPULSE_API_URL || 'http://localhost:5057';
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

  // Get all sales from BrandPulse
  router.get('/sales', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.BRANDPULSE_API_URL || 'http://localhost:5057';
      const apiKey = process.env.BRANDPULSE_API_KEY;

      const response = await fetch(`${apiUrl}/api/sales`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`BrandPulse API error: ${response.status}`);
      }

      const data = await response.json();
      const sales = data.sales || data;

      // Queue sync events
      for (const sale of sales) {
        const event: SyncEvent = {
          id: uuidv4(),
          type: 'sync.record_updated',
          source: SOURCE,
          target: 'salesos',
          entityType: 'sale',
          entityId: sale.id,
          timestamp: new Date(),
          data: sale,
          metadata: { source: SOURCE }
        };
        await synchronizer.queueEvent(event);
      }

      await auditLog.log({
        action: 'sales.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'sale',
        entityId: 'batch',
        details: { count: sales.length },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({
        success: true,
        source: SOURCE,
        count: sales.length,
        sales
      });
    } catch (error: any) {
      logger.error('Error fetching BrandPulse sales', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get single sale
  router.get('/sales/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.BRANDPULSE_API_URL || 'http://localhost:5057';
      const apiKey = process.env.BRANDPULSE_API_KEY;

      const response = await fetch(`${apiUrl}/api/sales/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`BrandPulse API error: ${response.status}`);
      }

      const sale = await response.json();

      await auditLog.log({
        action: 'sale.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'sale',
        entityId: id,
        details: { saleId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, sale });
    } catch (error: any) {
      logger.error('Error fetching BrandPulse sale', { error: error.message, saleId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Create sale in BrandPulse
  router.post('/sales', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;
    const { sale } = req.body;

    if (!sale) {
      return res.status(400).json({ error: 'Sale data required' });
    }

    try {
      const apiUrl = process.env.BRANDPULSE_API_URL || 'http://localhost:5057';
      const apiKey = process.env.BRANDPULSE_API_KEY;

      const response = await fetch(`${apiUrl}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(sale)
      });

      if (!response.ok) {
        throw new Error(`BrandPulse API error: ${response.status}`);
      }

      const createdSale = await response.json();

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_created',
        source: SOURCE,
        target: 'salesos',
        entityType: 'sale',
        entityId: createdSale.id,
        timestamp: new Date(),
        data: createdSale,
        metadata: { source: SOURCE }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'sale.created',
        source: 'local',
        target: SOURCE,
        entityType: 'sale',
        entityId: createdSale.id,
        details: { sale: createdSale },
        beforeState: null,
        afterState: createdSale,
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.status(201).json({ success: true, sale: createdSale });
    } catch (error: any) {
      logger.error('Error creating BrandPulse sale', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update sale in BrandPulse
  router.put('/sales/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const { sale } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    if (!sale) {
      return res.status(400).json({ error: 'Sale data required' });
    }

    try {
      const apiUrl = process.env.BRANDPULSE_API_URL || 'http://localhost:5057';
      const apiKey = process.env.BRANDPULSE_API_KEY;

      // Get current state
      const currentResponse = await fetch(`${apiUrl}/api/sales/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const beforeState = currentResponse.ok ? await currentResponse.json() : null;

      const response = await fetch(`${apiUrl}/api/sales/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(sale)
      });

      if (!response.ok) {
        throw new Error(`BrandPulse API error: ${response.status}`);
      }

      const updatedSale = await response.json();

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_updated',
        source: SOURCE,
        target: 'salesos',
        entityType: 'sale',
        entityId: id,
        timestamp: new Date(),
        data: updatedSale,
        metadata: { source: SOURCE, beforeState }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'sale.updated',
        source: 'local',
        target: SOURCE,
        entityType: 'sale',
        entityId: id,
        details: { sale: updatedSale },
        beforeState,
        afterState: updatedSale,
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, sale: updatedSale });
    } catch (error: any) {
      logger.error('Error updating BrandPulse sale', { error: error.message, saleId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Delete sale from BrandPulse
  router.delete('/sales/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.BRANDPULSE_API_URL || 'http://localhost:5057';
      const apiKey = process.env.BRANDPULSE_API_KEY;

      const response = await fetch(`${apiUrl}/api/sales/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`BrandPulse API error: ${response.status}`);
      }

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_deleted',
        source: SOURCE,
        target: 'salesos',
        entityType: 'sale',
        entityId: id,
        timestamp: new Date(),
        data: { deleted: true },
        metadata: { source: SOURCE }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'sale.deleted',
        source: 'local',
        target: SOURCE,
        entityType: 'sale',
        entityId: id,
        details: { deletedId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, message: 'Sale deleted' });
    } catch (error: any) {
      logger.error('Error deleting BrandPulse sale', { error: error.message, saleId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Get brand analytics
  router.get('/analytics', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.BRANDPULSE_API_URL || 'http://localhost:5057';
      const apiKey = process.env.BRANDPULSE_API_KEY;

      const response = await fetch(`${apiUrl}/api/analytics`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`BrandPulse API error: ${response.status}`);
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
      logger.error('Error fetching BrandPulse analytics', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get campaign performance
  router.get('/campaigns', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.BRANDPULSE_API_URL || 'http://localhost:5057';
      const apiKey = process.env.BRANDPULSE_API_KEY;

      const response = await fetch(`${apiUrl}/api/campaigns`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`BrandPulse API error: ${response.status}`);
      }

      const campaigns = await response.json();

      await auditLog.log({
        action: 'campaigns.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'campaign',
        entityId: 'batch',
        details: {},
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, campaigns });
    } catch (error: any) {
      logger.error('Error fetching BrandPulse campaigns', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get revenue reports
  router.get('/reports/revenue', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;
    const { startDate, endDate } = req.query;

    try {
      const apiUrl = process.env.BRANDPULSE_API_URL || 'http://localhost:5057';
      const apiKey = process.env.BRANDPULSE_API_KEY;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate as string);
      if (endDate) params.append('endDate', endDate as string);

      const response = await fetch(`${apiUrl}/api/reports/revenue?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`BrandPulse API error: ${response.status}`);
      }

      const report = await response.json();

      await auditLog.log({
        action: 'revenue_report.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'report',
        entityId: 'revenue',
        details: { startDate, endDate },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, report });
    } catch (error: any) {
      logger.error('Error fetching BrandPulse revenue report', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook endpoint for inbound events from BrandPulse
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
      logger.error('Error processing BrandPulse webhook', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger sync from BrandPulse to other systems
  router.post('/sync', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { targets = ['salesmind', 'salesos', 'customerops'] } = req.body;
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
      logger.error('Error triggering sync from BrandPulse', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export { router };
