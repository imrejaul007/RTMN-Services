/**
 * Merchant Proxy Route — Routes /merchant/* to REZ Merchant Service
 */

import type { Middleware } from 'itty-router';
import { circuitSuccess, circuitFailure } from '../middleware/circuitBreaker';
import { applySecurityHeaders } from '../middleware/securityHeaders';

export function withMerchantProxy(): Middleware {
  return async (request: Request, env: Env): Promise<Response> => {
    const merchantHost = env.MERCHANT_UPSTREAM_HOST || 'rez-merchant-service.onrender.com';
    const url = new URL(request.url);

    // Rewrite path: /merchant/stores → /api/merchant/stores
    const upstreamPath = url.pathname.replace(/^\/merchant/, '/api/merchant') + url.search;
    const upstreamUrl = `https://${merchantHost}${upstreamPath}`;

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: {
          'Host': merchantHost,
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
          'X-Forwarded-Proto': 'https',
          'X-Real-IP': request.headers.get('CF-Connecting-IP') || '',
          'X-Request-Id': (request as any).__requestId || '',
          'User-Agent': request.headers.get('User-Agent') || '',
          'Content-Type': request.headers.get('Content-Type') || 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
          'X-Internal-Token': request.headers.get('X-Internal-Token') || '',
        },
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.arrayBuffer()
          : undefined,
        redirect: 'manual',
      });

      circuitSuccess('merchant');
      let response = applySecurityHeaders(upstreamResponse);

      const rateLimitHeaders = (request as any).__rateLimitHeaders;
      if (rateLimitHeaders) {
        const headers = new Headers(response.headers);
        for (const [key, value] of Object.entries(rateLimitHeaders)) {
          headers.set(key, value);
        }
        response = new Response(response.body, { status: response.status, headers });
      }

      const corsOrigin = (request as any).__corsOrigin;
      if (corsOrigin) {
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', corsOrigin);
        response = new Response(response.body, { status: response.status, headers });
      }

      return response;
    } catch (error) {
      circuitFailure('merchant');
      console.error('[MerchantProxy] Upstream fetch failed:', error);

      return new Response(JSON.stringify({
        error: 'Service Unavailable',
        message: 'Merchant service is temporarily unavailable.',
        code: 'UPSTREAM_ERROR',
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
