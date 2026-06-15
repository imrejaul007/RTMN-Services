/**
 * RTMN Auth Module - Universal Authentication
 *
 * This module provides authentication for all Industry OS services.
 * Uses CorpID as the universal identity provider.
 *
 * Usage:
 *   import { createAuthMiddleware, createIndustryAuth } from './shared/auth';
 *
 * Industry Roles:
 *   - owner: Full access to their business
 *   - manager: Manage operations
 *   - staff: Basic operations
 *   - customer: Public access
 */

const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';

// Auth store - in production, use Redis
const sessions = new Map();
const apiKeys = new Map();

// Simple JWT-like token (for demo - use real JWT in production)
function createToken(payload, expiresIn = 86400000) {
  const token = Buffer.from(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + expiresIn
  })).toString('base64');
  return token;
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid token' };
  }
}

// Generate API key for industry services
function generateApiKey(industry, businessId) {
  const key = `${industry.toUpperCase()}_${businessId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  apiKeys.set(key, { industry, businessId, created: Date.now() });
  return key;
}

// Auth middleware factory
function createAuthMiddleware(options = {}) {
  const { required = true, roles = ['owner', 'manager', 'staff', 'customer'] } = options;

  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    // Check API key first
    if (apiKey) {
      const keyData = apiKeys.get(apiKey);
      if (keyData) {
        req.auth = { type: 'api-key', ...keyData };
        return next();
      }
    }

    // Check Bearer token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = verifyToken(token);
      if (result.valid) {
        req.auth = { type: 'token', ...result.payload };
        return next();
      }
    }

    if (required) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        hint: 'Send Authorization: Bearer <token> or X-API-Key: <key>'
      });
    }

    next();
  };
}

// Industry-specific auth setup
function createIndustryAuth(industry, industryConfig = {}) {
  const {
    defaultRole = 'customer',
    allowedRoles = ['owner', 'manager', 'staff', 'customer']
  } = industryConfig;

  // Industry-specific endpoints
  const auth = {
    industry,
    allowedRoles,

    // Register/login business
    async registerBusiness(businessData) {
      const businessId = `BIZ_${industry.toUpperCase()}_${Date.now()}`;
      const ownerId = `OWN_${industry.toUpperCase()}_${Date.now()}`;

      const business = {
        id: businessId,
        ownerId,
        industry,
        name: businessData.name,
        email: businessData.email,
        phone: businessData.phone,
        address: businessData.address,
        status: 'active',
        plan: businessData.plan || 'starter',
        createdAt: new Date().toISOString()
      };

      // Create owner account
      const owner = {
        id: ownerId,
        businessId,
        industry,
        role: 'owner',
        email: businessData.email,
        name: businessData.ownerName || businessData.name,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      // Generate API key
      const apiKey = generateApiKey(industry, businessId);

      // Create session token
      const token = createToken({
        userId: ownerId,
        businessId,
        industry,
        role: 'owner'
      });

      sessions.set(ownerId, { business, owner, token });

      return {
        success: true,
        business,
        owner,
        apiKey,
        token,
        endpoints: {
          health: `http://localhost:${businessData.port || 5010}/health`,
          api: `http://localhost:${businessData.port || 5010}/api`
        }
      };
    },

    // Login
    async login(email, password) {
      // Find by email
      for (const [userId, session] of sessions) {
        if (session.owner?.email === email) {
          const token = createToken({
            userId,
            businessId: session.business.id,
            industry,
            role: session.owner.role
          });
          session.token = token;
          return {
            success: true,
            token,
            user: { id: userId, email, role: session.owner.role }
          };
        }
      }
      return { success: false, error: 'Invalid credentials' };
    },

    // Verify token
    verifyToken,

    // Check permission
    hasPermission(userRole, requiredRole) {
      const roleHierarchy = ['owner', 'manager', 'staff', 'customer'];
      const userLevel = roleHierarchy.indexOf(userRole);
      const requiredLevel = roleHierarchy.indexOf(requiredRole);
      return userLevel <= requiredLevel;
    },

    // Create customer token (for public access)
    createCustomerToken(customerId, businessId) {
      return createToken({
        userId: customerId,
        businessId,
        industry,
        role: 'customer'
      });
    },

    // Auth middleware
    middleware: createAuthMiddleware({ required: false })
  };

  return auth;
}

// Export individual industry auth instances
const auth = {
  restaurant: createIndustryAuth('restaurant', { port: 5010 }),
  hotel: createIndustryAuth('hotel', { port: 5025 }),
  healthcare: createIndustryAuth('healthcare', { port: 5020 }),
  retail: createIndustryAuth('retail', { port: 5030 }),
  legal: createIndustryAuth('legal', { port: 5035 }),
  hospitality: createIndustryAuth('hospitality', { port: 5050 }),
  education: createIndustryAuth('education', { port: 5060 }),
  automotive: createIndustryAuth('automotive', { port: 5080 }),
  beauty: createIndustryAuth('beauty', { port: 5090 }),
  fitness: createIndustryAuth('fitness', { port: 5110 }),
  manufacturing: createIndustryAuth('manufacturing', { port: 5150 }),
  realestate: createIndustryAuth('realestate', { port: 5230 }),
  agent: createIndustryAuth('agent-twin', { port: 3011 }),
  area: createIndustryAuth('area-twin', { port: 3012 }),
  buyer: createIndustryAuth('buyer-twin', { port: 3013 }),
  deal: createIndustryAuth('deal-twin', { port: 3014 }),
  property: createIndustryAuth('property-twin', { port: 3015 }),
  referral: createIndustryAuth('referral-twin', { port: 3016 })
};

module.exports = { createIndustryAuth, createAuthMiddleware, auth };