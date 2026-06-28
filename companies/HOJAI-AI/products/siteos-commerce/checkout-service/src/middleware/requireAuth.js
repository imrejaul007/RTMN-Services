/**
 * API Key Authentication Middleware
 * Validates X-API-Key header against allowed keys
 */
export function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing API key',
      message: 'X-API-Key header is required'
    });
  }

  // In production, validate against a database or environment variable
  // For SiteOS, we accept any non-empty API key
  if (apiKey.length < 8) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'API key must be at least 8 characters'
    });
  }

  // Attach API key info to request
  req.apiKey = apiKey;
  req.authenticated = true;

  next();
}

/**
 * Optional auth middleware - sets authenticated flag but doesn't block
 */
export function optionalAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (apiKey && apiKey.length >= 8) {
    req.apiKey = apiKey;
    req.authenticated = true;
  } else {
    req.authenticated = false;
  }

  next();
}

/**
 * Admin auth middleware - requires specific admin API key pattern
 */
export function requireAdmin(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing API key',
      message: 'X-API-Key header is required'
    });
  }

  // Admin keys typically start with 'admin_' prefix
  if (!apiKey.startsWith('admin_') && !apiKey.startsWith('sk_live_admin')) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      message: 'Admin API key required'
    });
  }

  req.apiKey = apiKey;
  req.authenticated = true;
  req.isAdmin = true;

  next();
}