import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4889;

app.use(helmet());
app.use(cors());
app.use(express.json());

const actionRoutes = {
  task: 'http://localhost:4297',
  flow: 'http://localhost:4298',
  genie: 'http://localhost:4701',
  company: 'http://localhost:4705',
  payment: 'http://localhost:4301',
  calendar: 'http://localhost:4709',
  email: 'http://localhost:4710',
  crm: 'http://localhost:4800',
  support: 'http://localhost:4885'
};

const intentPatterns = {
  task: ['task', 'remind', 'todo', 'schedule', 'assign', 'deadline'],
  flow: ['workflow', 'automate', 'process', 'routine'],
  genie: ['help', 'question', 'what', 'how', 'tell me'],
  payment: ['pay', 'transfer', 'send money', 'checkout', 'purchase'],
  calendar: ['schedule', 'meeting', 'calendar', 'appointment', 'book'],
  email: ['email', 'send', 'message', 'compose', 'reply'],
  crm: ['customer', 'lead', 'deal', 'account', 'contact'],
  support: ['help', 'issue', 'problem', 'support', 'ticket']
};

function classifyIntent(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    scores[intent] = patterns.filter(p => lower.includes(p)).length;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'genie';
}

app.post('/route', (req, res) => {
  const { voiceText, corpId, context } = req.body;
  if (!voiceText) {
    return res.status(400).json({ error: 'voiceText required' });
  }
  const intent = classifyIntent(voiceText);
  const actionEndpoint = actionRoutes[intent];
  res.json({
    voiceText,
    corpId,
    intent,
    actionSystem: intent,
    actionEndpoint,
    routedAt: new Date().toISOString()
  });
});

app.get('/intents', (req, res) => {
  res.json({
    intents: Object.keys(intentPatterns),
    routes: actionRoutes
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-action-router', port: PORT });
});

app.listen(PORT, () => console.log(`Voice Action Router running on port ${PORT}`));
export default app;
