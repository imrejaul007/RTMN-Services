// RTMN API Gateway - Vercel Serverless Functions
// Routes requests to Render backend services

const https = require('https');

// Service registry - maps paths to Render backend URLs
const SERVICES = {
  // Foundation
  'corp': 'rtmn-corpid-service.onrender.com',
  'memory': 'rtmn-memory-os.onrender.com',
  'twins': 'rtmn-twinos-hub.onrender.com',
  'goal': 'rtmn-goal-os.onrender.com',
  'decision': 'rtmn-decision-engine.onrender.com',
  'economy': 'rtmn-agent-economy.onrender.com',

  // Industry OS
  'restaurant': 'rtmn-restaurant-os.onrender.com',
  'healthcare': 'rtmn-healthcare-os.onrender.com',
  'hotel': 'rtmn-hotel-os.onrender.com',
  'retail': 'rtmn-retail-os.onrender.com',
  'legal': 'rtmn-legal-os.onrender.com',
  'hospitality': 'rtmn-hospitality-os.onrender.com',
  'education': 'rtmn-education-os.onrender.com',
  'automotive': 'rtmn-automotive-os.onrender.com',
  'beauty': 'rtmn-beauty-os.onrender.com',
  'fitness': 'rtmn-fitness-os.onrender.com',
  'manufacturing': 'rtmn-manufacturing-os.onrender.com',
  'realestate': 'rtmn-realestate-os.onrender.com',

  // Digital Twins
  'agent-twin': 'rtmn-agent-twin.onrender.com',
  'area-twin': 'rtmn-area-twin.onrender.com',
  'buyer-twin': 'rtmn-buyer-twin.onrender.com',
  'deal-twin': 'rtmn-deal-twin.onrender.com',
  'property-twin': 'rtmn-property-twin.onrender.com',
  'referral-twin': 'rtmn-referral-twin.onrender.com',
};

module.exports = async (req, res) => {
  const { pathname } = req;

  // Health check endpoint
  if (pathname === '/health' || pathname === '/api/health') {
    return res.status(200).json({
      status: 'healthy',
      service: 'rtmn-api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: Object.keys(SERVICES).length
    });
  }

  // Route: /api/:service/:path
  const match = pathname.match(/^\/api\/([a-z-]+)\/(.*)$/);
  if (!match) {
    return res.status(400).json({
      error: 'Invalid route. Use /api/:service/:path',
      example: '/api/restaurant/menus',
      services: Object.keys(SERVICES)
    });
  }

  const [, service, path] = match;
  const backendHost = SERVICES[service];

  if (!backendHost) {
    return res.status(404).json({
      error: 'Service not found',
      service,
      available: Object.keys(SERVICES)
    });
  }

  // Proxy to backend
  const options = {
    hostname: backendHost,
    port: 443,
    path: `/${path}`,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'RTMN-API-Gateway/1.0'
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode).set(proxyRes.headers).send(proxyRes.data);
  });

  proxyReq.on('error', (err) => {
    res.status(502).json({
      error: 'Backend error',
      service,
      message: err.message
    });
  });

  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }

  proxyReq.end();
};
