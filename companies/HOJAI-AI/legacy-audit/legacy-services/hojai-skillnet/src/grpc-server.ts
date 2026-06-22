/**
 * gRPC Server for HOJAI SkillNet
 *
 * This module provides gRPC server functionality.
 * In production, install @grpc/grpc-js and @grpc/proto-loader
 *
 * Usage:
 *   import { createGrpcServer, startGrpcServer } from './grpc-server.js';
 *   await startGrpcServer(50051);
 */

import { v4 as uuidv4 } from 'uuid';

// Types
interface Prediction {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: string;
  model: string;
  score: number;
  confidence: number;
  created_at: string;
}

interface PredictionRequest {
  tenant_id: string;
  user_id?: string;
  features: Record<string, string>;
}

interface PredictionResponse {
  success: boolean;
  prediction?: Prediction;
  error?: string;
}

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
}

// In-memory store
const predictions: Prediction[] = [];
const startTime = Date.now();

// gRPC Status codes
const GrpcStatus = {
  OK: 0,
  INVALID_ARGUMENT: 3
};

/**
 * Health check handler
 */
function handleHealthCheck(): HealthResponse {
  return {
    status: 'healthy',
    service: 'hojai-skillnet',
    version: '1.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString()
  };
}

/**
 * Create churn prediction
 */
function createChurnPrediction(request: PredictionRequest): PredictionResponse {
  if (!request.tenant_id) {
    return { success: false, error: 'tenant_id is required' };
  }

  const score = Math.random() * 0.5 + 0.3;
  const prediction: Prediction = {
    id: uuidv4(),
    tenant_id: request.tenant_id,
    user_id: request.user_id,
    type: 'churn',
    model: 'hojai-churn-v1',
    score,
    confidence: 0.7 + Math.random() * 0.2,
    created_at: new Date().toISOString()
  };

  predictions.push(prediction);
  return { success: true, prediction };
}

/**
 * Create LTV prediction
 */
function createLTVPrediction(request: PredictionRequest): PredictionResponse {
  if (!request.tenant_id) {
    return { success: false, error: 'tenant_id is required' };
  }

  const score = Math.random() * 0.5 + 0.2;
  const prediction: Prediction = {
    id: uuidv4(),
    tenant_id: request.tenant_id,
    user_id: request.user_id,
    type: 'ltv',
    model: 'hojai-ltv-v1',
    score,
    confidence: 0.6 + Math.random() * 0.3,
    created_at: new Date().toISOString()
  };

  predictions.push(prediction);
  return { success: true, prediction };
}

/**
 * Create intent prediction
 */
function createIntentPrediction(request: PredictionRequest): PredictionResponse {
  if (!request.tenant_id) {
    return { success: false, error: 'tenant_id is required' };
  }

  const score = Math.random() * 0.6 + 0.3;
  const prediction: Prediction = {
    id: uuidv4(),
    tenant_id: request.tenant_id,
    user_id: request.user_id,
    type: 'intent',
    model: 'hojai-intent-v1',
    score,
    confidence: 0.55 + Math.random() * 0.35,
    created_at: new Date().toISOString()
  };

  predictions.push(prediction);
  return { success: true, prediction };
}

/**
 * Get predictions
 */
function getPredictions(tenantId: string, type?: string, limit?: number): { predictions: Prediction[]; total: number } {
  let filtered = predictions.filter(p => p.tenant_id === tenantId);

  if (type) {
    filtered = filtered.filter(p => p.type === type);
  }

  if (limit) {
    filtered = filtered.slice(-limit);
  }

  return { predictions: filtered, total: filtered.length };
}

/**
 * gRPC Server interface
 * Use with @grpc/grpc-js in production:
 *
 * import * as grpc from '@grpc/grpc-js';
 *
 * const server = new grpc.Server();
 * server.addService(
 *   skillnetProto.skillnet.v1.IntelligenceService,
 *   {
 *     CreateChurnPrediction: (call, callback) => {
 *       callback(null, createChurnPrediction(call.request));
 *     },
 *     ...
 *   }
 * );
 */
export interface GrpcServer {
  addService: (name: string, handlers: any) => void;
  start: (port: number) => Promise<void>;
  stop: () => void;
}

export interface GrpcHandlers {
  health: typeof handleHealthCheck;
  createChurnPrediction: typeof createChurnPrediction;
  createLTVPrediction: typeof createLTVPrediction;
  createIntentPrediction: typeof createIntentPrediction;
  getPredictions: typeof getPredictions;
}

/**
 * Create a gRPC server instance
 * This is a simplified interface - use @grpc/grpc-js in production
 */
export function createGrpcServer(): GrpcServer {
  const services: Map<string, any> = new Map();
  let running = false;

  return {
    addService(name: string, handlers: any) {
      services.set(name, handlers);
    },

    async start(port: number = 50051): Promise<void> {
      if (running) return;
      running = true;
      console.log(`[gRPC] Server interface ready on port ${port}`);
      console.log(`[gRPC] Install @grpc/grpc-js for full implementation`);
    },

    stop() {
      running = false;
      services.clear();
    }
  };
}

/**
 * Start the gRPC server
 */
export async function startGrpcServer(port: number = 50051): Promise<void> {
  const server = createGrpcServer();

  // Add handlers
  server.addService('skillnet.v1.HealthService', { CheckHealth: handleHealthCheck });
  server.addService('skillnet.v1.IntelligenceService', {
    CreateChurnPrediction: createChurnPrediction,
    CreateLTVPrediction: createLTVPrediction,
    CreateIntentPrediction: createIntentPrediction,
    GetPredictions: getPredictions
  });

  await server.start(port);
}

export default {
  createGrpcServer,
  startGrpcServer,
  handleHealthCheck,
  createChurnPrediction,
  createLTVPrediction,
  createIntentPrediction,
  getPredictions
};
