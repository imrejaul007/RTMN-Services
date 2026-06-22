// Explorer AI - Port 4899
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4899;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'explorer-ai', port: PORT });
});

app.post('/api/explore', (req, res) => {
  const { territory } = req.body;
  res.json({ territory, explored: true, map: 'Generated' });
});

app.listen(PORT, () => {
  console.log(`Explorer AI running on port ${PORT}`);
});
