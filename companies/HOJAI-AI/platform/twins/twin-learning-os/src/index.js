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

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4735;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================================
// TWIN SERVICE CONNECTIONS
// ============================================================

const TWIN_SERVICES = {
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
// HTTP HELPERS
// ============================================================

async function fetchTwin(serviceKey, path, options = {}) {
  const baseUrl = TWIN_SERVICES[serviceKey];
  if (!baseUrl) {
    throw new Error(`Unknown twin service: ${serviceKey}`);
  }

  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.warn(`[TwinLearning] ${serviceKey}${path} returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[TwinLearning] Failed to fetch ${serviceKey}${path}:`, error.message);
    return null;
  }
}

async function fetchAllTwins(requests) {
  const results = await Promise.allSettled(
    requests.map(({ service, path, key }) =>
      fetchTwin(service, path).then(data => ({ key, data, service }))
    )
  );

  return results.reduce((acc, result) => {
    if (result.status === 'fulfilled' && result.value) {
      acc[result.value.key] = result.value.data;
    }
    return acc;
  }, {});
}

// ============================================================
// TWIN LEARNING ENGINE
// ============================================================

/**
 * Get complete twin context for an employee
 * This is the main API - returns all 9 twin types in one call
 */
async function getEmployeeTwinContext(employeeId) {
  console.log(`[TwinLearning] Fetching context for employee: ${employeeId}`);

  // Fetch all twin data in parallel
  const twinData = await fetchAllTwins([
    // Identity Twins (Type 1)
    { service: 'employeeTwin', path: `/api/employees/${employeeId}`, key: 'identity' },
    { service: 'userTwin', path: `/api/users/${employeeId}`, key: 'user' },

    // Memory Layer (Type 2)
    { service: 'memoryOS', path: `/api/memories/${employeeId}`, key: 'memory' },
    { service: 'twinMemoryBridge', path: `/api/bindings/${employeeId}`, key: 'memoryBindings' },

    // Skill & Knowledge (Types 3 & 9)
    { service: 'salarOS', path: `/api/human-twin/${employeeId}`, key: 'skills' },
    { service: 'skillOS', path: `/api/skills/employee/${employeeId}`, key: 'skillProfiles' },
    { service: 'knowledgeGraph', path: `/api/nodes/${employeeId}`, key: 'knowledge' },

    // Communication (Type 4)
    { service: 'intentBus', path: `/api/intents/employee/${employeeId}`, key: 'communication' },

    // Workflow (Type 5)
    { service: 'flowOrchestrator', path: `/api/executions/employee/${employeeId}`, key: 'workflow' },

    // Decision (Type 6)
    { service: 'decisionEngine', path: `/api/decisions/employee/${employeeId}`, key: 'decisions' },
    { service: 'decisionIntelligence', path: `/api/recommendations/employee/${employeeId}`, key: 'decisionPatterns' },

    // Relationship (Type 7)
    { service: 'partnerTwin', path: `/api/partners/employee/${employeeId}`, key: 'relationships' },
    { service: 'customerTwin', path: `/api/customers/employee/${employeeId}`, key: 'customerRelations' },

    // Reputation (Type 8)
    { service: 'sadaOS', path: `/api/trust/${employeeId}`, key: 'reputation' },
    { service: 'agentReputation', path: `/api/scores/${employeeId}`, key: 'agentScore' },
  ]);

  // Calculate overall twin health
  const twinHealth = calculateTwinHealth(twinData);

  // Build response
  return {
    employeeId,
    timestamp: new Date().toISOString(),
    health: twinHealth,
    twins: twinData,
    summary: generateSummary(twinData),
  };
}

/**
 * Calculate overall twin health score
 */
function calculateTwinHealth(twinData) {
  const scores = [];
  const weights = {
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

  for (const [key, weight] of Object.entries(weights)) {
    if (twinData[key]) {
      scores.push(weight);
    }
  }

  const coverage = scores.length / Object.keys(weights).length;
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) * 100 : 0;

  return {
    coverage: Math.round(coverage * 100),
    score: Math.round(avgScore),
    level: avgScore > 80 ? 'healthy' : avgScore > 50 ? 'developing' : 'new',
    twinsPopulated: scores.length,
    twinsTotal: Object.keys(weights).length,
  };
}

/**
 * Generate summary of employee's twin
 */
function generateSummary(twinData) {
  const summary = {
    who: null,
    skills: [],
    recent: [],
    patterns: [],
    connections: 0,
  };

  // Extract identity
  if (twinData.identity?.data) {
    const emp = twinData.identity.data;
    summary.who = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
  }

  // Extract skills
  if (twinData.skills?.data?.capabilities) {
    summary.skills = twinData.skills.data.capabilities.slice(0, 10).map(c => c.name);
  }

  // Count connections
  if (twinData.relationships?.data) {
    summary.connections += twinData.relationships.data.length || 0;
  }
  if (twinData.customerRelations?.data) {
    summary.connections += twinData.customerRelations.data.length || 0;
  }

  return summary;
}

// ============================================================
// PATTERN LEARNING
// ============================================================

/**
 * Learn patterns from employee behavior
 */
async function learnPatterns(employeeId, events) {
  console.log(`[TwinLearning] Learning ${events.length} patterns for ${employeeId}`);

  const patterns = {
    decisionPatterns: [],
    workflowPatterns: [],
    communicationPatterns: [],
    skillPatterns: [],
  };

  for (const event of events) {
    switch (event.type) {
      case 'decision.made':
        patterns.decisionPatterns.push({
          context: event.context,
          choice: event.choice,
          reasoning: event.reasoning,
          timestamp: event.timestamp,
        });
        break;

      case 'workflow.executed':
        patterns.workflowPatterns.push({
          workflow: event.workflow,
          steps: event.steps,
          outcome: event.outcome,
          timestamp: event.timestamp,
        });
        break;

      case 'communication.sent':
        patterns.communicationPatterns.push({
          channel: event.channel,
          tone: event.tone,
          responseTime: event.responseTime,
          timestamp: event.timestamp,
        });
        break;

      case 'skill.used':
        patterns.skillPatterns.push({
          skill: event.skill,
          proficiency: event.proficiency,
          timestamp: event.timestamp,
        });
        break;
    }
  }

  // Store patterns in memory
  if (patterns.decisionPatterns.length > 0) {
    await fetchTwin('memoryOS', '/api/memories', {
      method: 'POST',
      body: JSON.stringify({
        twinId: employeeId,
        type: 'decision_patterns',
        data: patterns.decisionPatterns,
      }),
    });
  }

  return {
    employeeId,
    patternsLearned: {
      decisions: patterns.decisionPatterns.length,
      workflows: patterns.workflowPatterns.length,
      communications: patterns.communicationPatterns.length,
      skills: patterns.skillPatterns.length,
    },
    confidence: calculatePatternConfidence(patterns),
  };
}

function calculatePatternConfidence(patterns) {
  const total = Object.values(patterns).reduce((sum, arr) => sum + arr.length, 0);
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
async function observe(employeeId, event) {
  console.log(`[TwinLearning] Observing ${event.type} for ${employeeId}`);

  // Route to appropriate twins
  await fetchTwin('memoryOS', '/api/observe', {
    method: 'POST',
    body: JSON.stringify({
      twinId: employeeId,
      event,
      timestamp: new Date().toISOString(),
    }),
  });

  // Update specific twins based on event type
  switch (event.type) {
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

  return { observed: true, eventType: event.type };
}

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'twin-learning-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    twinsConnected: Object.keys(TWIN_SERVICES).length,
  });
});

// Get complete twin context (main endpoint)
app.get('/api/twin/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const context = await getEmployeeTwinContext(employeeId);
    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    console.error('[TwinLearning] Error fetching twin context:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get specific twin type
app.get('/api/twin/:employeeId/:twinType', async (req, res) => {
  try {
    const { employeeId, twinType } = req.params;

    const twinMap = {
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
      });
    }

    const data = await fetchTwin(twin.service, twin.path);
    res.json({
      success: true,
      data,
      twinType,
      employeeId,
    });
  } catch (error) {
    console.error('[TwinLearning] Error fetching twin:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Learn patterns from events
app.post('/api/twin/:employeeId/learn', async (req, res) => {
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
  } catch (error) {
    console.error('[TwinLearning] Error learning patterns:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Observe a single event
app.post('/api/observe', async (req, res) => {
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
  } catch (error) {
    console.error('[TwinLearning] Error observing event:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get twin health
app.get('/api/health/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const context = await getEmployeeTwinContext(employeeId);

    res.json({
      success: true,
      data: context.health,
      employeeId,
    });
  } catch (error) {
    console.error('[TwinLearning] Error calculating health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// List connected twin services
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    data: {
      count: Object.keys(TWIN_SERVICES).length,
      services: TWIN_SERVICES,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              Twin Learning OS - Started                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}
║  Connected Twins: ${Object.keys(TWIN_SERVICES).length}
║  9 Twin Types:                                               ║
║    1. Identity    4. Communication  7. Relationship         ║
║    2. Memory      5. Workflow       8. Reputation           ║
║    3. Knowledge   6. Decision       9. Skill               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
