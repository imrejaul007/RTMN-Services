/**
 * RTMN Shared Database Module
 *
 * Provides MongoDB connection and utilities for all Industry OS services.
 *
 * Usage:
 *   import { connectDB, db, getTenantModel } from '../shared/lib/database';
 *
 *   // Connect on startup
 *   await connectDB();
 *
 *   // Use models
 *   const Menu = getTenantModel('Menu');
 *   const menus = await Menu.find({ tenantId });
 */

import mongoose from 'mongoose';

// MongoDB connection state
let isConnected = false;
let connection = null;

/**
 * Connect to MongoDB
 */
export async function connectDB() {
  if (isConnected) {
    return connection;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('⚠️  MONGODB_URI not set. Running in demo mode (in-memory).');
    console.warn('    Set MONGODB_URI for production.');
    return null;
  }

  try {
    connection = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
      isConnected = false;
    });

    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected');
  }
}

/**
 * Get the mongoose connection
 */
export function getConnection() {
  return mongoose.connection;
}

/**
 * Check if connected
 */
export function isConnectedDB() {
  return isConnected && mongoose.connection.readyState === 1;
}

// ============================================
// Schema Definitions
// ============================================

/**
 * Base Schema with tenant isolation
 */
export const BaseSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  createdBy: {
    type: String,
    default: null,
  },
  updatedBy: {
    type: String,
    default: null,
  },
}, { timestamps: true });

// ============================================
// Industry-Specific Model Registries
// ============================================

const modelRegistries = {};

/**
 * Get or create a tenant-scoped model
 */
export function getTenantModel(modelName, schema) {
  const db = isConnectedDB() ? mongoose.connection.db : null;

  if (!db) {
    console.warn(`⚠️  Database not connected. Model '${modelName}' will use in-memory fallback.`);
    return createInMemoryModel(modelName);
  }

  const fullName = `${modelName}`; // Models are tenant-scoped via tenantId field

  if (mongoose.models[fullName]) {
    return mongoose.model(fullName);
  }

  if (schema) {
    return mongoose.model(fullName, schema);
  }

  // Create default schema
  const defaultSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, default: 'active' },
    ...BaseSchema.obj,
  }, { timestamps: true });

  return mongoose.model(fullName, defaultSchema);
}

// ============================================
// In-Memory Fallback (Demo Mode)
// ============================================

const inMemoryStores = {};

/**
 * Create an in-memory model fallback for demo mode
 */
function createInMemoryModel(modelName) {
  const store = new Map();
  inMemoryStores[modelName] = store;

  return {
    find: (query = {}) => {
      let results = Array.from(store.values());
      if (query.tenantId) {
        results = results.filter(item => item.tenantId === query.tenantId);
      }
      if (query._id) {
        results = results.filter(item => item._id.toString() === query._id);
      }
      return Promise.resolve(results);
    },
    findOne: (query = {}) => {
      const results = Array.from(store.values());
      const match = results.find(item => {
        if (query.tenantId && item.tenantId !== query.tenantId) return false;
        if (query._id && item._id.toString() !== query._id) return false;
        return true;
      });
      return Promise.resolve(match || null);
    },
    create: (data) => {
      const doc = { _id: new mongoose.Types.ObjectId(), ...data, createdAt: new Date(), updatedAt: new Date() };
      store.set(doc._id.toString(), doc);
      return Promise.resolve(doc);
    },
    findByIdAndUpdate: (id, data) => {
      const doc = store.get(id);
      if (doc) {
        const updated = { ...doc, ...data, updatedAt: new Date() };
        store.set(id, updated);
        return Promise.resolve(updated);
      }
      return Promise.resolve(null);
    },
    findByIdAndDelete: (id) => {
      const doc = store.get(id);
      store.delete(id);
      return Promise.resolve(doc);
    },
    countDocuments: (query = {}) => {
      let results = Array.from(store.values());
      if (query.tenantId) {
        results = results.filter(item => item.tenantId === query.tenantId);
      }
      return Promise.resolve(results.length);
    },
  };
}

/**
 * Get in-memory store for a model (for demo debugging)
 */
export function getInMemoryStore(modelName) {
  return inMemoryStores[modelName];
}

/**
 * Clear all in-memory stores (for testing)
 */
export function clearInMemoryStores() {
  Object.keys(inMemoryStores).forEach(key => {
    inMemoryStores[key].clear();
  });
}

// ============================================
// Tenant Middleware
// ============================================

/**
 * Express middleware to extract tenant ID from request
 */
export function tenantMiddleware(req, res, next) {
  // Get tenant ID from header, auth token, or subdomain
  const tenantId =
    req.headers['x-tenant-id'] ||
    req.headers['x-business-id'] ||
    req.query.tenantId ||
    req.auth?.businessId ||
    'default';

  req.tenantId = tenantId;
  req.userId = req.auth?.userId || null;
  req.userRole = req.auth?.role || 'owner';

  next();
}

/**
 * Require authentication middleware
 */
export function requireAuth(req, res, next) {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      hint: 'Include Authorization: Bearer <token> header'
    });
  }
  next();
}

/**
 * Require specific role middleware
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: roles,
        current: req.auth?.role
      });
    }
    next();
  };
}

export default {
  connectDB,
  disconnectDB,
  getConnection,
  isConnectedDB,
  getTenantModel,
  getInMemoryStore,
  clearInMemoryStores,
  tenantMiddleware,
  requireAuth,
  requireRole,
};
