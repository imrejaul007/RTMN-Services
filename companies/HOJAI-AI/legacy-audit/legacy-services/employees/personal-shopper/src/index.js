// Personal Shopper AI - Port 4821
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4821;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'personal-shopper', port: PORT });
});

app.post('/api/shopping/recommend', (req, res) => {
  const { preferences, budget } = req.body;
  res.json({ items: [{ name: 'Jacket', price: 2500 }], match: 92 });
});

app.post('/api/outfit/suggest', (req, res) => {
  const { occasion } = req.body;
  res.json({ outfit: ['Shirt', 'Jeans', 'Shoes'], occasion });
});

app.listen(PORT, () => {
  console.log(`Personal Shopper running on port ${PORT}`);
});
