const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');

const taskRoutes = require('./routes/tasks');
const automationRoutes = require('./routes/automation');
const workflowRoutes = require('./routes/workflows');
const calendarRoutes = require('./routes/calendar');
const reminderRoutes = require('./routes/reminders');
const executionRoutes = require('./routes/execution');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4726;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


app.use(requireAuth);// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/tasks', taskRoutes);
app.use('/automation', automationRoutes);
app.use('/workflows', workflowRoutes);
app.use('/calendar', calendarRoutes);
app.use('/reminders', reminderRoutes);
app.use('/execution', executionRoutes);

// Health check
app.get('/health', (req, res) => { res.json({ status: 'healthy', service: 'Genie', port: PORT }); });
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Execution Engine',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    capabilities: [
      '/tasks - Task management and tracking',
      '/automation - Automated workflows and routines',
      '/workflows - Complex workflow orchestration',
      '/calendar - Calendar and scheduling',
      '/reminders - Smart reminders and notifications',
      '/execution - Action execution and tracking'
    ]
  });
});

// PersistentMap-backed storage (parallel to in-route Maps; doesn't touch them)
const storage = {
  tasks: new PersistentMap('tasks', { serviceName: 'genie-execution-engine' }),
  automations: new PersistentMap('automations', { serviceName: 'genie-execution-engine' }),
  workflows: new PersistentMap('workflows', { serviceName: 'genie-execution-engine' }),
  executions: new PersistentMap('executions', { serviceName: 'genie-execution-engine' }),
  reminders: new PersistentMap('reminders', { serviceName: 'genie-execution-engine' }),
};
app.locals.storage = storage;

// Seed demo data (idempotent — only fills empty stores)
const seedPlans = [
  {
    store: storage.tasks,
    items: normalizeSeedData([
      { id: 'task-ex-1', userId: 'user-001', title: 'Finalize pricing page', status: 'in-progress', priority: 'high', dueAt: '2026-06-25T17:00:00Z' },
      { id: 'task-ex-2', userId: 'user-001', title: 'Onboard Acme Corp', status: 'todo', priority: 'medium', dueAt: '2026-06-27T12:00:00Z' },
      { id: 'task-ex-3', userId: 'user-002', title: 'Review Q3 hiring plan', status: 'in-progress', priority: 'high', dueAt: '2026-06-24T16:00:00Z' },
      { id: 'task-ex-4', userId: 'user-001', title: 'Ship multi-tenant fix', status: 'done', priority: 'high', completedAt: '2026-06-22T10:00:00Z' },
      { id: 'task-ex-5', userId: 'user-003', title: 'Customer interviews', status: 'todo', priority: 'medium', dueAt: '2026-06-30T18:00:00Z' },
    ]),
  },
  {
    store: storage.automations,
    items: normalizeSeedData([
      { id: 'auto-ex-1', userId: 'user-001', name: 'Daily standup reminder', trigger: 'cron:9am-weekdays', enabled: true },
      { id: 'auto-ex-2', userId: 'user-001', name: 'New lead → Slack #sales', trigger: 'event:lead.created', enabled: true },
      { id: 'auto-ex-3', userId: 'user-002', name: 'Invoice on order complete', trigger: 'event:order.completed', enabled: false },
      { id: 'auto-ex-4', userId: 'user-003', name: 'Weekly digest email', trigger: 'cron:fri-5pm', enabled: true },
    ]),
  },
  {
    store: storage.workflows,
    items: normalizeSeedData([
      { id: 'wf-ex-1', userId: 'user-001', name: 'New customer onboarding', steps: 6, status: 'published' },
      { id: 'wf-ex-2', userId: 'user-002', name: 'Refund approval', steps: 3, status: 'published' },
      { id: 'wf-ex-3', userId: 'user-001', name: 'Quarterly review', steps: 8, status: 'draft' },
    ]),
  },
  {
    store: storage.executions,
    items: normalizeSeedData([
      { id: 'exec-ex-1', workflowId: 'wf-ex-1', userId: 'user-001', status: 'completed', startedAt: '2026-06-20T10:00:00Z', finishedAt: '2026-06-20T10:14:00Z' },
      { id: 'exec-ex-2', workflowId: 'wf-ex-2', userId: 'user-002', status: 'running', startedAt: '2026-06-23T14:30:00Z' },
      { id: 'exec-ex-3', workflowId: 'wf-ex-1', userId: 'user-001', status: 'completed', startedAt: '2026-06-22T09:15:00Z', finishedAt: '2026-06-22T09:32:00Z' },
      { id: 'exec-ex-4', workflowId: 'wf-ex-2', userId: 'user-001', status: 'failed', startedAt: '2026-06-21T11:00:00Z', finishedAt: '2026-06-21T11:01:30Z' },
    ]),
  },
  {
    store: storage.reminders,
    items: normalizeSeedData([
      { id: 'rem-ex-1', userId: 'user-001', text: 'Call Acme procurement', at: '2026-06-25T14:00:00Z', completed: false },
      { id: 'rem-ex-2', userId: 'user-002', text: 'Review legal contract draft', at: '2026-06-24T16:30:00Z', completed: false },
      { id: 'rem-ex-3', userId: 'user-001', text: 'Submit Q3 OKRs', at: '2026-06-30T23:59:00Z', completed: false },
      { id: 'rem-ex-4', userId: 'user-003', text: 'Submit expense report', at: '2026-06-22T17:00:00Z', completed: true },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-execution-engine' });
if (seeded) console.log('[genie-execution-engine] demo data seeded');

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Readiness routes — /api/llm-health, /api/db-health, /api/readiness
installReadinessRoutes(app, { serviceName: 'genie-execution-engine' });



const server = app.listen(PORT, () => {
  console.log(`⚡ Genie Execution Engine running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;