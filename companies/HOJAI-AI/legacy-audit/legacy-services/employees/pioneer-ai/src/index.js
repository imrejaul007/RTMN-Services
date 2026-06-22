// Pioneer AI - Port 4897
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4897;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'pioneer-ai', port: PORT });
});

app.post('/api/pioneer', (req, res) => {
  const { frontier } = req.body;
  res.json({ frontier, explored: true, discoveries: ['Discovery 1', 'Discovery 2'] });
});

app.listen(PORT, () => {
  console.log(`Pioneer AI running on port ${PORT}`);
});
