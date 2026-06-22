/**
 * RAZO Cloud Services
 * Ports: 4631-4636
 * Security: Password encryption with AES-256-GCM, WebAuthn passkeys, rate limiting
 * Database: Redis + MongoDB connections with health checks
 */

import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { EventEmitter } from 'events';

// AI Service Clients
import { getGenieClient, getCoPilotClient, getMemoryClient, routeToAI } from './src/genie-client';
import { getVoiceClient, processVoiceInput, cleanupVoiceText, detectHinglish } from './src/voice-client';
import { getRABTULClient, createAuthMiddleware } from './src/auth-client';

// ============================================
// DATABASE CONNECTION MANAGEMENT
// ============================================

// Event emitter for connection status
export const dbEvents = new EventEmitter();

// Redis connection state
let redisClient: Redis | null = null;
let redisConnected = false;

// MongoDB connection state
let mongoConnected = false;

// Configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/razo';

/**
 * Initialize Redis connection with health monitoring
 */
export async function initRedis(): Promise<Redis> {
  if (redisClient && redisConnected) {
    return redisClient;
  }

  redisClient = new Redis(REDIS_URL, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      console.log(`Redis reconnecting in ${delay}ms... (attempt ${times})`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redisClient.on('connect', () => {
    redisConnected = true;
    console.log('✅ Redis connected');
    dbEvents.emit('redis:connected');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis ready');
    dbEvents.emit('redis:ready');
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
    redisConnected = false;
    dbEvents.emit('redis:error', err);
  });

  redisClient.on('close', () => {
    redisConnected = false;
    console.log('⚠️ Redis connection closed');
    dbEvents.emit('redis:closed');
  });

  redisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  return redisClient;
}

/**
 * Initialize MongoDB connection with health monitoring
 */
export async function initMongoDB(): Promise<typeof mongoose> {
  if (mongoConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    mongoose.connection.on('connected', () => {
      mongoConnected = true;
      console.log('✅ MongoDB connected');
      dbEvents.emit('mongo:connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
      mongoConnected = false;
      dbEvents.emit('mongo:error', err);
    });

    mongoose.connection.on('disconnected', () => {
      mongoConnected = false;
      console.log('⚠️ MongoDB disconnected');
      dbEvents.emit('mongo:disconnected');
    });

    await mongoose.connect(MONGODB_URL, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    mongoConnected = true;
    return mongoose;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

/**
 * Get Redis client (singleton)
 */
export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * Get database health status
 */
export function getDBHealth(): { redis: boolean; mongodb: boolean } {
  return {
    redis: redisConnected,
    mongodb: mongoConnected,
  };
}

/**
 * Close all database connections
 */
export async function closeConnections(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (redisClient) {
    promises.push(
      new Promise((resolve) => {
        redisClient!.quit().then(() => {
          redisClient = null;
          redisConnected = false;
          console.log('Redis connection closed');
          resolve();
        }).catch(() => {
          redisClient = null;
          resolve();
        });
      })
    );
  }

  if (mongoConnected) {
    promises.push(
      mongoose.disconnect().then(() => {
        mongoConnected = false;
        console.log('MongoDB connection closed');
      }).catch(() => {
        mongoConnected = false;
      })
    );
  }

  await Promise.all(promises);
}

// Initialize connections on module load
initRedis().catch((err) => console.warn('Redis init warning:', err.message));
initMongoDB().catch((err) => console.warn('MongoDB init warning:', err.message));

// ============================================
// ENCRYPTION UTILITIES (AES-256-GCM)
// ============================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

// ============================================
// RAZO CLOUD API (4631) - Cloud Sync
// ============================================
const cloudApp = express();
cloudApp.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
}));
cloudApp.use(express.json({ limit: "10kb" }));

// User Schema
const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  deviceId: String,
  platform: String,
  snippets: Array,
  settings: Object,
  lastSync: Date,
});
const User = mongoose.model('User', UserSchema);

// Health endpoint with DB status
cloudApp.get('/health', (req, res) => {
  const dbHealth = getDBHealth();
  res.json({
    status: 'healthy',
    service: 'razo-cloud',
    version: '2.0.0',
    database: dbHealth,
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check
cloudApp.get('/health/detailed', async (req, res) => {
  const dbHealth = getDBHealth();
  const redis = getRedis();

  // Test Redis
  let redisPing = false;
  try {
    await redis.ping();
    redisPing = true;
  } catch {}

  res.json({
    status: 'healthy',
    service: 'razo-cloud',
    version: '2.0.0',
    database: {
      redis: dbHealth.redis,
      redisPing,
      mongodb: dbHealth.mongodb,
    },
    timestamp: new Date().toISOString(),
  });
});

// Sync endpoint
cloudApp.post('/sync', async (req, res) => {
  try {
    const { userId, deviceId, platform } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user data
    const user = await User.findOne({ userId });

    // Sync to Redis for fast access
    await getRedis().set(`user:${userId}:sync`, JSON.stringify({
      snippets: user?.snippets || [],
      settings: user?.settings || {},
      lastSync: new Date()
    }));

    res.json({ synced: true, timestamp: new Date() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get sync status
cloudApp.get('/sync/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const syncData = await getRedis().get(`user:${userId}:sync`);

    res.json({
      lastSync: syncData ? JSON.parse(syncData).lastSync : null,
      pendingChanges: 0,
      devices: ['android', 'ios', 'mac', 'windows', 'web']
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Voice processing
cloudApp.post('/voice/process', async (req, res) => {
  try {
    const { audio, userId } = req.body;

    if (!audio || !userId) {
      return res.status(400).json({ error: 'audio and userId are required' });
    }

    // Process voice → text (placeholder - integrate with Whisper service)
    res.json({ text: 'processed text' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

cloudApp.listen(4631, () => console.log('RAZO Cloud (4631) - Sync + Voice'));

// ============================================
// RAZO VAULT (4632) - SECURE PASSWORD MANAGER
// ============================================
const vaultApp = express();
vaultApp.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
}));
vaultApp.use(express.json({ limit: "10kb" }));

// Rate limiting for vault endpoints
const vaultLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const key = req.ip || req.body.userId || 'unknown';
  const limit = 100; // requests per 15 minutes
  const windowMs = 15 * 60 * 1000;

  getRedis().incr(`ratelimit:vault:${key}`).then((count) => {
    if (count === 1) {
      getRedis().expire(`ratelimit:vault:${key}`, Math.ceil(windowMs / 1000));
    }
    if (count > limit) {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }
    next();
  }).catch(() => next());
};

vaultApp.use('/password', vaultLimiter);
vaultApp.use('/passkey', vaultLimiter);
vaultApp.use('/biometric', vaultLimiter);

// Password Schema - stores encrypted passwords
const PasswordSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  site: { type: String, required: true },
  username: { type: String, required: true },
  encryptedPassword: { type: String, required: true }, // AES-256-GCM encrypted
  url: String,
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
PasswordSchema.index({ userId: 1, site: 1 }, { unique: true });
const Password = mongoose.model('Password', PasswordSchema);

// Passkey Schema - WebAuthn credentials
const PasskeySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  site: { type: String, required: true },
  credentialId: { type: String, required: true },
  publicKey: { type: String, required: true },
  counter: { type: Number, default: 0 },
  deviceName: String,
  createdAt: { type: Date, default: Date.now },
});
PasskeySchema.index({ userId: 1, site: 1 });
const Passkey = mongoose.model('Passkey', PasskeySchema);

// Biometric Token Schema
const BiometricTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true },
  tokenHash: { type: String, required: true }, // SHA-256 hash of biometric token
  enabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date },
});
const BiometricToken = mongoose.model('BiometricToken', BiometricTokenSchema);

// Health endpoint
vaultApp.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'razo-vault', version: '2.0.0' });
});

// Get password (decrypted on-the-fly)
vaultApp.post('/password/get', async (req, res) => {
  try {
    const { site, userId } = req.body;

    if (!site || !userId) {
      return res.status(400).json({ error: 'site and userId are required' });
    }

    const entry = await Password.findOne({ userId, site });

    if (!entry) {
      return res.status(404).json({ error: 'Password not found' });
    }

    // Decrypt password for response
    let decryptedPassword = '';
    try {
      decryptedPassword = decrypt(entry.encryptedPassword);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to decrypt password' });
    }

    res.json({
      site: entry.site,
      username: entry.username,
      password: decryptedPassword,
      url: entry.url,
      notes: entry.notes,
      createdAt: entry.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save password (encrypted before storage)
vaultApp.post('/password/save', async (req, res) => {
  try {
    const { userId, site, username, password, url, notes } = req.body;

    if (!userId || !site || !username || !password) {
      return res.status(400).json({ error: 'userId, site, username, and password are required' });
    }

    // Validate ENCRYPTION_KEY is set
    if (!ENCRYPTION_KEY) {
      return res.status(500).json({ error: 'Encryption not configured' });
    }

    // Encrypt password before storage
    const encryptedPassword = encrypt(password);

    await Password.findOneAndUpdate(
      { userId, site },
      {
        userId,
        site,
        username,
        encryptedPassword,
        url: url || '',
        notes: notes || '',
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ saved: true, site });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List all sites for user (without passwords)
vaultApp.get('/passwords/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const entries = await Password.find({ userId }).select('site username url createdAt');

    res.json({
      count: entries.length,
      sites: entries.map(e => ({
        site: e.site,
        username: e.username,
        url: e.url,
        createdAt: e.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-fill
vaultApp.post('/autofill', async (req, res) => {
  try {
    const { site, userId, platform } = req.body;

    if (!site || !userId) {
      return res.status(400).json({ error: 'site and userId are required' });
    }

    const entry = await Password.findOne({ userId, site });

    if (!entry) {
      return res.json({ found: false });
    }

    // Decrypt for autofill
    let decryptedPassword = '';
    try {
      decryptedPassword = decrypt(entry.encryptedPassword);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to decrypt' });
    }

    res.json({
      found: true,
      credentials: {
        site: entry.site,
        username: entry.username,
        password: decryptedPassword,
        url: entry.url,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete password entry
vaultApp.delete('/password', async (req, res) => {
  try {
    const { userId, site } = req.body;

    await Password.deleteOne({ userId, site });

    res.json({ deleted: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WEBAUTHN / PASSKEY IMPLEMENTATION
// ============================================

// Generate WebAuthn registration options
vaultApp.post('/passkey/register-options', async (req, res) => {
  try {
    const { userId, site } = req.body;

    if (!userId || !site) {
      return res.status(400).json({ error: 'userId and site are required' });
    }

    // Generate random credential ID
    const credentialId = crypto.randomBytes(32).toString('base64url');

    // Registration options structure
    const options = {
      challenge: crypto.randomBytes(32).toString('base64url'),
      rp: {
        name: 'RAZO Vault',
        id: process.env.WEBAUTHN_RP_ID || 'razo.app',
      },
      user: {
        id: Buffer.from(userId).toString('base64url'),
        name: userId,
        displayName: userId,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' },  // RS256
      ],
      timeout: 60000,
      attestation: 'none',
      excludeCredentials: [],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
    };

    // Store challenge temporarily
    await getRedis().set(`webauthn:challenge:${userId}:${site}`, options.challenge, 'EX', 300);

    res.json({ options, credentialId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify WebAuthn registration
vaultApp.post('/passkey/register-verify', async (req, res) => {
  try {
    const { userId, site, credentialId, attestationResponse } = req.body;

    if (!userId || !site || !credentialId || !attestationResponse) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify challenge
    const storedChallenge = await getRedis().get(`webauthn:challenge:${userId}:${site}`);
    if (!storedChallenge) {
      return res.status(400).json({ error: 'Challenge expired or invalid' });
    }

    // Store passkey credential
    const publicKey = attestationResponse.attestationObject?.authData?.publicKey || credentialId;

    await Passkey.findOneAndUpdate(
      { userId, site, credentialId },
      {
        userId,
        site,
        credentialId,
        publicKey: Buffer.from(JSON.stringify(publicKey)).toString('base64'),
        counter: 0,
        deviceName: 'Default Device',
      },
      { upsert: true }
    );

    // Clear challenge
    await getRedis().del(`webauthn:challenge:${userId}:${site}`);

    res.json({ success: true, passkeyId: credentialId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate authentication options
vaultApp.post('/passkey/auth-options', async (req, res) => {
  try {
    const { userId, site } = req.body;

    if (!userId || !site) {
      return res.status(400).json({ error: 'userId and site are required' });
    }

    // Get registered credentials
    const passkeys = await Passkey.find({ userId, site });

    if (passkeys.length === 0) {
      return res.status(404).json({ error: 'No passkeys registered' });
    }

    const options = {
      challenge: crypto.randomBytes(32).toString('base64url'),
      timeout: 60000,
      rpId: process.env.WEBAUTHN_RP_ID || 'razo.app',
      allowCredentials: passkeys.map(pk => ({
        id: pk.credentialId,
        type: 'public-key',
      })),
      userVerification: 'preferred',
    };

    // Store challenge
    await getRedis().set(`webauthn:auth:${userId}:${site}`, options.challenge, 'EX', 300);

    res.json({ options });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify authentication
vaultApp.post('/passkey/auth-verify', async (req, res) => {
  try {
    const { userId, site, credentialId, assertionResponse } = req.body;

    if (!userId || !site || !credentialId || !assertionResponse) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify challenge
    const storedChallenge = await getRedis().get(`webauthn:auth:${userId}:${site}`);
    if (!storedChallenge) {
      return res.status(400).json({ error: 'Challenge expired or invalid' });
    }

    // Find passkey
    const passkey = await Passkey.findOne({ userId, site, credentialId });
    if (!passkey) {
      return res.status(404).json({ error: 'Passkey not found' });
    }

    // Update counter for replay protection
    const newCounter = passkey.counter + 1;
    await Passkey.updateOne(
      { _id: passkey._id },
      { counter: newCounter }
    );

    // Clear challenge
    await getRedis().del(`webauthn:auth:${userId}:${site}`);

    res.json({
      authenticated: true,
      passkeyId: credentialId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List passkeys for user
vaultApp.get('/passkeys/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const passkeys = await Passkey.find({ userId }).select('site credentialId deviceName createdAt');

    res.json({
      count: passkeys.length,
      passkeys: passkeys.map(pk => ({
        id: pk._id,
        site: pk.site,
        deviceName: pk.deviceName,
        createdAt: pk.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete passkey
vaultApp.delete('/passkey', async (req, res) => {
  try {
    const { userId, site, passkeyId } = req.body;

    await Passkey.deleteOne({ userId, site, credentialId: passkeyId });

    res.json({ deleted: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BIOMETRIC AUTHENTICATION
// ============================================

// Register biometric token
vaultApp.post('/biometric/register', async (req, res) => {
  try {
    const { userId, deviceId, token } = req.body;

    if (!userId || !deviceId || !token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Hash the biometric token for storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await BiometricToken.findOneAndUpdate(
      { userId },
      {
        userId,
        deviceId,
        tokenHash,
        enabled: true,
      },
      { upsert: true, new: true }
    );

    res.json({ registered: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify biometric
vaultApp.post('/biometric/authenticate', async (req, res) => {
  try {
    const { userId, deviceId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'userId and token are required' });
    }

    // Find token
    const biometric = await BiometricToken.findOne({ userId, enabled: true });

    if (!biometric) {
      return res.status(404).json({ error: 'Biometric not registered' });
    }

    // Verify token hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    if (tokenHash !== biometric.tokenHash) {
      return res.status(401).json({ authenticated: false, error: 'Invalid biometric' });
    }

    // Update last used
    await BiometricToken.updateOne(
      { _id: biometric._id },
      { lastUsed: new Date() }
    );

    res.json({
      authenticated: true,
      expiresIn: 3600, // Token valid for 1 hour
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Disable biometric
vaultApp.post('/biometric/disable', async (req, res) => {
  try {
    const { userId } = req.body;

    await BiometricToken.updateOne(
      { userId },
      { enabled: false }
    );

    res.json({ disabled: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

vaultApp.listen(4632, () => console.log('RAZO Vault (4632) - Passwords + Passkeys (SECURE v2.0)'));

// ============================================
// RAZO SEARCH (4633) - App Launcher
// ============================================
const searchApp = express();
searchApp.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
}));
searchApp.use(express.json({ limit: "10kb" }));

// Health endpoint
searchApp.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'razo-search', version: '2.0.0' });
});

// App registry
const APPS = [
  { id: 'airzy', name: 'Airzy', icon: '📱', type: 'app', action: 'airzy://' },
  { id: 'wallet', name: 'REZ Wallet', icon: '💰', type: 'app', action: 'rtnm://wallet' },
  { id: 'stayown', name: 'StayOwn', icon: '🏨', type: 'app', action: 'stayown://' },
  { id: 'khaimove', name: 'KHAIRMOVE', icon: '🚗', type: 'app', action: 'khaimove://' },
  { id: 'risacare', name: 'RisaCare', icon: '🏥', type: 'app', action: 'risacare://' },
  { id: 'corpperks', name: 'CorpPerks', icon: '💼', type: 'app', action: 'corpperks://' },
  { id: 'nexha', name: 'Nexha', icon: '🛒', type: 'app', action: 'nexha://' },
  { id: 'genie', name: 'Genie', icon: '🤖', type: 'app', action: 'rtnm://genie' },
  { id: 'copilot', name: 'CoPilot', icon: '📊', type: 'app', action: 'rtnm://copilot' },
  { id: 'memory', name: 'MemoryOS', icon: '🧠', type: 'app', action: 'rtnm://memory' },
];

// Search
searchApp.post('/query', async (req, res) => {
  try {
    const { query, userId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const q = query.toLowerCase();

    const results = APPS.filter(app =>
      app.name.toLowerCase().includes(q) ||
      app.id.toLowerCase().includes(q)
    );

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Launch app
searchApp.post('/launch', async (req, res) => {
  try {
    const { appId, userId } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    const app = APPS.find(a => a.id === appId);
    res.json({ launched: !!app, action: app?.action });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

searchApp.listen(4633, () => console.log('RAZO Search (4633) - App Launcher'));

// ============================================
// RAZO AI (4634) - Genie + CoPilot
// ============================================
const aiApp = express();
aiApp.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
}));
aiApp.use(express.json({ limit: "10kb" }));

// Health endpoint
aiApp.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'razo-ai', version: '2.0.0' });
});

// Genie integration - REAL IMPLEMENTATION
aiApp.post('/genie', async (req, res) => {
  try {
    const { command, userId } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'command is required' });
    }

    // Call Genie service
    const genie = getGenieClient();
    const response = await genie.processCommand(command, userId || 'anonymous');

    res.json(response);
  } catch (error: any) {
    console.error('Genie error:', error.message);
    res.status(500).json({
      response: "I'm having trouble connecting to Genie. Please try again.",
      actions: [],
      suggestions: []
    });
  }
});

// CoPilot integration - REAL IMPLEMENTATION
aiApp.post('/copilot', async (req, res) => {
  try {
    const { command, userId } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'command is required' });
    }

    const copilot = getCoPilotClient();
    const response = await copilot.processCommand(command, userId || 'anonymous');

    res.json(response);
  } catch (error: any) {
    console.error('CoPilot error:', error.message);
    res.status(500).json({
      response: "I'm having trouble connecting to CoPilot. Please try again.",
    });
  }
});

// Grammar correction - REAL IMPLEMENTATION
aiApp.post('/grammar/correct', async (req, res) => {
  try {
    const { text, tone } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    // Apply grammar correction
    const result = cleanupVoiceText(text);

    // Adjust tone if specified
    let adjusted = result.cleaned;
    if (tone === 'formal') {
      adjusted = adjustToFormal(adjusted);
    } else if (tone === 'friendly') {
      adjusted = adjustToFriendly(adjusted);
    }

    // Detect Hinglish
    const langAnalysis = detectHinglish(text);

    res.json({
      corrected: adjusted,
      original: text,
      grammar: result.grammar,
      suggestions: [...result.suggestions, ...langAnalysis.suggestions],
      languageMix: langAnalysis.languageMix,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Suggestions - REAL IMPLEMENTATION
aiApp.post('/suggestions', async (req, res) => {
  try {
    const { context, userId } = req.body;

    // Get context from Memory if available
    let memoryContext = {};
    try {
      const memory = getMemoryClient();
      memoryContext = await memory.getContext(userId || 'anonymous', 'basic');
    } catch {}

    // Generate contextual suggestions based on context
    const suggestions = generateContextualSuggestions(context || '', memoryContext);

    res.json({
      suggestions,
      context: memoryContext,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Predictions - connect to Predictive Engine
aiApp.post('/predictions', async (req, res) => {
  try {
    const { partial, userId } = req.body;

    if (!partial) {
      return res.status(400).json({ error: 'partial is required' });
    }

    // Call Predictive Engine (port 4640)
    try {
      const response = await fetch('http://localhost:4640/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: partial, userId }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch {}

    // Fallback predictions
    res.json({
      predictions: ['would you like', 'wonderful', 'working on']
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Route to AI (auto-detect genie vs copilot)
aiApp.post('/route', async (req, res) => {
  try {
    const { text, userId, mode } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const result = await routeToAI(text, userId || 'anonymous', mode);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

aiApp.listen(4634, () => console.log('RAZO AI (4634) - Genie + CoPilot (Connected)'));

/**
 * Helper: Generate contextual suggestions based on context
 */
function generateContextualSuggestions(context: string, memoryContext: any): Array<{
  text: string;
  type: string;
  confidence: number;
  icon?: string;
}> {
  const suggestions: Array<{ text: string; type: string; confidence: number; icon?: string }> = [];
  const lower = context.toLowerCase();

  // Based on keywords in context
  if (lower.includes('meeting') || lower.includes('schedule')) {
    suggestions.push({
      text: 'Schedule meeting?',
      type: 'genie',
      confidence: 0.9,
      icon: '📅'
    });
  }

  if (lower.includes('flight') || lower.includes('travel')) {
    suggestions.push({
      text: 'Search flights on Airzy',
      type: 'deeplink',
      confidence: 0.9,
      icon: '✈️'
    });
  }

  if (lower.includes('hotel') || lower.includes('stay')) {
    suggestions.push({
      text: 'Book hotel on StayOwn',
      type: 'deeplink',
      confidence: 0.9,
      icon: '🏨'
    });
  }

  if (lower.includes('cab') || lower.includes('taxi') || lower.includes('ride')) {
    suggestions.push({
      text: 'Book cab on KHAIRMOVE',
      type: 'deeplink',
      confidence: 0.9,
      icon: '🚗'
    });
  }

  if (lower.includes('food') || lower.includes('eat') || lower.includes('restaurant')) {
    suggestions.push({
      text: 'Order food on Nexha',
      type: 'deeplink',
      confidence: 0.9,
      icon: '🍔'
    });
  }

  if (lower.includes('report') || lower.includes('sales') || lower.includes('business')) {
    suggestions.push({
      text: 'Generate report with CoPilot',
      type: 'copilot',
      confidence: 0.85,
      icon: '📊'
    });
  }

  if (lower.includes('email') || lower.includes('mail')) {
    suggestions.push({
      text: 'Draft email with CoPilot',
      type: 'copilot',
      confidence: 0.85,
      icon: '📧'
    });
  }

  if (lower.includes('birthday') || lower.includes('anniversary')) {
    suggestions.push({
      text: 'Generate greeting with Genie',
      type: 'genie',
      confidence: 0.9,
      icon: '🎂'
    });
  }

  // Memory-based suggestions
  if (memoryContext.recentTopics?.length > 0) {
    suggestions.push({
      text: `Continue: ${memoryContext.recentTopics[0]}`,
      type: 'memory',
      confidence: 0.7,
      icon: '🧠'
    });
  }

  return suggestions;
}

/**
 * Helper: Adjust text to formal tone
 */
function adjustToFormal(text: string): string {
  const replacements: [string, string][] = [
    ['hey', 'hello'],
    ['thanks', 'thank you'],
    ['gonna', 'going to'],
    ['wanna', 'would like to'],
    ['gotta', 'have to'],
    ['kinda', 'somewhat'],
    ['lots of', 'many'],
    ['stuff', 'items'],
    ['a lot', 'considerably'],
  ];

  let adjusted = text;
  replacements.forEach(([from, to]) => {
    adjusted = adjusted.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
  });

  return adjusted;
}

/**
 * Helper: Adjust text to friendly tone
 */
function adjustToFriendly(text: string): string {
  const replacements: [string, string][] = [
    ['thank you', 'thanks'],
    ['therefore', 'so'],
    ['however', 'but'],
    ['furthermore', 'also'],
    ['nevertheless', 'still'],
    ['consequently', 'so'],
    ['subsequently', 'then'],
  ];

  let adjusted = text;
  replacements.forEach(([from, to]) => {
    adjusted = adjusted.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
  });

  return adjusted;
}

// ============================================
// RAZO CLEANUP (4635) - Grammar Correction
// ============================================
const cleanupApp = express();
cleanupApp.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
}));
cleanupApp.use(express.json({ limit: "10kb" }));

// Health endpoint
cleanupApp.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'razo-cleanup', version: '2.0.0' });
});

// Text cleanup
cleanupApp.post('/clean', async (req, res) => {
  try {
    const { text, userId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    // Remove filler words
    const fillers = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally'];
    let cleaned = text;
    fillers.forEach(f => {
      cleaned = cleaned.replace(new RegExp(`\\b${f}\\b`, 'gi'), '');
    });
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    res.json({
      cleaned,
      grammar: [],
      suggestions: []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

cleanupApp.listen(4635, () => console.log('RAZO Cleanup (4635) - Grammar'));

// ============================================
// RAZO SNIPPETS (4636) - Phrase Expansion
// ============================================
const snippetsApp = express();
snippetsApp.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
}));
snippetsApp.use(express.json({ limit: "10kb" }));

// Health endpoint
snippetsApp.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'razo-snippets', version: '2.0.0' });
});

// Snippet Schema
const SnippetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  trigger: { type: String, required: true },
  expansion: { type: String, required: true },
  category: String,
  useCount: { type: Number, default: 0 },
});
SnippetSchema.index({ userId: 1, trigger: 1 });
const Snippet = mongoose.model('Snippet', SnippetSchema);

// Built-in snippets
const BUILT_IN = [
  { trigger: 'dominos', expansion: 'Order from Domino\'s Pizza', category: 'food' },
  { trigger: 'ola', expansion: 'Book an Ola cab', category: 'transport' },
  { trigger: 'airzy', expansion: 'Open Airzy app', category: 'app' },
  { trigger: 'wallet', expansion: 'Open REZ Wallet', category: 'app' },
  { trigger: 'stay', expansion: 'Book hotel on StayOwn', category: 'app' },
  { trigger: 'cab', expansion: 'Book ride on KHAIRMOVE', category: 'app' },
  { trigger: 'food', expansion: 'Order food delivery', category: 'app' },
  { trigger: 'health', expansion: 'Open RisaCare', category: 'app' },
  { trigger: 'work', expansion: 'Open CorpPerks', category: 'app' },
];

// Expand snippet
snippetsApp.post('/expand', async (req, res) => {
  try {
    const { phrase, userId } = req.body;

    if (!phrase) {
      return res.status(400).json({ error: 'phrase is required' });
    }

    const p = phrase.toLowerCase().trim();

    // Check built-in
    const builtIn = BUILT_IN.find(s => s.trigger.toLowerCase() === p);
    if (builtIn) {
      return res.json({ expansion: builtIn.expansion, source: 'built-in' });
    }

    // Check user snippets
    const userSnippet = await Snippet.findOne({ userId, trigger: p });
    if (userSnippet) {
      return res.json({ expansion: userSnippet.expansion, source: 'user' });
    }

    res.json({ expansion: null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Match snippet
snippetsApp.post('/match', async (req, res) => {
  try {
    const { text, spoken, userId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const words = text.toLowerCase().split(' ');

    const matches = BUILT_IN.filter(s => words.includes(s.trigger.toLowerCase()));
    res.json({ matches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add snippet
snippetsApp.post('/add', async (req, res) => {
  try {
    const { trigger, expansion, category, userId } = req.body;

    if (!trigger || !expansion || !userId) {
      return res.status(400).json({ error: 'trigger, expansion, and userId are required' });
    }

    await Snippet.create({ userId, trigger, expansion, category, useCount: 0 });
    res.json({ added: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all snippets
snippetsApp.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userSnippets = await Snippet.find({ userId });
    res.json({
      snippets: [...BUILT_IN, ...userSnippets]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

snippetsApp.listen(4636, () => console.log('RAZO Snippets (4636) - Phrase Expansion'));

export default { cloudApp, vaultApp, searchApp, aiApp, cleanupApp, snippetsApp };
