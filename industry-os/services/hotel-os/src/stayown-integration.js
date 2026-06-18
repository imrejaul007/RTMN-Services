/**
 * StayOwn-Hospitality Integration for Hotel OS
 *
 * Wires the Hotel OS (5025) to the StayOwn-Hospitality / REZ-Merchant hotel services
 * that actually implement the hotel domain logic (rooms, bookings, POS, folios,
 * payments, concierge, housekeeping, etc).
 *
 * This module is intentionally thin: every route here is a thin proxy to the
 * underlying service. The Hotel OS stays the public entry point for the RTMN
 * Hub while the real logic lives in the domain services.
 *
 * Run `registerRoutes(app)` once at boot to install the proxy routes.
 */

const express = require('express');
const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `[stayown] ${timestamp} ${level}: ${message}`)
  ),
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------
// Service registry. Each entry points to a real StayOwn / REZ
// service. URLs can be overridden via env vars at boot.
// ---------------------------------------------------------------
const STAYOWN_SERVICES = {
  'rez-hotel-service': process.env.REZ_HOTEL_SERVICE_URL || 'http://localhost:4015',
  'rez-hotel-pos-service': process.env.REZ_HOTEL_POS_SERVICE_URL || 'http://localhost:4005',
  'rez-stayown-service': process.env.REZ_STAYOWN_SERVICE_URL || 'http://localhost:4016',
  'rez-booking': process.env.REZ_BOOKING_URL || 'http://localhost:4020',
  'rez-payment': process.env.REZ_PAYMENT_URL || 'http://localhost:4025',
  'rez-housekeeping': process.env.REZ_HOUSEKEEPING_URL || 'http://localhost:4030',
  'rez-pms': process.env.REZ_PMS_URL || 'http://localhost:4802',
  'hotel-pms': process.env.HOTEL_PMS_URL || 'http://localhost:4803',
  'ai-front-desk': process.env.AI_FRONT_DESK_URL || 'http://localhost:4810',
  'concierge-desk': process.env.CONCIERGE_DESK_URL || 'http://localhost:4811',
  'hojai-staybot': process.env.HOJAI_STAYBOT_URL || 'http://localhost:4812',
  'room-controls': process.env.ROOM_CONTROLS_URL || 'http://localhost:4820',
  'minibar-service': process.env.MINIBAR_SERVICE_URL || 'http://localhost:4821',
  'parking-service': process.env.PARKING_SERVICE_URL || 'http://localhost:4822',
  'pre-arrival-service': process.env.PRE_ARRIVAL_URL || 'http://localhost:4823',
  'voice-hotel-agent': process.env.VOICE_HOTEL_AGENT_URL || 'http://localhost:4824',
  'smart-lock-service': process.env.SMART_LOCK_URL || 'http://localhost:4825',
  'hotel-restaurant-booking': process.env.HOTEL_RESTAURANT_BOOKING_URL || 'http://localhost:4830',
  'hotel-spa-booking': process.env.HOTEL_SPA_BOOKING_URL || 'http://localhost:4831',
  'guest-twin-service': process.env.GUEST_TWIN_URL || 'http://localhost:4840',
  'hotel-business-twin': process.env.HOTEL_BUSINESS_TWIN_URL || 'http://localhost:4841',
  'predictive-housekeeping': process.env.PREDICTIVE_HOUSEKEEPING_URL || 'http://localhost:4850',
  'upsell-engine': process.env.UPSELL_ENGINE_URL || 'http://localhost:4851',
  'zero-checkout-automation': process.env.ZERO_CHECKOUT_URL || 'http://localhost:4852',
  'loyalty-system': process.env.LOYALTY_SYSTEM_URL || 'http://localhost:4860',
  'feedback-survey': process.env.FEEDBACK_SURVEY_URL || 'http://localhost:4861',
  'review-manager': process.env.REVIEW_MANAGER_URL || 'http://localhost:4862',
  'lost-found': process.env.LOST_FOUND_URL || 'http://localhost:4863',
  'rez-auth': process.env.REZ_AUTH_URL || 'http://localhost:4002',
  'rez-wallet': process.env.REZ_WALLET_URL || 'http://localhost:4004',
};

// Reverse lookup: human label -> service key
const STAYOWN_LABELS = {
  'hotel-search': 'rez-hotel-service',
  'hotel-details': 'rez-hotel-service',
  'bookings': 'rez-hotel-service',
  'pos': 'rez-hotel-pos-service',
  'folio': 'rez-hotel-pos-service',
  'payments': 'rez-hotel-pos-service',
  'outlets': 'rez-hotel-pos-service',
  'housekeeping': 'rez-housekeeping',
  'pms': 'rez-pms',
  'front-desk': 'ai-front-desk',
  'concierge': 'concierge-desk',
  'staybot': 'hojai-staybot',
  'rooms-controls': 'room-controls',
  'minibar': 'minibar-service',
  'parking': 'parking-service',
  'pre-arrival': 'pre-arrival-service',
  'voice-agent': 'voice-hotel-agent',
  'smart-lock': 'smart-lock-service',
  'restaurant-booking': 'hotel-restaurant-booking',
  'spa-booking': 'hotel-spa-booking',
  'guest-twin': 'guest-twin-service',
  'business-twin': 'hotel-business-twin',
  'predictive-hk': 'predictive-housekeeping',
  'upsell': 'upsell-engine',
  'zero-checkout': 'zero-checkout-automation',
  'loyalty': 'loyalty-system',
  'feedback': 'feedback-survey',
  'reviews': 'review-manager',
  'lost-found': 'lost-found',
  'auth': 'rez-auth',
  'wallet': 'rez-wallet',
};

const STAYOWN_TIMEOUT_MS = Number(process.env.STAYOWN_TIMEOUT_MS || 8000);

const http = axios.create({
  timeout: STAYOWN_TIMEOUT_MS,
  headers: { 'content-type': 'application/json' },
  validateStatus: () => true, // we want the raw status from downstream
});

// ---------------------------------------------------------------
// Generic proxy helper. Re-emits method, path, query and body and
// copies back the response. The Hotel OS becomes a single front
// door for all StayOwn services.
// ---------------------------------------------------------------
async function proxyRequest(req, res, serviceKey, downstreamPath) {
  const baseUrl = STAYOWN_SERVICES[serviceKey];
  if (!baseUrl) {
    return res.status(500).json({
      success: false,
      error: `Unknown StayOwn service: ${serviceKey}`,
    });
  }

  const url = `${baseUrl}${downstreamPath}`;
  const startedAt = Date.now();

  try {
    const response = await http({
      method: req.method,
      url,
      params: req.query,
      data: req.body,
      headers: {
        // Forward only the safe, useful subset
        authorization: req.headers.authorization,
        'x-tenant-id': req.headers['x-tenant-id'],
        'x-property-id': req.headers['x-property-id'],
        'x-guest-id': req.headers['x-guest-id'],
      },
    });

    const duration = Date.now() - startedAt;
    logger.info(`${req.method} ${req.originalUrl} -> ${serviceKey} ${response.status} (${duration}ms)`);

    res.status(response.status).json({
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      meta: {
        source: serviceKey,
        upstream: downstreamPath,
        duration_ms: duration,
      },
    });
  } catch (err) {
    const duration = Date.now() - startedAt;
    logger.error(`${req.method} ${req.originalUrl} -> ${serviceKey} ERROR (${duration}ms): ${err.message}`);
    res.status(502).json({
      success: false,
      error: `StayOwn service ${serviceKey} unreachable`,
      detail: err.message,
    });
  }
}

// ---------------------------------------------------------------
// One Express Router per logical area. Every route forwards to
// the right StayOwn service with a sensible default path.
// ---------------------------------------------------------------
function buildStayownRouter() {
  const router = express.Router();

  // ---- rez-hotel-service (4015) - hotels & bookings ----------
  router.get('/hotels/search', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-service', '/api/hotels/search')
  );
  router.get('/hotels/:id', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-service', `/api/hotels/${encodeURIComponent(req.params.id)}`)
  );
  router.post('/bookings', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-service', '/api/bookings')
  );
  router.get('/bookings/:id', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-service', `/api/bookings/${encodeURIComponent(req.params.id)}`)
  );
  router.post('/sync/hotels', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-service', '/api/sync/hotels')
  );

  // ---- rez-hotel-pos-service (4005) - POS, folios, payments --
  // Folio
  router.post('/folio', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', '/api/folio')
  );
  router.get('/folio/:folioId', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', `/api/folio/${encodeURIComponent(req.params.folioId)}`)
  );
  router.get('/folio/:folioId/summary', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', `/api/folio/${encodeURIComponent(req.params.folioId)}/summary`)
  );
  router.get('/folio/guest/:guestId', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', `/api/folio/guest/${encodeURIComponent(req.params.guestId)}`)
  );
  router.get('/folio/property/:propertyId', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', `/api/folio/property/${encodeURIComponent(req.params.propertyId)}`)
  );
  router.post('/folio/charge', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', '/api/folio/charge')
  );
  router.post('/folio/close', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', '/api/folio/close')
  );

  // Payment
  router.post('/payments/process', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', '/api/payment/process')
  );
  router.post('/payments/refund', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', '/api/payment/refund')
  );
  router.post('/payments/charge', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', '/api/payment/charge')
  );
  router.get('/payments/methods', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', '/api/payment/methods')
  );
  router.get('/payments/folio/:folioId', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service', `/api/payment/folio/${encodeURIComponent(req.params.folioId)}`)
  );

  // Outlets (restaurant, minibar, spa, banquet)
  router.get('/outlets/restaurant/:outletId/:propertyId/menu', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service',
      `/api/outlet/restaurant/${encodeURIComponent(req.params.outletId)}/${encodeURIComponent(req.params.propertyId)}/menu`)
  );
  router.post('/outlets/restaurant/:outletId/:propertyId/order', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service',
      `/api/outlet/restaurant/${encodeURIComponent(req.params.outletId)}/${encodeURIComponent(req.params.propertyId)}/order`)
  );
  router.get('/outlets/spa/:outletId/:propertyId/treatments', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service',
      `/api/outlet/spa/${encodeURIComponent(req.params.outletId)}/${encodeURIComponent(req.params.propertyId)}/treatments`)
  );
  router.post('/outlets/spa/:outletId/:propertyId/booking', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service',
      `/api/outlet/spa/${encodeURIComponent(req.params.outletId)}/${encodeURIComponent(req.params.propertyId)}/booking`)
  );
  router.post('/outlets/banquet/:outletId/:propertyId/booking', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service',
      `/api/outlet/banquet/${encodeURIComponent(req.params.outletId)}/${encodeURIComponent(req.params.propertyId)}/booking`)
  );
  router.get('/outlets/minibar/:outletId/:propertyId/inventory', (req, res) =>
    proxyRequest(req, res, 'rez-hotel-pos-service',
      `/api/outlet/minibar/${encodeURIComponent(req.params.outletId)}/${encodeURIComponent(req.params.propertyId)}/inventory`)
  );

  return router;
}

// ---------------------------------------------------------------
// Public mount points. These are exposed on the Hotel OS itself,
// e.g. GET /stayown/hotels/search will reach rez-hotel-service.
// ---------------------------------------------------------------
function registerRoutes(app) {
  // 1. Catch-all proxy for the named services
  app.use('/stayown', buildStayownRouter());

  // 2. Shortcut aliases used by the Hub and other RTMN services
  app.get('/api/stayown/registry', (req, res) => {
    const services = Object.entries(STAYOWN_SERVICES).map(([key, url]) => ({
      key,
      url,
      label: Object.entries(STAYOWN_LABELS).find(([, v]) => v === key)?.[0] || null,
    }));
    res.json({
      success: true,
      count: services.length,
      services,
    });
  });

  // 3. Aggregated health snapshot for all StayOwn services
  app.get('/api/stayown/health', async (req, res) => {
    const checks = await Promise.all(
      Object.entries(STAYOWN_SERVICES).map(async ([key, url]) => {
        try {
          const r = await axios.get(`${url}/health`, { timeout: 2000, validateStatus: () => true });
          return {
            key,
            url,
            ok: r.status >= 200 && r.status < 300,
            status: r.status,
            data: r.data,
          };
        } catch (err) {
          return { key, url, ok: false, error: err.message };
        }
      })
    );
    const okCount = checks.filter((c) => c.ok).length;
    res.json({
      success: true,
      total: checks.length,
      healthy: okCount,
      unhealthy: checks.length - okCount,
      services: checks,
    });
  });

  // 4. Per-label short cuts under /api/stayown/<label>/...
  //    e.g. POST /api/stayown/bookings  -> rez-hotel-service /api/bookings
  app.use('/api/stayown', (req, res, next) => {
    if (req.method !== 'POST' && req.method !== 'GET') return next();
    const label = req.path.replace(/^\/+/, '').split('/')[0];
    const serviceKey = STAYOWN_LABELS[label];
    if (!serviceKey) return next();
    const downstream = req.path.replace(new RegExp(`^/${label}`), `/api/${label}`);
    return proxyRequest(req, res, serviceKey, downstream);
  });

  logger.info(`StayOwn integration registered (${Object.keys(STAYOWN_SERVICES).length} services)`);
}

module.exports = {
  registerRoutes,
  STAYOWN_SERVICES,
  STAYOWN_LABELS,
};
