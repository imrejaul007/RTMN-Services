/**
 * StayOwn Direct Booking Engine
 *
 * Commission-free direct booking widget with AI upselling
 *
 * Features:
 * - Real-time availability search
 * - Dynamic pricing with AI
 * - Promo codes & packages
 * - Upsell engine
 * - WhatsApp/Email confirmations
 *
 * Port: 6010
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 6010;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// DATA STORES
// ============================================

// Property configurations
const properties = new Map();

// Room availability & rates
const availability = new Map();

// Bookings from direct channel
const bookings = new Map();

// Promo codes
const promoCodes = new Map();

// Packages
const packages = new Map();

// Upsell offers
const upsellOffers = new Map();

// Payment intents
const paymentIntents = new Map();

// Email/WhatsApp templates
const notificationTemplates = new Map();

// Analytics
const analytics = new Map();

// ============================================
// AUTHENTICATION
// ============================================

const authUsers = new Map();
const authSessions = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password, propertyName, website, contact } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }

  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash: hashPassword(password),
    role: 'booking_admin',
    createdAt: new Date().toISOString()
  };

  authUsers.set(email, user);

  // Initialize property
  properties.set(businessId, {
    id: businessId,
    name: propertyName || 'My Hotel',
    website,
    contact,
    settings: {
      currency: 'USD',
      timezone: 'UTC',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      minAdvanceBooking: 0,
      maxAdvanceBooking: 365,
      cancellationPolicy: 'flexible',
      confirmInstantly: true
    },
    branding: {
      logo: null,
      primaryColor: '#2563EB',
      secondaryColor: '#1E40AF'
    },
    widgets: [],
    active: true,
    createdAt: new Date().toISOString()
  });

  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, role: user.role });
  res.json({ token, user: { id: user.id, email, propertyId: businessId } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId: user.businessId, role: user.role });
  res.json({ token, user: { id: user.id, email, propertyId: user.businessId } });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============================================
// PUBLIC API (For Booking Widget)
// ============================================

// Search availability
app.get('/api/public/availability', (req, res) => {
  const { propertyId, checkIn, checkOut, adults = 1, children = 0, rooms = 1 } = req.query;

  if (!propertyId || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'propertyId, checkIn, checkOut required' });
  }

  const property = properties.get(propertyId);
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }

  // Get room types with availability
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

  // Simulate availability check
  // In production, this would call Hotel OS API
  const roomTypes = [
    {
      id: 'rt_standard',
      name: 'Standard Room',
      maxOccupancy: 2,
      baseRate: 150,
      available: 5,
      images: ['/images/standard-1.jpg'],
      amenities: ['WiFi', 'TV', 'AC']
    },
    {
      id: 'rt_deluxe',
      name: 'Deluxe Room',
      maxOccupancy: 2,
      baseRate: 250,
      available: 3,
      images: ['/images/deluxe-1.jpg'],
      amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Balcony']
    },
    {
      id: 'rt_suite',
      name: 'Junior Suite',
      maxOccupancy: 3,
      baseRate: 400,
      available: 2,
      images: ['/images/suite-1.jpg'],
      amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Living Area', 'Bathtub']
    }
  ];

  // Filter by occupancy
  const filteredRooms = roomTypes.filter(r =>
    r.maxOccupancy >= parseInt(adults) + parseInt(children)
  );

  // Calculate total price
  const roomsWithPricing = filteredRooms.map(r => ({
    ...r,
    totalPrice: r.baseRate * nights * parseInt(rooms),
    nightlyRate: r.baseRate,
    nights,
    tax: Math.round(r.baseRate * nights * 0.1),
    totalWithTax: Math.round(r.baseRate * nights * 1.1 * parseInt(rooms))
  }));

  res.json({
    property: {
      id: property.id,
      name: property.name
    },
    search: { checkIn, checkOut, nights, adults, children, rooms },
    rooms: roomsWithPricing,
    checkInTime: property.settings.checkInTime,
    checkOutTime: property.settings.checkOutTime
  });
});

// Get room details
app.get('/api/public/room/:roomTypeId', (req, res) => {
  const { roomTypeId } = req.params;
  const { propertyId } = req.query;

  const roomDetails = {
    rt_standard: {
      id: 'rt_standard',
      name: 'Standard Room',
      description: 'Comfortable room with all essential amenities for a pleasant stay.',
      size: 25,
      maxOccupancy: 2,
      bedType: 'Queen',
      view: 'City',
      floor: '2-5',
      amenities: ['WiFi', 'TV', 'AC', 'Safe', 'Mini Fridge'],
      images: ['/images/standard-1.jpg', '/images/standard-2.jpg'],
      baseRate: 150
    },
    rt_deluxe: {
      id: 'rt_deluxe',
      name: 'Deluxe Room',
      description: 'Spacious room with premium amenities and beautiful views.',
      size: 35,
      maxOccupancy: 2,
      bedType: 'King',
      view: 'City/Park',
      floor: '4-5',
      amenities: ['WiFi', 'TV', 'AC', 'Safe', 'Mini Bar', 'Balcony', 'Coffee Maker'],
      images: ['/images/deluxe-1.jpg', '/images/deluxe-2.jpg'],
      baseRate: 250
    },
    rt_suite: {
      id: 'rt_suite',
      name: 'Junior Suite',
      description: 'Luxurious suite with separate living area and premium amenities.',
      size: 50,
      maxOccupancy: 3,
      bedType: 'King',
      view: 'Panoramic',
      floor: '5',
      amenities: ['WiFi', 'Smart TV', 'AC', 'Safe', 'Minibar', 'Living Room', 'Bathtub', 'Bathrobes', 'Butler Service'],
      images: ['/images/suite-1.jpg', '/images/suite-2.jpg'],
      baseRate: 400
    }
  };

  const room = roomDetails[roomTypeId];
  if (!room) {
    return res.status(404).json({ error: 'Room type not found' });
  }

  res.json({ ...room, propertyId });
});

// Validate promo code
app.post('/api/public/promo/validate', (req, res) => {
  const { code, propertyId, amount } = req.body;

  const promo = promoCodes.get(`${propertyId}_${code.toUpperCase()}`);

  if (!promo) {
    return res.status(404).json({ valid: false, error: 'Invalid promo code' });
  }

  const now = new Date();
  if (new Date(promo.validFrom) > now || new Date(promo.validUntil) < now) {
    return res.status(400).json({ valid: false, error: 'Promo code expired' });
  }

  if (promo.usageLimit && promo.used >= promo.usageLimit) {
    return res.status(400).json({ valid: false, error: 'Promo code limit reached' });
  }

  let discount = 0;
  if (promo.type === 'percentage') {
    discount = Math.round(amount * (promo.value / 100));
  } else {
    discount = promo.value;
  }

  if (promo.maxDiscount) {
    discount = Math.min(discount, promo.maxDiscount);
  }

  res.json({
    valid: true,
    promo: {
      code: promo.code,
      type: promo.type,
      description: promo.description
    },
    discount,
    newAmount: amount - discount
  });
});

// Get available packages
app.get('/api/public/packages', (req, res) => {
  const { propertyId, checkIn, checkOut } = req.query;

  const propertyPackages = Array.from(packages.values())
    .filter(p => p.propertyId === propertyId && p.active);

  // Filter by dates if provided
  const filtered = propertyPackages.filter(p => {
    if (!checkIn || !checkOut) return true;
    return new Date(p.availableFrom) <= new Date(checkIn) &&
           new Date(p.availableTo) >= new Date(checkOut);
  });

  res.json({ packages: filtered });
});

// Create booking (public)
app.post('/api/public/bookings', (req, res) => {
  const { propertyId, roomTypeId, roomId, checkIn, checkOut, guest, rooms, extras, promoCode, paymentMethod } = req.body;

  if (!propertyId || !roomTypeId || !checkIn || !checkOut || !guest) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!guest.name || !guest.email || !guest.phone) {
    return res.status(400).json({ error: 'Guest name, email, phone required' });
  }

  const property = properties.get(propertyId);
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

  // Calculate base price
  const roomRates = { rt_standard: 150, rt_deluxe: 250, rt_suite: 400 };
  const baseRate = roomRates[roomTypeId] || 150;
  let subtotal = baseRate * nights * (rooms || 1);

  // Apply promo code
  let discount = 0;
  let promo = null;
  if (promoCode) {
    promo = promoCodes.get(`${propertyId}_${promoCode.toUpperCase()}`);
    if (promo && new Date(promo.validFrom) <= new Date() && new Date(promo.validUntil) >= new Date()) {
      if (promo.type === 'percentage') {
        discount = Math.round(subtotal * (promo.value / 100));
      } else {
        discount = promo.value;
      }
      discount = promo.maxDiscount ? Math.min(discount, promo.maxDiscount) : discount;
      promo.used++;
    }
  }

  // Calculate extras
  const extraCharges = (extras || []).reduce((sum, extra) => sum + (extra.price * extra.quantity || extra.price), 0);

  const total = subtotal - discount + extraCharges;
  const tax = Math.round(total * 0.1);
  const grandTotal = total + tax;

  // Create booking
  const bookingId = 'book_direct_' + Date.now();
  const confirmationNumber = 'STY' + Math.random().toString(36).substr(2, 8).toUpperCase();

  const booking = {
    id: bookingId,
    confirmationNumber,
    propertyId,
    propertyName: property.name,
    roomTypeId,
    roomId,
    checkIn,
    checkOut,
    nights,
    guest: {
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      nationality: guest.nationality,
      arrivalTime: guest.arrivalTime,
      specialRequests: guest.specialRequests
    },
    rooms: rooms || 1,
    extras,
    pricing: {
      baseRate,
      subtotal,
      discount,
      extraCharges,
      tax,
      total: grandTotal,
      currency: property.settings.currency
    },
    promoCode: promoCode || null,
    paymentStatus: paymentMethod === 'pay_later' ? 'pending' : 'pending_payment',
    bookingStatus: 'pending_confirmation',
    source: 'direct',
    createdAt: new Date().toISOString()
  };

  bookings.set(bookingId, booking);

  // Create payment intent
  if (paymentMethod && paymentMethod !== 'pay_later') {
    const intentId = 'pi_' + Date.now();
    paymentIntents.set(intentId, {
      id: intentId,
      bookingId,
      amount: grandTotal,
      currency: property.settings.currency,
      status: 'pending',
      paymentMethod,
      clientSecret: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date().toISOString()
    });
    booking.paymentIntentId = intentId;
    bookings.set(bookingId, booking);
  }

  // Track analytics
  trackAnalytics(propertyId, 'booking_started', { roomTypeId, nights, total: grandTotal });

  res.status(201).json({
    bookingId,
    confirmationNumber,
    status: booking.bookingStatus,
    pricing: booking.pricing,
    paymentIntent: booking.paymentIntentId ? {
      id: booking.paymentIntentId,
      clientSecret: paymentIntents.get(booking.paymentIntentId)?.clientSecret
    } : null
  });
});

// Get booking status
app.get('/api/public/bookings/:bookingId', (req, res) => {
  const booking = bookings.get(req.params.bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  res.json(booking);
});

// Get upsell offers for booking
app.get('/api/public/bookings/:bookingId/upsells', (req, res) => {
  const booking = bookings.get(req.params.bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // Get relevant upsell offers
  const offers = Array.from(upsellOffers.values())
    .filter(o => o.propertyId === booking.propertyId && o.active)
    .filter(o => !o.roomTypeId || o.roomTypeId === booking.roomTypeId)
    .filter(o => !o.minNights || o.minNights <= booking.nights);

  // Add AI-generated personalization
  const personalizedOffers = offers.map(o => ({
    ...o,
    aiScore: Math.random() * 0.4 + 0.6, // Simulated AI relevance score
    aiReason: generateUpsellReason(o, booking)
  }));

  // Sort by AI score
  personalizedOffers.sort((a, b) => b.aiScore - a.aiScore);

  res.json({
    bookingId: booking.id,
    offers: personalizedOffers.slice(0, 5)
  });
});

// Add upsell to booking
app.post('/api/public/bookings/:bookingId/upsells', (req, res) => {
  const { offerId } = req.body;
  const booking = bookings.get(req.params.bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const offer = upsellOffers.get(offerId);
  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  // Add to booking extras
  booking.extras = booking.extras || [];
  booking.extras.push({
    type: offer.type,
    name: offer.name,
    price: offer.price,
    quantity: 1
  });

  // Recalculate total
  booking.pricing.extraCharges = booking.extras.reduce((sum, e) => sum + (e.price * (e.quantity || 1)), 0);
  booking.pricing.total = booking.pricing.subtotal - booking.pricing.discount + booking.pricing.extraCharges + booking.pricing.tax;
  bookings.set(booking.id, booking);

  trackAnalytics(booking.propertyId, 'upsell_added', { offerId, price: offer.price });

  res.json({ success: true, booking });
});

// ============================================
// ADMIN API
// ============================================

// Get all bookings
app.get('/api/bookings', requireAuth, (req, res) => {
  const { status, fromDate, toDate, source } = req.query;
  const businessId = req.session.businessId;

  let bookingList = Array.from(bookings.values())
    .filter(b => b.propertyId === businessId);

  if (status) bookingList = bookingList.filter(b => b.bookingStatus === status);
  if (source) bookingList = bookingList.filter(b => b.source === source);
  if (fromDate) bookingList = bookingList.filter(b => b.checkIn >= fromDate);
  if (toDate) bookingList = bookingList.filter(b => b.checkOut <= toDate);

  bookingList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ bookings: bookingList, count: bookingList.length });
});

// Get booking details
app.get('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  res.json(booking);
});

// Confirm booking
app.post('/api/bookings/:id/confirm', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  booking.bookingStatus = 'confirmed';
  booking.confirmedAt = new Date().toISOString();
  bookings.set(booking.id, booking);

  trackAnalytics(booking.propertyId, 'booking_confirmed', { total: booking.pricing.total });

  res.json({ success: true, booking });
});

// Cancel booking
app.post('/api/bookings/:id/cancel', requireAuth, (req, res) => {
  const { reason } = req.body;
  const booking = bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  booking.bookingStatus = 'cancelled';
  booking.cancelledAt = new Date().toISOString();
  booking.cancellationReason = reason;
  bookings.set(booking.id, booking);

  // Release promo code usage
  if (booking.promoCode) {
    const promo = promoCodes.get(`${booking.propertyId}_${booking.promoCode}`);
    if (promo) {
      promo.used = Math.max(0, promo.used - 1);
    }
  }

  trackAnalytics(booking.propertyId, 'booking_cancelled', { reason });

  res.json({ success: true, booking });
});

// ============================================
// PROMO CODES
// ============================================

app.get('/api/promo-codes', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const promos = Array.from(promoCodes.values())
    .filter(p => p.propertyId === businessId);
  res.json({ promoCodes: promos });
});

app.post('/api/promo-codes', requireAuth, (req, res) => {
  const { code, type, value, description, validFrom, validUntil, usageLimit, maxDiscount, roomTypeIds } = req.body;

  if (!code || !type || !value) {
    return res.status(400).json({ error: 'code, type, value required' });
  }

  const businessId = req.session.businessId;
  const promoId = `${businessId}_${code.toUpperCase()}`;

  const promo = {
    id: promoId,
    propertyId: businessId,
    code: code.toUpperCase(),
    type, // 'percentage' or 'fixed'
    value,
    description: description || '',
    validFrom: validFrom || new Date().toISOString(),
    validUntil: validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    usageLimit,
    used: 0,
    maxDiscount,
    roomTypeIds,
    active: true,
    createdAt: new Date().toISOString()
  };

  promoCodes.set(promoId, promo);
  res.status(201).json(promo);
});

app.patch('/api/promo-codes/:id', requireAuth, (req, res) => {
  const promo = promoCodes.get(req.params.id);
  if (!promo) {
    return res.status(404).json({ error: 'Promo code not found' });
  }
  Object.assign(promo, req.body);
  promoCodes.set(promo.id, promo);
  res.json(promo);
});

// ============================================
// PACKAGES
// ============================================

app.get('/api/packages', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const packageList = Array.from(packages.values())
    .filter(p => p.propertyId === businessId);
  res.json({ packages: packageList });
});

app.post('/api/packages', requireAuth, (req, res) => {
  const { name, description, price, inclusions, validity, roomTypeIds, availableFrom, availableTo } = req.body;

  const businessId = req.session.businessId;
  const packageId = 'pkg_' + Date.now();

  const pkg = {
    id: packageId,
    propertyId: businessId,
    name,
    description,
    price,
    inclusions: inclusions || [],
    validity,
    roomTypeIds,
    availableFrom: availableFrom || new Date().toISOString(),
    availableTo: availableTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    createdAt: new Date().toISOString()
  };

  packages.set(packageId, pkg);
  res.status(201).json(pkg);
});

// ============================================
// UPSELL OFFERS
// ============================================

app.get('/api/upsells', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const offers = Array.from(upsellOffers.values())
    .filter(o => o.propertyId === businessId);
  res.json({ upsells: offers });
});

app.post('/api/upsells', requireAuth, (req, res) => {
  const { name, type, price, description, roomTypeIds, minNights } = req.body;

  const businessId = req.session.businessId;
  const offerId = 'upsell_' + Date.now();

  const offer = {
    id: offerId,
    propertyId: businessId,
    name,
    type, // 'room_upgrade', 'breakfast', 'spa', 'transport', etc.
    price,
    description,
    roomTypeIds,
    minNights,
    active: true,
    createdAt: new Date().toISOString()
  };

  upsellOffers.set(offerId, offer);
  res.status(201).json(offer);
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const bookingList = Array.from(bookings.values())
    .filter(b => b.propertyId === businessId);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = bookingList.filter(b => b.createdAt.startsWith(today.slice(0, 7)));

  res.json({
    overview: {
      totalBookings: bookingList.length,
      confirmed: bookingList.filter(b => b.bookingStatus === 'confirmed').length,
      pending: bookingList.filter(b => b.bookingStatus === 'pending_confirmation').length,
      cancelled: bookingList.filter(b => b.bookingStatus === 'cancelled').length,
      totalRevenue: bookingList
        .filter(b => b.bookingStatus === 'confirmed')
        .reduce((sum, b) => sum + b.pricing.total, 0)
    },
    thisMonth: {
      bookings: thisMonth.length,
      revenue: thisMonth
        .filter(b => b.bookingStatus === 'confirmed')
        .reduce((sum, b) => sum + b.pricing.total, 0),
      avgBookingValue: thisMonth.length > 0
        ? thisMonth.reduce((sum, b) => sum + b.pricing.total, 0) / thisMonth.length
        : 0
    },
    conversion: {
      started: analytics.get(`${businessId}_booking_started`) || 0,
      completed: analytics.get(`${businessId}_booking_confirmed`) || 0,
      rate: '0%' // Would calculate based on actual data
    }
  });
});

// ============================================
// EMBED WIDGET
// ============================================

// Get widget embed code
app.get('/api/widgets/embed', (req, res) => {
  const { propertyId, theme = 'light' } = req.query;

  const property = properties.get(propertyId);
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }

  res.json({
    propertyId,
    widgetUrl: `${req.protocol}://${req.get('host')}/booking-widget.html`,
    script: `<script src="${req.protocol}://${req.get('host')}/widget.js" data-property="${propertyId}"></script>`,
    styles: {
      primaryColor: property.branding.primaryColor,
      secondaryColor: property.branding.secondaryColor
    }
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'StayOwn Booking Engine',
    port: PORT,
    properties: properties.size,
    bookings: bookings.size,
    promoCodes: promoCodes.size,
    packages: packages.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function trackAnalytics(propertyId, event, data) {
  const key = `${propertyId}_${event}`;
  analytics.set(key, (analytics.get(key) || 0) + 1);
}

function generateUpsellReason(offer, booking) {
  const reasons = {
    room_upgrade: `Upgrade to ${offer.name} for just $${offer.price}/night`,
    breakfast: 'Start your day with our delicious breakfast',
    spa: 'Relax with our signature spa treatment',
    transport: 'Convenient airport transfers available',
    late_checkout: 'Sleep in and enjoy your morning'
  };
  return reasons[offer.type] || offer.description;
}

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log('🏨 StayOwn Booking Engine running on port ' + PORT);
  console.log('💳 Commission-free direct bookings with AI upselling');
});
