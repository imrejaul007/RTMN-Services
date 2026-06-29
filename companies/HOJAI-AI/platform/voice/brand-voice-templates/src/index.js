import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4893;

app.use(helmet());
app.use(cors());
app.use(express.json());

const templates = new Map();

const defaultTemplates = {
  luxury: { name: 'Luxury', tone: 'elegant', vocabulary: ['exquisite', 'premium'], pacing: 'slow' },
  casual: { name: 'Casual', tone: 'friendly', vocabulary: ['hey', 'awesome'], pacing: 'fast' },
  professional: { name: 'Professional', tone: 'formal', vocabulary: ['certainly', 'assistance'], pacing: 'moderate' }
};

for (const [key, val] of Object.entries(defaultTemplates)) {
  templates.set(key, val);
}

app.post('/templates', (req, res) => {
  const { id, name, tone, vocabulary, pacing } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  templates.set(id, { name, tone, vocabulary, pacing });
  res.json({ success: true, template: templates.get(id) });
});

app.get('/templates', (req, res) => {
  res.json({ templates: Object.fromEntries(templates) });
});

app.get('/templates/:id', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json({ template: t });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'brand-voice-templates', port: PORT });
});

app.listen(PORT, () => console.log(`Brand Voice Templates running on port ${PORT}`));
export default app;