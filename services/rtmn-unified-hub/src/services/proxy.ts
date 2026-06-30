/**
 * Proxy service — Routes requests to downstream services
 */

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { ServiceEntry, findServiceByPath } from './serviceRegistry.js';
import { buildProxyTargetUrl } from './proxyUtils.js';

export async function proxyRequest(req: Request, res: Response, next: NextFunction) {
  // Skip internal calls from dashboard to avoid circular routing
  if (req.headers['x-hub-internal'] === 'true') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Internal route, not proxyable' },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  // Use originalUrl which includes the /api prefix that was matched by app.use('/api', ...)
  // The middleware mounted at '/api' strips the prefix from req.path but keeps it in req.originalUrl
  const lookupPath = req.originalUrl.split('?')[0];
  const service = findServiceByPath(lookupPath);

  if (!service) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `No service registered for ${lookupPath}` },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  await proxyToService(req, res, service);
}

export async function proxyToService(req: Request, res: Response, service: ServiceEntry) {
  try {
    // Forward the full original path (with /api/<prefix>) to the downstream service.
    // See proxyUtils.ts for why we intentionally do NOT strip the prefix.
    const targetUrl = buildProxyTargetUrl(service, req.originalUrl);

    const response = await axios({
      method: req.method as any,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: {
        'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
        'content-type': 'application/json',
        'x-forwarded-by': 'rtmn-hub',
      },
      timeout: service.timeout,
      validateStatus: () => true,
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error(`[Hub] ${req.method} ${req.path} → ${service.url} failed: ${error.message}`);
    res.status(502).json({
      success: false,
      error: {
        code: 'DOWNSTREAM',
        message: 'Service unavailable',
        service: service.name,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }
}