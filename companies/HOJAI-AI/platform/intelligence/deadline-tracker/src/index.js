import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4294;

app.use(helmet());
app.use(cors());
app.use(express.json());

const deadlines = new Map();

app.post('/deadlines', (req, res) => {
  const { taskId, deadline, priority } = req.body;
  if (!taskId || !deadline) return res.status(400).json({ error: 'taskId and deadline required' });

  const entry = {
    taskId,
    deadline,
    priority: priority || 'medium',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  deadlines.set(taskId, entry);
  res.json({ success: true, deadline: entry });
});

app.get('/deadlines', (req, res) => {
  const { status } = req.query;
  let list = Array.from(deadlines.values());
  if (status) list = list.filter(d => d.status === status);
  res.json({ deadlines: list });
});

app.get('/deadlines/upcoming', (req, res) => {
  const now = new Date();
  const upcoming = [];
  for (const d of deadlines.values()) {
    const deadline = new Date(d.deadline);
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0) upcoming.push({ ...d, daysUntil });
  }
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  res.json({ deadlines: upcoming });
});

app.put('/deadlines/:taskId', (req, res) => {
  const d = deadlines.get(req.params.taskId);
  if (!d) return res.status(404).json({ error: 'Not found' });
  Object.assign(d, req.body);
  res.json({ success: true, deadline: d });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'deadline-tracker', port: PORT });
});

app.listen(PORT, () => console.log(`Deadline Tracker running on port ${PORT}`));
export default app;