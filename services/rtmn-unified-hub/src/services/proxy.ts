/**
 * Proxy service — Routes requests to downstream services
 */

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { ServiceEntry, findServiceByPath } from './serviceRegistry.js';

export async function proxyRequest(req: Request, res: Response, next: NextFunction) {
  const service = findServiceByPath(req.path);

  if (!service) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `No service registered for ${req.path}` },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  await proxyToService(req, res, service);
}

export async function proxyToService(req: Request, res: Response, service: ServiceEntry) {
  try {
    const strippedPath = req.path.replace(service.prefix, '') || '/';
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const targetUrl = `${service.url}${strippedPath}${queryString}`;

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