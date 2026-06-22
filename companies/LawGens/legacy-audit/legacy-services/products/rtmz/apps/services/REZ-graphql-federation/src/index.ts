/**
 * REZ GraphQL Federation Gateway
 * Main Entry Point
 * Port: 5000
 */

import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { logger } from './utils/logger.js';
import { typeDefs } from './schema/types/index.js';
import { resolvers, ResolverContext } from './schema/resolvers/index.js';
import { authMiddleware, createGraphQLContext, AuthenticatedRequest } from './middleware/auth.js';
import { tenantMiddleware, extractTenantId, extractUserId } from './middleware/tenant.js';
import {
  createHealthChecker,
  healthRouter,
  addMongoHealthCheck,
  addRestServiceHealthCheck
} from './health.js';

// Environment configuration
const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-federation-gateway';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

// Service URLs
const COMPANY_MEMORY_URL = process.env.COMPANY_MEMORY_SERVICE_URL || 'http://localhost:4801';
const AGENT_PROTOCOL_URL = process.env.AGENT_PROTOCOL_SERVICE_URL || 'http://localhost:4201';
const HOJAI_API_URL = process.env.HOJAI_API_SERVICE_URL || 'http://localhost:4500';

// Forensics MCP URLs
const MCP_EVIDENCE_URL = process.env.MCP_EVIDENCE_URL || 'http://localhost:3120';
const MCP_DEEPFAKE_URL = process.env.MCP_DEEPFAKE_URL || 'http://localhost:3121';
const MCP_CUSTODY_URL = process.env.MCP_CUSTODY_URL || 'http://localhost:3122';
const MCP_FORENSICS_URL = process.env.MCP_FORENSICS_URL || 'http://localhost:3123';
const MCP_SOCIAL_URL = process.env.MCP_SOCIAL_URL || 'http://localhost:3130';
const MCP_FINANCIAL_URL = process.env.MCP_FINANCIAL_URL || 'http://localhost:3131';
const MCP_LOCATION_URL = process.env.MCP_LOCATION_URL || 'http://localhost:3132';
const MCP_REPORTS_URL = process.env.MCP_REPORTS_URL || 'http://localhost:3133';
const FORENSICS_GATEWAY_URL = process.env.FORENSICS_GATEWAY_URL || 'http://localhost:5100';

// Create Express app
const app: Express = express();

// Create HTTP server
const httpServer = createServer(app);

// Create health checker
const health = createHealthChecker('REZ-graphql-federation-gateway', '1.0.0');

// Add health checks
addMongoHealthCheck(health, MONGODB_URI);
addRestServiceHealthCheck(health, 'company-memory', COMPANY_MEMORY_URL);
addRestServiceHealthCheck(health, 'agent-protocol', AGENT_PROTOCOL_URL);
addRestServiceHealthCheck(health, 'hojai-api', HOJAI_API_URL);

// Forensics MCP health checks
addRestServiceHealthCheck(health, 'mcp-evidence', MCP_EVIDENCE_URL);
addRestServiceHealthCheck(health, 'mcp-deepfake', MCP_DEEPFAKE_URL);
addRestServiceHealthCheck(health, 'mcp-custody', MCP_CUSTODY_URL);
addRestServiceHealthCheck(health, 'mcp-forensics', MCP_FORENSICS_URL);
addRestServiceHealthCheck(health, 'mcp-social', MCP_SOCIAL_URL);
addRestServiceHealthCheck(health, 'mcp-financial', MCP_FINANCIAL_URL);
addRestServiceHealthCheck(health, 'mcp-location', MCP_LOCATION_URL);
addRestServiceHealthCheck(health, 'mcp-reports', MCP_REPORTS_URL);
addRestServiceHealthCheck(health, 'forensics-gateway', FORENSICS_GATEWAY_URL);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-User-ID', 'X-User-Roles']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    errors: [{
      message: 'Too many requests, please try again later',
      extensions: { code: 'RATE_LIMIT_EXCEEDED' }
    }]
  }
});
app.use('/graphql', limiter);

// Tenant middleware
app.use(tenantMiddleware());

// Auth middleware
app.use(authMiddleware());

// Health routes (before other routes)
app.use('/health', healthRouter(health));

// Liveness probe
app.get('/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe
app.get('/ready', async (_req: Request, res: Response) => {
  const checks = await health.getHealth();
  const unhealthy = checks.some(c => c.status === 'fail');
  res.status(unhealthy ? 503 : 200).json({
    status: unhealthy ? 'not_ready' : 'ready',
    timestamp: new Date().toISOString()
  });
});

// Create GraphQL schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// Create Apollo Server
const server = new ApolloServer<ResolverContext>({
  schema,
  introspection: true,
  formatError: (error) => {
    logger.error('graphql_error', {
      message: error.message,
      path: error.path,
      extensions: error.extensions
    });

    // Don't expose internal errors in production
    if (NODE_ENV === 'production' && error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
      return {
        message: 'Internal server error',
        extensions: { code: 'INTERNAL_SERVER_ERROR' }
      };
    }
    return error;
  }
});

// Start server function
async function startServer(): Promise<void> {
  try {
    // Start Apollo Server
    await server.start();

    // GraphQL endpoint with context
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async ({ req }: { req: Request }): Promise<ResolverContext> => {
          const authReq = req as AuthenticatedRequest;
          const tenantId = extractTenantId(req);
          const userId = extractUserId(req);

          return createGraphQLContext({
            tenantId,
            userId,
            isAuthenticated: authReq.auth?.isAuthenticated || false,
            roles: authReq.auth?.roles
          });
        }
      })
    );

    // Connect to MongoDB
    logger.info('connecting_to_mongodb', { uri: MONGODB_URI });
    await mongoose.connect(MONGODB_URI);
    logger.info('mongodb_connected');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info('server_started', {
        port: PORT,
        nodeEnv: NODE_ENV,
        graphqlUrl: `http://localhost:${PORT}/graphql`,
        healthUrl: `http://localhost:${PORT}/health`
      });

      console.log(`
╔════════════════════════════════════════════════════════════════╗
║         REZ GraphQL Federation Gateway                         ║
╠════════════════════════════════════════════════════════════════╣
║  GraphQL:     http://localhost:${PORT.toString().padEnd(28)}║
║  Health:      http://localhost:${PORT.toString().padEnd(28)}║
║  Status:      ${NODE_ENV.padEnd(28)}║
╠════════════════════════════════════════════════════════════════╣
║  Services:                                                  ║
║    - Company Memory:  ${COMPANY_MEMORY_URL.padEnd(26)}║
║    - Agent Protocol:  ${AGENT_PROTOCOL_URL.padEnd(26)}║
║    - Hojai API:       ${HOJAI_API_URL.padEnd(26)}║
╚════════════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    logger.error('start_failed', { error });
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info('shutdown_initiated', { signal });

  try {
    await server.stop();
    logger.info('apollo_server_stopped');

    await mongoose.connection.close();
    logger.info('mongodb_connection_closed');

    httpServer.close(() => {
      logger.info('http_server_closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('forced_shutdown');
      process.exit(1);
    }, 10000);

  } catch (error) {
    logger.error('shutdown_error', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('unhandled_rejection', { reason, promise });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error });
  process.exit(1);
});

// Start the server
startServer();

export { app, server };
