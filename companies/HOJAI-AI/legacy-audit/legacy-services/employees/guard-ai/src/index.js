// Guard AI - Port 4879
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4879;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'guard-ai', port: PORT });
});

app.post('/api/guard', (req, res) => {
  const { asset } = req.body;
  res.json({ asset, protected: true, status: 'secure' });
});

app.listen(PORT, () => {
  console.log(`Guard AI running on port ${PORT}`);
});
