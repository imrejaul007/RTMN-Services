// Controller AI - Port 4876
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4876;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'controller-ai', port: PORT });
});

app.post('/api/control', (req, res) => {
  const { system } = req.body;
  res.json({ system, controlled: true, status: 'optimal' });
});

app.listen(PORT, () => {
  console.log(`Controller AI running on port ${PORT}`);
});
