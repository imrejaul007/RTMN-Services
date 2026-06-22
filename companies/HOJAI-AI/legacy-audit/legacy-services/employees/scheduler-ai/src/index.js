// Scheduler AI - Port 4866
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4866;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'scheduler-ai', port: PORT });
});

app.post('/api/schedule', (req, res) => {
  const { tasks } = req.body;
  res.json({ schedule: tasks, optimized: true });
});

app.listen(PORT, () => {
  console.log(`Scheduler AI running on port ${PORT}`);
});
