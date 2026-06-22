// Scheduling Agent AI - Port 4823
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4823;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'scheduling-agent', port: PORT });
});

app.post('/api/schedule/find', (req, res) => {
  const { attendees, duration } = req.body;
  res.json({ slots: ['10 AM', '2 PM', '4 PM'], best: '2 PM' });
});

app.post('/api/meeting/create', (req, res) => {
  const { slot, attendees } = req.body;
  res.json({ meetingId: `MTG-${Date.now()}`, slot, attendees, status: 'scheduled' });
});

app.listen(PORT, () => {
  console.log(`Scheduling Agent running on port ${PORT}`);
});
