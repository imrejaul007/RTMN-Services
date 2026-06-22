// IT Support Agent AI - Port 4816
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4816;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'it-support-agent', port: PORT });
});

app.post('/api/tickets/create', (req, res) => {
  const { issue, priority } = req.body;
  res.json({ ticketId: `IT-${Date.now()}`, issue, priority, status: 'open' });
});

app.post('/api/tickets/resolve', (req, res) => {
  const { ticketId } = req.body;
  res.json({ ticketId, resolution: 'Password reset completed', status: 'resolved' });
});

app.listen(PORT, () => {
  console.log(`IT Support Agent running on port ${PORT}`);
});
