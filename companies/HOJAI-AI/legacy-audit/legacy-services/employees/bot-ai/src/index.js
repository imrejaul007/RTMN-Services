// Bot AI - Port 4872
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4872;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'bot-ai', port: PORT });
});

app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  res.json({ message, response: 'Understood. Processing...', next_steps: ['Step 1', 'Step 2'] });
});

app.listen(PORT, () => {
  console.log(`Bot AI running on port ${PORT}`);
});
