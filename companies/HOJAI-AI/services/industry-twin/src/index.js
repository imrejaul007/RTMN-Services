const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 4893;
app.use(express.json());

const industries = new Map([
  ['restaurant', { id: 'restaurant', name: 'Restaurant', vertCount: 1, segments: ['fast food', 'casual', 'fine dining'], aiAgents: 15 }],
  ['hotel', { id: 'hotel', name: 'Hotel', vertCount: 1, segments: ['budget', 'mid-scale', 'luxury'], aiAgents: 12 }],
  ['healthcare', { id: 'healthcare', name: 'Healthcare', vertCount: 1, segments: ['hospital', 'clinic', 'pharmacy'], aiAgents: 18 }],
  ['retail', { id: 'retail', name: 'Retail', vertCount: 1, segments: ['ecommerce', 'brick-mortar', 'omni-channel'], aiAgents: 20 }]
]);

app.get('/api/industries', (req, res) => res.json({ industries: Array.from(industries.values()) }));
app.get('/api/industries/:id', (req, res) => {
  const ind = industries.get(req.params.id);
  if (!ind) return res.status(404).json({ error: 'Not found' });
  res.json(ind);
});
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'industry-twin', port: PORT }));
app.listen(PORT, () => console.log('Industry Twin running on ' + PORT));
