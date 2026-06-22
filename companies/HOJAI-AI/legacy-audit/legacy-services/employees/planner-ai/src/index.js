// Planner AI - Port 4865
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4865;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'planner-ai', port: PORT });
});

app.post('/api/plan', (req, res) => {
  const { goal } = req.body;
  res.json({ goal, steps: ['Step 1', 'Step 2', 'Step 3'], timeline: '30 days' });
});

app.listen(PORT, () => {
  console.log(`Planner AI running on port ${PORT}`);
});
