/**
 * RTMN CorpID Integration - JWT Authentication Middleware
 *
 * Connects Workforce OS to CorpID (Port 4702)
 * for Universal Identity and Authentication
 */

import jwt from 'jsonwebtoken';
import axios from 'axios';

const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const JWT_SECRET = process.env.JWT_SECRET || 'rtmn-workforce-secret-key';

// CorpID API Client
class CorpIDClient {
  constructor() {
    this.baseURL = CORPID_URL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
    });
  }

  // Verify token with CorpID
  async verifyToken(token) {
    try {
      const { data } = await this.client.get('/api/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    } catch (error) {
      // If CorpID is not available, decode JWT locally
      return this.decodeLocal(token);
    }
  }

  // Decode JWT locally
  decodeLocal(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Get user by ID
  async getUser(userId) {
    try {
      const { data } = await this.client.get(`/api/users/${userId}`);
      return data;
    } catch (error) {
      return null;
    }
  }

  // Create user in CorpID
  async createUser(userData) {
    try {
      const { data } = await this.client.post('/api/users', userData);
      return data;
    } catch (error) {
      // If CorpID not available, return mock response
      return {
        id: userData.email || `user_${Date.now()}`,
        email: userData.email,
        name: userData.name,
        tenantId: userData.tenantId || 'default'
      };
    }
  }

  // Update user in CorpID
  async updateUser(userId, updates) {
    try {
      const { data } = await this.client.patch(`/api/users/${userId}`, updates);
      return data;
    } catch (error) {
      return updates;
    }
  }
}

export const corpidClient = new CorpIDClient();

// JWT Token Generation
export function generateToken(user, tenantId = 'default') {
  const payload = {
    sub: user.id || user.employeeId,
    email: user.email,
    name: user.name || `${user.firstName} ${user.lastName}`,
    role: user.role || 'employee',
    tenantId,
    permissions: user.permissions || ['read'],
    employeeId: user.employeeId,
    department: user.departmentId,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify Token Middleware
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For development, allow unauthenticated access with mock user
      if (process.env.NODE_ENV === 'development') {
        req.user = {
          id: 'dev-user',
          email: 'dev@rtmn.com',
          name: 'Development User',
          role: 'admin',
          tenantId: 'default',
          permissions: ['read', 'write', 'admin']
        };
        req.tenantId = 'default';
        return next();
      }
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Try CorpID verification first
    let decoded = await corpidClient.verifyToken(token);

    // Fallback to local verification
    if (!decoded) {
      decoded = jwt.verify(token, JWT_SECRET);
    }

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      tenantId: decoded.tenantId,
      permissions: decoded.permissions || [],
      employeeId: decoded.employeeId,
      department: decoded.department,
    };
    req.tenantId = decoded.tenantId;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Role-Based Access Control
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
}

// Permission Check
export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const hasPermission = permissions.every(p => req.user.permissions.includes(p));

    if (!hasPermission && !req.user.permissions.includes('admin')) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permissions
      });
    }

    next();
  };
}

// Tenant Isolation Middleware
export function tenantIsolation(req, res, next) {
  // All data operations use tenantId from JWT
  req.query.tenantId = req.tenantId;
  next();
}

// Sync employee to CorpID
export async function syncEmployeeToCorpID(employee) {
  try {
    const corpidUser = {
      email: employee.email,
      name: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.employeeId,
      department: employee.departmentId,
      role: 'employee',
      metadata: {
        position: employee.positionId,
        employmentType: employee.employmentType,
        joiningDate: employee.joiningDate,
      }
    };

    const result = await corpidClient.createUser(corpidUser);
    return result;
  } catch (error) {
    console.error('CorpID sync error:', error.message);
    return null;
  }
}

export default {
  corpidClient,
  generateToken,
  authMiddleware,
  requireRole,
  requirePermission,
  tenantIsolation,
  syncEmployeeToCorpID,
};
