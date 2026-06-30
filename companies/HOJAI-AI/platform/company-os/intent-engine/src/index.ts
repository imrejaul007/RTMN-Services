/**
 * CompanyOS Intent Engine Pipeline
 *
 * Transforms natural language input into executable goals.
 *
 * Flow:
 * Input → Intent Classification → Entity Extraction → Goal Decomposition
 *         → Worker Routing → Execution Plan → Execute via SUTAR
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

const PORT = parseInt(process.env.PORT || '4011', 10);
const SERVICE_NAME = 'intent-engine';
const VERSION = '1.0.0';

const SALAR_URL = process.env.SALAR_URL || 'http://localhost:4710';
const SUTAR_DECISION_URL = process.env.SUTAR_DECISION_URL || 'http://localhost:4240';
const AGENT_OS_URL = process.env.AGENT_OS_URL || 'http://localhost:4802';
const LLM_URL = process.env.LLM_URL || 'http://localhost:5000';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

async function callService(url: string, method: string, body?: any): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (INTERNAL_TOKEN) {
    headers['x-internal-token'] = INTERNAL_TOKEN;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error: any) {
    console.error(`[Intent Engine] Failed to call ${url}:`, error.message);
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

// ============================================================================
// INTENT CATALOG
// ============================================================================

interface IntentDefinition {
  name: string;
  description: string;
  keywords: string[];
  examples: string[];
  category: 'workforce' | 'commerce' | 'operations' | 'finance' | 'support' | 'general';
  requiredEntities: string[];
  goals: GoalTemplate[];
}

interface GoalTemplate {
  type: 'hire' | 'deploy' | 'purchase' | 'analyze' | 'create' | 'update' | 'delete' | 'query' | 'execute';
  action: string;
  entities: string[];
  workers?: string[];
}

const INTENT_CATALOG: IntentDefinition[] = [
  {
    name: 'hire_workforce',
    description: 'Hire a new employee or AI worker',
    keywords: ['hire', 'recruit', 'add', 'onboard', 'employ', 'join team'],
    examples: [
      'Hire a sales manager',
      'I need an AI accountant',
      'Recruit someone for marketing',
      'Add a customer support agent',
    ],
    category: 'workforce',
    requiredEntities: ['role', 'department'],
    goals: [
      { type: 'hire', action: 'create_worker', entities: ['role', 'department'], workers: ['hr_manager'] },
    ],
  },
  {
    name: 'deploy_agent',
    description: 'Deploy an AI agent to perform tasks',
    keywords: ['deploy', 'activate', 'start', 'launch', 'enable'],
    examples: [
      'Deploy the AI marketer',
      'Start the support agent',
      'Activate the CFO agent',
    ],
    category: 'workforce',
    requiredEntities: ['agent_name'],
    goals: [
      { type: 'deploy', action: 'activate_agent', entities: ['agent_name'], workers: ['ai_orchestrator'] },
    ],
  },
  {
    name: 'purchase_marketplace',
    description: 'Purchase an agent or service from marketplace',
    keywords: ['buy', 'purchase', 'subscribe', 'get', 'acquire'],
    examples: [
      'Buy an AI sales agent',
      'Subscribe to the marketing pack',
      'Get the analytics dashboard',
    ],
    category: 'commerce',
    requiredEntities: ['item'],
    goals: [
      { type: 'purchase', action: 'buy_from_marketplace', entities: ['item'], workers: ['procurement_agent'] },
    ],
  },
  {
    name: 'create_department',
    description: 'Create a new department',
    keywords: ['create department', 'new department', 'add department', 'setup department'],
    examples: [
      'Create a data science department',
      'Set up a new operations team',
      'Add an AI research department',
    ],
    category: 'operations',
    requiredEntities: ['department_name'],
    goals: [
      { type: 'create', action: 'setup_department', entities: ['department_name'], workers: ['operations_manager'] },
    ],
  },
  {
    name: 'analyze_performance',
    description: 'Analyze company or department performance',
    keywords: ['analyze', 'report', 'dashboard', 'metrics', 'performance', 'insights'],
    examples: [
      'Show me the sales performance',
      'Generate a financial report',
      'What are our customer metrics?',
    ],
    category: 'general',
    requiredEntities: ['subject'],
    goals: [
      { type: 'analyze', action: 'generate_report', entities: ['subject'], workers: ['analytics_agent'] },
    ],
  },
  {
    name: 'create_ticket',
    description: 'Create a support ticket',
    keywords: ['ticket', 'issue', 'problem', 'help', 'support', 'broken'],
    examples: [
      'I have an issue with my account',
      'Create a ticket for the IT team',
      'Report a bug',
    ],
    category: 'support',
    requiredEntities: ['issue'],
    goals: [
      { type: 'create', action: 'create_ticket', entities: ['issue'], workers: ['support_agent'] },
    ],
  },
  {
    name: 'workflow_execute',
    description: 'Execute a workflow or process',
    keywords: ['run', 'execute', 'process', 'workflow', 'automate'],
    examples: [
      'Run the onboarding workflow',
      'Execute the expense approval',
      'Start the daily report workflow',
    ],
    category: 'operations',
    requiredEntities: ['workflow_name'],
    goals: [
      { type: 'execute', action: 'run_workflow', entities: ['workflow_name'], workers: ['automation_agent'] },
    ],
  },
  {
    name: 'query_knowledge',
    description: 'Query company knowledge or information',
    keywords: ['what', 'who', 'how', 'where', 'when', 'query', 'find', 'search'],
    examples: [
      'What is our refund policy?',
      'How do I reset my password?',
      'Who handles procurement?',
    ],
    category: 'general',
    requiredEntities: ['question'],
    goals: [
      { type: 'query', action: 'search_knowledge', entities: ['question'], workers: ['knowledge_agent'] },
    ],
  },
  {
    name: 'financial_action',
    description: 'Perform financial operations',
    keywords: ['invoice', 'payment', 'expense', 'budget', 'cost', 'revenue', 'financial'],
    examples: [
      'Create an invoice for the client',
      'Check our monthly burn rate',
      'What are our Q3 revenues?',
    ],
    category: 'finance',
    requiredEntities: ['action_type'],
    goals: [
      { type: 'execute', action: 'financial_operation', entities: ['action_type'], workers: ['cfo_agent'] },
    ],
  },
  {
    name: 'general_chat',
    description: 'General conversation or unclear intent',
    keywords: ['hi', 'hello', 'thanks', 'help', '?'],
    examples: [
      'Hi, how are you?',
      'Thanks for your help',
      'What can you do?',
    ],
    category: 'general',
    requiredEntities: [],
    goals: [
      { type: 'query', action: 'general_response', entities: [], workers: [] },
    ],
  },
];

// ============================================================================
// ENTITY EXTRACTION
// ============================================================================

interface ExtractedEntity {
  name: string;
  value: string;
  confidence: number;
}

function extractEntities(text: string, intent: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lowerText = text.toLowerCase();

  const rolePatterns = [
    /hire\s+(?:an?)?(?:\s+ai\s+)?(\w+(?:\s+\w+)?)/i,
    /need\s+(?:an?)?(?:\s+ai\s+)?(\w+(?:\s+\w+)?)/i,
    /(\w+(?:\s+\w+)?)\s+manager/i,
    /(\w+(?:\s+\w+)?)\s+agent/i,
    /(\w+(?:\s+\w+)?)\s+specialist/i,
  ];
  for (const pattern of rolePatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      entities.push({ name: 'role', value: match[1].trim(), confidence: 0.85 });
      break;
    }
  }

  const deptPatterns = [
    /for\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+department/i,
    /in\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+team/i,
    /(\w+(?:\s+\w+)?)\s+department/i,
    /(\w+(?:\s+\w+)?)\s+team/i,
  ];
  for (const pattern of deptPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      entities.push({ name: 'department', value: match[1].trim(), confidence: 0.8 });
      break;
    }
  }

  const itemPatterns = [
    /buy\s+(?:an?)?(?:\s+ai\s+)?(\w+(?:\s+\w+)?)/i,
    /subscribe\s+to\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
    /get\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
  ];
  for (const pattern of itemPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      entities.push({ name: 'item', value: match[1].trim(), confidence: 0.75 });
      break;
    }
  }

  const workflowPatterns = [
    /run\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+workflow/i,
    /execute\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
    /start\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
  ];
  for (const pattern of workflowPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      entities.push({ name: 'workflow_name', value: match[1].trim(), confidence: 0.9 });
      break;
    }
  }

  const agentPatterns = [
    /deploy\s+(?:the\s+)?(ai\s+\w+)/i,
    /activate\s+(?:the\s+)?(\w+\s+agent)/i,
    /start\s+(?:the\s+)?(\w+\s+agent)/i,
  ];
  for (const pattern of agentPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      entities.push({ name: 'agent_name', value: match[1].trim(), confidence: 0.85 });
      break;
    }
  }

  const issuePatterns = [
    /issue\s+(?:with\s+)?(.+?)(?:\.|$)/i,
    /problem\s+(?:with\s+)?(.+?)(?:\.|$)/i,
  ];
  for (const pattern of issuePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      entities.push({ name: 'issue', value: match[1].trim(), confidence: 0.8 });
      break;
    }
  }

  if (lowerText.includes('what') || lowerText.includes('how') || lowerText.includes('who')) {
    entities.push({ name: 'question', value: text, confidence: 0.9 });
  }

  return entities;
}

// ============================================================================
// INTENT CLASSIFICATION
// ============================================================================

interface IntentResult {
  intent: string;
  confidence: number;
  explanation: string;
}

function classifyIntent(text: string): IntentResult {
  const lowerText = text.toLowerCase();
  let bestMatch: IntentResult = {
    intent: 'general_chat',
    confidence: 0.3,
    explanation: 'No clear intent detected',
  };

  for (const intentDef of INTENT_CATALOG) {
    let score = 0;
    const matches: string[] = [];

    for (const keyword of intentDef.keywords) {
      if (lowerText.includes(keyword)) {
        score += 0.3;
        matches.push(keyword);
      }
    }

    for (const example of intentDef.examples) {
      const exampleLower = example.toLowerCase();
      const words = exampleLower.split(' ').filter(w => w.length > 3);
      const matchedWords = words.filter(w => lowerText.includes(w));
      if (matchedWords.length > 0) {
        score += matchedWords.length * 0.1;
      }
    }

    if (score > bestMatch.confidence) {
      bestMatch = {
        intent: intentDef.name,
        confidence: Math.min(score, 0.95),
        explanation: `Matched keywords: ${matches.join(', ')}`,
      };
    }
  }

  return bestMatch;
}

async function classifyIntentWithLLM(text: string): Promise<IntentResult> {
  try {
    const prompt = `Classify this user input into one of these intents:
- hire_workforce: Hire new employees or AI workers
- deploy_agent: Deploy or activate an AI agent
- purchase_marketplace: Buy from marketplace
- create_department: Create new department
- analyze_performance: Generate reports or analytics
- create_ticket: Create support ticket
- workflow_execute: Run a workflow
- query_knowledge: Query information
- financial_action: Financial operations
- general_chat: General conversation

User input: "${text}"

Respond with JSON: {"intent": "name", "confidence": 0.0-1.0, "reasoning": "brief"}`;

    const result = await callService(`${LLM_URL}/v1/chat/completions`, 'POST', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
    });

    if (result.ok && result.data?.choices?.[0]?.message?.content) {
      const response = JSON.parse(result.data.choices[0].message.content);
      return {
        intent: response.intent,
        confidence: response.confidence,
        explanation: response.reasoning || 'LLM classified',
      };
    }
  } catch (error) {
    console.log('[Intent Engine] LLM unavailable, using keyword matching');
  }
  return classifyIntent(text);
}

// ============================================================================
// GOAL DECOMPOSITION
// ============================================================================

interface Goal {
  id: string;
  type: string;
  action: string;
  entities: Record<string, string>;
  status: 'pending' | 'routed' | 'executing' | 'completed' | 'failed';
  assignedWorkers: string[];
  result?: any;
  dependencies?: string[];
}

function decomposeGoals(intent: IntentResult, entities: ExtractedEntity[]): Goal[] {
  const intentDef = INTENT_CATALOG.find(i => i.name === intent.intent);
  if (!intentDef) return [];

  const entityMap: Record<string, string> = {};
  for (const e of entities) {
    entityMap[e.name] = e.value;
  }

  return intentDef.goals.map((goalTemplate, index) => ({
    id: `goal_${Date.now()}_${index}`,
    type: goalTemplate.type,
    action: goalTemplate.action,
    entities: entityMap,
    status: 'pending' as const,
    assignedWorkers: goalTemplate.workers || [],
    dependencies: index > 0 ? [`goal_${Date.now()}_${index - 1}`] : undefined,
  }));
}

// ============================================================================
// WORKER ROUTING
// ============================================================================

interface WorkerAssignment {
  goalId: string;
  workerId: string;
  workerName: string;
  confidence: number;
  reason: string;
}

async function routeGoalsToWorkers(goals: Goal[]): Promise<WorkerAssignment[]> {
  const assignments: WorkerAssignment[] = [];

  for (const goal of goals) {
    const requiredCapabilities = getCapabilitiesForAction(goal.action);

    const salarResult = await callService(
      `${SALAR_URL}/sutar/bridge/workforce-decision`,
      'POST',
      {
        decisionId: `route_${goal.id}`,
        requiredCapabilities,
        preferHuman: false,
        allowHybrid: true,
      }
    );

    if (salarResult.ok && salarResult.data?.data?.recommendations?.length > 0) {
      const best = salarResult.data.data.recommendations[0];
      assignments.push({
        goalId: goal.id,
        workerId: best.corpId,
        workerName: best.name,
        confidence: best.matchScore,
        reason: `Best match for ${goal.action}`,
      });
    } else {
      const defaultWorker = getDefaultWorker(goal.action);
      assignments.push({
        goalId: goal.id,
        workerId: defaultWorker.id,
        workerName: defaultWorker.name,
        confidence: 0.5,
        reason: `Default worker for ${goal.action}`,
      });
    }
  }

  return assignments;
}

function getCapabilitiesForAction(action: string): string[] {
  const actionCapabilities: Record<string, string[]> = {
    'create_worker': ['recruitment', 'onboarding', 'hr'],
    'activate_agent': ['agent_deployment', 'ai_operations'],
    'buy_from_marketplace': ['procurement', 'marketplace'],
    'setup_department': ['operations', 'planning'],
    'generate_report': ['analytics', 'reporting', 'data_analysis'],
    'create_ticket': ['support', 'ticketing'],
    'run_workflow': ['automation', 'workflow_execution'],
    'search_knowledge': ['knowledge_management', 'search'],
    'financial_operation': ['finance', 'accounting'],
    'general_response': ['conversation', 'help'],
  };
  return actionCapabilities[action] || [];
}

function getDefaultWorker(action: string): { id: string; name: string } {
  const defaultWorkers: Record<string, { id: string; name: string }> = {
    'create_worker': { id: 'hr_manager', name: 'HR Manager' },
    'activate_agent': { id: 'ai_orchestrator', name: 'AI Orchestrator' },
    'buy_from_marketplace': { id: 'procurement_agent', name: 'Procurement Agent' },
    'setup_department': { id: 'operations_manager', name: 'Operations Manager' },
    'generate_report': { id: 'analytics_agent', name: 'Analytics Agent' },
    'create_ticket': { id: 'support_agent', name: 'Support Agent' },
    'run_workflow': { id: 'automation_agent', name: 'Automation Agent' },
    'search_knowledge': { id: 'knowledge_agent', name: 'Knowledge Agent' },
    'financial_operation': { id: 'cfo_agent', name: 'CFO Agent' },
    'general_response': { id: 'assistant', name: 'AI Assistant' },
  };
  return defaultWorkers[action] || { id: 'assistant', name: 'AI Assistant' };
}

// ============================================================================
// EXECUTION PLANNING
// ============================================================================

interface ExecutionPlan {
  planId: string;
  goals: Goal[];
  assignments: WorkerAssignment[];
  estimatedDuration: number;
  steps: ExecutionStep[];
}

interface ExecutionStep {
  step: number;
  goalId: string;
  action: string;
  worker: string;
  dependsOn: string[];
}

function createExecutionPlan(goals: Goal[], assignments: WorkerAssignment[]): ExecutionPlan {
  const steps: ExecutionStep[] = [];

  goals.forEach((goal, index) => {
    const assignment = assignments.find(a => a.goalId === goal.id);
    steps.push({
      step: index + 1,
      goalId: goal.id,
      action: goal.action,
      worker: assignment?.workerName || 'Unknown',
      dependsOn: goal.dependencies || [],
    });
  });

  return {
    planId: `plan_${Date.now()}`,
    goals,
    assignments,
    estimatedDuration: goals.length * 60,
    steps,
  };
}

async function executePlan(plan: ExecutionPlan): Promise<any> {
  const results = [];

  for (const step of plan.steps) {
    const goal = plan.goals.find(g => g.id === step.goalId);
    if (!goal) continue;

    console.log(`[Intent Engine] Executing: ${step.action} via ${step.worker}`);

    const result = await callService(
      `${SUTAR_DECISION_URL}/api/tasks`,
      'POST',
      {
        taskId: goal.id,
        action: goal.action,
        entities: goal.entities,
        worker: step.worker,
      }
    );

    results.push({
      step: step.step,
      goalId: goal.id,
      action: goal.action,
      worker: step.worker,
      result: result.ok ? result.data : { error: result.error },
    });

    goal.status = result.ok ? 'executing' : 'failed';
  }

  return {
    planId: plan.planId,
    executedAt: new Date().toISOString(),
    steps: results,
    summary: {
      total: results.length,
      successful: results.filter(r => !r.result?.error).length,
      failed: results.filter(r => r.result?.error).length,
    },
  };
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    status: 'ok',
  });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * POST /api/intent/classify
 * Classify user intent from natural language.
 */
app.post('/api/intent/classify', async (req: Request, res: Response) => {
  try {
    const { text, use_llm = true } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'text is required',
      });
    }

    const intent = use_llm
      ? await classifyIntentWithLLM(text)
      : classifyIntent(text);

    const entities = extractEntities(text, intent.intent);

    res.json({
      success: true,
      data: {
        text,
        intent,
        entities,
        catalogEntry: INTENT_CATALOG.find(i => i.name === intent.intent),
      },
    });
  } catch (error: any) {
    console.error('[Intent Engine] Classification error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/intent/process
 * Full processing: classify → extract → decompose → route → plan → execute
 */
app.post('/api/intent/process', async (req: Request, res: Response) => {
  try {
    const { text, use_llm = true, execute = false } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'text is required',
      });
    }

    console.log(`[Intent Engine] Processing: "${text}"`);

    const intent = use_llm
      ? await classifyIntentWithLLM(text)
      : classifyIntent(text);

    const entities = extractEntities(text, intent.intent);
    const goals = decomposeGoals(intent, entities);
    const assignments = await routeGoalsToWorkers(goals);
    const plan = createExecutionPlan(goals, assignments);

    let executionResult = null;
    if (execute && goals.length > 0) {
      executionResult = await executePlan(plan);
    }

    res.json({
      success: true,
      data: {
        input: text,
        intent,
        entities,
        goals,
        assignments,
        plan,
        execution: executionResult,
      },
    });
  } catch (error: any) {
    console.error('[Intent Engine] Process error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/intent/execute/:planId
 * Execute a previously created plan.
 */
app.post('/api/intent/execute/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'plan is required',
      });
    }

    const result = await executePlan(plan);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Intent Engine] Execute error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/intent/catalog
 * Get all available intents.
 */
app.get('/api/intent/catalog', (_req, res) => {
  res.json({
    success: true,
    data: {
      intents: INTENT_CATALOG.map(i => ({
        name: i.name,
        description: i.description,
        category: i.category,
        examples: i.examples,
      })),
      total: INTENT_CATALOG.length,
    },
  });
});

/**
 * GET /api/intent/health
 * Check connectivity to dependent services.
 */
app.get('/api/intent/health', async (_req, res) => {
  const [salar, sutar, agentos] = await Promise.all([
    callService(`${SALAR_URL}/health`, 'GET'),
    callService(`${SUTAR_DECISION_URL}/health`, 'GET'),
    callService(`${AGENT_OS_URL}/health`, 'GET'),
  ]);

  res.json({
    success: true,
    data: {
      service: SERVICE_NAME,
      connectedTo: {
        salar: salar.ok ? 'connected' : 'disconnected',
        sutar: sutar.ok ? 'connected' : 'disconnected',
        agentos: agentos.ok ? 'connected' : 'disconnected',
      },
    },
  });
});

// ============================================================================
// START
// ============================================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
    console.log(`[${SERVICE_NAME}] LLM: ${LLM_URL}`);
    console.log(`[${SERVICE_NAME}] Salar: ${SALAR_URL}`);
    console.log(`[${SERVICE_NAME}] SUTAR: ${SUTAR_DECISION_URL}`);
  });
}

module.exports = { app, SERVICE_NAME, VERSION, PORT };
