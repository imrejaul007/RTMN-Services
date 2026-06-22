// Watcher AI - Port 4881
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4881;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'watcher-ai', port: PORT });
});

app.post('/api/watch', (req, res) => {
  const { target } = req.body;
  res.json({ target, watching: true, alerts: [] });
});

app.listen(PORT, () => {
  console.log(`Watcher AI running on port ${PORT}`);
});
