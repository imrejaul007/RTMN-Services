/**
 * Travel OS - AI Company Platform
 * Complete Travel/Tourism Agency Management System
 *
 * Port: 5190
 * Industry: Travel & Tourism
 *
 * Features:
 * - Package/Holiday Management
 * - Destination Management
 * - Hotel/Transfer Partnerships
 * - Customer/Booking Management
 * - Itinerary Planning
 * - Visa/Passport Services
 * - Travel Insurance
 * - Supplier Management
 * - Analytics
 * - RTMN Layer Integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5190;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// AUTHENTICATION (RTMN Standard Pattern)
// ============================================
const authUsers = new Map(); // userId -> { userId, email, name, role, createdAt }
const authSessions = new Map(); // sessionId -> { sessionId, userId, token, createdAt, expiresAt }

// Seed default users
const defaultUsers = [
  { userId: 'travel-admin-001', email: 'admin@travelos.com', name: 'Travel Admin', role: 'admin', password: 'admin123' },
  { userId: 'travel-agent-001', email: 'agent@travelos.com', name: 'John Agent', role: 'agent', password: 'agent123' },
  { userId: 'travel-customer-001', email: 'customer@travelos.com', name: 'Jane Customer', role: 'customer', password: 'customer123' }
];

defaultUsers.forEach(u => authUsers.set(u.userId, u));

function generateToken() {
  return 'token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !authSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid session required' });
  }
  req.session = authSessions.get(sessionId);
  req.user = authUsers.get(req.session.userId);
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden', message: `Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

// ============================================
// SAMPLE DATA
// ============================================

// Destinations
const destinations = new Map([
  ['dest-001', {
    id: 'dest-001', name: 'Goa', country: 'India', region: 'West India',
    description: 'Sunny beaches, vibrant nightlife, Portuguese heritage',
    highlights: ['Baga Beach', 'Fort Aguada', 'Dudhsagar Falls', 'Anjuna Flea Market'],
    bestSeason: 'November to February', avgTemp: '28°C', timezone: 'IST',
    visaRequired: false, currency: 'INR', language: 'Hindi, Konkani, English',
    imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800',
    rating: 4.5, reviewCount: 2847, createdAt: new Date().toISOString()
  }],
  ['dest-002', {
    id: 'dest-002', name: 'Kerala', country: 'India', region: 'South India',
    description: 'God\'s own country - backwaters, tea gardens, Ayurveda',
    highlights: ['Alleppey Backwaters', 'Munnar Tea Gardens', 'Kochi Fort', 'Wayanad'],
    bestSeason: 'September to March', avgTemp: '25°C', timezone: 'IST',
    visaRequired: false, currency: 'INR', language: 'Malayalam, English, Tamil',
    imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800',
    rating: 4.8, reviewCount: 3156, createdAt: new Date().toISOString()
  }],
  ['dest-003', {
    id: 'dest-003', name: 'Dubai', country: 'UAE', region: 'Middle East',
    description: 'Luxury shopping, ultramodern architecture, vibrant nightlife',
    highlights: ['Burj Khalifa', 'Palm Jumeirah', 'Dubai Mall', 'Desert Safari'],
    bestSeason: 'November to March', avgTemp: '30°C', timezone: 'GST',
    visaRequired: true, currency: 'AED', language: 'Arabic, English, Hindi',
    imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800',
    rating: 4.7, reviewCount: 4521, createdAt: new Date().toISOString()
  }],
  ['dest-004', {
    id: 'dest-004', name: 'Maldives', country: 'Maldives', region: 'South Asia',
    description: 'Tropical paradise with overwater villas and pristine beaches',
    highlights: ['Overwater Bungalows', 'Snorkeling', 'Whale Shark Diving', 'Sunset Cruises'],
    bestSeason: 'November to April', avgTemp: '28°C', timezone: 'MVT',
    visaRequired: true, currency: 'MVR', language: 'Dhivehi, English',
    imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800',
    rating: 4.9, reviewCount: 1892, createdAt: new Date().toISOString()
  }]
]);

// Travel Packages
const packages = new Map([
  ['pkg-001', {
    id: 'pkg-001', name: 'Goa Beach Getaway', destinationId: 'dest-001',
    type: 'beach', duration: '4 days / 3 nights', validity: '2026-06-01 to 2026-12-31',
    inclusions: ['Beach Resort Accommodation', 'Airport Transfers', 'Daily Breakfast', 'North Goa Tour', 'Evening Bonfire'],
    exclusions: ['Flights', 'Lunch & Dinner', 'Water Sports', 'Personal Expenses'],
    itinerary: [
      { day: 1, title: 'Arrival', activities: ['Airport pickup', 'Hotel check-in', 'Beach walk', 'Welcome dinner'] },
      { day: 2, title: 'North Goa Tour', activities: ['Visit Calangute Beach', 'Baga Beach', 'Anjuna Market', 'Night clubbing'] },
      { day: 3, title: 'Adventure Day', activities: ['Water sports', 'Spice plantation visit', 'Sunset cruise', 'Bonfire'] },
      { day: 4, title: 'Departure', activities: ['Leisure morning', 'Hotel checkout', 'Airport transfer'] }
    ],
    basePrice: 12500, currency: 'INR', maxGuests: 4, minGuests: 1,
    accommodation: '3-star beach resort', transportIncluded: true,
    images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'],
    rating: 4.3, totalBookings: 156, available: true, createdAt: new Date().toISOString()
  }],
  ['pkg-002', {
    id: 'pkg-002', name: 'Kerala Backwater Luxury', destinationId: 'dest-002',
    type: 'heritage', duration: '5 days / 4 nights', validity: '2026-06-01 to 2026-09-30',
    inclusions: ['Houseboat Stay', 'All Meals', 'Ayurveda Massage', 'Tea Garden Tour', 'Cathedral Visit'],
    exclusions: ['Flights', 'Personal Expenses', 'Adventure Activities'],
    itinerary: [
      { day: 1, title: 'Cochin Arrival', activities: ['Cochi airport pickup', 'Fort Kochi tour', 'Chinese fishing nets', 'Kathakali show'] },
      { day: 2, title: 'Munnar Hills', activities: ['Drive to Munnar', 'Tea plantations', 'Eravikulam National Park', 'Spice garden'] },
      { day: 3, title: 'Periyar & Backwaters', activities: ['Periyar boat ride', 'Drive to Alleppey', 'Houseboat check-in', 'Sunset view'] },
      { day: 4, title: 'Houseboat Experience', activities: ['Backwater cruise', 'Village visit', 'Fishing', 'Onboard cooking'] },
      { day: 5, title: 'Departure', activities: ['Morning cruise', 'Houseboat checkout', 'Airport transfer'] }
    ],
    basePrice: 28500, currency: 'INR', maxGuests: 6, minGuests: 2,
    accommodation: 'Premium houseboat + heritage hotel', transportIncluded: true,
    images: ['https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800'],
    rating: 4.7, totalBookings: 89, available: true, createdAt: new Date().toISOString()
  }],
  ['pkg-003', {
    id: 'pkg-003', name: 'Dubai Premium Holiday', destinationId: 'dest-003',
    type: 'luxury', duration: '5 days / 4 nights', validity: '2026-06-01 to 2026-12-31',
    inclusions: ['5-star Hotel', 'Burj Khalifa Visit', 'Desert Safari', 'Dhow Cruise', 'Dubai Mall Shopping', 'Airport Transfers'],
    exclusions: ['Flights', 'Travel Insurance', 'Visa Fee', 'Personal Expenses'],
    itinerary: [
      { day: 1, title: 'Arrival in Dubai', activities: ['Airport pickup', 'Hotel check-in', 'Dubai Mall', 'Fountain show'] },
      { day: 2, title: 'City Tour', activities: ['Burj Khalifa 124th floor', 'Dubai Museum', 'Abra ride', 'Gold Souk'] },
      { day: 3, title: 'Desert Adventure', activities: ['Desert safari', 'BBQ dinner', 'Belly dance show', 'Stargazing'] },
      { day: 4, title: 'Leisure Day', activities: ['Beach time', 'Water park', 'Shopping', 'Spa treatment'] },
      { day: 5, title: 'Departure', activities: ['Hotel checkout', 'Airport transfer', 'Shopping at airport'] }
    ],
    basePrice: 65000, currency: 'INR', maxGuests: 4, minGuests: 1,
    accommodation: '5-star hotel (Atlantis/Emirates Palace)', transportIncluded: true,
    images: ['https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800'],
    rating: 4.8, totalBookings: 234, available: true, createdAt: new Date().toISOString()
  }],
  ['pkg-004', {
    id: 'pkg-004', name: 'Maldives Island Paradise', destinationId: 'dest-004',
    type: 'honeymoon', duration: '6 days / 5 nights', validity: '2026-06-01 to 2026-10-31',
    inclusions: ['Overwater Villa', 'All Meals', 'Snorkeling Gear', 'Sunset Cruise', 'Couple\'s Spa', 'Speedboat Transfers'],
    exclusions: ['International Flights', 'Travel Insurance', 'Visa Fee', 'Premium Alcohol'],
    itinerary: [
      { day: 1, title: 'Arrival at Paradise', activities: ['Male airport', 'Speedboat to resort', 'Welcome cocktails', 'Sunset view'] },
      { day: 2, title: 'Island Exploration', activities: ['Snorkeling excursion', 'Whale shark watching', 'Beach dinner', 'Stargazing'] },
      { day: 3, title: 'Water Sports', activities: ['Jet skiing', 'Parasailing', 'Kayaking', 'Couple\'s spa'] },
      { day: 4, title: 'Local Island Visit', activities: ['Visit local village', 'Cultural show', 'Diving lesson', 'Photo session'] },
      { day: 5, title: 'Relaxation Day', activities: ['Beach lounge', 'Infinity pool', 'Couple\'s massage', 'Farewell dinner'] },
      { day: 6, title: 'Departure', activities: ['Morning swim', 'Checkout', 'Speedboat to airport'] }
    ],
    basePrice: 185000, currency: 'INR', maxGuests: 2, minGuests: 1,
    accommodation: 'Overwater villa with pool', transportIncluded: true,
    images: ['https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800'],
    rating: 4.9, totalBookings: 67, available: true, createdAt: new Date().toISOString()
  }],
  ['pkg-005', {
    id: 'pkg-005', name: 'Goa Adventure Week', destinationId: 'dest-001',
    type: 'adventure', duration: '6 days / 5 nights', validity: '2026-06-01 to 2026-08-31',
    inclusions: ['Beach Camp', 'Water Sports Package', 'Trekking', 'All Meals', 'Campfire', 'Kayaking'],
    exclusions: ['Flights', 'Personal Expenses', 'Travel Insurance'],
    itinerary: [
      { day: 1, title: 'Arrival & Camp Setup', activities: ['Airport pickup', 'Travel to camp', 'Beach camp setup', 'Welcome dinner'] },
      { day: 2, title: 'Water Sports Day', activities: ['Jet skiing', 'Banana ride', 'Parasailing', 'Speed boat', 'Beach party'] },
      { day: 3, title: 'Trekking Adventure', activities: ['Dudhsagar Falls trek', 'Jungle bathing', 'Wildlife spotting', 'Campfire'] },
      { day: 4, title: 'Diving & Snorkeling', activities: ['Scuba diving', 'Snorkeling', 'Island hopping', 'Seafood dinner'] },
      { day: 5, title: 'Cultural Day', activities: ['Fort Aguada', 'Spice plantation', 'Cooking class', 'Farewell party'] },
      { day: 6, title: 'Departure', activities: ['Morning yoga', 'Camp cleanup', 'Airport transfer'] }
    ],
    basePrice: 22000, currency: 'INR', maxGuests: 8, minGuests: 2,
    accommodation: 'Beach camping + resort stay', transportIncluded: true,
    images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'],
    rating: 4.5, totalBookings: 112, available: true, createdAt: new Date().toISOString()
  }]
]);

// Customers
const customers = new Map([
  ['cust-001', {
    id: 'cust-001', name: 'Rahul Sharma', email: 'rahul.sharma@email.com', phone: '+91-9876543210',
    address: { street: '42 MG Road', city: 'Mumbai', state: 'Maharashtra', zip: '400001', country: 'India' },
    dateOfBirth: '1988-05-15', nationality: 'Indian', passportNo: 'J1234567', passportExpiry: '2029-05-14',
    preferences: { seatPreference: 'window', mealPreference: 'vegetarian', specialNeeds: 'None' },
    tier: 'gold', totalBookings: 8, totalSpent: 245000, createdAt: new Date().toISOString()
  }],
  ['cust-002', {
    id: 'cust-002', name: 'Priya Patel', email: 'priya.patel@email.com', phone: '+91-8765432109',
    address: { street: '15 Ring Road', city: 'Delhi', state: 'Delhi', zip: '110001', country: 'India' },
    dateOfBirth: '1992-08-22', nationality: 'Indian', passportNo: 'K7654321', passportExpiry: '2028-08-21',
    preferences: { seatPreference: 'aisle', mealPreference: 'vegan', specialNeeds: 'Wheelchair access required' },
    tier: 'platinum', totalBookings: 15, totalSpent: 520000, createdAt: new Date().toISOString()
  }],
  ['cust-003', {
    id: 'cust-003', name: 'Amit & Neha Gupta', email: 'gupta.family@email.com', phone: '+91-7654321098',
    address: { street: '78 Nehru Street', city: 'Bangalore', state: 'Karnataka', zip: '560001', country: 'India' },
    dateOfBirth: '1985-03-10', nationality: 'Indian', passportNo: 'L9876543', passportExpiry: '2027-03-09',
    preferences: { seatPreference: 'window', mealPreference: 'vegetarian', specialNeeds: 'Child seat needed' },
    tier: 'silver', totalBookings: 3, totalSpent: 85000, children: 2, createdAt: new Date().toISOString()
  }]
]);

// Bookings
const bookings = new Map([
  ['book-001', {
    id: 'book-001', bookingRef: 'TRV-2026-001', customerId: 'cust-001', packageId: 'pkg-003',
    destinationId: 'dest-003', travelDate: '2026-07-15', returnDate: '2026-07-19',
    guests: { adults: 2, children: 0, infants: 0 }, totalGuests: 2,
    status: 'confirmed', paymentStatus: 'paid',
    pricing: { basePrice: 65000, taxes: 11700, visa: 5000, insurance: 2500, total: 84200, currency: 'INR' },
    roomConfiguration: { rooms: 1, type: 'Double' }, specialRequests: 'Honeymoon decoration requested',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }],
  ['book-002', {
    id: 'book-002', bookingRef: 'TRV-2026-002', customerId: 'cust-002', packageId: 'pkg-004',
    destinationId: 'dest-004', travelDate: '2026-08-10', returnDate: '2026-08-15',
    guests: { adults: 2, children: 0, infants: 0 }, totalGuests: 2,
    status: 'confirmed', paymentStatus: 'partially_paid',
    pricing: { basePrice: 185000, taxes: 33300, visa: 0, insurance: 5000, total: 223300, currency: 'INR' },
    roomConfiguration: { rooms: 1, type: 'Overwater Suite' }, specialRequests: 'Anniversary celebration',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }],
  ['book-003', {
    id: 'book-003', bookingRef: 'TRV-2026-003', customerId: 'cust-003', packageId: 'pkg-001',
    destinationId: 'dest-001', travelDate: '2026-06-20', returnDate: '2026-06-23',
    guests: { adults: 2, children: 2, infants: 0 }, totalGuests: 4,
    status: 'pending', paymentStatus: 'pending',
    pricing: { basePrice: 50000, taxes: 9000, visa: 0, insurance: 3000, total: 62000, currency: 'INR' },
    roomConfiguration: { rooms: 2, type: 'Family Suite' }, specialRequests: 'Child-friendly activities',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }],
  ['book-004', {
    id: 'book-004', bookingRef: 'TRV-2026-004', customerId: 'cust-001', packageId: 'pkg-002',
    destinationId: 'dest-002', travelDate: '2026-09-05', returnDate: '2026-09-09',
    guests: { adults: 2, children: 0, infants: 0 }, totalGuests: 2,
    status: 'confirmed', paymentStatus: 'paid',
    pricing: { basePrice: 57000, taxes: 10260, visa: 0, insurance: 2000, total: 69260, currency: 'INR' },
    roomConfiguration: { rooms: 1, type: 'Premium Houseboat' }, specialRequests: 'Ayurveda package',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }],
  ['book-005', {
    id: 'book-005', bookingRef: 'TRV-2026-005', customerId: 'cust-002', packageId: 'pkg-005',
    destinationId: 'dest-001', travelDate: '2026-07-01', returnDate: '2026-07-06',
    guests: { adults: 1, children: 0, infants: 0 }, totalGuests: 1,
    status: 'confirmed', paymentStatus: 'paid',
    pricing: { basePrice: 22000, taxes: 3960, visa: 0, insurance: 1500, total: 27460, currency: 'INR' },
    roomConfiguration: { rooms: 1, type: 'Adventure Camp' }, specialRequests: 'Solo traveler, arrange group activities',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }]
]);

// Suppliers
const suppliers = new Map([
  ['supp-001', {
    id: 'supp-001', name: 'Sunrise Hotels Goa', type: 'hotel', contact: { email: 'bookings@sunrisegoa.com', phone: '+91-832-2451234' },
    rating: 4.2, contracts: ['pkg-001', 'pkg-005'], commission: 15, bankDetails: { account: '****4567', bank: 'HDFC' },
    createdAt: new Date().toISOString()
  }],
  ['supp-002', {
    id: 'supp-002', name: 'Alleppey Houseboats Co', type: 'houseboat', contact: { email: 'info@alleppeyboats.in', phone: '+91-477-2234567' },
    rating: 4.5, contracts: ['pkg-002'], commission: 20, bankDetails: { account: '****8901', bank: 'SBI' },
    createdAt: new Date().toISOString()
  }],
  ['supp-003', {
    id: 'supp-003', name: 'Emirates Tourism LLC', type: 'tour_operator', contact: { email: 'ops@emiratestourism.ae', phone: '+971-4-2345678' },
    rating: 4.7, contracts: ['pkg-003'], commission: 12, bankDetails: { account: '****3456', bank: 'Emirates NBD' },
    createdAt: new Date().toISOString()
  }],
  ['supp-004', {
    id: 'supp-004', name: 'Paradise Islands Maldives', type: 'resort', contact: { email: 'reservations@paradiseislands.mv', phone: '+960-6601234' },
    rating: 4.9, contracts: ['pkg-004'], commission: 10, bankDetails: { account: '****7890', bank: 'Bank of Maldives' },
    createdAt: new Date().toISOString()
  }]
]);

// Visas & Insurance
const visaApplications = new Map([
  ['visa-001', { id: 'visa-001', bookingId: 'book-001', country: 'UAE', type: 'tourist', status: 'approved', fee: 5000, submittedAt: '2026-06-01' }],
  ['visa-002', { id: 'visa-002', bookingId: 'book-002', country: 'Maldives', type: 'tourist', status: 'approved', fee: 0, submittedAt: '2026-06-05' }]
]);

const insurancePolicies = new Map([
  ['ins-001', { id: 'ins-001', bookingId: 'book-001', provider: 'Tata AIG', policyNo: 'TATA-2026-001', coverage: 500000, premium: 2500, status: 'active' }],
  ['ins-002', { id: 'ins-002', bookingId: 'book-002', provider: 'ICICI Lombard', policyNo: 'ICICI-2026-002', coverage: 1000000, premium: 5000, status: 'active' }],
  ['ins-003', { id: 'ins-003', bookingId: 'book-003', provider: 'HDFC ERGO', policyNo: 'HDFC-2026-003', coverage: 500000, premium: 3000, status: 'pending' }]
]);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Travel OS',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      destinations: destinations.size,
      packages: packages.size,
      customers: customers.size,
      bookings: bookings.size,
      suppliers: suppliers.size
    }
  });
});

// ============================================
// AUTH ROUTES
// ============================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = Array.from(authUsers.values()).find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sessionId = generateId('sess');
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  authSessions.set(sessionId, { sessionId, userId: user.userId, token, createdAt: new Date().toISOString(), expiresAt });

  res.json({
    sessionId,
    token,
    user: { userId: user.userId, email: user.email, name: user.name, role: user.role }
  });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  authSessions.delete(req.session.sessionId);
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ============================================
// DESTINATION ROUTES
// ============================================
app.get('/api/destinations', (req, res) => {
  const { country, region, search } = req.query;
  let result = Array.from(destinations.values());

  if (country) result = result.filter(d => d.country.toLowerCase() === country.toLowerCase());
  if (region) result = result.filter(d => d.region.toLowerCase() === region.toLowerCase());
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(d => d.name.toLowerCase().includes(s) || d.country.toLowerCase().includes(s));
  }

  res.json({ destinations: result, total: result.length });
});

app.get('/api/destinations/:id', (req, res) => {
  const dest = destinations.get(req.params.id);
  if (!dest) return res.status(404).json({ error: 'Destination not found' });

  const relatedPackages = Array.from(packages.values()).filter(p => p.destinationId === req.params.id);
  res.json({ ...dest, relatedPackages });
});

// ============================================
// PACKAGE ROUTES
// ============================================
app.get('/api/packages', (req, res) => {
  const { destination, type, minPrice, maxPrice, search } = req.query;
  let result = Array.from(packages.values());

  if (destination) result = result.filter(p => p.destinationId === destination);
  if (type) result = result.filter(p => p.type === type);
  if (minPrice) result = result.filter(p => p.basePrice >= parseInt(minPrice));
  if (maxPrice) result = result.filter(p => p.basePrice <= parseInt(maxPrice));
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(s) || p.type.toLowerCase().includes(s));
  }

  res.json({ packages: result, total: result.length });
});

app.get('/api/packages/:id', (req, res) => {
  const pkg = packages.get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });

  const dest = destinations.get(pkg.destinationId);
  res.json({ ...pkg, destination: dest });
});

// ============================================
// BOOKING ROUTES
// ============================================
app.get('/api/bookings', requireAuth, (req, res) => {
  const { status, customerId } = req.query;
  let result = Array.from(bookings.values());

  if (status) result = result.filter(b => b.status === status);
  if (customerId) result = result.filter(b => b.customerId === customerId);
  if (req.user.role === 'customer') {
    const userCustomer = Array.from(customers.values()).find(c => c.email === req.user.email);
    if (userCustomer) result = result.filter(b => b.customerId === userCustomer.id);
  }

  res.json({ bookings: result, total: result.length });
});

app.get('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const customer = customers.get(booking.customerId);
  const pkg = packages.get(booking.packageId);
  const dest = destinations.get(booking.destinationId);
  const insurance = Array.from(insurancePolicies.values()).find(i => i.bookingId === req.params.id);

  res.json({ ...booking, customer, package: pkg, destination: dest, insurance });
});

app.post('/api/bookings', requireAuth, (req, res) => {
  const { packageId, travelDate, returnDate, guests, specialRequests } = req.body;

  const pkg = packages.get(packageId);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });

  const bookingId = generateId('book');
  const bookingRef = `TRV-${new Date().getFullYear()}-${String(bookings.size + 1).padStart(3, '0')}`;

  const totalGuests = (guests?.adults || 1) + (guests?.children || 0);
  if (totalGuests > pkg.maxGuests) {
    return res.status(400).json({ error: `Maximum ${pkg.maxGuests} guests allowed for this package` });
  }

  const priceMultiplier = pkg.type === 'luxury' || pkg.type === 'honeymoon' ? 1.2 : 1;
  const basePrice = pkg.basePrice * totalGuests;
  const taxes = Math.round(basePrice * 0.18);

  const booking = {
    id: bookingId, bookingRef, customerId: req.user.role === 'customer' ?
      Array.from(customers.values()).find(c => c.email === req.user.email)?.id || 'cust-unknown' : null,
    packageId, destinationId: pkg.destinationId, travelDate, returnDate,
    guests: guests || { adults: 1, children: 0, infants: 0 }, totalGuests,
    status: 'pending', paymentStatus: 'pending',
    pricing: { basePrice, taxes, visa: 0, insurance: 0, total: basePrice + taxes, currency: 'INR' },
    specialRequests, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };

  bookings.set(bookingId, booking);
  res.status(201).json(booking);
});

app.patch('/api/bookings/:id', requireAuth, requireRole('admin', 'agent'), (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const updates = req.body;
  bookings.set(req.params.id, { ...booking, ...updates, updatedAt: new Date().toISOString() });
  res.json(bookings.get(req.params.id));
});

// ============================================
// CUSTOMER ROUTES
// ============================================
app.get('/api/customers', requireAuth, requireRole('admin', 'agent'), (req, res) => {
  const { tier, search } = req.query;
  let result = Array.from(customers.values());

  if (tier) result = result.filter(c => c.tier === tier);
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s));
  }

  res.json({ customers: result, total: result.length });
});

app.get('/api/customers/:id', requireAuth, (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const customerBookings = Array.from(bookings.values()).filter(b => b.customerId === req.params.id);
  res.json({ ...customer, bookings: customerBookings });
});

// ============================================
// SUPPLIER ROUTES
// ============================================
app.get('/api/suppliers', requireAuth, requireRole('admin', 'agent'), (req, res) => {
  const { type } = req.query;
  let result = Array.from(suppliers.values());
  if (type) result = result.filter(s => s.type === type);
  res.json({ suppliers: result, total: result.length });
});

app.get('/api/suppliers/:id', requireAuth, requireRole('admin', 'agent'), (req, res) => {
  const supplier = suppliers.get(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  res.json(supplier);
});

// ============================================
// VISA & INSURANCE ROUTES
// ============================================
app.get('/api/visas', requireAuth, requireRole('admin', 'agent'), (req, res) => {
  res.json({ visas: Array.from(visaApplications.values()) });
});

app.get('/api/insurance', requireAuth, requireRole('admin', 'agent'), (req, res) => {
  res.json({ policies: Array.from(insurancePolicies.values()) });
});

// ============================================
// ANALYTICS ROUTES
// ============================================
app.get('/api/analytics/dashboard', requireAuth, requireRole('admin', 'agent'), (req, res) => {
  const allBookings = Array.from(bookings.values());
  const totalRevenue = allBookings.reduce((sum, b) => sum + b.pricing.total, 0);
  const confirmedBookings = allBookings.filter(b => b.status === 'confirmed');

  const revenueByDestination = {};
  const bookingsByStatus = {};
  const revenueByMonth = {};

  allBookings.forEach(b => {
    const dest = destinations.get(b.destinationId);
    const destName = dest?.name || 'Unknown';
    revenueByDestination[destName] = (revenueByDestination[destName] || 0) + b.pricing.total;
    bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1;

    const month = new Date(b.travelDate).toLocaleString('default', { month: 'short' });
    revenueByMonth[month] = (revenueByMonth[month] || 0) + b.pricing.total;
  });

  const topPackages = Array.from(packages.values())
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(0, 5)
    .map(p => ({ id: p.id, name: p.name, bookings: p.totalBookings, revenue: p.basePrice * p.totalBookings }));

  res.json({
    summary: {
      totalBookings: allBookings.length,
      confirmedBookings: confirmedBookings.length,
      pendingBookings: allBookings.filter(b => b.status === 'pending').length,
      totalRevenue,
      avgBookingValue: totalRevenue / (allBookings.length || 1)
    },
    revenueByDestination,
    bookingsByStatus,
    revenueByMonth,
    topPackages,
    popularDestinations: Array.from(destinations.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3)
  });
});

// ============================================
// RTMN LAYER INTEGRATION
// ============================================
app.get('/api/layers', (req, res) => {
  res.json({
    layers: [
      { id: 1, name: 'Intelligence', status: 'active', services: ['Genie', 'CoPilot', 'AI Agents'] },
      { id: 2, name: 'Customer Growth', status: 'active', services: ['CRM', 'Loyalty'] },
      { id: 3, name: 'Commerce', status: 'active', services: ['Packages', 'Bookings'] },
      { id: 4, name: 'Financial', status: 'active', services: ['Payments', 'Invoicing'] },
      { id: 5, name: 'Memory', status: 'active', services: ['Travel Preferences'] },
      { id: 6, name: 'Digital Twins', status: 'active', services: ['Customer Twin', 'Booking Twin'] }
    ]
  });
});

app.get('/api/twin/travel', requireAuth, (req, res) => {
  const customerId = req.query.customerId;
  if (!customerId) return res.status(400).json({ error: 'customerId required' });

  const customer = customers.get(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const customerBookings = Array.from(bookings.values()).filter(b => b.customerId === customerId);
  const visitedDestinations = [...new Set(customerBookings.map(b => b.destinationId))];

  res.json({
    twinId: `travel-twin-${customerId}`,
    customerId,
    profile: {
      tier: customer.tier,
      totalTrips: customer.totalBookings,
      totalSpent: customer.totalSpent,
      preferences: customer.preferences
    },
    history: {
      bookings: customerBookings.length,
      destinations: visitedDestinations.map(id => destinations.get(id)?.name).filter(Boolean),
      favoriteType: customerBookings.length > 0 ?
        Array.from(packages.values()).find(p => p.id === customerBookings[0]?.packageId)?.type : null
    },
    predictions: {
      nextDestination: 'Maldives',
      predictedSpending: customer.tier === 'platinum' ? 250000 : 100000,
      loyaltyScore: customer.tier === 'platinum' ? 95 : customer.tier === 'gold' ? 80 : 60
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`\n🛫 Travel OS started on port ${PORT}`);
  console.log(`📊 Destinations: ${destinations.size} | Packages: ${packages.size} | Customers: ${customers.size} | Bookings: ${bookings.size}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: POST /api/auth/login\n`);
});

module.exports = app;
