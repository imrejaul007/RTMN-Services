/**
 * CORS — Cross-Origin Resource Sharing enforcement
 */

import type { Middleware } from 'itty-router';

const ALLOWED_ORIGINS = [
  'https://rez.money',
  'https://www.rez.money',
  'https://now.rez.money',
  'https://app.nextabizz.com',
  'https://hotel.rez.money',
  'https://rendez.in',
  'http://localhost', // dev only
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.join(' '),
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Internal-Token',
    'Accept',
    'Origin',
    'Cache-Control',
  ].join(', '),
  'Access-Control-Expose-Headers': [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-Id',
  ].join(', '),
  'Access-Control-Max-Age': '86400', // 24 hours
};

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed =>
    allowed === origin || origin.endsWith('.rez.money') || origin.endsWith('.vercel.app'),
  );
}

export function withCors(): Middleware {
  return async (request: Request): Promise<Response | undefined> => {
    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      const accessControlRequestHeader = request.headers.get('Access-Control-Request-Headers');

      const headers = new Headers(CORS_HEADERS);
      if (accessControlRequestHeader) {
        headers.set('Access-Control-Allow-Headers', accessControlRequestHeader);
      }

      // Check origin
      if (origin && !isOriginAllowed(origin)) {
        headers.set('Access-Control-Allow-Origin', 'null');
        headers.set('Vary', 'Origin');
        return new Response(null, { status: 204, headers });
      }

      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          'Vary': 'Origin',
        },
      });
    }

    // Add CORS headers to actual requests
    const origin = request.headers.get('Origin');
    if (origin && isOriginAllowed(origin)) {
      (request as any).__corsOrigin = origin;
    }

    return undefined;
  };
}
