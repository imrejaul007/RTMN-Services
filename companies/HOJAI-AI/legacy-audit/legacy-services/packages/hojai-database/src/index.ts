/**
 * HOJAI Database Package
 * MongoDB connection and repository utilities
 */

export { createConnection, getConnection, closeConnection, isConnected } from './connection.js';
export { BaseRepository } from './repositories/base-repository.js';
export { TenantRepository } from './repositories/tenant-repository.js';
export * from './schemas/index.js';


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-database',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
