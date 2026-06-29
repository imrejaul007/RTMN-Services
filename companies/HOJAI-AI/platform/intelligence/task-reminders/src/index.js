import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4295;

app.use(helmet());
app.use(cors());
app.use(express.json());

const reminders = new Map();
const notifications = [];

app.post('/reminders', (req, res) => {
  const { taskId, assignee, message, remindAt, channel } = req.body;
  if (!taskId) return res.status(400).json({ error: 'taskId required' });

  const reminder = {
    id: `rem_${Date.now()}`,
    taskId,
    assignee,
    message,
    remindAt: remindAt || new Date().toISOString(),
    channel: channel || 'app',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  reminders.set(reminder.id, reminder);
  res.json({ success: true, reminder });
});

app.get('/reminders', (req, res) => {
  const { assignee } = req.query;
  let list = Array.from(reminders.values());
  if (assignee) list = list.filter(r => r.assignee === assignee);
  res.json({ reminders: list });
});

app.delete('/reminders/:id', (req, res) => {
  reminders.delete(req.params.id);
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'task-reminders', port: PORT });
});

app.listen(PORT, () => console.log(`Task Reminders running on port ${PORT}`));
export default app;