import { Request, Response } from 'express';
import { decisionEngine } from '../services/decisionEngine';
import { customerOpsBridge } from '../services/customerOpsBridge';
import { twinSync } from '../services/twinSync';
import { eventBus } from '../services/eventBus';

export class HealthController {
  static async healthCheck(req: Request, res: Response): Promise<void> {
    const checks = {
      service: 'refund-engine',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        decisionEngine: false,
        customerTwin: false,
        twins: { payment: false, agent: false },
        eventBus: false
      }
    };

    try {
      // Check dependencies in parallel
      const [decisionHealth, customerHealth, twinHealth, eventHealth] = await Promise.all([
        decisionEngine.healthCheck().catch(() => false),
        customerOpsBridge.healthCheck().catch(() => false),
        twinSync.healthCheck().catch(() => ({ paymentTwin: false, agentTwin: false })),
        eventBus.healthCheck().catch(() => false)
      ]);

      checks.dependencies.decisionEngine = decisionHealth;
      checks.dependencies.customerTwin = customerHealth;
      checks.dependencies.twins = twinHealth;
      checks.dependencies.eventBus = eventHealth;

      // Check if any critical dependency is down
      const criticalDown = !checks.dependencies.decisionEngine;

      if (criticalDown) {
        checks.status = 'degraded';
      }

      const statusCode = checks.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json(checks);
    } catch (error) {
      checks.status = 'unhealthy';
      res.status(503).json(checks);
    }
  }
}
