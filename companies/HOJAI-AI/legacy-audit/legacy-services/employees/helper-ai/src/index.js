// Helper AI - Port 4874
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4874;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'helper-ai', port: PORT });
});

app.post('/api/help', (req, res) => {
  const { request } = req.body;
  res.json({ request, solution: 'Here\'s how to solve it...', steps: ['Step 1', 'Step 2'] });
});

app.listen(PORT, () => {
  console.log(`Helper AI running on port ${PORT}`);
});
