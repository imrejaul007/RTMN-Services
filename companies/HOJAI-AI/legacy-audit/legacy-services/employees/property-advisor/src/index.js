// Property Advisor AI - Port 4798
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4798;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'property-advisor', port: PORT });
});

app.post('/api/property/match', (req, res) => {
  const { userId, requirements } = req.body;
  res.json({ userId, matches: [{ propertyId: 'p1', matchScore: 0.85 }] });
});

app.listen(PORT, () => {
  console.log(`Property Advisor running on port ${PORT}`);
});
