import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4292;

app.use(helmet());
app.use(cors());
app.use(express.json());

const executions = new Map();

// Action definitions
const actions = {
  email: { endpoint: '/api/email/send', method: 'POST' },
  calendar: { endpoint: '/api/calendar/event', method: 'POST' },
  task: { endpoint: '/api/tasks', method: 'POST' },
  payment: { endpoint: '/api/payment/process', method: 'POST' },
  notification: { endpoint: '/api/notifications/send', method: 'POST' },
  crm: { endpoint: '/api/crm/update', method: 'POST' }
};

async function executeAction(action, params) {
  const definition = actions[action];
  if (!definition) {
    return { success: false, error: 'Unknown action' };
  }

  const execution = {
    id: `exec-${Date.now()}`,
    action,
    params,
    status: 'completed',
    executedAt: new Date().toISOString()
  };

  executions.set(execution.id, execution);
  return { success: true, execution };
}

app.post('/execute', (req, res) => {
  const { action, params } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'action required' });
  }

  executeAction(action, params).then(result => {
    res.json(result);
  });
});

app.get('/actions', (req, res) => {
  res.json({ actions: Object.keys(actions) });
});

app.get('/executions/:id', (req, res) => {
  const { id } = req.params;
  const execution = executions.get(id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json({ execution });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'action-orchestrator', port: PORT });
});

app.listen(PORT, () => console.log(`Action Orchestrator running on port ${PORT}`));
export default app;