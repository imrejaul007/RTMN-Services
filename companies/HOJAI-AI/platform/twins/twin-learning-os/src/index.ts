/**
 * Twin Learning OS
 *
 * Unified orchestrator connecting all 9 twin types into a single employee context.
 *
 * Port: 4735
 *
 * The 9 Twin Types:
 * 1. Identity Twin - Who is this person?
 * 2. Memory Twin - What have they done?
 * 3. Knowledge Twin - What do they know?
 * 4. Communication Twin - How do they communicate?
 * 5. Workflow Twin - How do they work?
 * 6. Decision Twin - How do they decide?
 * 7. Relationship Twin - Who do they know?
 * 8. Reputation Twin - What do others think?
 * 9. Skill Twin - What can they do?
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { types, TwinServiceConfig } from './types/index.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4735', 10);
const VERSION = '1.0.0';

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = uuidv4();
  next();
});

// Morgan logging with request ID
morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// ============================================================
// TWIN SERVICE CONNECTIONS
// ============================================================

interface TwinServices {
  [key: string]: string;
}

const TWIN_SERVICES: TwinServices = {
  // Identity Twins
  employeeTwin: process.env.EMPLOYEE_TWIN_URL || 'http://localhost:4730',
  userTwin: process.env.USER_TWIN_URL || 'http://localhost:4889',
  customerTwin: process.env.CUSTOMER_TWIN_URL || 'http://localhost:4895',
  organizationTwin: process.env.ORGANIZATION_TWIN_URL || 'http://localhost:4710',

  // Memory Layer
  memoryOS: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  twinMemoryBridge: process.env.TWIN_MEMORY_BRIDGE_URL || 'http://localhost:4704',
  memoryContextEngine: process.env.MEMORY_CONTEXT_URL || 'http://localhost:4790',

  // Skill & Capability
  salarOS: process.env.SALAR_OS_URL || 'http://localhost:4710',
  skillOS: process.env.SKILL_OS_URL || 'http://localhost:4743',
  capabilityStore: process.env.CAPABILITY_STORE_URL || 'http://localhost:4804',

  // Communication
  intentBus: process.env.INTENT_BUS_URL || 'http://localhost:4154',
  messageBus: process.env.MESSAGE_BUS_URL || 'http://localhost:4807',

  // Workflow & Decision
  flowOrchestrator: process.env.FLOW_ORCHESTRATOR_URL || 'http://localhost:4244',
  decisionEngine: process.env.DECISION_ENGINE_URL || 'http://localhost:4240',
  decisionIntelligence: process.env.DECISION_INTELLIGENCE_URL || 'http://localhost:4756',
  simulationOS: process.env.SIMULATION_OS_URL || 'http://localhost:4241',

  // Relationship
  partnerTwin: process.env.PARTNER_TWIN_URL || 'http://localhost:4892',
  leadTwin: process.env.LEAD_TWIN_URL || 'http://localhost:4894',

  // Reputation
  sadaOS: process.env.SADA_OS_URL || 'http://localhost:4190',
  agentReputation: process.env.AGENT_REPUTATION_URL || 'http://localhost:4820',
  trustNetwork: process.env.TRUST_NETWORK_URL || 'http://localhost:4252',

  // Knowledge
  knowledgeGraph: process.env.KNOWLEDGE_GRAPH_URL || 'http://localhost:4755',

  // CorpPerks Bridge
  twinLearningBridge: process.env.TWIN_LEARNING_BRIDGE_URL || 'http://localhost:4748',
};

// ============================================================
// IN-MEMORY STORAGE (Replace with database in production)
// ============================================================

interface LearningPattern {
  id: string;
  employeeId: string;
  type: string;
  data: any;
  createdAt: string;
  updatedAt: string;
}

const patternStore = new Map<string, LearningPattern[]>();
const observationStore = new Map<string, any[]>();

// ============================================================
// HTTP HELPERS
// ============================================================

interface FetchOptions extends RequestInit {
  timeout?: number;
}

async function fetchTwin(
  serviceKey: string,
  path: string,
  options: FetchOptions = {}
): Promise<any | null> {
  const baseUrl = TWIN_SERVICES[serviceKey];
  if (!baseUrl) {
    console.warn(`[TwinLearning] Unknown twin service: ${serviceKey}`);
    return null;
  }

  const url = `${baseUrl}${path}`;
  const timeout = options.timeout || 5000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': (global as any).requestId || uuidv4(),
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[TwinLearning] ${serviceKey}${path} returned ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`[TwinLearning] Timeout fetching ${serviceKey}${path}`);
    } else {
      console.error(`[TwinLearning] Failed to fetch ${serviceKey}${path}:`, error.message);
    }
    return null;
  }
}

interface FetchRequest {
  service: string;
  path: string;
  key: string;
}

async function fetchAllTwins(requests: FetchRequest[]): Promise<Record<string, any>> {
  const results = await Promise.allSettled(
    requests.map(({ service, path, key }) =>
      fetchTwin(service, path).then(data => ({ key, data }))
    )
  );

  return results.reduce((acc: Record<string, any>, result) => {
    if (result.status === 'fulfilled' && result.value?.data) {
      acc[result.value.key] = result.value.data;
    } else if (result.status === 'fulfilled' && result.value) {
      acc[result.value.key] = result.value;
    }
    return acc;
  }, {});
}

// ============================================================
// TWIN LEARNING ENGINE
// ============================================================

/**
 * Get complete twin context for an employee
 */
async function getEmployeeTwinContext(employeeId: string) {
  console.log(`[TwinLearning] Fetching context for employee: ${employeeId}`);
  const startTime = Date.now();

  // Fetch all twin data in parallel
  const twinData = await fetchAllTwins([
    // Identity Twins
    { service: 'employeeTwin', path: `/api/employees/${employeeId}`, key: 'identity' },
    { service: 'userTwin', path: `/api/users/${employeeId}`, key: 'user' },

    // Memory Layer
    { service: 'memoryOS', path: `/api/memories/${employeeId}`, key: 'memory' },
    { service: 'twinMemoryBridge', path: `/api/bindings/${employeeId}`, key: 'memoryBindings' },

    // Skill & Knowledge
    { service: 'salarOS', path: `/api/human-twin/${employeeId}`, key: 'skills' },
    { service: 'skillOS', path: `/api/skills/employee/${employeeId}`, key: 'skillProfiles' },
    { service: 'knowledgeGraph', path: `/api/nodes/${employeeId}`, key: 'knowledge' },

    // Communication
    { service: 'intentBus', path: `/api/intents/employee/${employeeId}`, key: 'communication' },

    // Workflow
    { service: 'flowOrchestrator', path: `/api/executions/employee/${employeeId}`, key: 'workflow' },

    // Decision
    { service: 'decisionEngine', path: `/api/decisions/employee/${employeeId}`, key: 'decisions' },
    { service: 'decisionIntelligence', path: `/api/recommendations/employee/${employeeId}`, key: 'decisionPatterns' },

    // Relationship
    { service: 'partnerTwin', path: `/api/partners/employee/${employeeId}`, key: 'relationships' },
    { service: 'customerTwin', path: `/api/customers/employee/${employeeId}`, key: 'customerRelations' },

    // Reputation
    { service: 'sadaOS', path: `/api/trust/${employeeId}`, key: 'reputation' },
    { service: 'agentReputation', path: `/api/scores/${employeeId}`, key: 'agentScore' },
  ]);

  const duration = Date.now() - startTime;
  console.log(`[TwinLearning] Fetched context in ${duration}ms`);

  // Calculate overall twin health
  const twinHealth = calculateTwinHealth(twinData);

  // Build response
  return {
    employeeId,
    timestamp: new Date().toISOString(),
    fetchDuration: duration,
    health: twinHealth,
    twins: twinData,
    summary: generateSummary(twinData),
  };
}

/**
 * Calculate overall twin health score
 */
function calculateTwinHealth(twinData: Record<string, any>) {
  const weights: Record<string, number> = {
    identity: 1.0,
    memory: 0.9,
    knowledge: 0.8,
    skills: 0.9,
    communication: 0.7,
    workflow: 0.7,
    decisions: 0.8,
    relationships: 0.6,
    reputation: 0.8,
  };

  const scores: number[] = [];
  const twinsPopulated: string[] = [];

  for (const [key, weight] of Object.entries(weights)) {
    if (twinData[key]) {
      scores.push(weight);
      twinsPopulated.push(key);
    }
  }

  const coverage = scores.length / Object.keys(weights).length;
  const avgScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
    : 0;

  let level: 'new' | 'developing' | 'healthy';
  if (avgScore > 80) level = 'healthy';
  else if (avgScore > 50) level = 'developing';
  else level = 'new';

  return {
    coverage: Math.round(coverage * 100),
    score: Math.round(avgScore),
    level,
    twinsPopulated: scores.length,
    twinsTotal: Object.keys(weights).length,
    populatedTwins: twinsPopulated,
  };
}

/**
 * Generate summary of employee's twin
 */
function generateSummary(twinData: Record<string, any>) {
  const summary = {
    who: null as string | null,
    skills: [] as string[],
    recent: [] as string[],
    patterns: [] as string[],
    connections: 0,
  };

  // Extract identity
  const identityData = twinData.identity?.data || twinData.identity;
  if (identityData) {
    const firstName = identityData.firstName || identityData.name?.split(' ')[0] || '';
    const lastName = identityData.lastName || identityData.name?.split(' ').slice(1).join(' ') || '';
    summary.who = `${firstName} ${lastName}`.trim() || identityData.email || null;
  }

  // Extract skills
  const skillsData = twinData.skills?.data || twinData.skills;
  if (skillsData?.capabilities) {
    summary.skills = skillsData.capabilities.slice(0, 10).map((c: any) => c.name || c);
  }

  // Count connections
  const relData = twinData.relationships?.data || twinData.relationships;
  if (relData?.length) {
    summary.connections += relData.length;
  }
  const custData = twinData.customerRelations?.data || twinData.customerRelations;
  if (custData?.length) {
    summary.connections += custData.length;
  }

  return summary;
}

// ============================================================
// PATTERN LEARNING
// ============================================================

/**
 * Learn patterns from employee behavior
 */
async function learnPatterns(employeeId: string, events: any[]) {
  console.log(`[TwinLearning] Learning ${events.length} patterns for ${employeeId}`);

  const patterns = {
    decisionPatterns: [] as any[],
    workflowPatterns: [] as any[],
    communicationPatterns: [] as any[],
    skillPatterns: [] as any[],
  };

  for (const event of events) {
    switch (event.type) {
      case 'decision.made':
        patterns.decisionPatterns.push({
          context: event.context,
          choice: event.choice,
          reasoning: event.reasoning,
          timestamp: event.timestamp || new Date().toISOString(),
        });
        break;

      case 'workflow.executed':
        patterns.workflowPatterns.push({
          workflow: event.workflow,
          steps: event.steps,
          outcome: event.outcome,
          timestamp: event.timestamp || new Date().toISOString(),
        });
        break;

      case 'communication.sent':
        patterns.communicationPatterns.push({
          channel: event.channel,
          tone: event.tone,
          responseTime: event.responseTime,
          timestamp: event.timestamp || new Date().toISOString(),
        });
        break;

      case 'skill.used':
        patterns.skillPatterns.push({
          skill: event.skill,
          proficiency: event.proficiency,
          timestamp: event.timestamp || new Date().toISOString(),
        });
        break;
    }
  }

  // Store patterns
  const existingPatterns = patternStore.get(employeeId) || [];
  const newPatterns = [
    ...patterns.decisionPatterns.map(p => ({ ...p, type: 'decision', id: uuidv4() })),
    ...patterns.workflowPatterns.map(p => ({ ...p, type: 'workflow', id: uuidv4() })),
    ...patterns.communicationPatterns.map(p => ({ ...p, type: 'communication', id: uuidv4() })),
    ...patterns.skillPatterns.map(p => ({ ...p, type: 'skill', id: uuidv4() })),
  ].map(p => ({
    ...p,
    employeeId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  patternStore.set(employeeId, [...existingPatterns, ...newPatterns]);

  // Also send to Memory OS
  await fetchTwin('memoryOS', '/api/memories', {
    method: 'POST',
    body: JSON.stringify({
      twinId: employeeId,
      type: 'learning_patterns',
      data: patterns,
    }),
  });

  return {
    employeeId,
    patternsLearned: {
      decisions: patterns.decisionPatterns.length,
      workflows: patterns.workflowPatterns.length,
      communications: patterns.communicationPatterns.length,
      skills: patterns.skillPatterns.length,
    },
    totalPatterns: newPatterns.length,
    confidence: calculatePatternConfidence(patterns),
  };
}

function calculatePatternConfidence(patterns: Record<string, any[]>): number {
  const total = Object.values(patterns).reduce((sum: number, arr: any[]) => sum + arr.length, 0);
  if (total === 0) return 0;
  if (total < 5) return 30;
  if (total < 20) return 50;
  if (total < 50) return 70;
  if (total < 100) return 85;
  return 95;
}

// ============================================================
// TWIN OBSERVATION
// ============================================================

/**
 * Observe an event and learn from it
 */
async function observe(employeeId: string, event: any) {
  console.log(`[TwinLearning] Observing ${event.type || event.eventType} for ${employeeId}`);

  // Store observation
  const observations = observationStore.get(employeeId) || [];
  observations.push({
    ...event,
    observedAt: new Date().toISOString(),
    id: uuidv4(),
  });
  // Keep last 1000 observations
  if (observations.length > 1000) {
    observations.splice(0, observations.length - 1000);
  }
  observationStore.set(employeeId, observations);

  // Send to Memory OS
  await fetchTwin('memoryOS', '/api/observe', {
    method: 'POST',
    body: JSON.stringify({
      twinId: employeeId,
      event,
      timestamp: new Date().toISOString(),
    }),
  });

  // Update specific twins based on event type
  const eventType = event.type || event.eventType;

  switch (eventType) {
    case 'decision.made':
      await fetchTwin('decisionEngine', '/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          decision: event.decision,
          context: event.context,
          outcome: event.outcome,
        }),
      });
      break;

    case 'workflow.executed':
      await fetchTwin('flowOrchestrator', '/api/executions', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          workflow: event.workflow,
          result: event.result,
        }),
      });
      break;

    case 'communication.sent':
      await fetchTwin('intentBus', '/api/intents', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          communication: event.communication,
        }),
      });
      break;
  }

  return { observed: true, eventType };
}

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'twin-learning-os',
    version: VERSION,
    timestamp: new Date().toISOString(),
    twinsConnected: Object.keys(TWIN_SERVICES).length,
    patternsStored: patternStore.size,
  });
});

// Readiness check
app.get('/ready', (_req: Request, res: Response) => {
  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

// Get complete twin context (main endpoint)
app.get('/api/twin/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const context = await getEmployeeTwinContext(employeeId);

    res.json({
      success: true,
      data: context,
    });
  } catch (error: any) {
    console.error('[TwinLearning] Error fetching twin context:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get specific twin type
app.get('/api/twin/:employeeId/:twinType', async (req: Request, res: Response) => {
  try {
    const { employeeId, twinType } = req.params;

    const twinMap: Record<string, { service: string; path: string }> = {
      identity: { service: 'employeeTwin', path: `/api/employees/${employeeId}` },
      memory: { service: 'memoryOS', path: `/api/memories/${employeeId}` },
      knowledge: { service: 'knowledgeGraph', path: `/api/nodes/${employeeId}` },
      skills: { service: 'salarOS', path: `/api/human-twin/${employeeId}` },
      communication: { service: 'intentBus', path: `/api/intents/employee/${employeeId}` },
      workflow: { service: 'flowOrchestrator', path: `/api/executions/employee/${employeeId}` },
      decisions: { service: 'decisionEngine', path: `/api/decisions/employee/${employeeId}` },
      relationships: { service: 'partnerTwin', path: `/api/partners/employee/${employeeId}` },
      reputation: { service: 'sadaOS', path: `/api/trust/${employeeId}` },
    };

    const twin = twinMap[twinType];
    if (!twin) {
      return res.status(400).json({
        success: false,
        error: `Unknown twin type: ${twinType}`,
        validTypes: Object.keys(twinMap),
      });
    }

    const data = await fetchTwin(twin.service, twin.path);
    res.json({
      success: true,
      data,
      twinType,
      employeeId,
    });
  } catch (error: any) {
    console.error('[TwinLearning] Error fetching twin:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Learn patterns from events
app.post('/api/twin/:employeeId/learn', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { events } = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Events must be an array',
      });
    }

    const result = await learnPatterns(employeeId, events);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[TwinLearning] Error learning patterns:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Observe a single event
app.post('/api/observe', async (req: Request, res: Response) => {
  try {
    const { employeeId, event } = req.body;

    if (!employeeId || !event) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: employeeId, event',
      });
    }

    const result = await observe(employeeId, event);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[TwinLearning] Error observing event:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get twin health
app.get('/api/health/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const context = await getEmployeeTwinContext(employeeId);

    res.json({
      success: true,
      data: context.health,
      employeeId,
    });
  } catch (error: any) {
    console.error('[TwinLearning] Error calculating health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get stored patterns for employee
app.get('/api/patterns/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const patterns = patternStore.get(employeeId) || [];

  res.json({
    success: true,
    data: {
      employeeId,
      total: patterns.length,
      patterns: patterns.slice(-100), // Last 100 patterns
    },
  });
});

// Get observations for employee
app.get('/api/observations/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const observations = observationStore.get(employeeId) || [];

  res.json({
    success: true,
    data: {
      employeeId,
      total: observations.length,
      recent: observations.slice(-50),
    },
  });
});

// List connected twin services
app.get('/api/services', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      count: Object.keys(TWIN_SERVICES).length,
      services: TWIN_SERVICES,
    },
  });
});

// Stats endpoint
app.get('/api/stats', (_req: Request, res: Response) => {
  let totalPatterns = 0;
  let totalObservations = 0;

  for (const patterns of patternStore.values()) {
    totalPatterns += patterns.length;
  }
  for (const observations of observationStore.values()) {
    totalObservations += observations.length;
  }

  res.json({
    success: true,
    data: {
      employeesWithPatterns: patternStore.size,
      employeesWithObservations: observationStore.size,
      totalPatterns,
      totalObservations,
      connectedServices: Object.keys(TWIN_SERVICES).length,
    },
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[TwinLearning] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ============================================================
// START SERVER
// ============================================================

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    Twin Learning OS - Started                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  Port: ${PORT}
║  Version: ${VERSION}
║  Connected Twins: ${Object.keys(TWIN_SERVICES).length}
║
║  9 Twin Types:                                                      ║
║    1. Identity      4. Communication  7. Relationship              ║
║    2. Memory       5. Workflow       8. Reputation               ║
║    3. Knowledge    6. Decision       9. Skill                    ║
║
║  Endpoints:                                                        ║
║    GET  /health                    - Health check                 ║
║    GET  /ready                     - Readiness check              ║
║    GET  /api/twin/:id             - Get complete twin           ║
║    GET  /api/twin/:id/:type       - Get specific twin type      ║
║    POST /api/twin/:id/learn        - Learn patterns             ║
║    POST /api/observe               - Observe event               ║
║    GET  /api/health/:id            - Get twin health            ║
║    GET  /api/patterns/:id          - Get stored patterns       ║
║    GET  /api/services              - List connected services     ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[TwinLearning] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[TwinLearning] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[TwinLearning] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('[TwinLearning] Server closed');
    process.exit(0);
  });
});

export default app;
