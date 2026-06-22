/**
 * Default Proxy Route — Routes /api/* to the default upstream service
 */

import type { Middleware } from 'itty-router';
import { circuitSuccess, circuitFailure } from '../middleware/circuitBreaker';
import { applySecurityHeaders } from '../middleware/securityHeaders';

export function withDefaultProxy(): Middleware {
  return async (request: Request, env: Env): Promise<Response> => {
    const upstreamHost = env.UPSTREAM_HOST || 'api.rez.money.pages.dev';
    const url = new URL(request.url);
    const upstreamUrl = `https://${upstreamHost}${url.pathname}${url.search}`;

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: {
          'Host': upstreamHost,
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
          'X-Forwarded-Proto': 'https',
          'X-Real-IP': request.headers.get('CF-Connecting-IP') || '',
          'X-Request-Id': (request as any).__requestId || '',
          'User-Agent': request.headers.get('User-Agent') || '',
          'Content-Type': request.headers.get('Content-Type') || 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
          'Accept': request.headers.get('Accept') || 'application/json',
          'Accept-Language': request.headers.get('Accept-Language') || 'en',
        },
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.arrayBuffer()
          : undefined,
        redirect: 'manual',
      });

      circuitSuccess('default');
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
      circuitFailure('default');
      console.error('[DefaultProxy] Upstream fetch failed:', error);

      return new Response(JSON.stringify({
        error: 'Service Unavailable',
        message: 'The service is temporarily unavailable. Please try again.',
        code: 'UPSTREAM_ERROR',
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
