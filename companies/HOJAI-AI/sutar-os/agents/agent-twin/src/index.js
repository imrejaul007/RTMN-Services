/**
 * Agent Twin Service
 * Digital Twin service for agent entities
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import {
  requireAuth,
  optionalAuth,
  defaultLimiter,
  strictLimiter,
  sanitizeObject,
  preventPrototypePollution
} from '@rtmn/twinos-shared';

dotenv.config();

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 5324;
const JWT_SECRET = process.env.JWT_SECRET;
const SERVICE_NAME = 'agent-twin';

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply default rate limiter to all routes
app.use(defaultLimiter);

// MongoDB Connection
const connectDB = async () => {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log(`[${SERVICE_NAME}] MongoDB connected`);
    } catch (err) {
      console.log(`[${SERVICE_NAME}] MongoDB connection failed, using in-memory store`);
    }
  }
};

// In-memory store fallback (now file-backed via PersistentMap)
const store = new PersistentMap('agents', { serviceName: 'agent-twin' });

// Allowed fields for create and update operations
const ALLOWED_CREATE_FIELDS = ['id', 'name', 'type', 'category', 'metadata', 'status', 'email', 'phone', 'role', 'permissions', 'businessId'];
const ALLOWED_UPDATE_FIELDS = ['name', 'metadata', 'status', 'email', 'phone', 'role', 'permissions'];

// Health endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

// Get all agent twins (with pagination)
app.get('/api/twins', optionalAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.q || '';
    const status = req.query.status;

    let twins = Array.from(store.values());

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      twins = twins.filter(t =>
        (t.name && t.name.toLowerCase().includes(searchLower)) ||
        (t.id && t.id.toLowerCase().includes(searchLower)) ||
        (t.email && t.email.toLowerCase().includes(searchLower))
      );
    }

    // Filter by status
    if (status) {
      twins = twins.filter(t => t.status === status);
    }

    // Pagination
    const total = twins.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTwins = twins.slice(startIndex, endIndex);

    res.json({
      success: true,
      twins: paginatedTwins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error fetching twins:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch twins'
      }
    });
  }
});

// Get agent twin by ID
app.get('/api/twin/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const twin = store.get(id);

    if (!twin) {
      // Return default twin if not found
      const defaultTwin = {
        id,
        name: `Agent ${id}`,
        status: 'active',
        type: 'entity',
        category: 'foundation',
        createdAt: new Date().toISOString()
      };
      return res.json({
        success: true,
        twin: defaultTwin
      });
    }

    res.json({
      success: true,
      twin
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error fetching twin:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch twin'
      }
    });
  }
});

// Create agent twin
app.post('/api/twin',requireAuth,  strictLimiter, (req, res) => {
  try {
    // Sanitize input to prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);

    if (!sanitizedBody || typeof sanitizedBody !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request body'
        }
      });
    }

    const { id, name, type, category, metadata, status, email, phone, role, permissions, businessId } = sanitizedBody;

    // Validate required fields
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Twin ID and name are required'
        }
      });
    }

    // Validate ID format
    if (!/^[a-z0-9-_]+$/i.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Twin ID must be alphanumeric with hyphens and underscores'
        }
      });
    }

    // Check if twin already exists
    if (store.has(id)) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_TWIN',
          message: 'Twin with this ID already exists'
        }
      });
    }

    // Whitelist fields for creation
    const twinData = sanitizeObject(sanitizedBody, ALLOWED_CREATE_FIELDS);

    const twin = {
      ...twinData,
      id,
      type: twinData.type || 'entity',
      category: twinData.category || 'foundation',
      status: twinData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    store.set(id, twin);

    console.log(`[${SERVICE_NAME}] Created twin: ${id}`);

    res.status(201).json({
      success: true,
      twin
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error creating twin:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create twin'
      }
    });
  }
});

// Update agent twin
app.put('/api/twin/:id',requireAuth,  strictLimiter, (req, res) => {
  try {
    const { id } = req.params;

    // Sanitize input to prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);

    if (!sanitizedBody || typeof sanitizedBody !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request body'
        }
      });
    }

    const twin = store.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Twin not found'
        }
      });
    }

    // Whitelist fields to prevent mass assignment
    const updates = sanitizeObject(sanitizedBody, ALLOWED_UPDATE_FIELDS);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No valid fields to update'
        }
      });
    }

    const updatedTwin = {
      ...twin,
      ...updates,
      id: twin.id, // Prevent ID change
      updatedAt: new Date().toISOString(),
      version: (twin.version || 1) + 1
    };

    store.set(id, updatedTwin);

    console.log(`[${SERVICE_NAME}] Updated twin: ${id}`);

    res.json({
      success: true,
      twin: updatedTwin
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error updating twin:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update twin'
      }
    });
  }
});

// Delete agent twin
app.delete('/api/twin/:id',requireAuth,  strictLimiter, (req, res) => {
  try {
    const { id } = req.params;

    if (!store.has(id)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Twin not found'
        }
      });
    }

    store.delete(id);

    console.log(`[${SERVICE_NAME}] Deleted twin: ${id}`);

    res.json({
      success: true,
      message: 'Twin deleted successfully'
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error deleting twin:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete twin'
      }
    });
  }
});

// Update twin state
app.patch('/api/twin/:id/state',requireAuth,  strictLimiter, (req, res) => {
  try {
    const { id } = req.params;

    // Sanitize input to prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);

    if (!sanitizedBody || typeof sanitizedBody !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request body'
        }
      });
    }

    const twin = store.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Twin not found'
        }
      });
    }

    const { data } = sanitizedBody;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'State data is required and must be an object'
        }
      });
    }

    const updatedTwin = {
      ...twin,
      state: {
        ...twin.state,
        ...data
      },
      updatedAt: new Date().toISOString(),
      version: (twin.version || 1) + 1
    };

    store.set(id, updatedTwin);

    console.log(`[${SERVICE_NAME}] Updated state for twin: ${id}`);

    res.json({
      success: true,
      twin: updatedTwin
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error updating twin state:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update twin state'
      }
    });
  }
});

// Get twin history
app.get('/api/twin/:id/history', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const twin = store.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Twin not found'
        }
      });
    }

    // Return current version info
    res.json({
      success: true,
      history: {
        id: twin.id,
        version: twin.version || 1,
        createdAt: twin.createdAt,
        updatedAt: twin.updatedAt
      }
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error fetching twin history:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch twin history'
      }
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Unhandled error:`, err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message
    }
  });
});

// Start server
const server = 
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Agent Twin Service running on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Environment: ${process.env.NODE_ENV || 'development'}`);
  connectDB();
});

// Graceful shutdown — flush agent store before exit
installGracefulShutdown(server, async () => {
  await store.flush();
  store.stopAutoFlush();
});

export default app;
