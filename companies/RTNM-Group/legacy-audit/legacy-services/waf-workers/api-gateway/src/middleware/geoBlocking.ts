/**
 * Geo-Blocking — Block or challenge traffic from specific countries
 */

import type { Middleware } from 'itty-router';

export function withGeoBlocking(): Middleware {
  return async (request: Request, env: Env): Promise<Response | undefined> => {
    const country = request.headers.get('CF-IPCountry') || 'XX';
    const blockedCountries = (env.BLOCKED_COUNTRIES || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

    if (blockedCountries.includes(country)) {
      console.warn('[GeoBlock] Blocked request from:', { country, path: new URL(request.url).pathname });

      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'Access from your region is not permitted.',
        code: 'GEO_BLOCKED',
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    return undefined;
  };
}
