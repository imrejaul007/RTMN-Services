// Coordinator AI - Port 4861
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4861;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'coordinator-ai', port: PORT });
});

app.post('/api/coordinate', (req, res) => {
  const { event } = req.body;
  res.json({ event, assigned: ['Team A', 'Team B'], timeline: '2 weeks' });
});

app.listen(PORT, () => {
  console.log(`Coordinator AI running on port ${PORT}`);
});
