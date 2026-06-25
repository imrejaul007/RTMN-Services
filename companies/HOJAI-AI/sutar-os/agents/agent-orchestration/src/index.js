import cors from 'cors';
import helmet from 'helmet';
/**
 * Agent Orchestration Service
 *
 * Coordinates multiple AI agents to complete complex multi-step tasks.
 * Features:
 * - Multi-agent workflows
 * - Parallel agent execution
 * - Sequential dependencies
 * - Result aggregation
 * - Error recovery
 * - Coordination patterns
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');
const rezIntel = require('./rez-intel-client');

const app = express();

app.use(cors());
app.use(helmet());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'agent-orchestration' });

const PORT = process.env.PORT || 4851;

// Service URLs
const ACN_NETWORK_URL = process.env.ACN_NETWORK_URL || 'http://localhost:4801';
const ACP_PROTOCOL_URL = process.env.ACP_PROTOCOL_URL || 'http://localhost:4800';
const GENIE_SHOPPING_URL = process.env.GENIE_SHOPPING_URL || 'http://localhost:4716';
const MERCHANT_AGENTS_URL = process.env.MERCHANT_AGENTS_URL || 'http://localhost:4810';

// In-memory stores
const orchestrations = new PersistentMap('orchestrations', { serviceName: 'agent-orchestration' });
const taskGraphs = new PersistentMap('task-graphs', { serviceName: 'agent-orchestration' });
const executionLogs = new PersistentMap('execution-logs', { serviceName: 'agent-orchestration' });

// Orchestration patterns
const PATTERNS = {
  SEQUENTIAL: 'sequential',     // One after another
  PARALLEL: 'parallel',         // All at once
  PIPELINE: 'pipeline',         // Stage by stage
  FANOUT: 'fanout',            // One to many
  FANIN: 'fanin',              // Many to one
  CONDITIONAL: 'conditional'    // Branch based on results
};

/**
 * Create orchestration task graph
 */
function createTaskGraph(graphData) {
  const graph = {
    id: `TG-${uuidv4().substring(0, 8)}`,
    name: graphData.name,
    pattern: graphData.pattern || PATTERNS.SEQUENTIAL,
    tasks: graphData.tasks || [],  // Array of task definitions
    dependencies: graphData.dependencies || {},  // taskId -> [dependentTaskIds]
    status: 'created',
    createdAt: new Date().toISOString()
  };

  taskGraphs.set(graph.id, graph);
  return graph;
}

/**
 * Execute orchestration
 */
async function executeOrchestration(graphId, context = {}) {
  const graph = taskGraphs.get(graphId);
  if (!graph) {
    throw new Error('Task graph not found');
  }

  const execution = {
    id: uuidv4(),
    graphId,
    status: 'running',
    tasks: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    context
  };

  orchestrations.set(execution.id, execution);
  executionLogs.set(execution.id, []);

  try {
    switch (graph.pattern) {
      case PATTERNS.SEQUENTIAL:
        await runSequential(execution, graph, context);
        break;
      case PATTERNS.PARALLEL:
        await runParallel(execution, graph, context);
        break;
      case PATTERNS.PIPELINE:
        await runPipeline(execution, graph, context);
        break;
      case PATTERNS.FANOUT:
        await runFanout(execution, graph, context);
        break;
      case PATTERNS.FANIN:
        await runFanin(execution, graph, context);
        break;
      case PATTERNS.CONDITIONAL:
        await runConditional(execution, graph, context);
        break;
      default:
        throw new Error(`Unknown pattern: ${graph.pattern}`);
    }

    execution.status = 'completed';
  } catch (error) {
    execution.status = 'failed';
    execution.error = error.message;
  }

  execution.completedAt = new Date().toISOString();
  execution.duration = new Date(execution.completedAt) - new Date(execution.startedAt);
  orchestrations.set(execution.id, execution);

  return execution;
}

/**
 * Run tasks sequentially
 */
async function runSequential(execution, graph, context) {
  for (const task of graph.tasks) {
    const result = await executeTask(task, context);
    execution.tasks.push(result);
    if (!result.success) {
      throw new Error(`Task failed: ${task.name}`);
    }
    // Update context with result
    context[`${task.id}_result`] = result.output;
  }
}

/**
 * Run tasks in parallel
 */
async function runParallel(execution, graph, context) {
  const promises = graph.tasks.map(async task => {
    return await executeTask(task, context);
  });

  const results = await Promise.all(promises);
  execution.tasks = results;
}

/**
 * Run as pipeline (each task feeds next)
 */
async function runPipeline(execution, graph, context) {
  let pipeContext = { ...context };

  for (const task of graph.tasks) {
    const result = await executeTask(task, pipeContext);
    execution.tasks.push(result);
    pipeContext = { ...pipeContext, ...result.output };
  }
}

/**
 * Run fan-out (one task triggers multiple)
 */
async function runFanout(execution, graph, context) {
  if (graph.tasks.length < 2) {
    throw new Error('Fanout requires at least 2 tasks');
  }

  const [first, ...rest] = graph.tasks;

  // Execute first task
  const firstResult = await executeTask(first, context);
  execution.tasks.push(firstResult);

  // Fan out to remaining tasks
  const fanoutContext = { ...context, initialResult: firstResult.output };
  const promises = rest.map(async task => {
    return await executeTask(task, fanoutContext);
  });

  const results = await Promise.all(promises);
  execution.tasks.push(...results);
}

/**
 * Run fan-in (multiple tasks aggregate to one)
 */
async function runFanin(execution, graph, context) {
  if (graph.tasks.length < 2) {
    throw new Error('Fanin requires at least 2 tasks');
  }

  const [...inputs] = graph.tasks;
  const last = inputs.pop();

  // Run all input tasks
  const promises = inputs.map(async task => {
    return await executeTask(task, context);
  });

  const results = await Promise.all(promises);
  execution.tasks.push(...results);

  // Run aggregation task
  const aggregatedContext = {
    ...context,
    aggregatedInputs: results.map(r => r.output)
  };

  const finalResult = await executeTask(last, aggregatedContext);
  execution.tasks.push(finalResult);
}

/**
 * Run conditional (branch based on result)
 */
async function runConditional(execution, graph, context) {
  // First task determines the branch
  const [first, ...branches] = graph.tasks;

  const conditionResult = await executeTask(first, context);
  execution.tasks.push(conditionResult);

  // Select branch based on condition
  const branchKey = conditionResult.output?.branch || 'default';
  const selectedBranch = branches.find(b => b.id === branchKey) || branches[0];

  if (selectedBranch) {
    const branchResult = await executeTask(selectedBranch, context);
    execution.tasks.push(branchResult);
  }
}

/**
 * Execute single task (simulated)
 */
async function executeTask(task, context) {
  const startTime = Date.now();

  // Simulate task execution
  const result = {
    id: task.id || uuidv4(),
    name: task.name,
    type: task.type,
    agentId: task.agentId,
    service: task.service,
    status: 'running',
    startedAt: new Date().toISOString(),
    success: true,
    output: null,
    error: null
  };

  try {
    // Simulate different task types
    switch (task.type) {
      case 'genie_shop':
        result.output = {
          taskType: 'shopping',
          message: `Genie shopping for ${task.params?.product || 'item'}`,
          result: 'shopping_initiated'
        };
        break;

      case 'merchant_respond':
        result.output = {
          taskType: 'merchant_response',
          message: `Merchant ${task.agentId} responded`,
          offer: { price: task.params?.price || 100 }
        };
        break;

      case 'create_contract':
        result.output = {
          taskType: 'contract',
          contractId: `CTR-${Date.now()}`
        };
        break;

      case 'process_payment':
        result.output = {
          taskType: 'payment',
          transactionId: `TX-${Date.now()}`,
          amount: task.params?.amount || 0
        };
        break;

      case 'update_twin':
        result.output = {
          taskType: 'twin_update',
          twinId: task.params?.twinId,
          updated: true
        };
        break;

      default:
        result.output = {
          taskType: task.type,
          data: task.params
        };
    }

    result.status = 'completed';
    result.duration = Date.now() - startTime;
  } catch (error) {
    result.success = false;
    result.error = error.message;
    result.status = 'failed';
  }

  return result;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    service: 'Agent Orchestration',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      taskGraphs: taskGraphs.size,
      orchestrations: orchestrations.size
    }
  });
});

/**
 * Create task graph
 * POST /api/graphs
 */
app.post('/api/graphs',requireAuth,  (req, res) => {
  try {
    const graph = createTaskGraph(req.body);
    res.status(201).json(graph);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get task graph
 * GET /api/graphs/:id
 */
app.get('/api/graphs/:id', (req, res) => {
  const graph = taskGraphs.get(req.params.id);
  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }
  res.json(graph);
});

/**
 * Execute orchestration
 * POST /api/orchestrations
 */
app.post('/api/orchestrations',requireAuth,  async (req, res) => {
  try {
    const { graphId, context } = req.body;
    const execution = await executeOrchestration(graphId, context);
    res.status(201).json(execution);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get orchestration
 * GET /api/orchestrations/:id
 */
app.get('/api/orchestrations/:id', (req, res) => {
  const execution = orchestrations.get(req.params.id);
  if (!execution) {
    return res.status(404).json({ error: 'Orchestration not found' });
  }
  res.json(execution);
});

/**
 * Pre-built workflow: Shop and deliver
 * POST /api/workflows/shop-and-deliver
 */
app.post('/api/workflows/shop-and-deliver',requireAuth,  async (req, res) => {
  try {
    const { userId, product, maxPrice, deliveryAddress } = req.body;

    // Create graph
    const graph = createTaskGraph({
      name: 'Shop and Deliver',
      pattern: PATTERNS.PIPELINE,
      tasks: [
        {
          id: 'shop',
          name: 'Genie shops for product',
          type: 'genie_shop',
          params: { product, maxPrice }
        },
        {
          id: 'contract',
          name: 'Create purchase contract',
          type: 'create_contract',
          params: {}
        },
        {
          id: 'payment',
          name: 'Process payment',
          type: 'process_payment',
          params: {}
        },
        {
          id: 'twin',
          name: 'Update Customer Twin',
          type: 'update_twin',
          params: { twinId: `customer-${userId}` }
        }
      ]
    });

    const execution = await executeOrchestration(graph.id, { userId, product, deliveryAddress });
    res.status(201).json({ graph, execution });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Pre-built workflow: Multi-merchant comparison
 * POST /api/workflows/compare-merchants
 */
app.post('/api/workflows/compare-merchants',requireAuth,  async (req, res) => {
  try {
    const { product, maxPrice } = req.body;

    const graph = createTaskGraph({
      name: 'Multi-Merchant Comparison',
      pattern: PATTERNS.FANOUT,
      tasks: [
        {
          id: 'search',
          name: 'Search all merchants',
          type: 'genie_shop',
          params: { product, maxPrice }
        },
        {
          id: 'merchant1',
          name: 'Get quote from merchant 1',
          type: 'merchant_respond',
          agentId: 'merchant-1',
          params: { price: maxPrice * 0.95 }
        },
        {
          id: 'merchant2',
          name: 'Get quote from merchant 2',
          type: 'merchant_respond',
          agentId: 'merchant-2',
          params: { price: maxPrice * 0.90 }
        },
        {
          id: 'merchant3',
          name: 'Get quote from merchant 3',
          type: 'merchant_respond',
          agentId: 'merchant-3',
          params: { price: maxPrice * 0.85 }
        }
      ]
    });

    const execution = await executeOrchestration(graph.id, { product });
    res.status(201).json({ graph, execution });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * List all patterns
 * GET /api/patterns
 */
app.get('/api/patterns', (req, res) => {
  res.json({
    patterns: Object.values(PATTERNS).map(p => ({
      name: p,
      description: getPatternDescription(p)
    }))
  });
});

function getPatternDescription(pattern) {
  const descriptions = {
    sequential: 'Tasks execute one after another, in order',
    parallel: 'All tasks execute simultaneously',
    pipeline: 'Each task output feeds into the next task',
    fanout: 'One initial task triggers multiple parallel tasks',
    fanin: 'Multiple tasks aggregate results into one final task',
    conditional: 'Branch execution based on task result'
  };
  return descriptions[pattern] || '';
}

/**
 * Get orchestration stats
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const all = Array.from(orchestrations.values());

  res.json({
    totalOrchestrations: all.length,
    completed: all.filter(o => o.status === 'completed').length,
    failed: all.filter(o => o.status === 'failed').length,
    avgDuration: all.length > 0
      ? all.reduce((sum, o) => sum + (o.duration || 0), 0) / all.length
      : 0,
    taskGraphs: taskGraphs.size
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



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

// Additional REZ Intelligence endpoints (shallow pattern)
app.post('/api/intel/classify-intent', requireAuth, async (req, res) => {
  try {
    const intent = await rezIntel.classifyIntent({ ...req.body }).catch(() => null);
    res.json({ success: !!intent, intent, source: intent ? 'rez-intel' : 'unavailable', fallback: !intent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/intel/next-best-action', requireAuth, async (req, res) => {
  try {
    const action = await rezIntel.getNextBestAction({ ...req.query }).catch(() => null);
    res.json({ success: !!action, action, source: action ? 'rez-intel' : 'unavailable', fallback: !action });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AGENT ORCHESTRATION SERVICE                        ║
║                 Version 1.0.0                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Patterns:                                                    ║
║    Sequential │ Parallel │ Pipeline                          ║
║    Fan-out    │ Fan-in   │ Conditional                       ║
╠══════════════════════════════════════════════════════════════╣
║  Pre-built Workflows:                                        ║
║    • Shop and Deliver                                        ║
║    • Multi-Merchant Comparison                               ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/graphs                  Create graph          ║
║    POST   /api/orchestrations          Execute orchestration  ║
║    POST   /api/workflows/shop-and-deliver Shop workflow      ║
║    POST   /api/workflows/compare-merchants Compare          ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
