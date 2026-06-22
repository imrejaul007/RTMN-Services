// Advisor AI - Port 4858
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4858;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'advisor-ai', port: PORT });
});

app.post('/api/advice', (req, res) => {
  const { topic } = req.body;
  res.json({ topic, advice: ['Focus on fundamentals', 'Track metrics', 'Iterate quickly'] });
});

app.listen(PORT, () => {
  console.log(`Advisor AI running on port ${PORT}`);
});
