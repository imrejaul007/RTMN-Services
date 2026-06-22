/**
 * REZ Operations Dashboard
 * Feature flags and observability in one place
 *
 * SECURITY: All endpoints require authentication via X-Admin-Token header.
 */

import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// ============================================
// Authentication Middleware
// ============================================

const ADMIN_TOKEN = process.env.OPS_ADMIN_TOKEN || process.env.ADMIN_TOKEN;

interface AuthRequest extends express.Request {
  adminId?: string;
  isSuperAdmin?: boolean;
}

/**
 * Verify admin authentication token
 * Uses constant-time comparison to prevent timing attacks
 */
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const token = (req.headers['x-admin-token'] || req.headers['x-admin-key']) as string;

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return;
  }

  if (!ADMIN_TOKEN) {
    console.error('[SECURITY] OPS_ADMIN_TOKEN not configured - rejecting all requests');
    res.status(500).json({ success: false, error: 'Server configuration error', code: 'CONFIG_ERROR' });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(ADMIN_TOKEN);

  let tokenValid = false;
  if (tokenBuf.length === expectedBuf.length) {
    try {
      tokenValid = crypto.timingSafeEqual(tokenBuf, expectedBuf);
    } catch {
      tokenValid = false;
    }
  }

  if (!tokenValid) {
    console.warn('[AUTH] Invalid admin token attempted from', req.ip);
    res.status(401).json({ success: false, error: 'Invalid credentials', code: 'INVALID_TOKEN' });
    return;
  }

  // Mark as authenticated
  (req as AuthRequest).adminId = 'admin';
  (req as AuthRequest).isSuperAdmin = true;

  next();
}

/**
 * Require super admin role for sensitive operations
 */
function requireSuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const authReq = req as AuthRequest;

  if (!authReq.adminId) {
    res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return;
  }

  if (!authReq.isSuperAdmin) {
    res.status(403).json({ success: false, error: 'Super admin role required', code: 'FORBIDDEN' });
    return;
  }

  next();
}

// Apply auth middleware to all routes
app.use(requireAuth);

const PORT = 4032;
const MONGODB = process.env.MONGODB_URI;

if (!MONGODB) {
  console.error('[CONFIG] MONGODB_URI environment variable is required');
  process.exit(1);
}

// Feature Flags Schema
const FeatureFlag = mongoose.model('FeatureFlag', new mongoose.Schema({
  flag_key: String,
  enabled: Boolean,
  description: String,
  rollout_percentage: Number,
  updated_at: Date,
}, { collection: 'feature_flags' }));

// Audit Log Schema
const OpsAuditLog = mongoose.model('OpsAuditLog', new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  admin_id: String,
  action: String,
  resource_type: String,
  resource_key: String,
  old_value: mongoose.Schema.Types.Mixed,
  new_value: mongoose.Schema.Types.Mixed,
  ip_address: String,
  user_agent: String,
}, { collection: 'ops_audit_logs' }));

// Observability Schema
const LogEntry = mongoose.model('LogEntry', new mongoose.Schema({
  timestamp: Date,
  correlation_id: String,
  service: String,
  event_type: String,
  level: String,
  message: String,
}, { collection: 'observability_logs' }));

mongoose.connect(MONGODB).then(() => {
  app.listen(PORT, () => {
    logger.info(Ops Dashboard running on port ${PORT}`);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ops-dashboard' });
});

// Feature Flags Status
app.get('/flags', async (req, res) => {
  try {
    const flags = await FeatureFlag.find().lean();
    const flagsMap: Record<string, any> = {};

    const defaults: Record<string, any> = {
      'learning_enabled': { enabled: false, description: 'Machine learning' },
      'adaptive_enabled': { enabled: false, description: 'Adaptive decisions' },
      'personalization_enabled': { enabled: true, description: 'Personalization' },
      'recommendations_enabled': { enabled: true, description: 'Recommendations' },
      'intent_prediction_enabled': { enabled: true, description: 'Intent prediction' },
      'ads_enabled': { enabled: false, description: 'Targeted ads' },
      'push_enabled': { enabled: true, description: 'Push notifications' },
      'auto_execute_safe': { enabled: true, description: 'Auto-execute SAFE decisions' },
      'rollback_enabled': { enabled: true, description: 'Auto-rollback' },
    };

    for (const key of Object.keys(defaults)) {
      const dbFlag = flags.find(f => f.flag_key === key);
      flagsMap[key] = {
        key,
        enabled: dbFlag?.enabled ?? defaults[key].enabled,
        description: dbFlag?.description ?? defaults[key].description,
      };
    }

    res.json({ flags: flagsMap });
  } catch (error: any) {
    res.json({ error: error.message });
  }
});

// Toggle Flag - Requires super admin
app.post('/flags/:key/toggle', requireSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const authReq = req as AuthRequest;

    // Validate flag key
    const ALLOWED_FLAGS = [
      'learning_enabled', 'adaptive_enabled', 'personalization_enabled',
      'recommendations_enabled', 'intent_prediction_enabled', 'ads_enabled',
      'push_enabled', 'auto_execute_safe', 'rollback_enabled'
    ];

    if (!ALLOWED_FLAGS.includes(key)) {
      res.status(400).json({ success: false, error: 'Invalid flag key', code: 'INVALID_FLAG' });
      return;
    }

    const flag = await FeatureFlag.findOne({ flag_key: key });

    if (flag) {
      const oldValue = flag.enabled;
      flag.enabled = !flag.enabled;
      flag.updated_at = new Date();
      await flag.save();

      // Audit log
      await OpsAuditLog.create({
        admin_id: authReq.adminId,
        action: 'FLAG_TOGGLE',
        resource_type: 'feature_flag',
        resource_key: key,
        old_value: oldValue,
        new_value: flag.enabled,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });

      logger.info([AUDIT] Flag ${key} toggled from ${oldValue} to ${flag.enabled} by ${authReq.adminId}`);
      res.json({ success: true, key, enabled: flag.enabled });
    } else {
      const newFlag = new FeatureFlag({ flag_key: key, enabled: false, updated_at: new Date() });
      await newFlag.save();

      // Audit log
      await OpsAuditLog.create({
        admin_id: authReq.adminId,
        action: 'FLAG_CREATE',
        resource_type: 'feature_flag',
        resource_key: key,
        old_value: null,
        new_value: false,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.json({ success: true, key, enabled: false });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// System Health
app.get('/health/status', async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const errorCount = await LogEntry.countDocuments({
      timestamp: { $gte: oneHourAgo },
      level: 'error'
    });

    const warnCount = await LogEntry.countDocuments({
      timestamp: { $gte: oneHourAgo },
      level: 'warn'
    });

    res.json({
      status: errorCount > 10 ? 'degraded' : 'healthy',
      errors_last_hour: errorCount,
      warnings_last_hour: warnCount,
      checked_at: now,
    });
  } catch (error: any) {
    res.json({ error: error.message });
  }
});

// Quick Actions
app.get('/quick-actions', (req, res) => {
  res.json({
    actions: [
      { id: 'disable-learning', label: 'Disable Learning', endpoint: 'POST /flags/learning_enabled/disable' },
      { id: 'enable-learning', label: 'Enable Learning', endpoint: 'POST /flags/learning_enabled/enable' },
      { id: 'disable-ads', label: 'Disable Ads', endpoint: 'POST /flags/ads_enabled/disable' },
      { id: 'enable-ads', label: 'Enable Ads', endpoint: 'POST /flags/ads_enabled/enable' },
      { id: 'enable-shadow', label: 'Shadow Mode', description: 'Learning off, baseline active' },
      { id: 'full-safe', label: 'Full Safe Mode', description: 'All safeguards active' },
    ]
  });
});
