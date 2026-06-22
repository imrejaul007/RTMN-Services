// Kitchen Manager AI - Port 4818
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4818;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'kitchen-manager', port: PORT });
});

app.post('/api/orders/optimize', (req, res) => {
  const { orders } = req.body;
  res.json({ suggestions: ['Fire table 5 first', 'Start desserts'], efficiency: '+20%' });
});

app.post('/api/inventory/check', (req, res) => {
  res.json({ lowStock: ['Chicken', 'Basil'], suggestions: ['Reorder today'] });
});

app.listen(PORT, () => {
  console.log(`Kitchen Manager running on port ${PORT}`);
});
