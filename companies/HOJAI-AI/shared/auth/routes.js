/**
 * Industry Auth Routes Template
 *
 * Add these routes to each Industry OS service for authentication.
 *
 * Usage in service:
 *   import { industryAuth } from './shared/auth/routes';
 *   app.use('/auth', industryAuth('restaurant'));
 */

const express = require('express');
const crypto = require('crypto');

// In-memory stores (use Redis in production)
const businesses = new Map();
const users = new Map();
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createIndustryAuth(industry) {
  const router = express.Router();

  // Register business (owner signup)
  router.post('/register', async (req, res) => {
    const { businessName, ownerName, email, phone, password, plan } = req.body;

    if (!businessName || !ownerName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: businessName, ownerName, email, password'
      });
    }

    // Check if email exists
    for (const [, user] of users) {
      if (user.email === email && user.industry === industry) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered for this industry'
        });
      }
    }

    const businessId = `BIZ_${industry.toUpperCase()}_${Date.now()}`;
    const ownerId = `OWN_${industry.toUpperCase()}_${Date.now()}`;
    const sessionId = `SES_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create business
    const business = {
      id: businessId,
      name: businessName,
      industry,
      email,
      phone: phone || '',
      plan: plan || 'starter',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // Create owner user
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const owner = {
      id: ownerId,
      businessId,
      industry,
      email,
      name: ownerName,
      role: 'owner',
      passwordHash,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // Create session
    const token = generateToken();
    sessions.set(token, {
      userId: ownerId,
      businessId,
      industry,
      role: 'owner',
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    });

    businesses.set(businessId, business);
    users.set(ownerId, owner);

    res.status(201).json({
      success: true,
      message: `${industry} business registered`,
      business: {
        id: businessId,
        name: businessName,
        industry,
        plan: business.plan
      },
      user: {
        id: ownerId,
        name: ownerName,
        email,
        role: 'owner'
      },
      token,
      expiresIn: '30 days'
    });
  });

  // Login
  router.post('/login', async (req, res) => {
    const { email, password, industry: reqIndustry } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const targetIndustry = reqIndustry || industry;

    // Find user
    for (const [userId, user] of users) {
      if (user.email === email && user.industry === targetIndustry) {
        if (user.passwordHash !== passwordHash) {
          return res.status(401).json({
            success: false,
            error: 'Invalid password'
          });
        }

        // Create new session
        const token = generateToken();
        sessions.set(token, {
          userId,
          businessId: user.businessId,
          industry: user.industry,
          role: user.role,
          createdAt: Date.now(),
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
        });

        return res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: userId,
            name: user.name,
            email: user.email,
            role: user.role,
            businessId: user.businessId
          },
          business: businesses.get(user.businessId),
          token
        });
      }
    }

    res.status(401).json({
      success: false,
      error: 'User not found'
    });
  });

  // Verify token
  router.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const session = sessions.get(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    if (session.expiresAt < Date.now()) {
      sessions.delete(token);
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    const user = users.get(session.userId);
    const business = businesses.get(session.businessId);

    res.json({
      success: true,
      valid: true,
      user: {
        id: session.userId,
        name: user?.name,
        email: user?.email,
        role: session.role
      },
      business: business ? {
        id: business.id,
        name: business.name,
        industry: business.industry
      } : null
    });
  });

  // Logout
  router.post('/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      sessions.delete(token);
    }
    res.json({ success: true, message: 'Logged out' });
  });

  // Add staff
  router.post('/staff', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const session = sessions.get(token);

    if (!session || session.role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Only owners can add staff' });
    }

    const { name, email, role, password } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ success: false, error: 'Name, email, role required' });
    }

    const staffId = `STF_${industry.toUpperCase()}_${Date.now()}`;
    const passwordHash = crypto.createHash('sha256').update(password || 'default123').digest('hex');

    const staff = {
      id: staffId,
      businessId: session.businessId,
      industry,
      email,
      name,
      role: ['manager', 'staff'].includes(role) ? role : 'staff',
      passwordHash,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    users.set(staffId, staff);

    res.status(201).json({
      success: true,
      staff: {
        id: staffId,
        name,
        email,
        role: staff.role
      }
    });
  });

  // Get business info
  router.get('/business', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const session = sessions.get(token);

    if (!session) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const business = businesses.get(session.businessId);
    res.json({ success: true, business });
  });

  return router;
}

module.exports = { createIndustryAuth };