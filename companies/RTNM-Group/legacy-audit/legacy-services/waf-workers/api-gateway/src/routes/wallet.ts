/**
 * Wallet Proxy Route — Routes /wallet/* to REZ Wallet Service
 */

import type { Middleware } from 'itty-router';
import { circuitSuccess, circuitFailure } from '../middleware/circuitBreaker';
import { applySecurityHeaders } from '../middleware/securityHeaders';

export function withWalletProxy(): Middleware {
  return async (request: Request, env: Env): Promise<Response> => {
    const walletHost = env.WALLET_UPSTREAM_HOST || 'rez-wallet-service.onrender.com';
    const url = new URL(request.url);

    // Rewrite path: /wallet/balance → /api/wallet/balance
    const upstreamPath = url.pathname.replace(/^\/wallet/, '/api/wallet') + url.search;
    const upstreamUrl = `https://${walletHost}${upstreamPath}`;

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: {
          'Host': walletHost,
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

      circuitSuccess('wallet');
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
      circuitFailure('wallet');
      console.error('[WalletProxy] Upstream fetch failed:', error);

      return new Response(JSON.stringify({
        error: 'Service Unavailable',
        message: 'Wallet service is temporarily unavailable.',
        code: 'UPSTREAM_ERROR',
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
