// Notifier AI - Port 4870
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4870;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notifier-ai', port: PORT });
});

app.post('/api/notify', (req, res) => {
  const { user, message } = req.body;
  res.json({ user, message, delivered: true, channel: 'push' });
});

app.listen(PORT, () => {
  console.log(`Notifier AI running on port ${PORT}`);
});
