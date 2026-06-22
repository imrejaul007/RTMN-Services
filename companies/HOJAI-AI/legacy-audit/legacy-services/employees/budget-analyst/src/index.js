// Budget Analyst AI - Port 4814
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4814;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'budget-analyst', port: PORT });
});

app.post('/api/budget/plan', (req, res) => {
  const { department } = req.body;
  res.json({ department, budget: 500000, allocation: { ops: 40, marketing: 30, hr: 30 } });
});

app.post('/api/budget/variance', (req, res) => {
  const { month } = req.body;
  res.json({ month, variance: 5, status: 'within_budget' });
});

app.listen(PORT, () => {
  console.log(`Budget Analyst running on port ${PORT}`);
});
