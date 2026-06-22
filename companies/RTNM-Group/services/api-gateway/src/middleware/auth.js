/**
 * Authentication Middleware
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rtmn-secret-key-change-in-production';

/**
 * Verify JWT token and attach user to request
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.requestId = req.headers['x-request-id'] || generateRequestId();
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Check if user has required role
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

/**
 * Check if user has access to industry
 */
export function requireIndustryAccess(industry) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userIndustry = req.user.industry;
    const userRoles = req.user.roles || [];
    
    // Admins have access to all industries
    if (userRoles.includes('admin')) {
      return next();
    }
    
    // Check if user has access to requested industry
    if (userIndustry !== industry && userIndustry !== 'general') {
      return res.status(403).json({ error: 'Industry access denied' });
    }
    
    next();
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default authMiddleware;
