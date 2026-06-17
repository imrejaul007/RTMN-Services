import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { RABTULAuthProfile, createRABTULAuthProfile } from '../models/RABTULProfile';

const router = Router();

// In-memory store for demo (replace with database in production)
const authProfiles = new Map<string, RABTULAuthProfile>();

// RABTUL Auth Service URL
const RABTUL_AUTH_URL = process.env.RABTUL_AUTH_URL || 'http://localhost:4002';

/**
 * POST /api/auth/register
 * Register a new user with RABTUL Auth
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, firstName, lastName, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const profile = createRABTULAuthProfile({
      email,
      phone,
      firstName,
      lastName,
      status: 'active',
      kycStatus: 'pending'
    });

    // Sync to Identity Twin
    try {
      await axios.post(`${process.env.IDENTITY_TWIN_URL || 'http://localhost:4702'}/api/identity`, {
        id: profile.id,
        corpid: profile.corpid,
        email: profile.email,
        phone: profile.phone,
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        type: 'user',
        source: 'rabtul-auth',
        metadata: { kycStatus: profile.kycStatus }
      }, {
        headers: { 'X-Request-ID': req.headers['x-request-id'] }
      });
    } catch (err) {
      req.app.locals.logger?.warn('Failed to sync to Identity Twin', { error: err });
    }

    authProfiles.set(profile.id, profile);

    res.status(201).json({
      success: true,
      data: profile,
      message: 'User registered successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with RABTUL Auth
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // In production, call RABTUL Auth Service
    const profile = Array.from(authProfiles.values()).find(p => p.email === email);

    if (!profile) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionId = uuidv4();
    const token = Buffer.from(JSON.stringify({
      userId: profile.id,
      sessionId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })).toString('base64');

    res.json({
      success: true,
      data: {
        token,
        sessionId,
        user: {
          id: profile.id,
          email: profile.email,
          status: profile.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/profile/:id
 * Get user profile from RABTUL Auth
 */
router.get('/profile/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const profile = authProfiles.get(id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile/:id
 * Update user profile
 */
router.put('/profile/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const profile = authProfiles.get(id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const updatedProfile: RABTULAuthProfile = {
      ...profile,
      ...updates,
      id: profile.id,
      updatedAt: new Date()
    };

    authProfiles.set(id, updatedProfile);

    // Sync to Identity Twin
    try {
      await axios.put(`${process.env.IDENTITY_TWIN_URL || 'http://localhost:4702'}/api/identity/${id}`, {
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        name: `${updatedProfile.firstName || ''} ${updatedProfile.lastName || ''}`.trim(),
        metadata: { kycStatus: updatedProfile.kycStatus, status: updatedProfile.status }
      }, {
        headers: { 'X-Request-ID': req.headers['x-request-id'] }
      });
    } catch (err) {
      req.app.locals.logger?.warn('Failed to sync profile update to Identity Twin', { error: err });
    }

    res.json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/kyc
 * Submit KYC verification
 */
router.post('/kyc', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, documentType, documentNumber, verificationData } = req.body;

    if (!userId || !documentType || !documentNumber) {
      return res.status(400).json({ error: 'userId, documentType, and documentNumber are required' });
    }

    const profile = authProfiles.get(userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // In production, integrate with KYC service
    const kycRequest = {
      id: uuidv4(),
      userId,
      documentType,
      documentNumber,
      verificationData,
      status: 'pending',
      createdAt: new Date()
    };

    res.json({
      success: true,
      data: {
        kycRequest,
        message: 'KYC verification initiated'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/verify/:token
 * Verify authentication token
 */
router.get('/verify/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

      if (decoded.expiresAt < Date.now()) {
        return res.status(401).json({ error: 'Token expired' });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          userId: decoded.userId,
          sessionId: decoded.sessionId
        }
      });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    // In production, invalidate the token in RABTUL Auth

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
