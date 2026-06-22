/**
 * Auth Proxy Route — Routes /auth/* to REZ Auth Service
 */

import type { Middleware } from 'itty-router';
import { circuitSuccess, circuitFailure } from '../middleware/circuitBreaker';
import { applySecurityHeaders } from '../middleware/securityHeaders';

export function withAuthProxy(): Middleware {
  return async (request: Request, env: Env): Promise<Response> => {
    const authHost = env.AUTH_UPSTREAM_HOST || 'rez-auth-service.onrender.com';
    const url = new URL(request.url);

    // Rewrite path: /auth/otp → /api/auth/otp
    const upstreamPath = url.pathname.replace(/^\/auth/, '/api/auth') + url.search;

    const upstreamUrl = `https://${authHost}${upstreamPath}`;

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: {
          'Host': authHost,
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
          'X-Forwarded-Proto': 'https',
          'X-Real-IP': request.headers.get('CF-Connecting-IP') || '',
          'X-Request-Id': (request as any).__requestId || '',
          'User-Agent': request.headers.get('User-Agent') || '',
          'Content-Type': request.headers.get('Content-Type') || 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.arrayBuffer()
          : undefined,
        redirect: 'manual',
      });

      circuitSuccess('auth');
    } catch (error) {
      circuitFailure('auth');
      console.error('[AuthProxy] Upstream fetch failed:', error);

      return new Response(JSON.stringify({
        error: 'Service Unavailable',
        message: 'Auth service is temporarily unavailable.',
        code: 'UPSTREAM_ERROR',
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add security headers and rate limit headers
    let response = applySecurityHeaders(upstreamResponse);

    // Add rate limit headers if present
    const rateLimitHeaders = (request as any).__rateLimitHeaders;
    if (rateLimitHeaders) {
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(rateLimitHeaders)) {
        headers.set(key, value);
           response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // Add CORS origin if present
    const corsOrigin = (request as any).__corsOrigin;
    if (corsOrigin) {
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', corsOrigin);
      response = new Response(response.body, {
        status: response.status,
        headers,
      });
    }

    return response;
  };
}
