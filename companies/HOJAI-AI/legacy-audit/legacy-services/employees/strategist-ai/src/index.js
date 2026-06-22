// Strategist AI - Port 4860
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4860;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'strategist-ai', port: PORT });
});

app.post('/api/strategy', (req, res) => {
  const { goal } = req.body;
  res.json({ goal, phases: ['Foundation', 'Growth', 'Scale'], timeline: '12 months' });
});

app.listen(PORT, () => {
  console.log(`Strategist AI running on port ${PORT}`);
});
