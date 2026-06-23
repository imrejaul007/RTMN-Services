import { Router, Request, Response } from 'express';
import axios from 'axios';

export const healthRouter = Router();

/**
 * Health check endpoint
 * Verifies REZ Intelligence Integration is running and connected
 */
healthRouter.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  const services = {
    self: { status: 'healthy', latency: 0 },
    rez_intel_bridge: { status: 'unknown', latency: null as number | null },
    intent_engine: { status: 'unknown', latency: null as number | null }
  };

  // Check REZ Intel Bridge
  try {
    const bridgeStart = Date.now();
    const REZ_INTEL_BRIDGE = process.env.REZ_INTEL_BRIDGE_URL || 'http://localhost:5369';
    const bridgeRes = await axios.get(`${REZ_INTEL_BRIDGE}/health`, { timeout: 3000 });
    services.rez_intel_bridge = {
      status: bridgeRes.status === 200 ? 'healthy' : 'degraded',
      latency: Date.now() - bridgeStart
    };
  } catch (err) {
    services.rez_intel_bridge = { status: 'unhealthy', latency: null };
  }

  // Check Intent Engine
  try {
    const engineStart = Date.now();
    const INTENT_ENGINE = process.env.INTENT_ENGINE_URL || 'http://localhost:4800';
    const engineRes = await axios.get(`${INTENT_ENGINE}/health`, { timeout: 3000 });
    services.intent_engine = {
      status: engineRes.status === 200 ? 'healthy' : 'degraded',
      latency: Date.now() - engineStart
    };
  } catch (err) {
    services.intent_engine = { status: 'unhealthy', latency: null };
  }

  // Self latency
  services.self.latency = Date.now() - startTime;

  const allHealthy = Object.values(services).every(
    (s) => s.status === 'healthy' || s.status === 'unknown'
  );

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    service: 'rez-intelligence-integration',
    version: '1.0.0',
    port: 5370,
    services,
    total_latency_ms: Date.now() - startTime,
    timestamp: new Date().toISOString()
  });
});
