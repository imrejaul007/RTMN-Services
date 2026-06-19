const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 4929;
app.use(express.json());

app.post('/api/campaigns/generate', (req, res) => {
  const { goal, audience, channels } = req.body;
  res.json({ id: uuidv4(), name: 'AI Campaign', goal, audience, channels, status: 'draft', recommendations: ['Email sequence', 'Social posts', 'Landing page'] });
});

app.post('/api/content/generate', (req, res) => {
  const { topic, tone, platform } = req.body;
  res.json({ id: uuidv4(), topic, content: 'Generated content for ' + topic, variations: 3, hashtags: ['#AI', '#Marketing'] });
});

app.post('/api/audience/insights', (req, res) => {
  const { segmentId } = req.body;
  res.json({ segmentId, size: 15000, demographics: { age: '25-45', interests: ['tech', 'business'] } });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'marketing-copilot', port: PORT }));
app.listen(PORT, () => console.log('Marketing Copilot running on ' + PORT));
