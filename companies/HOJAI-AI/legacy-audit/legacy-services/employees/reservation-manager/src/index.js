// Reservation Manager AI - Port 4822
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4822;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'reservation-manager', port: PORT });
});

app.post('/api/reserve', (req, res) => {
  const { date, time, guests, name } = req.body;
  res.json({ bookingId: `RSV-${Date.now()}`, date, time, guests, name, status: 'confirmed' });
});

app.post('/api/modify', (req, res) => {
  const { bookingId, changes } = req.body;
  res.json({ bookingId, changes, status: 'updated' });
});

app.listen(PORT, () => {
  console.log(`Reservation Manager running on port ${PORT}`);
});
