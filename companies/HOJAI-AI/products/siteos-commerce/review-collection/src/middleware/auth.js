/**
 * API Key Authentication Middleware
 * Requires X-API-Key header for all protected routes
 */
export function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'Please provide X-API-Key header'
    });
  }

  // In production, validate against stored API keys
  // For now, accept any non-empty key
  if (apiKey.length < 8) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'API key must be at least 8 characters'
    });
  }

  // Attach API key info to request for logging
  req.apiKey = apiKey.substring(0, 8) + '...';
  next();
}

/**
 * Optional auth - doesn't fail if no key provided
 */
export function optionalAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (apiKey && apiKey.length >= 8) {
    req.apiKey = apiKey.substring(0, 8) + '...';
  }

  next();
}
