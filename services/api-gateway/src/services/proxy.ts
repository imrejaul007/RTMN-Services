import express, { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

interface ServiceConfig {
  url: string;
  timeout?: number;
  retries?: number;
}

// Service registry
const SERVICES: Record<string, ServiceConfig> = {
  // Support Services
  'support-inbox': { url: process.env.SUPPORT_INBOX_URL || 'http://localhost:4870' },
  'knowledge-base': { url: process.env.KNOWLEDGE_BASE_URL || 'http://localhost:4871' },
  'ticket-service': { url: process.env.TICKET_SERVICE_URL || 'http://localhost:4872' },
  'sla-service': { url: process.env.SLA_SERVICE_URL || 'http://localhost:4873' },
  'analytics': { url: process.env.ANALYTICS_URL || 'http://localhost:4874' },
  'supporter-ai': { url: process.env.SUPPORTER_AI_URL || 'http://localhost:4878' },
  'customer-context': { url: process.env.CUSTOMER_CONTEXT_URL || 'http://localhost:4879' },

  // New Phase 2 Services
  'customer-intelligence': { url: process.env.CUSTOMER_INTELLIGENCE_URL || 'http://localhost:4885' },
  'workflow-engine': { url: process.env.WORKFLOW_ENGINE_URL || 'http://localhost:4886' },
  'action-registry': { url: process.env.ACTION_REGISTRY_URL || 'http://localhost:4887' },
  'hojai-intelligence': { url: process.env.HOJAI_INTELLIGENCE_URL || 'http://localhost:4881' },
  'notification-service': { url: process.env.NOTIFICATION_URL || 'http://localhost:4880' },
  'integration-hub': { url: process.env.INTEGRATION_HUB_URL || 'http://localhost:4890' },
  'agent-copilot': { url: process.env.AGENT_COPILOT_URL || 'http://localhost:4895' },

  // Foundation Services
  'corpId': { url: process.env.CORPID_URL || 'http://localhost:4702' },
  'memory-os': { url: process.env.MEMORY_OS_URL || 'http://localhost:4703' },
  'event-bus': { url: process.env.EVENT_BUS_URL || 'http://localhost:4510' },

  // CRM
  'crm-hub': { url: process.env.CRM_HUB_URL || 'http://localhost:4056' },
};

export function createServiceProxy(serviceName: string) {
  const config = SERVICES[serviceName];
  if (!config) {
    throw new Error(`Unknown service: ${serviceName}`);
  }

  return createProxyMiddleware({
    target: config.url,
    changeOrigin: true,
    pathRewrite: {
      [`^/services/${serviceName}`]: '',
    },
    onProxyReq: (proxyReq, req) => {
      // Add headers
      proxyReq.setHeader('X-Tenant-Id', (req as any).tenant?.tenantId || '');
      proxyReq.setHeader('X-User-Id', (req as any).auth?.userId || '');
      proxyReq.setHeader('X-Trace-Id', (req as any).traceId || '');

      if (config.timeout) {
        proxyReq.setTimeout(config.timeout);
      }
    },
    onProxyRes: (proxyRes, req, _res) => {
      // Log response
      console.log({
        service: serviceName,
        status: proxyRes.statusCode,
        traceId: (req as any).traceId
      });
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${serviceName}:`, err.message);
      (res as Response).status(502).json({
        success: false,
        error: 'Service unavailable',
        service: serviceName
      });
    }
  });
}

export function setupRoutes(app: express.Application) {
  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'api-gateway', version: '1.0.0' });
  });

  app.get('/health/live', (_req: Request, res: Response) => {
    res.json({ status: 'alive' });
  });

  app.get('/health/ready', async (_req: Request, res: Response) => {
    // Check service health
    const serviceStatuses: Record<string, boolean> = {};

    const healthChecks = Object.entries(SERVICES).map(async ([name, config]) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${config.url}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        serviceStatuses[name] = response.ok;
      } catch {
        serviceStatuses[name] = false;
      }
    });

    await Promise.all(healthChecks);

    const allHealthy = Object.values(serviceStatuses).every(s => s);

    res.json({
      status: allHealthy ? 'ready' : 'degraded',
      services: serviceStatuses
    });
  });

  // Service routes
  Object.keys(SERVICES).forEach(serviceName => {
    app.use(`/services/${serviceName}`, createServiceProxy(serviceName));
  });

  // Legacy routes (for backward compatibility)
  app.use('/api/support', createServiceProxy('support-inbox'));
  app.use('/api/kb', createServiceProxy('knowledge-base'));
  app.use('/api/tickets', createServiceProxy('ticket-service'));
  app.use('/api/sla', createServiceProxy('sla-service'));
  app.use('/api/analytics', createServiceProxy('analytics'));
  app.use('/api/ai', createServiceProxy('supporter-ai'));
  app.use('/api/customer-context', createServiceProxy('customer-context'));
  app.use('/api/customer-intelligence', createServiceProxy('customer-intelligence'));
  app.use('/api/workflows', createServiceProxy('workflow-engine'));
  app.use('/api/actions', createServiceProxy('action-registry'));
  app.use('/api/hojai', createServiceProxy('hojai-intelligence'));
  app.use('/api/notifications', createServiceProxy('notification-service'));
  app.use('/api/integrations', createServiceProxy('integration-hub'));
  app.use('/api/copilot', createServiceProxy('agent-copilot'));
}

export { SERVICES };
