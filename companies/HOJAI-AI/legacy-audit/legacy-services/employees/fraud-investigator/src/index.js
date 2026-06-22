// Fraud Investigator AI - Port 4797
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4797;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'fraud-investigator', port: PORT });
});

app.post('/api/fraud/investigate', (req, res) => {
  const { transactionId } = req.body;
  res.json({ transactionId, risk: 0.75, verdict: 'review', actions: ['flag_account'] });
});

app.listen(PORT, () => {
  console.log(`Fraud Investigator running on port ${PORT}`);
});
