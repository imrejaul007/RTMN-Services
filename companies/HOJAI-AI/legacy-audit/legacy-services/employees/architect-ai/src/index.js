// Architect AI - Port 4863
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4863;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'architect-ai', port: PORT });
});

app.post('/api/design', (req, res) => {
  const { system } = req.body;
  res.json({ system, architecture: ['Component A', 'Component B'], tech_stack: ['Node.js', 'React'] });
});

app.listen(PORT, () => {
  console.log(`Architect AI running on port ${PORT}`);
});
