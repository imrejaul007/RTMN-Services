/**
 * Hotel Services
 * Port: 4771
 * Booking Engine, Channel Manager, Revenue Management
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4771;

const rooms = new Map();
const bookings = new Map();
const channels = new Map();

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'hotel-services' }));

// Rooms
app.get('/api/rooms', (req, res) => {
  const { type, available } = req.query;
  let results = Array.from(rooms.values());
  if (type) results = results.filter(r => r.type === type);
  if (available) results = results.filter(r => r.status === 'available');
  res.json({ success: true, count: results.length, rooms: results });
});

app.post('/api/rooms', (req, res) => {
  const room = { id: uuidv4(), ...req.body, status: 'available' };
  rooms.set(room.id, room);
  res.status(201).json({ success: true, room });
});

// Bookings
app.post('/api/bookings', (req, res) => {
  const { roomId, guest, checkin, checkout, guests } = req.body;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const booking = { id: uuidv4(), roomId, guest, checkin, checkout, guests, status: 'confirmed', confirmationNo: `HT${Date.now()}` };
  room.status = 'booked';
  rooms.set(roomId, room);
  bookings.set(booking.id, booking);
  res.status(201).json({ success: true, booking });
});

app.get('/api/bookings', (req, res) => res.json({ success: true, bookings: Array.from(bookings.values()) }));
app.get('/api/bookings/:id', (req, res) => {
  const b = bookings.get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  res.json({ success: true, booking: b });
});

// Channel Manager
app.get('/api/channels', (_, res) => res.json({ success: true, channels: Array.from(channels.values()) }));
app.post('/api/channels', (req, res) => {
  const ch = { id: uuidv4(), ...req.body, status: 'connected' };
  channels.set(ch.id, ch);
  res.status(201).json({ success: true, channel: ch });
});

app.listen(PORT, () => console.log(`\n🏨 Hotel Services — PORT ${PORT}\n`));
export default app;
