// Mortgage Advisor AI - Port 4829
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4829;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mortgage-advisor', port: PORT });
});

app.post('/api/calculate', (req, res) => {
  const { amount, tenure } = req.body;
  res.json({ emi: Math.round(amount / tenure), interest: 250000, total: amount + 250000 });
});

app.post('/api/eligibility', (req, res) => {
  const { income, expenses } = req.body;
  res.json({ eligible: true, maxLoan: income * 60, rate: 8.5 });
});

app.listen(PORT, () => {
  console.log(`Mortgage Advisor running on port ${PORT}`);
});
