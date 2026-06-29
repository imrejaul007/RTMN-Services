/**
 * Ontology Engine - Main Entry Point
 *
 * Port: 4751
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { testConnection, runMigrations, closePool } from './db/database.js';
import { inferenceEngine } from './inference/inferenceEngine.js';
import ontologyRoutes from './routes/ontology.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4751');

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Routes
app.use('/', ontologyRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'Ontology Engine',
    version: '1.0.0',
    description: 'Schema management, validation, inference, and taxonomy for knowledge graphs',
    docs: '/ontology/health',
    endpoints: {
      classes: '/ontology/classes',
      properties: '/ontology/properties',
      constraints: '/ontology/constraints',
      validate: '/ontology/validate',
      infer: '/ontology/infer',
      taxonomy: '/ontology/taxonomy'
    }
  });
});

// Graceful shutdown
let server: ReturnType<typeof app.listen>;

async function shutdown() {
  console.log('[OntologyEngine] Shutting down...');
  if (server) {
    server.close();
  }
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('[OntologyEngine] Failed to connect to database');
      process.exit(1);
    }

    // Run migrations
    await runMigrations();

    // Initialize inference engine
    await inferenceEngine.initialize();
    console.log('[OntologyEngine] Inference engine initialized');

    // Start listening
    if (process.env.NODE_ENV !== 'test') {
      server = app.listen(PORT, () => {
        console.log(`[OntologyEngine] Running on port ${PORT}`);
        console.log(`[OntologyEngine] Health: http://localhost:${PORT}/ontology/health`);
      });
    }
  } catch (error) {
    console.error('[OntologyEngine] Failed to start:', error);
    process.exit(1);
  }
}

start();

export { app };
export default app;
