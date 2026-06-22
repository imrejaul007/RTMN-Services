// Host AI - Port 4819
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4819;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'host-ai', port: PORT });
});

app.post('/api/guests/welcome', (req, res) => {
  const { name } = req.body;
  res.json({ greeting: `Welcome, ${name}!`, table: 5, waiter: 'assigned' });
});

app.post('/api/seating/optimize', (req, res) => {
  res.json({ suggestions: ['2-top near window', '4-top by garden'], efficiency: '+15%' });
});

app.listen(PORT, () => {
  console.log(`Host AI running on port ${PORT}`);
});
