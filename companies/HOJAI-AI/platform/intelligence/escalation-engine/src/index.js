import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4296;

app.use(helmet());
app.use(cors());
app.use(express.json());

const escalations = new Map();

const escalationRules = [
  { condition: 'overdue', level: 1, action: 'notify_manager' },
  { condition: 'priority_critical', level: 2, action: 'notify_executive' },
  { condition: 'blocked', level: 1, action: 'reassign' }
];

function checkEscalation(task) {
  for (const rule of escalationRules) {
    if (rule.condition === 'overdue' && task.overdue) return rule;
    if (rule.condition === 'priority_critical' && task.priority === 'critical') return rule;
    if (rule.condition === 'blocked' && task.blocked) return rule;
  }
  return null;
}

app.post('/escalate', (req, res) => {
  const { taskId, task } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: 'taskId required' });
  }
  task = task || {};
  const rule = checkEscalation(task);
  const escalation = {
    id: 'esc_' + Date.now(),
    taskId: taskId,
    rule: rule,
    level: rule ? rule.level : 0,
    action: rule ? rule.action : null,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  escalations.set(taskId, escalation);
  res.json({ success: true, escalation: escalation });
});

app.get('/escalations', (req, res) => {
  const list = Array.from(escalations.values());
  res.json({ escalations: list });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'escalation-engine', port: PORT });
});

app.listen(PORT, () => console.log('Escalation Engine running on port ' + PORT));
export default app;
