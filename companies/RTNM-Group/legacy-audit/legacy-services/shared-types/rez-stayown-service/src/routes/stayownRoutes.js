/**
 * StayOwn Hotel Service for CorpPerks
 * Integration with StayOwn (Hotel OTA + PMS) for corporate hotel bookings.
 * StayOwn is ReZ's own hotel platform.
 */

const express = require('express');
const router = express.Router();

// Simple auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

const requireAdminAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// Demo properties
const DEMO_PROPERTIES = [
  {
    propertyId: 'P001',
    name: 'The Grand Mumbai',
    description: 'Luxury hotel in the heart of Mumbai',
    address: { line1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra' },
    starRating: 5,
    userRating: 4.5,
    reviewCount: 2341,
    amenities: ['Free WiFi', 'Pool', 'Spa', 'Gym'],
    rooms: [
      { roomId: 'R001', roomType: 'Deluxe', name: 'Deluxe Room', bedType: 'King', baseRate: 5500, corporateRate: 4500, discount: 18, available: true },
      { roomId: 'R002', roomType: 'Suite', name: 'Executive Suite', bedType: 'King', baseRate: 8500, corporateRate: 7200, discount: 15, available: true },
    ],
    gstInfo: { hsnCode: '9963', taxRate: 12 },
  },
  {
    propertyId: 'P002',
    name: 'ITC Gardenia Bangalore',
    description: 'Premium business hotel',
    address: { line1: 'MG Road', city: 'Bangalore', state: 'Karnataka' },
    starRating: 5,
    userRating: 4.6,
    reviewCount: 1892,
    amenities: ['Free WiFi', 'Business Center', 'Gym'],
    rooms: [
      { roomId: 'R003', roomType: 'Executive', name: 'Executive Room', bedType: 'Queen', baseRate: 7500, corporateRate: 6500, discount: 13, available: true },
    ],
    gstInfo: { hsnCode: '9963', taxRate: 12 },
  },
];

// In-memory bookings
const bookingsStore = [];

// GET /api/hotels/search
router.get('/search', requireAuth, (req, res) => {
  const { city, checkIn, checkOut, guests } = req.query;
  let properties = DEMO_PROPERTIES;
  
  if (city) {
    properties = properties.filter(p => 
      p.address.city.toLowerCase().includes(city.toLowerCase())
    );
  }
  
  res.json({ success: true, data: properties });
});

// GET /api/hotels/:propertyId
router.get('/:propertyId', requireAuth, (req, res) => {
  const { propertyId } = req.params;
  const property = DEMO_PROPERTIES.find(p => p.propertyId === propertyId);
  
  if (!property) {
    return res.status(404).json({ success: false, message: 'Property not found' });
  }
  
  res.json({ success: true, data: property });
});

// GET /api/hotels/:propertyId/availability
router.get('/:propertyId/availability', requireAuth, (req, res) => {
  const { propertyId } = req.params;
  const property = DEMO_PROPERTIES.find(p => p.propertyId === propertyId);
  
  if (!property) {
    return res.status(404).json({ success: false, message: 'Property not found' });
  }
  
  res.json({ success: true, data: property.rooms.filter(r => r.available) });
});

// POST /api/hotels/bookings
router.post('/bookings', requireAuth, (req, res) => {
  const { propertyId, roomId, checkIn, checkOut, guests, guestDetails } = req.body;
  
  const property = DEMO_PROPERTIES.find(p => p.propertyId === propertyId);
  if (!property) {
    return res.status(404).json({ success: false, message: 'Property not found' });
  }
  
  const room = property.rooms.find(r => r.roomId === roomId);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }
  
  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  const subtotal = room.corporateRate * nights;
  const gstAmount = Math.round(subtotal * 0.12);
  const totalAmount = subtotal + gstAmount;
  
  const booking = {
    bookingId: `HB${Date.now()}`,
    confirmationNumber: `MCB${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    status: 'confirmed',
    property: { propertyId, name: property.name, address: `${property.address.line1}, ${property.address.city}` },
    room: { roomId, name: room.name, bedType: room.bedType },
    guest: guestDetails?.[0] || { firstName: 'Guest', lastName: 'User' },
    dates: { checkIn, checkOut, nights },
    pricing: { roomRate: room.corporateRate, numberOfRooms: 1, subtotal, gstAmount, totalAmount, currency: 'INR' },
    createdAt: new Date().toISOString(),
  };
  
  bookingsStore.push(booking);
  
  res.status(201).json({ success: true, data: booking });
});

// GET /api/hotels/bookings
router.get('/bookings', requireAuth, (req, res) => {
  res.json({ success: true, data: bookingsStore });
});

// GET /api/hotels/bookings/:bookingId
router.get('/bookings/:bookingId', requireAuth, (req, res) => {
  const { bookingId } = req.params;
  const booking = bookingsStore.find(b => b.bookingId === bookingId);
  
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }
  
  res.json({ success: true, data: booking });
});

// POST /api/hotels/bookings/:bookingId/cancel
router.post('/bookings/:bookingId/cancel', requireAuth, (req, res) => {
  const { bookingId } = req.params;
  const booking = bookingsStore.find(b => b.bookingId === bookingId);
  
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }
  
  booking.status = 'cancelled';
  res.json({ success: true, data: booking });
});

// POST /api/hotels/pricing/calculate
router.post('/pricing/calculate', requireAuth, (req, res) => {
  const { propertyId, roomId, checkIn, checkOut } = req.body;
  
  const property = DEMO_PROPERTIES.find(p => p.propertyId === propertyId);
  if (!property) {
    return res.status(404).json({ success: false, message: 'Property not found' });
  }
  
  const room = property.rooms.find(r => r.roomId === roomId);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }
  
  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  const subtotal = room.corporateRate * nights;
  const taxableAmount = Math.round(subtotal / 1.12);
  const cgstAmount = Math.round(taxableAmount * 0.06);
  const sgstAmount = cgstAmount;
  
  res.json({
    success: true,
    data: {
      baseRate: room.baseRate,
      corporateRate: room.corporateRate,
      nights,
      subtotal,
      corporateDiscount: room.discount,
      taxableAmount,
      cgstRate: 6,
      cgstAmount,
      sgstRate: 6,
      sgstAmount,
      totalTax: cgstAmount + sgstAmount,
      totalAmount: subtotal,
      itcEligible: true,
    },
  });
});

module.exports = router;
