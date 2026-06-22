// Legal Assistant AI - Port 4787
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4787;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'legal-assistant', port: PORT });
});

app.post('/api/contracts/review', (req, res) => {
  const { contractText } = req.body;
  res.json({
    risks: ['Missing liability clause', 'Unclear payment terms'],
    score: 72,
    recommendations: [
      'Add termination clause',
      'Clarify payment terms',
      'Add force majeure'
    ]
  });
});

app.post('/api/policies/draft', (req, res) => {
  const { policyType } = req.body;
  res.json({
    policyId: `pol_${Date.now()}`,
    type: policyType,
    sections: ['Purpose', 'Scope', 'Responsibilities', 'Compliance'],
    template: 'Standard policy template applied'
  });
});

app.listen(PORT, () => {
  console.log(`Legal Assistant running on port ${PORT}`);
});
