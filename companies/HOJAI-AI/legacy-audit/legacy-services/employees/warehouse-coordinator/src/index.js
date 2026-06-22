// Warehouse Coordinator AI - Port 4824
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4824;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'warehouse-coordinator', port: PORT });
});

app.post('/api/pick/optimize', (req, res) => {
  const { orders } = req.body;
  res.json({ route: ['A1', 'B2', 'C3'], time: '45 min' });
});

app.post('/api/receive', (req, res) => {
  const { shipmentId } = req.body;
  res.json({ shipmentId, status: 'received', location: 'Zone A' });
});

app.listen(PORT, () => {
  console.log(`Warehouse Coordinator running on port ${PORT}`);
});
