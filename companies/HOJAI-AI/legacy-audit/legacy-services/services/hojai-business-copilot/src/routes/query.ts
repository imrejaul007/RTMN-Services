import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import {
  createResponse,
  createErrorResponse,
  CopilotQuery,
  CopilotResponse,
  OrchestrationResult,
  InterfaceHealth,
} from '../types/index.js';

const logger = createLogger('hojai-business-copilot:query');
const router = Router();

// Service URLs
const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const TWIN_SERVICE_URL = process.env.TWIN_SERVICE_URL || 'http://localhost:4860';
const GRAPH_SERVICE_URL = process.env.GRAPH_SERVICE_URL || 'http://localhost:4810';
const INTELLIGENCE_SERVICE_URL = process.env.INTELLIGENCE_SERVICE_URL || 'http://localhost:4530';
const EXPERT_OS_URL = process.env.EXPERT_OS_URL || 'http://localhost:4550';
const FLOW_OS_URL = process.env.FLOW_OS_URL || 'http://localhost:4244';
const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || 'http://localhost:4708';
const SIMULATION_OS_URL = process.env.SIMULATION_OS_URL || 'http://localhost:4241';

// Intent classification patterns
const INTENT_PATTERNS = {
  memory: [
    'remember', 'recall', 'forget', 'forgot', 'memory', 'context', 'previous',
    'past', 'history', 'what was', 'tell me about', 'before', 'earlier',
  ],
  twin: [
    'predict', 'prediction', 'forecast', 'twin', 'profile', 'customer', 'employee',
    'behavior', 'likely to', 'will', 'should', 'anticipate',
  ],
  intelligence: [
    'analyze', 'analysis', 'insight', 'pattern', 'relationship', 'graph',
    'connect', 'correlation', 'trend', 'find related', 'how are',
  ],
  agent: [
    'execute', 'run', 'perform', 'do', 'automate', 'agent', 'task',
    'action', 'complete', 'finish', 'process',
  ],
  workflow: [
    'workflow', 'sequence', 'steps', 'automation', 'pipeline', 'chain',
    'process', 'flow', 'series of',
  ],
  execution: [
    'task', 'project', 'assign', 'deadline', 'complete', 'status',
    'progress', 'update', 'track', 'manage',
  ],
  simulation: [
    'simulate', 'what if', 'scenario', 'model', 'test', 'try',
    'predict outcome', 'impact', 'effect', 'would happen',
  ],
};

// Classify intent based on query
function classifyIntent(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const matchedIntents: string[] = [];

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerQuery.includes(pattern)) {
        if (!matchedIntents.includes(intent)) {
          matchedIntents.push(intent);
        }
        break;
      }
    }
  }

  // Default to all if no specific intent matched
  return matchedIntents.length > 0 ? matchedIntents : ['intelligence', 'memory'];
}

// Check interface health
async function checkInterfaceHealth(name: string, url: string): Promise<InterfaceHealth> {
  const start = Date.now();
  try {
    await axios.get(`${url}/health/live`, { timeout: 2000 });
    return {
      name,
      status: 'healthy',
      lastChecked: new Date().toISOString(),
      responseTime: Date.now() - start,
    };
  } catch {
    return {
      name,
      status: 'unavailable',
      lastChecked: new Date().toISOString(),
      responseTime: Date.now() - start,
    };
  }
}

// Synthesize results into a response
function synthesizeResponse(
  query: string,
  intent: string[],
  results: Record<string, unknown>
): { synthesizedResponse: string; confidence: number } {
  const resultKeys = Object.keys(results);
  const successfulResults = resultKeys.filter(key => results[key] !== null && results[key] !== undefined);

  let synthesizedResponse = `Based on your query "${query}", I analyzed the following interfaces: ${intent.join(', ')}. `;

  if (successfulResults.length === 0) {
    synthesizedResponse += 'However, no results were found from the connected services.';
    return { synthesizedResponse, confidence: 0.3 };
  }

  // Build response based on available results
  if (results.memory) {
    synthesizedResponse += 'Found relevant memory context. ';
  }
  if (results.twin) {
    synthesizedResponse += 'Retrieved digital twin insights. ';
  }
  if (results.intelligence) {
    synthesizedResponse += 'Generated intelligence analysis. ';
  }
  if (results.agent) {
    synthesizedResponse += 'Executed agent task. ';
  }
  if (results.workflow) {
    synthesizedResponse += 'Retrieved workflow information. ';
  }
  if (results.execution) {
    synthesizedResponse += 'Fetched execution status. ';
  }
  if (results.simulation) {
    synthesizedResponse += 'Ran simulation scenario. ';
  }

  const confidence = Math.min(0.95, 0.5 + (successfulResults.length * 0.1));
  return { synthesizedResponse, confidence };
}

// Main unified query endpoint
router.post('/', async (req, res) => {
  const startTime = Date.now();
  const queryId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { query, interfaces, context } = req.body as CopilotQuery;

    if (!query) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'query is required'));
      return;
    }

    const tenantId = context?.tenantId || req.headers['x-tenant-id'] as string;
    const userId = context?.userId || req.headers['x-user-id'] as string;

    logger.info('copilot_query_received', { queryId, query, interfaces });

    // Determine which interfaces to use
    const targetInterfaces = interfaces || classifyIntent(query);
    const usedInterfaces: string[] = [];

    // Results accumulator
    const results: Record<string, unknown> = {};

    // Execute queries to backing services in parallel where possible
    const queries = [];

    if (targetInterfaces.includes('memory')) {
      queries.push(
        (async () => {
          try {
            const response = await axios.get(`${MEMORY_SERVICE_URL}/api/context`, {
              params: { userId, entityId: context?.entityId },
              headers: { 'X-Tenant-Id': tenantId, 'X-User-Id': userId },
              timeout: 5000,
            });
            results.memory = response.data;
            usedInterfaces.push('memory');
          } catch (error: any) {
            logger.warn('memory_query_failed', { error: error.message });
            results.memory = null;
          }
        })()
      );
    }

    if (targetInterfaces.includes('twin') && context?.entityId) {
      queries.push(
        (async () => {
          try {
            const response = await axios.get(`${TWIN_SERVICE_URL}/api/twin/profile`, {
              params: { entityId: context.entityId, entityType: context.entityType },
              headers: { 'X-Tenant-Id': tenantId, 'X-User-Id': userId },
              timeout: 5000,
            });
            results.twin = response.data;
            usedInterfaces.push('twin');
          } catch (error: any) {
            logger.warn('twin_query_failed', { error: error.message });
            results.twin = null;
          }
        })()
      );
    }

    if (targetInterfaces.includes('intelligence')) {
      queries.push(
        (async () => {
          try {
            const response = await axios.post(`${GRAPH_SERVICE_URL}/api/query`, {
              query,
              depth: 2,
            }, {
              headers: { 'X-Tenant-Id': tenantId, 'X-User-Id': userId },
              timeout: 10000,
            });
            results.intelligence = response.data;
            usedInterfaces.push('intelligence');
          } catch (error: any) {
            logger.warn('intelligence_query_failed', { error: error.message });
            results.intelligence = null;
          }
        })()
      );
    }

    if (targetInterfaces.includes('execution')) {
      queries.push(
        (async () => {
          try {
            const response = await axios.get(`${PROJECT_SERVICE_URL}/api/tasks`, {
              params: { assignee: userId, limit: 10 },
              headers: { 'X-Tenant-Id': tenantId, 'X-User-Id': userId },
              timeout: 5000,
            });
            results.execution = response.data;
            usedInterfaces.push('execution');
          } catch (error: any) {
            logger.warn('execution_query_failed', { error: error.message });
            results.execution = null;
          }
        })()
      );
    }

    if (targetInterfaces.includes('workflow')) {
      queries.push(
        (async () => {
          try {
            const response = await axios.get(`${FLOW_OS_URL}/api/workflows`, {
              params: { limit: 5 },
              headers: { 'X-Tenant-Id': tenantId, 'X-User-Id': userId },
              timeout: 5000,
            });
            results.workflow = response.data;
            usedInterfaces.push('workflow');
          } catch (error: any) {
            logger.warn('workflow_query_failed', { error: error.message });
            results.workflow = null;
          }
        })()
      );
    }

    if (targetInterfaces.includes('simulation')) {
      queries.push(
        (async () => {
          try {
            const response = await axios.get(`${SIMULATION_OS_URL}/api/simulations`, {
              params: { limit: 5 },
              headers: { 'X-Tenant-Id': tenantId, 'X-User-Id': userId },
              timeout: 5000,
            });
            results.simulation = response.data;
            usedInterfaces.push('simulation');
          } catch (error: any) {
            logger.warn('simulation_query_failed', { error: error.message });
            results.simulation = null;
          }
        })()
      );
    }

    // Wait for all queries to complete
    await Promise.allSettled(queries);

    // Synthesize results
    const { synthesizedResponse, confidence } = synthesizeResponse(query, usedInterfaces, results);

    const response: CopilotResponse = {
      intent: targetInterfaces.join(', '),
      usedInterfaces,
      results,
      synthesizedResponse,
      confidence,
      timestamp: new Date().toISOString(),
    };

    const executionTime = Date.now() - startTime;
    logger.info('copilot_query_completed', { queryId, usedInterfaces, executionTime });

    res.json(createResponse(response));
  } catch (error: any) {
    logger.error('copilot_query_error', { queryId, error: error.message });
    res.status(500).json(
      createErrorResponse('COPILOT_ERROR', error.message || 'Failed to process query')
    );
  }
});

// Get interface health status
router.get('/interfaces', async (req, res) => {
  try {
    const interfaces = [
      { name: 'memory', url: MEMORY_SERVICE_URL },
      { name: 'twin', url: TWIN_SERVICE_URL },
      { name: 'graph', url: GRAPH_SERVICE_URL },
      { name: 'intelligence', url: INTELLIGENCE_SERVICE_URL },
      { name: 'expert-os', url: EXPERT_OS_URL },
      { name: 'flow-os', url: FLOW_OS_URL },
      { name: 'project', url: PROJECT_SERVICE_URL },
      { name: 'simulation', url: SIMULATION_OS_URL },
    ];

    const healthChecks = await Promise.all(
      interfaces.map(iface => checkInterfaceHealth(iface.name, iface.url))
    );

    res.json(createResponse(healthChecks));
  } catch (error: any) {
    logger.error('interface_health_error', { error: error.message });
    res.status(500).json(
      createErrorResponse('HEALTH_CHECK_ERROR', error.message || 'Failed to check interface health')
    );
  }
});

// Analyze query to determine intent
router.post('/analyze', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'query is required'));
      return;
    }

    const detectedIntents = classifyIntent(query);

    res.json(createResponse({
      query,
      detectedIntents,
      confidence: 0.8,
      suggestedInterfaces: detectedIntents,
    }));
  } catch (error: any) {
    logger.error('query_analyze_error', { error: error.message });
    res.status(500).json(
      createErrorResponse('ANALYSIS_ERROR', error.message || 'Failed to analyze query')
    );
  }
});

export default router;
