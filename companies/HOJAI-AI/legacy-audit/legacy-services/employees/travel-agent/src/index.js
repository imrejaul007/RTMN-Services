// Travel Agent AI - Port 4803
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4803;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'travel-agent', port: PORT });
});

app.post('/api/flights/search', (req, res) => {
  const { from, to, date } = req.body;
  res.json({ flights: [{ id: 'f1', price: 8500, airline: 'Air India', time: '10:00 AM' }] });
});

app.post('/api/hotels/search', (req, res) => {
  const { city, checkin } = req.body;
  res.json({ hotels: [{ id: 'h1', name: 'Grand Hotel', price: 4500, rating: 4.5 }] });
});

app.post('/api/book', (req, res) => {
  const { type, id } = req.body;
  res.json({ bookingId: `bk_${Date.now()}`, status: 'confirmed' });
});

app.listen(PORT, () => {
  console.log(`Travel Agent running on port ${PORT}`);
});
