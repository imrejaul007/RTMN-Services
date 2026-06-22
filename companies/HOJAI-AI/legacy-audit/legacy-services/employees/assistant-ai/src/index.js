// Assistant AI - Port 4873
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4873;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'assistant-ai', port: PORT });
});

app.post('/api/help', (req, res) => {
  const { task } = req.body;
  res.json({ task, help: ['Option A', 'Option B'], status: 'ready' });
});

app.listen(PORT, () => {
  console.log(`Assistant AI running on port ${PORT}`);
});
