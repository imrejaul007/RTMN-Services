/**
 * CorpID Auth Integration - Connect Finance OS to CorpID
 */

const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';

/**
 * Verify user token from CorpID
 */
async function verifyToken(token) {
  try {
    const res = await fetch(`${CORPID_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      return { valid: false, error: 'Invalid token' };
    }

    return await res.json();
  } catch (error) {
    console.warn('CorpID verification failed:', error.message);
    return { valid: false, error: error.message };
  }
}

/**
 * Get user permissions from CorpID
 */
async function getUserPermissions(userId) {
  try {
    const res = await fetch(`${CORPID_URL}/api/users/${userId}/permissions`, {
      headers: {
        'X-Internal-Token': process.env.CORPID_TOKEN || 'dev-token'
      }
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (error) {
    console.warn('CorpID permissions fetch failed:', error.message);
    return [];
  }
}

/**
 * Check if user has specific permission
 */
async function hasPermission(token, permission) {
  const user = await verifyToken(token);
  if (!user.valid) return false;

  const permissions = await getUserPermissions(user.userId);
  return permissions.includes(permission) || permissions.includes('admin');
}

/**
 * Get user organization context
 */
async function getOrganizationContext(token) {
  const user = await verifyToken(token);
  if (!user.valid) return null;

  try {
    const res = await fetch(`${CORPID_URL}/api/users/${user.userId}/context`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) return { userId: user.userId, orgId: 'default' };

    return await res.json();
  } catch (error) {
    return { userId: user.userId, orgId: 'default' };
  }
}

/**
 * Auth middleware for Express
 */
function authMiddleware(options = {}) {
  const { required = true, permissions = [] } = options;

  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    // Development bypass
    if (process.env.NODE_ENV === 'development' && !token) {
      req.user = { userId: 'dev-user', orgId: 'dev-org', role: 'admin' };
      return next();
    }

    if (!token) {
      if (required) {
        return res.status(401).json({ error: 'Authorization required' });
      }
      return next();
    }

    const user = await verifyToken(token);

    if (!user.valid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get permissions
    const userPermissions = await getUserPermissions(user.userId);

    // Check required permissions
    if (permissions.length > 0) {
      const hasAll = permissions.every(p =>
        userPermissions.includes(p) || userPermissions.includes('admin')
      );

      if (!hasAll) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions
        });
      }
    }

    // Get organization context
    const context = await getOrganizationContext(token);

    req.user = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      orgId: context?.orgId || 'default',
      role: user.role,
      permissions: userPermissions
    };

    next();
  };
}

/**
 * Health check for CorpID connection
 */
async function healthCheck() {
  try {
    const res = await fetch(`${CORPID_URL}/health`, {
      timeout: 3000
    });

    if (!res.ok) return { healthy: false, status: res.status };

    const data = await res.json();
    return { healthy: true, data };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

module.exports = {
  verifyToken,
  getUserPermissions,
  hasPermission,
  getOrganizationContext,
  authMiddleware,
  healthCheck
};
