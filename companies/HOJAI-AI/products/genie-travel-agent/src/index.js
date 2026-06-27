/**
 * Genie Travel Agent — port 4714.
 *
 * Vision role: travel.
 * Capabilities: flight-booking, hotel-booking, itinerary-planning, rebooking, price-comparison.
 *
 * Endpoints:
 *   GET  /health, /ready, /info
 *   POST /api/v1/travel/search/flights
 *   POST /api/v1/travel/search/hotels
 *   POST /api/v1/travel/itinerary/plan
 *   POST /api/v1/travel/rebook             — handle cancellations / changes
 *
 * Production: integrate with Amadeus, Sabre, Skyscanner, Booking.com, etc.
 * MVP: deterministic mock data + price comparison logic + itinerary optimization.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const PORT = parseInt(process.env.TRAVEL_PORT || '4714');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUIRE_AUTH = process.env.TRAVEL_REQUIRE_AUTH !== 'false';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function apiResponse(success, data, error) {
  return { success, data, error, timestamp: new Date().toISOString() };
}

function apiKeyAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const auth = req.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json(apiResponse(false, undefined, 'Auth required'));
  if (HOJAI_API_KEY && token !== HOJAI_API_KEY) return res.status(401).json(apiResponse(false, undefined, 'Invalid key'));
  next();
}

// ─── In-memory state ───────────────────────────────────────────────────
const bookings = new Map();

// ─── Endpoints ─────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'genie-travel', version: '1.0.0', port: PORT });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, bookings: bookings.size, port: PORT });
});

app.get('/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'Genie Travel',
    visionRole: 'travel',
    version: '1.0.0',
    capabilities: ['flight-booking', 'hotel-booking', 'itinerary-planning', 'rebooking', 'price-comparison']
  }));
});

app.post('/api/v1/travel/search/flights', apiKeyAuth, (req, res) => {
  const { origin, destination, departDate, returnDate, passengers = 1, cabinClass = 'economy' } = req.body || {};
  if (!origin || !destination || !departDate) {
    return res.status(400).json(apiResponse(false, undefined, 'origin, destination, departDate are required'));
  }
  const flights = mockFlightSearch({ origin, destination, departDate, returnDate, passengers, cabinClass });
  res.json(apiResponse(true, {
    origin, destination, departDate, cabinClass,
    total: flights.length,
    flights
  }));
});

app.post('/api/v1/travel/search/hotels', apiKeyAuth, (req, res) => {
  const { city, checkIn, checkOut, guests = 1, minStars = 0, maxPriceUsd = null } = req.body || {};
  if (!city || !checkIn || !checkOut) {
    return res.status(400).json(apiResponse(false, undefined, 'city, checkIn, checkOut are required'));
  }
  const hotels = mockHotelSearch({ city, checkIn, checkOut, guests, minStars, maxPriceUsd });
  res.json(apiResponse(true, {
    city, checkIn, checkOut, guests,
    total: hotels.length,
    hotels
  }));
});

app.post('/api/v1/travel/itinerary/plan', apiKeyAuth, (req, res) => {
  const { city, days = 3, interests = [], pace = 'moderate', budgetUsd = 2000 } = req.body || {};
  if (!city) return res.status(400).json(apiResponse(false, undefined, 'city is required'));
  const itinerary = planItinerary({ city, days, interests, pace, budgetUsd });
  res.json(apiResponse(true, itinerary));
});

app.post('/api/v1/travel/rebook', apiKeyAuth, (req, res) => {
  const { bookingId, reason } = req.body || {};
  if (!bookingId) return res.status(400).json(apiResponse(false, undefined, 'bookingId is required'));

  const original = bookings.get(bookingId);
  if (!original) return res.status(404).json(apiResponse(false, undefined, 'Booking not found'));

  // MVP: simulate rebooking. Production: call carrier APIs.
  const newBooking = {
    bookingId: 'BK' + Date.now().toString(36).toUpperCase(),
    originalBookingId: bookingId,
    rebookedAt: new Date().toISOString(),
    reason: reason || 'customer-request',
    status: 'confirmed',
    refundAmount: Math.round(original.priceUsd * 0.85 * 100) / 100, // 85% refund
    newDeparture: original.departure, // simplified — same time
    additionalCostUsd: 25 // rebooking fee
  };
  bookings.set(newBooking.bookingId, { ...original, bookingId: newBooking.bookingId });
  res.json(apiResponse(true, newBooking));
});

// ─── Mock data + helpers ─────────────────────────────────────────────

const AIRPORTS = {
  'NYC': { name: 'New York', city: 'New York', country: 'US', lat: 40.71, lon: -74.0 },
  'LON': { name: 'London Heathrow', city: 'London', country: 'GB', lat: 51.5, lon: -0.45 },
  'PAR': { name: 'Paris CDG', city: 'Paris', country: 'FR', lat: 49.0, lon: 2.55 },
  'TYO': { name: 'Tokyo Narita', city: 'Tokyo', country: 'JP', lat: 35.76, lon: 140.39 },
  'DXB': { name: 'Dubai', city: 'Dubai', country: 'AE', lat: 25.25, lon: 55.36 },
  'SIN': { name: 'Singapore Changi', city: 'Singapore', country: 'SG', lat: 1.36, lon: 103.99 },
  'BLR': { name: 'Bangalore', city: 'Bangalore', country: 'IN', lat: 12.97, lon: 77.59 }
};

function mockFlightSearch({ origin, destination, departDate, returnDate, passengers, cabinClass }) {
  // Deterministic price based on route + class
  const o = AIRPORTS[origin] || { name: origin, city: origin };
  const d = AIRPORTS[destination] || { name: destination, city: destination };
  const distance = haversineKm(o, d);
  const basePrice = Math.round(distance * 0.12 * (cabinClass === 'business' ? 4 : cabinClass === 'first' ? 8 : 1) * passengers);

  // 3 carrier options
  return [
    {
      flightId: 'FL-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      carrier: 'SkyWays',
      carrierCode: 'SW' + Math.floor(Math.random() * 999),
      origin, destination, departDate, returnDate, passengers, cabinClass,
      departTime: departDate + 'T08:00:00Z',
      arriveTime: departDate + 'T' + (8 + Math.round(distance / 800)) + ':00:00Z',
      durationHours: Math.round(distance / 800),
      stops: 0,
      priceUsd: basePrice,
      seatsLeft: 7
    },
    {
      flightId: 'FL-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      carrier: 'GlobalAir',
      carrierCode: 'GA' + Math.floor(Math.random() * 999),
      origin, destination, departDate, returnDate, passengers, cabinClass,
      departTime: departDate + 'T14:30:00Z',
      arriveTime: departDate + 'T' + (14 + Math.round(distance / 800) + 4) + ':30:00Z',
      durationHours: Math.round(distance / 800) + 4,
      stops: 1,
      stopCity: ['LON', 'DXB', 'SIN'][Math.floor(Math.random() * 3)],
      priceUsd: Math.round(basePrice * 0.78),
      seatsLeft: 12
    },
    {
      flightId: 'FL-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      carrier: 'PremiumJets',
      carrierCode: 'PJ' + Math.floor(Math.random() * 999),
      origin, destination, departDate, returnDate, passengers, cabinClass,
      departTime: departDate + 'T22:15:00Z',
      arriveTime: departDate + 'T' + (22 + Math.round(distance / 900)) + ':15:00Z',
      durationHours: Math.round(distance / 900),
      stops: 0,
      priceUsd: Math.round(basePrice * 1.25),
      seatsLeft: 3,
      premium: true
    }
  ].sort((a, b) => a.priceUsd - b.priceUsd);
}

function mockHotelSearch({ city, checkIn, checkOut, guests, minStars = 0, maxPriceUsd = null }) {
  const nights = daysBetween(checkIn, checkOut);
  const basePrice = Math.max(50, Math.round((city.length * 25) + Math.random() * 100));
  const hotels = [
    { name: `${city} Grand Hotel`, stars: 5, pricePerNight: basePrice * 2.5, amenities: ['pool', 'spa', 'wifi', 'breakfast'] },
    { name: `${city} Boutique Inn`, stars: 4, pricePerNight: basePrice * 1.5, amenities: ['wifi', 'breakfast'] },
    { name: `${city} Express`, stars: 3, pricePerNight: basePrice * 0.9, amenities: ['wifi'] },
    { name: `${city} Hostel Central`, stars: 2, pricePerNight: basePrice * 0.4, amenities: ['wifi', 'shared-bath'] },
    { name: `${city} Luxury Resort`, stars: 5, pricePerNight: basePrice * 4, amenities: ['pool', 'spa', 'beach', 'wifi', 'breakfast', 'golf'] },
    { name: `${city} Budget Inn`, stars: 2, pricePerNight: basePrice * 0.3, amenities: ['wifi'] },
    { name: `${city} Central Lodge`, stars: 3, pricePerNight: basePrice * 1.1, amenities: ['wifi', 'parking'] }
  ].filter((h) => h.stars >= minStars)
    .filter((h) => !maxPriceUsd || h.pricePerNight * nights <= maxPriceUsd / guests)
    .map((h) => ({
      hotelId: 'HTL-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      ...h,
      totalUsd: Math.round(h.pricePerNight * nights),
      rating: 3.5 + Math.random() * 1.5
    }))
    .sort((a, b) => a.pricePerNight - b.pricePerNight);
  return hotels;
}

function planItinerary({ city, days, interests, pace, budgetUsd }) {
  const perDayBudget = budgetUsd / days;
  const activityDuration = pace === 'relaxed' ? 3 : pace === 'packed' ? 6 : 4;

  const attractions = generateAttractions(city, interests, days * 3);
  const itinerary = [];

  for (let d = 0; d < days; d++) {
    const dayActivities = [];
    for (let slot = 0; slot < 3; slot++) {
      const attraction = attractions[d * 3 + slot];
      if (!attraction) break;
      dayActivities.push({
        time: ['09:00', '14:00', '19:00'][slot],
        attraction: attraction.name,
        type: attraction.type,
        durationHours: activityDuration,
        estimatedCostUsd: attraction.estimatedCostUsd
      });
    }
    itinerary.push({
      day: d + 1,
      date: new Date(Date.now() + d * 24 * 3600 * 1000).toISOString().slice(0, 10),
      theme: ['Arrival & Explore', 'Cultural Highlights', 'Local Experience', 'Nature & Adventure', 'Departure & Shopping'][d] || `Day ${d + 1}`,
      activities: dayActivities,
      dayBudgetUsd: Math.round(perDayBudget),
      estimatedCostUsd: dayActivities.reduce((s, a) => s + (a.estimatedCostUsd || 0), 0)
    });
  }

  return {
    city,
    days,
    pace,
    totalBudgetUsd: budgetUsd,
    itinerary,
    tips: generateTravelTips(city, pace)
  };
}

function generateAttractions(city, interests, count) {
  const types = ['landmark', 'museum', 'restaurant', 'park', 'market', 'viewpoint', 'experience', 'shopping'];
  const preferred = (interests && interests.length > 0) ? interests : types;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      name: `${city} ${['Old Town', 'Cathedral', 'Art Museum', 'Central Park', 'Food Market', 'Skyline View', 'Cultural Show', 'Shopping District'][i % 8]}`,
      type: preferred[i % preferred.length] || 'landmark',
      estimatedCostUsd: 15 + (i * 13) % 80
    });
  }
  return out;
}

function generateTravelTips(city, pace) {
  const tips = [
    `Book ${city} attractions 2-3 days in advance for best prices.`,
    pace === 'packed' ? 'Wear comfortable shoes — you\'ll be walking 15K+ steps/day.' : 'Take breaks between activities to soak in the atmosphere.',
    'Use local public transit instead of taxis — saves 60-70%.',
    'Try the street food. It\'s usually the best meal you\'ll have.'
  ];
  return tips;
}

function haversineKm(a, b) {
  if (!a.lat || !b.lat) return 5000;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

// Only start the server when run directly (not when imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[genie-travel] listening on :${PORT}`);
    console.log(`[genie-travel] vision role: travel`);
    console.log(`[genie-travel] auth: ${REQUIRE_AUTH ? 'required' : 'disabled'}`);
  });
}

module.exports = { app, mockFlightSearch, mockHotelSearch, planItinerary, haversineKm, daysBetween };