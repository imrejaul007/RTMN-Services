// Voyagers AI - Port 4900
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4900;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'voyager-ai', port: PORT });
});

app.post('/api/voyage', (req, res) => {
  const { destination } = req.body;
  res.json({ destination, journey: 'Planned', milestones: ['M1', 'M2', 'M3'] });
});

app.listen(PORT, () => {
  console.log(`Voyager AI running on port ${PORT}`);
});
