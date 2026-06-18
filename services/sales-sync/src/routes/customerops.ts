import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Synchronizer } from '../services/synchronizer';
import { AuditLog } from '../services/auditLog';
import { SyncSource, SyncEvent } from '../models/Sync';

const router = Router();
const SOURCE: SyncSource = 'customerops';

/**
 * Initialize Customer Ops routes
 */
export default function customeropsRoutes(
  synchronizer: Synchronizer,
  auditLog: AuditLog,
  logger: any
) {
  // Health check for Customer Ops integration
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const apiUrl = process.env.CUSTOMEROPS_API_URL || 'http://localhost:4780';
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

  // Get all customers from Customer Ops
  router.get('/customers', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.CUSTOMEROPS_API_URL || 'http://localhost:4780';
      const apiKey = process.env.CUSTOMEROPS_API_KEY;

      const response = await fetch(`${apiUrl}/api/customers`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Customer Ops API error: ${response.status}`);
      }

      const data = await response.json();
      const customers = data.customers || data;

      // Queue sync events
      for (const customer of customers) {
        const event: SyncEvent = {
          id: uuidv4(),
          type: 'sync.record_updated',
          source: SOURCE,
          target: 'salesmind',
          entityType: 'customer',
          entityId: customer.id,
          timestamp: new Date(),
          data: customer,
          metadata: { source: SOURCE }
        };
        await synchronizer.queueEvent(event);
      }

      await auditLog.log({
        action: 'customers.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'customer',
        entityId: 'batch',
        details: { count: customers.length },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({
        success: true,
        source: SOURCE,
        count: customers.length,
        customers
      });
    } catch (error: any) {
      logger.error('Error fetching Customer Ops customers', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get single customer
  router.get('/customers/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.CUSTOMEROPS_API_URL || 'http://localhost:4780';
      const apiKey = process.env.CUSTOMEROPS_API_KEY;

      const response = await fetch(`${apiUrl}/api/customers/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Customer Ops API error: ${response.status}`);
      }

      const customer = await response.json();

      await auditLog.log({
        action: 'customer.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'customer',
        entityId: id,
        details: { customerId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, customer });
    } catch (error: any) {
      logger.error('Error fetching Customer Ops customer', { error: error.message, customerId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Create customer in Customer Ops
  router.post('/customers', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;
    const { customer } = req.body;

    if (!customer) {
      return res.status(400).json({ error: 'Customer data required' });
    }

    try {
      const apiUrl = process.env.CUSTOMEROPS_API_URL || 'http://localhost:4780';
      const apiKey = process.env.CUSTOMEROPS_API_KEY;

      const response = await fetch(`${apiUrl}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(customer)
      });

      if (!response.ok) {
        throw new Error(`Customer Ops API error: ${response.status}`);
      }

      const createdCustomer = await response.json();

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_created',
        source: SOURCE,
        target: 'salesmind',
        entityType: 'customer',
        entityId: createdCustomer.id,
        timestamp: new Date(),
        data: createdCustomer,
        metadata: { source: SOURCE }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'customer.created',
        source: 'local',
        target: SOURCE,
        entityType: 'customer',
        entityId: createdCustomer.id,
        details: { customer: createdCustomer },
        beforeState: null,
        afterState: createdCustomer,
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.status(201).json({ success: true, customer: createdCustomer });
    } catch (error: any) {
      logger.error('Error creating Customer Ops customer', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update customer in Customer Ops
  router.put('/customers/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const { customer } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    if (!customer) {
      return res.status(400).json({ error: 'Customer data required' });
    }

    try {
      const apiUrl = process.env.CUSTOMEROPS_API_URL || 'http://localhost:4780';
      const apiKey = process.env.CUSTOMEROPS_API_KEY;

      // Get current state
      const currentResponse = await fetch(`${apiUrl}/api/customers/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const beforeState = currentResponse.ok ? await currentResponse.json() : null;

      const response = await fetch(`${apiUrl}/api/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(customer)
      });

      if (!response.ok) {
        throw new Error(`Customer Ops API error: ${response.status}`);
      }

      const updatedCustomer = await response.json();

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_updated',
        source: SOURCE,
        target: 'salesmind',
        entityType: 'customer',
        entityId: id,
        timestamp: new Date(),
        data: updatedCustomer,
        metadata: { source: SOURCE, beforeState }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'customer.updated',
        source: 'local',
        target: SOURCE,
        entityType: 'customer',
        entityId: id,
        details: { customer: updatedCustomer },
        beforeState,
        afterState: updatedCustomer,
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, customer: updatedCustomer });
    } catch (error: any) {
      logger.error('Error updating Customer Ops customer', { error: error.message, customerId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Delete customer from Customer Ops
  router.delete('/customers/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.CUSTOMEROPS_API_URL || 'http://localhost:4780';
      const apiKey = process.env.CUSTOMEROPS_API_KEY;

      const response = await fetch(`${apiUrl}/api/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Customer Ops API error: ${response.status}`);
      }

      // Queue sync event
      const event: SyncEvent = {
        id: uuidv4(),
        type: 'sync.record_deleted',
        source: SOURCE,
        target: 'salesmind',
        entityType: 'customer',
        entityId: id,
        timestamp: new Date(),
        data: { deleted: true },
        metadata: { source: SOURCE }
      };
      await synchronizer.queueEvent(event);

      await auditLog.log({
        action: 'customer.deleted',
        source: 'local',
        target: SOURCE,
        entityType: 'customer',
        entityId: id,
        details: { deletedId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, message: 'Customer deleted' });
    } catch (error: any) {
      logger.error('Error deleting Customer Ops customer', { error: error.message, customerId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Get customer activities
  router.get('/customers/:id/activities', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.CUSTOMEROPS_API_URL || 'http://localhost:4780';
      const apiKey = process.env.CUSTOMEROPS_API_KEY;

      const response = await fetch(`${apiUrl}/api/customers/${id}/activities`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Customer Ops API error: ${response.status}`);
      }

      const activities = await response.json();

      await auditLog.log({
        action: 'activities.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'activity',
        entityId: id,
        details: { customerId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, activities });
    } catch (error: any) {
      logger.error('Error fetching Customer Ops activities', { error: error.message, customerId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Get customer support tickets
  router.get('/customers/:id/tickets', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    const requestId = req.headers['x-request-id'] as string;

    try {
      const apiUrl = process.env.CUSTOMEROPS_API_URL || 'http://localhost:4780';
      const apiKey = process.env.CUSTOMEROPS_API_KEY;

      const response = await fetch(`${apiUrl}/api/customers/${id}/tickets`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Customer Ops API error: ${response.status}`);
      }

      const tickets = await response.json();

      await auditLog.log({
        action: 'tickets.fetched',
        source: SOURCE,
        target: 'local',
        entityType: 'ticket',
        entityId: id,
        details: { customerId: id },
        status: 'success',
        duration: Date.now() - startTime,
        requestId
      });

      res.json({ success: true, tickets });
    } catch (error: any) {
      logger.error('Error fetching Customer Ops tickets', { error: error.message, customerId: id });
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook endpoint for inbound events from Customer Ops
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
      logger.error('Error processing Customer Ops webhook', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger sync from Customer Ops to other systems
  router.post('/sync', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { targets = ['salesmind', 'salesos', 'brandpulse'] } = req.body;
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
      logger.error('Error triggering sync from Customer Ops', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export { router };
