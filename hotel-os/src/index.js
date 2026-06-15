import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5025;

// Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory data stores
const rooms = new Map();
const bookings = new Map();
const guests = new Map();
const services = new Map();
const invoices = new Map();
const amenities = new Map();

// Digital Twins
const twins = {
  room: { id: 'room-twin', status: 'active', rooms: [], occupancyRate: 0 },
  booking: { id: 'booking-twin', status: 'active', activeBookings: [] },
  guest: { id: 'guest-twin', status: 'active', guests: [] },
  service: { id: 'service-twin', status: 'active', activeServices: [] },
  revenue: { id: 'revenue-twin', status: 'active', today: 0 }
};

// Initialize sample data
function initializeSampleData() {
  // Sample rooms (50 rooms)
  const roomTypes = ['standard', 'deluxe', 'suite', 'presidential'];
  const floors = [1, 2, 3, 4, 5];
  let roomNum = 101;

  for (const floor of floors) {
    for (let i = 0; i < 10; i++) {
      const type = roomTypes[i < 6 ? 0 : i < 8 ? 1 : i < 9 ? 2 : 3];
      const price = type === 'standard' ? 99 : type === 'deluxe' ? 149 : type === 'suite' ? 249 : 499;
      const room = {
        id: `R${roomNum}`,
        number: roomNum,
        floor,
        type,
        price,
        capacity: type === 'standard' ? 2 : type === 'deluxe' ? 2 : type === 'suite' ? 4 : 6,
        amenities: ['wifi', 'tv', 'ac'],
        status: Math.random() > 0.7 ? 'occupied' : 'available',
        view: i % 2 === 0 ? 'city' : 'ocean'
      };
      rooms.set(room.id, room);
      roomNum++;
    }
  }

  // Sample services
  const sampleServices = [
    { id: 's1', name: 'Room Service', category: 'food', price: 15, available: true },
    { id: 's2', name: 'Spa Treatment', category: 'wellness', price: 80, available: true },
    { id: 's3', name: 'Gym Access', category: 'wellness', price: 25, available: true },
    { id: 's4', name: 'Airport Transfer', category: 'transport', price: 45, available: true },
    { id: 's5', name: 'Laundry', category: 'housekeeping', price: 20, available: true },
    { id: 's6', name: 'Restaurant', category: 'food', price: 0, available: true },
    { id: 's7', name: 'Bar', category: 'food', price: 0, available: true },
    { id: 's8', name: 'Concierge', category: 'service', price: 0, available: true }
  ];
  sampleServices.forEach(s => services.set(s.id, s));

  // Update twins
  twins.room.rooms = Array.from(rooms.values());
  updateOccupancy();

  logger.info('Hotel OS sample data initialized');
}

function updateOccupancy() {
  const allRooms = Array.from(rooms.values());
  const occupied = allRooms.filter(r => r.status === 'occupied').length;
  twins.room.occupancyRate = allRooms.length > 0 ? (occupied / allRooms.length * 100).toFixed(1) : 0;
}

initializeSampleData();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hotel-os', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ============= ROOM ENDPOINTS =============

// Get all rooms
app.get('/api/rooms', (req, res) => {
  const { status, type, floor, minPrice, maxPrice } = req.query;
  let allRooms = Array.from(rooms.values());

  if (status) allRooms = allRooms.filter(r => r.status === status);
  if (type) allRooms = allRooms.filter(r => r.type === type);
  if (floor) allRooms = allRooms.filter(r => r.floor === parseInt(floor));
  if (minPrice) allRooms = allRooms.filter(r => r.price >= parseFloat(minPrice));
  if (maxPrice) allRooms = allRooms.filter(r => r.price <= parseFloat(maxPrice));

  res.json({ success: true, count: allRooms.length, rooms: allRooms });
});

// Get room
app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
  res.json({ success: true, room });
});

// Create room
app.post('/api/rooms', (req, res) => {
  const { number, floor, type, price, capacity, amenities, view } = req.body;

  if (!number || !floor || !type) {
    return res.status(400).json({ success: false, error: 'Number, floor, and type required' });
  }

  const room = {
    id: `R${number}`,
    number: parseInt(number),
    floor: parseInt(floor),
    type: type || 'standard',
    price: price || 99,
    capacity: capacity || 2,
    amenities: amenities || [],
    view: view || 'city',
    status: 'available',
    createdAt: new Date().toISOString()
  };

  rooms.set(room.id, room);
  twins.room.rooms.push(room);
  updateOccupancy();

  logger.info(`Room created: ${room.id}`);
  res.status(201).json({ success: true, room });
});

// Update room
app.put('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

  const updated = { ...room, ...req.body, id: room.id, updatedAt: new Date().toISOString() };
  rooms.set(room.id, updated);

  const twinIndex = twins.room.rooms.findIndex(r => r.id === room.id);
  if (twinIndex >= 0) twins.room.rooms[twinIndex] = updated;

  res.json({ success: true, room: updated });
});

// Delete room
app.delete('/api/rooms/:id', (req, res) => {
  if (!rooms.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }
  rooms.delete(req.params.id);
  twins.room.rooms = twins.room.rooms.filter(r => r.id !== req.params.id);
  updateOccupancy();
  res.json({ success: true, message: 'Room deleted' });
});

// ============= BOOKING ENDPOINTS =============

// Create booking
app.post('/api/bookings', (req, res) => {
  const { roomId, guestId, checkIn, checkOut, guests, specialRequests, paymentMethod } = req.body;

  if (!roomId || !checkIn || !checkOut) {
    return res.status(400).json({ success: false, error: 'Room ID, check-in, and check-out dates required' });
  }

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

  // Check availability
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (checkInDate >= checkOutDate) {
    return res.status(400).json({ success: false, error: 'Check-out must be after check-in' });
  }

  const conflicting = Array.from(bookings.values()).find(b => {
    if (b.roomId !== roomId || b.status === 'cancelled') return false;
    const bIn = new Date(b.checkIn);
    const bOut = new Date(b.checkOut);
    return (checkInDate < bOut && checkOutDate > bIn);
  });

  if (conflicting) {
    return res.status(409).json({ success: false, error: 'Room not available for selected dates' });
  }

  // Calculate nights and total
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const subtotal = room.price * nights;
  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  const booking = {
    id: uuidv4(),
    bookingNumber: `BK-${Date.now().toString(36).toUpperCase()}`,
    roomId,
    guestId: guestId || null,
    guestCount: guests || 1,
    checkIn: checkInDate.toISOString(),
    checkOut: checkOutDate.toISOString(),
    nights,
    roomPrice: room.price,
    subtotal,
    tax,
    total,
    status: 'confirmed',
    specialRequests: specialRequests || '',
    paymentMethod: paymentMethod || 'credit_card',
    createdAt: new Date().toISOString()
  };

  bookings.set(booking.id, booking);
  twins.booking.activeBookings.push(booking);

  // Update room status
  room.status = 'occupied';
  rooms.set(room.id, room);

  logger.info(`Booking created: ${booking.bookingNumber}, Room ${roomId}, ${nights} nights, $${total.toFixed(2)}`);
  res.status(201).json({ success: true, booking });
});

// Get bookings
app.get('/api/bookings', (req, res) => {
  const { status, roomId, guestId, fromDate, toDate } = req.query;
  let allBookings = Array.from(bookings.values());

  if (status) allBookings = allBookings.filter(b => b.status === status);
  if (roomId) allBookings = allBookings.filter(b => b.roomId === roomId);
  if (guestId) allBookings = allBookings.filter(b => b.guestId === guestId);
  if (fromDate) allBookings = allBookings.filter(b => new Date(b.checkIn) >= new Date(fromDate));
  if (toDate) allBookings = allBookings.filter(b => new Date(b.checkOut) <= new Date(toDate));

  res.json({ success: true, count: allBookings.length, bookings: allBookings });
});

// Get booking
app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
  res.json({ success: true, booking });
});

// Update booking
app.put('/api/bookings/:id', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

  const { checkIn, checkOut, specialRequests, guestCount } = req.body;
  const updates = {};

  if (checkIn) updates.checkIn = new Date(checkIn).toISOString();
  if (checkOut) updates.checkOut = new Date(checkOut).toISOString();
  if (specialRequests) updates.specialRequests = specialRequests;
  if (guestCount) updates.guestCount = guestCount;

  const updated = { ...booking, ...updates, updatedAt: new Date().toISOString() };
  bookings.set(booking.id, updated);

  res.json({ success: true, booking: updated });
});

// Update booking status
app.patch('/api/bookings/:id/status', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

  const { status } = req.body;
  const validStatuses = ['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Valid: ${validStatuses.join(', ')}` });
  }

  booking.status = status;
  booking.updatedAt = new Date().toISOString();

  // Update room status
  if (status === 'checked-in') {
    rooms.get(booking.roomId).status = 'occupied';
  } else if (status === 'checked-out' || status === 'cancelled') {
    rooms.get(booking.roomId).status = 'available';
    twins.booking.activeBookings = twins.booking.activeBookings.filter(b => b.id !== booking.id);
  }

  logger.info(`Booking ${booking.bookingNumber} status: ${status}`);
  res.json({ success: true, booking });
});

// Cancel booking
app.delete('/api/bookings/:id', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();

  rooms.get(booking.roomId).status = 'available';
  twins.booking.activeBookings = twins.booking.activeBookings.filter(b => b.id !== booking.id);
  updateOccupancy();

  logger.info(`Booking cancelled: ${booking.bookingNumber}`);
  res.json({ success: true, booking });
});

// ============= GUEST ENDPOINTS =============

// Create guest
app.post('/api/guests', (req, res) => {
  const { name, email, phone, address, idType, idNumber, preferences } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  // Check for existing guest
  if (email) {
    const existing = Array.from(guests.values()).find(g => g.email === email);
    if (existing) {
      Object.assign(existing, req.body, { updatedAt: new Date().toISOString() });
      guests.set(existing.id, existing);
      return res.json({ success: true, guest: existing, isNew: false });
    }
  }

  const guest = {
    id: uuidv4(),
    name,
    email: email || null,
    phone: phone || null,
    address: address || {},
    idType: idType || null,
    idNumber: idNumber || null,
    preferences: preferences || {},
    loyaltyPoints: 0,
    tier: 'bronze',
    stayCount: 0,
    totalSpent: 0,
    notes: '',
    createdAt: new Date().toISOString()
  };

  guests.set(guest.id, guest);
  twins.guest.guests.push(guest);

  logger.info(`Guest registered: ${guest.name}`);
  res.status(201).json({ success: true, guest, isNew: true });
});

// Get guests
app.get('/api/guests', (req, res) => {
  const { tier, minStays } = req.query;
  let allGuests = Array.from(guests.values());

  if (tier) allGuests = allGuests.filter(g => g.tier === tier);
  if (minStays) allGuests = allGuests.filter(g => g.stayCount >= parseInt(minStays));

  res.json({ success: true, count: allGuests.length, guests: allGuests });
});

// Get guest
app.get('/api/guests/:id', (req, res) => {
  const guest = guests.get(req.params.id);
  if (!guest) return res.status(404).json({ success: false, error: 'Guest not found' });
  res.json({ success: true, guest });
});

// Update guest
app.put('/api/guests/:id', (req, res) => {
  const guest = guests.get(req.params.id);
  if (!guest) return res.status(404).json({ success: false, error: 'Guest not found' });

  const updated = { ...guest, ...req.body, id: guest.id, updatedAt: new Date().toISOString() };
  guests.set(guest.id, updated);

  const twinIndex = twins.guest.guests.findIndex(g => g.id === guest.id);
  if (twinIndex >= 0) twins.guest.guests[twinIndex] = updated;

  res.json({ success: true, guest: updated });
});

// Add loyalty points
app.post('/api/guests/:id/points', (req, res) => {
  const guest = guests.get(req.params.id);
  if (!guest) return res.status(404).json({ success: false, error: 'Guest not found' });

  const { points, amount } = req.body;
  const earned = amount ? Math.floor(amount * 10) : (points || 0);
  guest.loyaltyPoints += earned;
  guest.totalSpent += amount || 0;
  guest.stayCount++;

  // Update tier
  if (guest.loyaltyPoints >= 10000) guest.tier = 'platinum';
  else if (guest.loyaltyPoints >= 5000) guest.tier = 'gold';
  else if (guest.loyaltyPoints >= 1000) guest.tier = 'silver';

  guests.set(guest.id, guest);
  res.json({ success: true, guest });
});

// ============= SERVICES ENDPOINTS =============

// Get services
app.get('/api/services', (req, res) => {
  const { category, available } = req.query;
  let allServices = Array.from(services.values());

  if (category) allServices = allServices.filter(s => s.category === category);
  if (available !== undefined) allServices = allServices.filter(s => s.available === (available === 'true'));

  res.json({ success: true, services: allServices });
});

// Request service
app.post('/api/services/request', (req, res) => {
  const { serviceId, bookingId, roomId, quantity, notes } = req.body;

  const service = services.get(serviceId);
  if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
  if (!service.available) return res.status(400).json({ success: false, error: 'Service not available' });

  const request = {
    id: uuidv4(),
    serviceId,
    serviceName: service.name,
    bookingId: bookingId || null,
    roomId: roomId || null,
    quantity: quantity || 1,
    price: service.price,
    total: service.price * (quantity || 1),
    status: 'pending',
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  twins.service.activeServices.push(request);
  logger.info(`Service requested: ${service.name}`);
  res.status(201).json({ success: true, request });
});

// Get service requests
app.get('/api/services/requests', (req, res) => {
  const { status, roomId } = req.query;
  let requests = twins.service.activeServices;

  if (status) requests = requests.filter(r => r.status === status);
  if (roomId) requests = requests.filter(r => r.roomId === roomId);

  res.json({ success: true, requests });
});

// Update service request
app.patch('/api/services/requests/:id', (req, res) => {
  const request = twins.service.activeServices.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ success: false, error: 'Request not found' });

  const { status } = req.body;
  if (status) {
    request.status = status;
    if (status === 'completed' || status === 'cancelled') {
      twins.service.activeServices = twins.service.activeServices.filter(r => r.id !== request.id);
    }
  }

  res.json({ success: true, request });
});

// ============= INVOICE ENDPOINTS =============

// Create invoice
app.post('/api/invoices', (req, res) => {
  const { bookingId, items, paymentMethod } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Invoice items required' });
  }

  const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  const invoice = {
    id: uuidv4(),
    invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
    bookingId: bookingId || null,
    items,
    subtotal,
    tax,
    total,
    status: 'pending',
    paymentMethod: paymentMethod || 'credit_card',
    paidAt: null,
    createdAt: new Date().toISOString()
  };

  invoices.set(invoice.id, invoice);
  logger.info(`Invoice created: ${invoice.invoiceNumber}, $${total.toFixed(2)}`);
  res.status(201).json({ success: true, invoice });
});

// Get invoices
app.get('/api/invoices', (req, res) => {
  const { status, bookingId } = req.query;
  let allInvoices = Array.from(invoices.values());

  if (status) allInvoices = allInvoices.filter(i => i.status === status);
  if (bookingId) allInvoices = allInvoices.filter(i => i.bookingId === bookingId);

  res.json({ success: true, invoices: allInvoices });
});

// Get invoice
app.get('/api/invoices/:id', (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
  res.json({ success: true, invoice });
});

// Pay invoice
app.post('/api/invoices/:id/pay', (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

  invoice.status = 'paid';
  invoice.paidAt = new Date().toISOString();

  twins.revenue.today += invoice.total;

  logger.info(`Invoice paid: ${invoice.invoiceNumber}`);
  res.json({ success: true, invoice });
});

// ============= ANALYTICS =============

// Get analytics
app.get('/api/analytics', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = Array.from(bookings.values()).filter(b => b.createdAt.startsWith(today));
  const checkedIn = Array.from(bookings.values()).filter(b => b.status === 'checked-in');

  const totalRevenue = Array.from(invoices.values())
    .filter(i => i.paidAt && i.paidAt.startsWith(today))
    .reduce((sum, i) => sum + i.total, 0);

  const occupancy = Array.from(rooms.values()).filter(r => r.status === 'occupied').length;

  res.json({
    success: true,
    analytics: {
      date: today,
      rooms: { total: rooms.size, occupied: occupancy, available: rooms.size - occupancy, occupancyRate: `${((occupancy / rooms.size) * 100).toFixed(1)}%` },
      bookings: { today: todayBookings.length, active: checkedIn.length },
      revenue: { today: totalRevenue.toFixed(2), perRoom: (totalRevenue / Math.max(1, occupancy)).toFixed(2) },
      services: { active: twins.service.activeServices.length },
      guests: { total: guests.size, vip: guests.size }
    }
  });
});

// ============= DIGITAL TWINS =============

// Get all twins
app.get('/api/twins', (req, res) => {
  res.json({ success: true, twins });
});

// Get specific twin
app.get('/api/twins/:name', (req, res) => {
  const twin = twins[req.params.name];
  if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });
  res.json({ success: true, twin });
});

// Sync twins
app.post('/api/twins/sync', (req, res) => {
  twins.room.rooms = Array.from(rooms.values());
  twins.booking.activeBookings = Array.from(bookings.values()).filter(b => !['completed', 'cancelled'].includes(b.status));
  twins.guest.guests = Array.from(guests.values());
  updateOccupancy();

  logger.info('Hotel twins synchronized');
  res.json({ success: true, twins });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🏨 Hotel OS running on port ${PORT}`);
});

export default app;
