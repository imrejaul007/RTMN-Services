import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4291;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Task patterns
const taskPatterns = [
  { pattern: /remind me to ([^.]+)/gi, type: 'reminder' },
  { pattern: /schedule ([^.]+)/gi, type: 'scheduling' },
  { pattern: /assign ([^.]+) to ([^.]+)/gi, type: 'assignment' },
  { pattern: /do ([^.]+)/gi, type: 'action' },
  { pattern: /follow up on ([^.]+)/gi, type: 'followup' },
  { pattern: /call ([^.]+)/gi, type: 'call' },
  { pattern: /email ([^.]+)/gi, type: 'email' },
  { pattern: /buy ([^.]+)/gi, type: 'purchase' },
  { pattern: /review ([^.]+)/gi, type: 'review' },
  { pattern: /approve ([^.]+)/gi, type: 'approval' }
];

// Extract tasks from text
function extractTasks(text) {
  const tasks = [];

  for (const { pattern, type } of taskPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      tasks.push({
        id: `task-${Date.now()}-${tasks.length}`,
        type,
        title: match[0],
        description: match[1] || match[0],
        extractedAt: new Date().toISOString()
      });
    }
  }

  return tasks;
}

// Extract deadline
function extractDeadline(text) {
  const datePatterns = [
    { pattern: /next week/i, days: 7 },
    { pattern: /tomorrow/i, days: 1 },
    { pattern: /today/i, days: 0 },
    { pattern: /by ([^.]+)/i, days: null }
  ];

  for (const { pattern, days } of datePatterns) {
    if (pattern.test(text)) {
      if (days !== null) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
      }
      return null;
    }
  }
  return null;
}

app.post('/extract', (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  const tasks = extractTasks(text);
  const deadline = extractDeadline(text);

  res.json({
    text,
    tasks,
    count: tasks.length,
    deadline
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'task-extraction-engine', port: PORT });
});

app.listen(PORT, () => console.log(`Task Extraction Engine running on port ${PORT}`));
export default app;