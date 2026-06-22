// Campaign Manager AI - Port 4793
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4793;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'campaign-manager', port: PORT });
});

app.post('/api/campaigns/create', (req, res) => {
  const { name, budget } = req.body;
  res.json({ campaignId: `cmp_${Date.now()}`, name, budget, status: 'draft' });
});

app.post('/api/campaigns/optimize', (req, res) => {
  const { campaignId } = req.body;
  res.json({ campaignId, recommendations: ['Increase budget on mobile', 'Extend by 2 weeks'] });
});

app.listen(PORT, () => {
  console.log(`Campaign Manager running on port ${PORT}`);
});
