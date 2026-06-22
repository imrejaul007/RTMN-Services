/**
 * REZ API Gateway — Cloudflare Worker (WAF Layer)
 * ================================================================
 *
 * This Worker sits in front of all REZ API services and provides:
 * 1. OWASP Top 10 protection (SQL injection, XSS, path traversal)
 * 2. Rate limiting (per-IP, per-endpoint)
 * 3. Bot detection and blocking
 * 4. Request/response logging
 * 5. CORS enforcement
 * 6. Circuit breaking (fail closed on upstream errors)
 * 7. Geo-blocking (configurable)
 *
 * Architecture:
 *   Client → Cloudflare WAF (this Worker) → Upstream Service (Render/Vercel)
 *
 * Deploy:
 *   wrangler deploy --env production
 *
 * Environment Variables (set via `wrangler secret put`):
 *   UPSTREAM_HOST        — Default upstream host
 *   AUTH_UPSTREAM_HOST   — Auth service host
 *   MERCHANT_UPSTREAM_HOST — Merchant service host
 *   WALLET_UPSTREAM_HOST — Wallet service host
 *   BLOCKED_COUNTRIES    — ISO 3166-1 alpha-2 codes, comma-separated (e.g., "RU,CN,KP")
 *   BLOCKED_IPS          — Comma-separated IP ranges to block
 *   RATE_LIMIT_AUTH      — Auth endpoint rate limit (req/min)
 *   RATE_LIMIT_API       — General API rate limit (req/min)
 *   CIRCUIT_BREAKER_THRESHOLD — Error % to trip circuit breaker
 * ================================================================
 */

import { Router } from 'itty-router';
import { withCors } from './middleware/cors';
import { withRateLimit } from './middleware/rateLimit';
import { withSecurityHeaders } from './middleware/securityHeaders';
import { withWaf } from './middleware/waf';
import { withBotProtection } from './middleware/botProtection';
import { withCircuitBreaker } from './middleware/circuitBreaker';
import { withGeoBlocking } from './middleware/geoBlocking';
import { withRequestLogging } from './middleware/logging';
import { withAuthProxy } from './routes/auth';
import { withMerchantProxy } from './routes/merchant';
import { withWalletProxy } from './routes/wallet';
import { withDefaultProxy } from './routes/default';

const router = Router();

// ── Global Middleware Pipeline ──────────────────────────────────────────────
// Order matters: Logging → Bot → Geo → WAF → Rate Limit → Circuit Breaker

router.all('*', withRequestLogging);
router.all('*', withBotProtection);
router.all('*', withGeoBlocking);
router.all('*', withSecurityHeaders);

// ── Route-Specific Middleware ────────────────────────────────────────────────

// Auth endpoints — strictest rate limiting
router.all('/auth/*', withRateLimit('auth'));
router.all('/auth/*', withCircuitBreaker('auth'));

// Merchant endpoints
router.all('/merchant/*', withRateLimit('api'));
router.all('/merchant/*', withCircuitBreaker('merchant'));

// Wallet endpoints — financial, high security
router.all('/wallet/*', withRateLimit('api'));
router.all('/wallet/*', withCircuitBreaker('wallet'));

// General API
router.all('/api/*', withRateLimit('api'));
router.all('/api/*', withWaf);
router.all('/api/*', withCors);
router.all('/api/*', withCircuitBreaker('default'));

// Health check (no rate limit, no WAF — for load balancer probes)
router.get('/health', (request: Request) => {
  return new Response(JSON.stringify({
    status: 'ok',
    service: 'rez-api-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
});

// ── Proxy Routes ────────────────────────────────────────────────────────────

router.all('/auth/*', withAuthProxy);
router.all('/merchant/*', withMerchantProxy);
router.all('/wallet/*', withWalletProxy);
router.all('/api/*', withDefaultProxy);

// ── 404 Handler ────────────────────────────────────────────────────────────

router.all('*', () => {
  return new Response(JSON.stringify({
    error: 'Not Found',
    message: 'The requested endpoint does not exist.',
    status: 404,
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ── Worker Entry Point ─────────────────────────────────────────────────────

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Merge env vars with defaults
    const config: Config = {
      upstreamHost: env.UPSTREAM_HOST || 'api.rez.money.pages.dev',
      authHost: env.AUTH_UPSTREAM_HOST || 'rez-auth-service.onrender.com',
      merchantHost: env.MERCHANT_UPSTREAM_HOST || 'rez-merchant-service.onrender.com',
      walletHost: env.WALLET_UPSTREAM_HOST || 'rez-wallet-service.onrender.com',
      blockedCountries: (env.BLOCKED_COUNTRIES || '').split(',').map(c => c.trim()).filter(Boolean),
      blockedIPs: (env.BLOCKED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean),
      rateLimits: {
        auth: parseInt(env.RATE_LIMIT_AUTH || '10', 10),
        api: parseInt(env.RATE_LIMIT_API || '100', 10),
      },
      circuitBreakerThreshold: parseInt(env.CIRCUIT_BREAKER_THRESHOLD || '50', 10),
    };

    // Handle the request through the middleware pipeline
    try {
      const response = await router.handle(request, env, ctx);
      return response;
    } catch (error) {
      // Global error handler — fail closed (don't expose internal errors)
      console.error('[API Gateway] Unhandled error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred. Please try again.',
        status: 500,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

// ── Types ────────────────────────────────────────────────────────────────

interface Env {
  UPSTREAM_HOST?: string;
  AUTH_UPSTREAM_HOST?: string;
  MERCHANT_UPSTREAM_HOST?: string;
  WALLET_UPSTREAM_HOST?: string;
  BLOCKED_COUNTRIES?: string;
  BLOCKED_IPS?: string;
  RATE_LIMIT_AUTH?: string;
  RATE_LIMIT_API?: string;
  CIRCUIT_BREAKER_THRESHOLD?: string;
}

interface Config {
  upstreamHost: string;
  authHost: string;
  merchantHost: string;
  walletHost: string;
  blockedCountries: string[];
  blockedIPs: string[];
  rateLimits: { auth: number; api: number };
  circuitBreakerThreshold: number;
}
