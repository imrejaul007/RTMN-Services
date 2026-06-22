// Monitor AI - Port 4869
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4869;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'monitor-ai', port: PORT });
});

app.post('/api/monitor', (req, res) => {
  const { metric } = req.body;
  res.json({ metric, status: 'healthy', alerts: [] });
});

app.listen(PORT, () => {
  console.log(`Monitor AI running on port ${PORT}`);
});
