/**
 * REZ Identity Hub v2.0
 *
 * Unified User Intelligence + Knowledge Graph across ALL REZ apps
 * Version 2.0 includes:
 * - 26 data sources (previously 18)
 * - MongoDB persistence layer
 * - Real API integration clients
 * - Event Bus integration
 * - Admin UI dashboard
 * - Background sync jobs
 * - Data quality tracking
 * - Conversation Memory (INTERNAL ONLY)
 * - REZ CRM Hub integration
 *
 * Port: 6000
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

import { identityRoutes } from './routes/identity.js';
import { profileRoutes } from './routes/profile.js';
import { socialRoutes } from './routes/social.js';
import { searchRoutes } from './routes/search.js';
import { knowledgeGraphRoutes } from './routes/knowledgeGraph.js';
import { adminRoutes } from './routes/admin.js';
import { default as conversationRoutes } from './routes/conversation.js';

import { databaseService } from './services/database.js';
import { eventBusService, PROFILE_EVENT_TYPES, profileEventHandlers } from './services/eventBus.js';
import { syncJobManager, dataQualityTracker } from './services/syncJobs.js';
import { conversationMemory } from './services/conversationMemory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6000;

// Middleware
app.use(cors());
app.use(express.json());

// Static files for admin UI
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  const requestId = uuidv4();
  const start = Date.now();
  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ-identity-hub',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sources: 25,
    features: ['mongodb', 'event-bus', 'sync-jobs', 'admin-ui']
  });
});

// Admin dashboard (serves the HTML UI)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.use('/api', identityRoutes);
app.use('/api', profileRoutes);
app.use('/api', socialRoutes);
app.use('/api', searchRoutes);
app.use('/api', knowledgeGraphRoutes);
app.use('/api', adminRoutes);

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'REZ Identity Hub',
    description: 'Unified User Intelligence + Knowledge Graph across all REZ apps',
    version: '2.0.0',
    adminUI: '/admin',
    endpoints: {
      identity: {
        'GET /api/identity/:id': 'Get unified profile by ID',
        'POST /api/identity/resolve': 'Resolve identity by phone/email',
        'POST /api/identity/link': 'Link identities across apps',
        'GET /api/identity/:id/brief': 'Pre-call research brief',
        'GET /api/identity/:id/summary': 'Quick summary for pre-call'
      },
      profile: {
        'GET /api/profile/:type/:id': 'Get profile by type',
        'POST /api/profile': 'Create/update profile',
        'PUT /api/profile/:id/enrich': 'Enrich profile with more data',
        'GET /api/profile/:id/activity': 'Get activity across all apps'
      },
      social: {
        'POST /api/social/verify': 'Verify social media accounts',
        'GET /api/social/:userId': 'Get verified social profiles',
        'POST /api/social/scrape': 'Scrape social media for user'
      },
      search: {
        'GET /api/search/users': 'Search users across all apps',
        'GET /api/search/merchants': 'Search merchants',
        'GET /api/search/customers': 'Search customers',
        'GET /api/search/vendors': 'Search vendors',
        'GET /api/search/phone/:phone': 'Quick phone lookup'
      },
      knowledge: {
        'GET /api/knowledge/:userId': 'Full knowledge graph (ALL 25 sources)',
        'GET /api/knowledge/:userId/source/:source': 'Data from specific source',
        'GET /api/knowledge/:userId/insights': 'Aggregated insights',
        'GET /api/knowledge/:userId/compare': 'Compare with segment',
        'GET /api/knowledge/sources': 'All data sources status',
        'POST /api/knowledge/sync/:source': 'Sync data from source'
      },
      admin: {
        'GET /api/admin/dashboard': 'Admin dashboard stats',
        'GET /api/admin/identities': 'List all identities',
        'GET /api/admin/identities/:id': 'Identity detail',
        'GET /api/admin/quality': 'Data quality report',
        'GET /api/admin/sync': 'Sync management',
        'POST /api/admin/sync/:source': 'Trigger sync'
      },
      internal: {
        // INTERNAL ONLY - Not exposed to client frontends
        'POST /api/internal/conversations': 'Add conversation (CRM calls)',
        'GET /api/internal/pre-call/:clientId/:leadId': 'Get pre-call brief (INTERNAL)',
        'GET /api/internal/intelligence/:clientId/:leadId': 'Get lead intelligence (INTERNAL)',
        'GET /api/internal/history/:clientId/:leadId': 'Get conversation history (INTERNAL)',
        'POST /api/internal/extract-topics': 'Extract topics from text'
      }
    }
  });
});

// Event endpoint (for Event Bus callbacks)
app.post('/api/events', async (req, res) => {
  try {
    const event = req.body;
    await eventBusService.handleEvent(event);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mount internal conversation routes (INTERNAL ONLY)
app.use('/api/internal', conversationRoutes);

// Start server
async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await databaseService.connect();
    console.log('MongoDB connected');

    // Subscribe to Event Bus
    console.log('Connecting to Event Bus...');
    try {
      await eventBusService.subscribe(PROFILE_EVENT_TYPES, async (event) => {
        // Handle profile events
        const handler = profileEventHandlers[event.type as keyof typeof profileEventHandlers];
        if (handler) {
          await handler(event);
        }
      });
      console.log('Event Bus connected');
    } catch (error) {
      console.log('Event Bus connection failed (non-critical):', error);
    }

    // Start sync jobs
    console.log('Starting sync jobs...');
    syncJobManager.start();
    console.log('Sync jobs started');

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`REZ IDENTITY HUB v2.0 running on port ${PORT}
Admin UI: http://localhost:${PORT}/admin
Health: http://localhost:${PORT}/health
25 data sources connected`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  syncJobManager.stop();
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  syncJobManager.stop();
  await databaseService.disconnect();
  process.exit(0);
});

// Start
startServer();

export default app;