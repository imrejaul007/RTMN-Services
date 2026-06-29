import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4290;

app.use(helmet());
app.use(cors());
app.use(express.json());

const tasks = new Map();
const assignments = new Map();

// Assign task based on role/department
function assignTask(task, context = {}) {
  const { role, department, skills, availability } = context;

  // Role-based routing
  const roleMap = {
    finance: 'finance_team',
    hr: 'hr_team',
    engineering: 'eng_team',
    sales: 'sales_team',
    support: 'support_team'
  };

  let assignee = roleMap[department] || 'general_pool';

  // Skill matching
  if (skills && task.requiredSkills) {
    const matchedSkills = skills.filter(s => task.requiredSkills.includes(s));
    if (matchedSkills.length > 0) {
      assignee = matchedSkills[0] + '_specialist';
    }
  }

  const assignment = {
    taskId: task.id,
    assignee,
    assignedAt: new Date().toISOString(),
    confidence: 0.85,
    reason: department ? `Based on ${department} department` : 'Skill matching'
  };

  assignments.set(task.id, assignment);
  return assignment;
}

app.post('/tasks', (req, res) => {
  const { title, description, priority, department, requiredSkills, context } = req.body;

  const task = {
    id: `task-${Date.now()}`,
    title,
    description,
    priority: priority || 'medium',
    department,
    requiredSkills: requiredSkills || [],
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  tasks.set(task.id, task);
  const assignment = assignTask(task, context || {});

  res.json({ success: true, task, assignment });
});

app.get('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const task = tasks.get(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const assignment = assignments.get(id);
  res.json({ task, assignment });
});

app.post('/tasks/:id/assign', (req, res) => {
  const { id } = req.params;
  const task = tasks.get(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const assignment = assignTask(task, req.body);
  res.json({ success: true, assignment });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'task-assignment-engine', port: PORT });
});

app.listen(PORT, () => console.log(`Task Assignment Engine running on port ${PORT}`));
export default app;
