// Concierge AI - Port 4791
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4791;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'concierge-ai', port: PORT });
});

app.post('/api/guest/request', (req, res) => {
  const { guestId, request } = req.body;
  res.json({ guestId, request, status: 'processing', assignedTo: 'Room Service' });
});

app.post('/api/room/service', (req, res) => {
  const { guestId, service } = req.body;
  res.json({ guestId, service, eta: '15 minutes' });
});

app.listen(PORT, () => {
  console.log(`Concierge AI running on port ${PORT}`);
});
