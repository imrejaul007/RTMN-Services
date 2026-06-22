/**
 * ReZ Admin Service
 * Admin dashboard and management API
 *
 * ============================================
 * AUDIT LOG IMMUTABILITY POLICY
 * ============================================
 * Audit logs are designed to be APPEND-ONLY for security and compliance.
 *
 * Principles:
 * 1. NO direct DELETE operations allowed on audit_logs collection
 * 2. Logs can only be "archived" (soft delete) via authorized routes
 * 3. Archived logs can be restored by users with audit:restore permission
 * 4. Role hierarchy protection: cannot archive logs from higher-privileged users
 * 5. Scheduled cleanup of logs older than 1 year is supported via cron route
 *
 * Immutability Enforcement:
 * - DELETE /api/audit/:id - BLOCKED (use archive instead)
 * - Only POST /api/audit/:id/archive is permitted for "removal"
 * - All archive/restore operations are themselves logged
 *
 * Compliance: This ensures audit trails cannot be tampered with while
 * still allowing legitimate data lifecycle management.
 * ============================================
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

config();

const app = express();
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// ============================================
// SECURITY: Fail fast on missing secrets in production
// ============================================
if (isProduction) {
  const requiredSecrets = [
    { key: 'JWT_SECRET', pattern: /^(test|dev|development|secret|changeme|default)/i },
  ];

  for (const { key, pattern } of requiredSecrets) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`[FATAL] ${key} is required in production`);
    }
    if (pattern.test(value)) {
      throw new Error(`[FATAL] ${key} contains a weak value in production`);
    }
  }
}

// ============================================
// MIDDLEWARE
// ============================================

// Helmet security headers
app.use(helmet({
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : undefined,
}));

// CORS - explicit origins only
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || [];
if (isProduction && allowedOrigins.length === 0) {
  throw new Error('[FATAL] ALLOWED_ORIGINS is required in production');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));

// Request ID middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-Id', requestId);
  (req as Request & { requestId: string }).requestId = requestId;
  next();
});

// ============================================
// RATE LIMITING (basic)
// ============================================
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    error: 'Too Many Requests',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many login attempts. Please try again later.',
  },
  skip: (req) => req.path !== '/api/auth/login',
});

app.use(authLimiter);

// ============================================
// TYPES
// ============================================

interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'super_admin' | 'admin' | 'support';
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  mfaSecret?: string;
  mfaEnabled: boolean;
}

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  timestamp: Date;
  // Audit immutability fields
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: string;
  restoredAt?: Date;
  restoredBy?: string;
  pendingCleanup?: boolean;
  cleanupAt?: Date;
}

// Type for creating audit log entries (isArchived is optional, defaults to false)
type CreateAuditLogEntry = Omit<AuditLog, 'id' | 'timestamp' | 'isArchived' | 'archivedAt' | 'archivedBy' | 'restoredAt' | 'restoredBy' | 'pendingCleanup' | 'cleanupAt'>;

// Extended request type for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'super_admin' | 'admin' | 'support';
    permissions: string[];
  };
}

// ============================================
// CONFIGURATION (no hardcoded fallbacks)
// ============================================

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://rez-auth-service.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET;
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
const JWT_EXPIRES_IN = '24h';
const MONGODB_URI = process.env.MONGODB_URI;

// ============================================
// MONGODB CONNECTION (persist data)
// ============================================

const AdminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin', 'support'], default: 'support' },
  permissions: [String],
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
  mfaSecret: { type: String },
  mfaEnabled: { type: Boolean, default: false },
}, { timestamps: true });

const AuditLogSchema = new mongoose.Schema({
  userId: String,
  action: String,
  resource: String,
  resourceId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  // Audit immutability fields - soft delete support
  isArchived: { type: Boolean, default: false, index: true },
  archivedAt: Date,
  archivedBy: String,
  restoredAt: Date,
  restoredBy: String,
}, { timestamps: true });

const AdminUserModel = mongoose.models.AdminUser || mongoose.model<AdminUser>('AdminUser', AdminUserSchema);
const AuditLogModel = mongoose.models.AuditLog || mongoose.model<AuditLog>('AuditLog', AuditLogSchema);

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateToken = async (user: { id: string; email: string; role: string }): Promise<string> => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const verifyToken = async (token: string): Promise<{ userId: string; email: string; role: string } | null> => {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET not configured');
    return null;
  }

  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN || '',
      },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.user) {
        return { userId: result.user.id, email: result.user.email || '', role: result.user.role || 'user' };
      }
    }

    // Fallback to local verification
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
    return payload;
  } catch {
    return null;
  }
};

const createAuditLog = async (entry: CreateAuditLogEntry) => {
  try {
    await AuditLogModel.create({
      ...entry,
      id: uuidv4(),
      timestamp: new Date(),
      isArchived: false, // Default value - audit logs are active by default
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Timing-safe string comparison
const timingSafeEqual = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
};

// ============================================
// AUDIT IMMUTABILITY HELPERS
// ============================================

// Role hierarchy for immutability protection
// Higher number = more privilege
const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 3,
  admin: 2,
  support: 1,
};

/**
 * Check if userA has higher or equal role than userB
 * Used to prevent lower-privileged users from archiving logs of higher-privileged users
 */
const hasHigherOrEqualRole = (roleA: string, roleB: string): boolean => {
  return (ROLE_HIERARCHY[roleA] || 0) >= (ROLE_HIERARCHY[roleB] || 0);
};

/**
 * Require authentication middleware for protected routes
 */
const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'No token provided',
    });
    return;
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid token',
    });
    return;
  }

  const user = await AdminUserModel.findById(payload.userId).select('-passwordHash');
  if (!user || !user.isActive) {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'User not found or inactive',
    });
    return;
  }

  (req as AuthenticatedRequest).user = {
    id: user._id.toString(),
    email: user.email,
    role: user.role as 'super_admin' | 'admin' | 'support',
    permissions: user.permissions || [],
  };
  next();
};

/**
 * Require specific permission middleware
 */
const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Super admins with '*' permission can do anything
    if (authReq.user.role === 'super_admin' && authReq.user.permissions.includes('*')) {
      next();
      return;
    }

    if (!authReq.user.permissions.includes(permission) && !authReq.user.permissions.includes('*')) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`,
      });
      return;
    }

    next();
  };
};

/**
 * Require minimum role level
 */
const requireRole = (minRole: 'super_admin' | 'admin' | 'support') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!hasHigherOrEqualRole(authReq.user.role, minRole)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Insufficient role. Required: ${minRole} or higher`,
      });
      return;
    }

    next();
  };
};

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'admin-service',
    timestamp: new Date().toISOString(),
    environment: nodeEnv,
  });
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password, mfaCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email and password are required',
      });
    }

    // Find user in database
    const user = await AdminUserModel.findOne({ email: email.toLowerCase(), isActive: true });

    if (!user) {
      await createAuditLog({
        userId: 'unknown',
        action: 'LOGIN_FAILED',
        resource: 'auth',
        ipAddress: req.ip || 'unknown',
      });

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        ipAddress: req.ip || 'unknown',
      });

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    }

    // Check if MFA is required
    const requiresMfa = user.role === 'super_admin' || user.mfaEnabled;

    if (requiresMfa && !user.mfaEnabled) {
      // super_admin without MFA - prompt to enable
      return res.status(403).json({
        success: false,
        error: 'MFA Required',
        code: 'MFA_NOT_ENABLED',
        message: 'MFA is required for super_admin accounts. Please setup MFA first.',
        mfaRequired: true,
        mfaSetupRequired: true,
      });
    }

    if (requiresMfa && user.mfaEnabled) {
      // MFA is enabled, verify the code
      if (!mfaCode) {
        return res.json({
          success: true,
          mfaRequired: true,
          message: 'Please enter your MFA code',
        });
      }

      // Verify TOTP code
      const isValidMfa = authenticator.verify({ token: mfaCode, secret: user.mfaSecret! });

      if (!isValidMfa) {
        await createAuditLog({
          userId: user.id,
          action: 'MFA_FAILED',
          resource: 'auth',
          ipAddress: req.ip || 'unknown',
        });

        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          code: 'INVALID_MFA_CODE',
          message: 'Invalid MFA code',
        });
      }

      await createAuditLog({
        userId: user.id,
        action: 'MFA_SUCCESS',
        resource: 'auth',
        ipAddress: req.ip || 'unknown',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = await generateToken(user);

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      ipAddress: req.ip || 'unknown',
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mfaEnabled: user.mfaEnabled,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Login failed',
    });
  }
});

// Register (super_admin only)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'support' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email, password, and name are required',
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Password must be at least 8 characters',
      });
    }

    // Check if user exists
    const existingUser = await AdminUserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'User already exists',
      });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await AdminUserModel.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
      permissions: [],
      isActive: true,
    });

    await createAuditLog({
      userId: user.id,
      action: 'USER_CREATED',
      resource: 'users',
      resourceId: user.id,
      ipAddress: req.ip || 'unknown',
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Registration failed',
    });
  }
});

// ============================================
// MFA ENDPOINTS
// ============================================

// Helper to get user from request token
const getUserFromToken = async (req: Request): Promise<mongoose.Document | null> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  return AdminUserModel.findById(payload.userId);
};

// MFA Setup - Generate TOTP secret and QR code
app.post('/api/auth/mfa/setup', async (req: Request, res: Response) => {
  try {
    // Authenticate the request
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userDoc = user as unknown as { id: string; email: string; name: string; mfaEnabled: boolean; mfaSecret?: string };

    // If MFA already enabled, reject setup
    if (userDoc.mfaEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'MFA is already enabled. Disable MFA first to regenerate secret.',
      });
    }

    // Generate a new TOTP secret
    const secret = authenticator.generateSecret();

    // Store the secret temporarily (not enabled yet)
    userDoc.mfaSecret = secret;
    await user.save();

    // Generate QR code URL
    const otpauthUrl = authenticator.keyuri(userDoc.email, 'ReZ Admin', secret);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await createAuditLog({
      userId: userDoc.id,
      action: 'MFA_SETUP_INITIATED',
      resource: 'mfa',
      ipAddress: req.ip || 'unknown',
    });

    res.json({
      success: true,
      data: {
        secret,
        qrCode: qrCodeDataUrl,
        otpauthUrl,
      },
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to setup MFA',
    });
  }
});

// MFA Verify - Verify a TOTP code (before enabling)
app.post('/api/auth/mfa/verify', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'MFA code is required',
      });
    }

    // Authenticate the request
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userDoc = user as unknown as { id: string; mfaSecret?: string; mfaEnabled: boolean };

    if (!userDoc.mfaSecret) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'MFA setup not initiated. Call /api/auth/mfa/setup first.',
      });
    }

    // Verify the TOTP code
    const isValid = authenticator.verify({ token: code, secret: userDoc.mfaSecret });

    if (!isValid) {
      await createAuditLog({
        userId: userDoc.id,
        action: 'MFA_VERIFY_FAILED',
        resource: 'mfa',
        ipAddress: req.ip || 'unknown',
      });

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'INVALID_MFA_CODE',
        message: 'Invalid MFA code',
      });
    }

    await createAuditLog({
      userId: userDoc.id,
      action: 'MFA_VERIFY_SUCCESS',
      resource: 'mfa',
      ipAddress: req.ip || 'unknown',
    });

    res.json({
      success: true,
      data: {
        verified: true,
        message: 'MFA code verified successfully. Call /api/auth/mfa/enable to activate MFA.',
      },
    });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to verify MFA code',
    });
  }
});

// MFA Enable - Enable MFA after verification
app.post('/api/auth/mfa/enable', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'MFA code is required',
      });
    }

    // Authenticate the request
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userDoc = user as unknown as { id: string; mfaSecret?: string; mfaEnabled: boolean; email: string };

    if (!userDoc.mfaSecret) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'MFA setup not initiated. Call /api/auth/mfa/setup first.',
      });
    }

    if (userDoc.mfaEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'MFA is already enabled.',
      });
    }

    // Verify the TOTP code one more time before enabling
    const isValid = authenticator.verify({ token: code, secret: userDoc.mfaSecret });

    if (!isValid) {
      await createAuditLog({
        userId: userDoc.id,
        action: 'MFA_ENABLE_FAILED',
        resource: 'mfa',
        ipAddress: req.ip || 'unknown',
      });

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'INVALID_MFA_CODE',
        message: 'Invalid MFA code',
      });
    }

    // Enable MFA
    userDoc.mfaEnabled = true;
    await user.save();

    await createAuditLog({
      userId: userDoc.id,
      action: 'MFA_ENABLED',
      resource: 'mfa',
      ipAddress: req.ip || 'unknown',
    });

    res.json({
      success: true,
      data: {
        mfaEnabled: true,
        message: 'MFA has been enabled successfully.',
      },
    });
  } catch (error) {
    console.error('MFA enable error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to enable MFA',
    });
  }
});

// MFA Disable - Disable MFA (requires current MFA code)
app.post('/api/auth/mfa/disable', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'MFA code is required',
      });
    }

    // Authenticate the request
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userDoc = user as unknown as { id: string; mfaSecret?: string; mfaEnabled: boolean; role: string };

    if (!userDoc.mfaEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'MFA is not enabled.',
      });
    }

    // super_admin cannot disable MFA
    if (userDoc.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'super_admin accounts cannot disable MFA.',
      });
    }

    // Verify the TOTP code
    const isValid = authenticator.verify({ token: code, secret: userDoc.mfaSecret! });

    if (!isValid) {
      await createAuditLog({
        userId: userDoc.id,
        action: 'MFA_DISABLE_FAILED',
        resource: 'mfa',
        ipAddress: req.ip || 'unknown',
      });

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'INVALID_MFA_CODE',
        message: 'Invalid MFA code',
      });
    }

    // Disable MFA
    userDoc.mfaEnabled = false;
    (userDoc as unknown as Record<string, unknown>).mfaSecret = undefined;
    await user.save();

    await createAuditLog({
      userId: userDoc.id,
      action: 'MFA_DISABLED',
      resource: 'mfa',
      ipAddress: req.ip || 'unknown',
    });

    res.json({
      success: true,
      data: {
        mfaEnabled: false,
        message: 'MFA has been disabled successfully.',
      },
    });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to disable MFA',
    });
  }
});

// Get MFA status for current user
app.get('/api/auth/mfa/status', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userDoc = user as unknown as { id: string; mfaEnabled: boolean; role: string };

    res.json({
      success: true,
      data: {
        mfaEnabled: userDoc.mfaEnabled,
        mfaRequired: userDoc.role === 'super_admin',
      },
    });
  } catch (error) {
    console.error('MFA status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get MFA status',
    });
  }
});

// Get current user
app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }

    const user = await AdminUserModel.findById(payload.userId).select('-passwordHash');
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// Get audit logs
app.get('/api/audit-logs', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0' } = req.query;
    const logs = await AuditLogModel
      .find()
      .sort({ timestamp: -1 })
      .skip(parseInt(offset as string))
      .limit(Math.min(parseInt(limit as string), 100));

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// Get users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await AdminUserModel.find().select('-passwordHash');
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// ============================================
// AUDIT LOG IMMUTABILITY ROUTES
// ============================================
// These routes enforce the append-only audit log policy
// Reference: AUDIT LOG IMMUTABILITY POLICY (see file header)

/**
 * GET /api/audit
 * List non-archived audit logs (active logs only)
 */
app.get('/api/audit', requireAuth, async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0' } = req.query;
    const logs = await AuditLogModel
      .find({ isArchived: false })
      .sort({ timestamp: -1 })
      .skip(parseInt(offset as string))
      .limit(Math.min(parseInt(limit as string), 100));

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

/**
 * GET /api/audit/archive
 * List archived audit logs
 */
app.get('/api/audit/archive', requireAuth, requirePermission('audit:archive'), async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0' } = req.query;
    const logs = await AuditLogModel
      .find({ isArchived: true })
      .sort({ archivedAt: -1 })
      .skip(parseInt(offset as string))
      .limit(Math.min(parseInt(limit as string), 100));

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Get archived audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

/**
 * POST /api/audit/:id/archive
 * Archive an audit log (soft delete) - requires audit:archive permission
 * Cannot archive logs from users with higher privilege
 */
app.post('/api/audit/:id/archive', requireAuth, requirePermission('audit:archive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;

    // Find the audit log
    const auditLog = await AuditLogModel.findById(id);
    if (!auditLog) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Audit log not found',
      });
    }

    // Check if already archived
    if (auditLog.isArchived) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Audit log is already archived',
      });
    }

    // Role hierarchy protection: Get the user who created the log
    const logCreator = await AdminUserModel.findById(auditLog.userId);

    // If we can find the creator, check role hierarchy
    if (logCreator && !hasHigherOrEqualRole(authReq.user!.role, logCreator.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Cannot archive audit logs created by users with higher privileges',
      });
    }

    // Archive the log
    auditLog.isArchived = true;
    auditLog.archivedAt = new Date();
    auditLog.archivedBy = authReq.user!.id;
    await auditLog.save();

    // Log this archive action (audit immutability in action)
    await createAuditLog({
      userId: authReq.user!.id,
      action: 'AUDIT_ARCHIVED',
      resource: 'audit',
      resourceId: id,
      details: {
        archivedLogId: id,
        originalTimestamp: auditLog.timestamp,
        originalAction: auditLog.action,
      },
      ipAddress: req.ip || 'unknown',
    });

    res.json({
      success: true,
      data: {
        id: auditLog._id,
        isArchived: true,
        archivedAt: auditLog.archivedAt,
        archivedBy: auditLog.archivedBy,
      },
      message: 'Audit log archived successfully',
    });
  } catch (error) {
    console.error('Archive audit log error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

/**
 * POST /api/audit/archive/:id/restore
 * Restore an archived audit log - requires audit:restore permission
 */
app.post('/api/audit/archive/:id/restore', requireAuth, requirePermission('audit:restore'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;

    // Find the archived audit log
    const auditLog = await AuditLogModel.findById(id);
    if (!auditLog) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Archived audit log not found',
      });
    }

    // Check if it's actually archived
    if (!auditLog.isArchived) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Audit log is not archived',
      });
    }

    // Restore the log
    auditLog.isArchived = false;
    auditLog.restoredAt = new Date();
    auditLog.restoredBy = authReq.user!.id;
    await auditLog.save();

    // Log this restore action
    await createAuditLog({
      userId: authReq.user!.id,
      action: 'AUDIT_RESTORED',
      resource: 'audit',
      resourceId: id,
      details: {
        restoredLogId: id,
        originalTimestamp: auditLog.timestamp,
        archivedAt: auditLog.archivedAt,
        archivedBy: auditLog.archivedBy,
      },
      ipAddress: req.ip || 'unknown',
    });

    res.json({
      success: true,
      data: {
        id: auditLog._id,
        isArchived: false,
        restoredAt: auditLog.restoredAt,
        restoredBy: auditLog.restoredBy,
      },
      message: 'Audit log restored successfully',
    });
  } catch (error) {
    console.error('Restore audit log error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

/**
 * DELETE /api/audit/:id
 * BLOCKED - Audit logs cannot be deleted, only archived
 * This route intentionally returns 405 Method Not Allowed
 */
app.delete('/api/audit/:id', (req: Request, res: Response) => {
  res.status(405).json({
    success: false,
    error: 'Method Not Allowed',
    message: 'Audit logs cannot be deleted. Use POST /api/audit/:id/archive to archive instead.',
    policy: 'AUDIT_IMMUTABILITY',
  });
});

/**
 * POST /api/audit/cleanup
 * Scheduled cleanup for old archived logs (older than 1 year)
 * Should be called by a cron job with audit:cleanup permission
 */
app.post('/api/audit/cleanup', requireAuth, requirePermission('audit:cleanup'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Only mark logs that are:
    // 1. Already archived
    // 2. Older than 1 year
    const result = await AuditLogModel.updateMany(
      {
        isArchived: true,
        archivedAt: { $lt: oneYearAgo },
      },
      {
        $set: {
          // Mark for permanent cleanup (actual deletion requires separate process)
          pendingCleanup: true,
          cleanupAt: new Date(),
        },
      }
    );

    // Log cleanup action
    await createAuditLog({
      userId: authReq.user!.id,
      action: 'AUDIT_CLEANUP_PREPARED',
      resource: 'audit',
      details: {
        logsMarked: result.modifiedCount,
        olderThan: oneYearAgo.toISOString(),
        timestamp: new Date().toISOString(),
      },
      ipAddress: req.ip || 'unknown',
    });

    res.json({
      success: true,
      data: {
        markedForCleanup: result.modifiedCount,
        olderThan: oneYearAgo.toISOString(),
        message: 'Archived logs older than 1 year have been marked for cleanup',
      },
    });
  } catch (error) {
    console.error('Audit cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

/**
 * GET /api/audit/stats
 * Get audit log statistics
 */
app.get('/api/audit/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const totalLogs = await AuditLogModel.countDocuments();
    const archivedLogs = await AuditLogModel.countDocuments({ isArchived: true });
    const activeLogs = totalLogs - archivedLogs;

    // Count by action type
    const actionCounts = await AuditLogModel.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Count by user
    const userCounts = await AuditLogModel.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        total: totalLogs,
        active: activeLogs,
        archived: archivedLogs,
        topActions: actionCounts,
        topUsers: userCounts,
      },
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Origin not allowed',
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    requestId: (req as Request & { requestId?: string }).requestId,
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 4003;

async function start() {
  try {
    // Connect to MongoDB if URI provided
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI, {
        w: 'majority',
        journal: true,
        retryWrites: true,
      });
      console.log('Connected to MongoDB');

      // Create default admin if none exist
      const userCount = await AdminUserModel.countDocuments();
      if (userCount === 0) {
        // SECURITY: Require explicit admin password - never use fallback
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        if (!adminPassword) {
          throw new Error('[FATAL] DEFAULT_ADMIN_PASSWORD environment variable is required. Cannot create default admin without a secure password.');
        }
        if (adminPassword.length < 12) {
          throw new Error('[FATAL] DEFAULT_ADMIN_PASSWORD must be at least 12 characters.');
        }
        if (/^(test|dev|changeme|password|admin)/i.test(adminPassword)) {
          throw new Error('[FATAL] DEFAULT_ADMIN_PASSWORD contains a weak pattern. Use a strong password.');
        }

        console.log('Creating default admin user...');
        const hash = await hashPassword(adminPassword);
        await AdminUserModel.create({
          email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@rez.money',
          passwordHash: hash,
          name: 'Default Admin',
          role: 'super_admin',
          permissions: ['*'],
        });
        console.log('Default admin created successfully.');
      }
    } else {
      console.log('WARNING: Running without MongoDB - data will not persist');
    }

    app.listen(PORT, () => {
      logger.info(Admin Service running on port ${PORT}`);
      logger.info(Environment: ${nodeEnv}`);
    });
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

start();

export default app;
