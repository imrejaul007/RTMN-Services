// Safety Coordinator AI - Port 4796
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4796;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'safety-coordinator', port: PORT });
});

app.post('/api/safety/alert', (req, res) => {
  const { locationId, type } = req.body;
  res.json({ alertId: `alt_${Date.now()}`, locationId, type, status: 'investigating' });
});

app.listen(PORT, () => {
  console.log(`Safety Coordinator running on port ${PORT}`);
});
