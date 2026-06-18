/**
 * RTMN Sync Client Library
 *
 * Use this in any OS to integrate with Sync Hub
 *
 * Usage:
 *   const sync = require('./sync-client');
 *   sync.register({ id: 'my-os', port: 5000 });
 *   sync.sync('target-os', 'data', 'type');
 */

const http = require('http');

const SYNC_HUB_URL = process.env.SYNC_HUB_URL || 'http://localhost:4399';

// ============================================================
// SYNC CLIENT
// ============================================================

class SyncClient {
  constructor(serviceId, serviceName, port) {
    this.serviceId = serviceId;
    this.serviceName = serviceName;
    this.port = port;
    this.version = '1.0.0';
    this.modules = [];
    this.features = [];
  }

  // ============================================================
  // REGISTER - Register with Sync Hub
  // ============================================================

  async register(config = {}) {
    const service = {
      id: this.serviceId,
      name: this.serviceName,
      port: this.port,
      version: this.version || config.version,
      type: config.type || 'service',
      category: config.category || 'general',
      modules: this.modules || config.modules || [],
      features: this.features || config.features || [],
      health: 'healthy',
      lastSync: new Date().toISOString(),
    };

    try {
      const response = await this.request('/api/registry', 'POST', service);
      console.log(`[SYNC] Registered with Sync Hub: ${this.serviceId}`);
      return response;
    } catch (error) {
      console.error(`[SYNC] Registration failed:`, error.message);
      return null;
    }
  }

  // ============================================================
  // SYNC - Sync data to another service
  // ============================================================

  async sync(targetService, data, type = 'data') {
    const syncRequest = {
      source: this.serviceId,
      target: targetService,
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await this.request('/api/sync', 'POST', syncRequest);
      console.log(`[SYNC] Synced to ${targetService}: ${type}`);
      return response;
    } catch (error) {
      console.error(`[SYNC] Sync failed:`, error.message);
      return null;
    }
  }

  // ============================================================
  // BROADCAST - Send to multiple services
  // ============================================================

  async broadcast(services, data, type = 'broadcast') {
    const results = [];
    for (const service of services) {
      const result = await this.sync(service, data, type);
      results.push({ service, result });
    }
    return results;
  }

  // ============================================================
  // FEATURE - Register/update features
  // ============================================================

  async registerFeature(name, category = 'general', status = 'active') {
    const feature = {
      service: this.serviceId,
      name,
      category,
      status,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await this.request('/api/features', 'POST', feature);
      console.log(`[SYNC] Feature registered: ${name}`);
      return response;
    } catch (error) {
      console.error(`[SYNC] Feature registration failed:`, error.message);
      return null;
    }
  }

  async updateFeature(featureId, updates) {
    try {
      const response = await this.request(`/api/features/${featureId}`, 'PATCH', updates);
      console.log(`[SYNC] Feature updated: ${featureId}`);
      return response;
    } catch (error) {
      console.error(`[SYNC] Feature update failed:`, error.message);
      return null;
    }
  }

  // ============================================================
  // HEALTH - Report health status
  // ============================================================

  async reportHealth(status = 'healthy', message = 'All systems operational') {
    const healthReport = {
      health: status,
      message,
      service: this.serviceId,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.request(`/api/health/${this.serviceId}`, 'POST', healthReport);
      return true;
    } catch (error) {
      console.error(`[SYNC] Health report failed:`, error.message);
      return false;
    }
  }

  // ============================================================
  // VERSION - Update version
  // ============================================================

  async updateVersion(newVersion) {
    this.version = newVersion;
    try {
      await this.request(`/api/registry/${this.serviceId}`, 'PATCH', { version: newVersion });
      console.log(`[SYNC] Version updated to ${newVersion}`);
      return true;
    } catch (error) {
      console.error(`[SYNC] Version update failed:`, error.message);
      return false;
    }
  }

  // ============================================================
  // QUERY - Get info from Sync Hub
  // ============================================================

  async getServices() {
    try {
      const response = await this.request('/api/registry', 'GET');
      return response;
    } catch (error) {
      console.error(`[SYNC] Get services failed:`, error.message);
      return null;
    }
  }

  async getService(serviceId) {
    try {
      const response = await this.request(`/api/registry/${serviceId}`, 'GET');
      return response;
    } catch (error) {
      console.error(`[SYNC] Get service failed:`, error.message);
      return null;
    }
  }

  async getFeatures(serviceId = null) {
    const endpoint = serviceId ? `/api/features?service=${serviceId}` : '/api/features';
    try {
      const response = await this.request(endpoint, 'GET');
      return response;
    } catch (error) {
      console.error(`[SYNC] Get features failed:`, error.message);
      return null;
    }
  }

  async getVersions() {
    try {
      const response = await this.request('/api/versions', 'GET');
      return response;
    } catch (error) {
      console.error(`[SYNC] Get versions failed:`, error.message);
      return null;
    }
  }

  // ============================================================
  // UTILITY
  // ============================================================

  async request(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, SYNC_HUB_URL);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function createSyncClient(serviceId, serviceName, port) {
  return new SyncClient(serviceId, serviceName, port);
}

// Quick sync function
async function quickSync(sourceId, targetId, data, type = 'data') {
  const client = new SyncClient(sourceId);
  return client.sync(targetId, data, type);
}

// Quick broadcast
async function quickBroadcast(sourceId, targets, data, type = 'broadcast') {
  const client = new SyncClient(sourceId);
  return client.broadcast(targets, data, type);
}

// ============================================================
// EXPRESS MIDDLEWARE
// ============================================================

function syncMiddleware(syncClient) {
  return (req, res, next) => {
    // Attach sync client to request
    req.sync = syncClient;

    // Auto-report health on requests
    if (req.path === '/health') {
      syncClient.reportHealth('healthy');
    }

    next();
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  SyncClient,
  createSyncClient,
  quickSync,
  quickBroadcast,
  syncMiddleware,
  SYNC_HUB_URL,
};

// ============================================================
// USAGE EXAMPLES
// ============================================================

/*
// Example 1: Basic integration
const { createSyncClient } = require('./sync-client');

const sync = createSyncClient('legal-os', 'Legal OS', 5035);
sync.register({ modules: ['contracts', 'compliance'], features: ['digital-twin'] });

// On contract created
sync.sync('finance-os', { contractId: 'CTR001', value: 5000000 }, 'contract');

// On feature added
sync.registerFeature('Auto Contract Review', 'ai');


// Example 2: Express middleware
const express = require('express');
const { syncMiddleware } = require('./sync-client');

const app = express();
const sync = createSyncClient('my-service', 'My Service', 5000);

app.use(syncMiddleware(sync));

// Routes
app.post('/contracts', async (req, res) => {
  const contract = await createContract(req.body);
  // Auto-sync to other services
  await req.sync.sync('finance-os', contract, 'contract');
  await req.sync.sync('operations-os', contract, 'contract');
  res.json(contract);
});


// Example 3: Health monitoring
const sync = createSyncClient('legal-os', 'Legal OS', 5035);
await sync.register();

// Report health every 30 seconds
setInterval(() => {
  sync.reportHealth('healthy', 'All systems operational');
}, 30000);
*/
