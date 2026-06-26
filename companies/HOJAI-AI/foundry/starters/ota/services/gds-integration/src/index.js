/**
 * GDS Integration Service
 * Port: 4701
 * Connects to: Amadeus, Sabre, Travelport
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors(), express.json());
const PORT = process.env.PORT || 4701;

// ── GDS Providers ────────────────────────────────────────────────

const GDS_PROVIDERS = {
  amadeus: {
    name: 'Amadeus',
    api: 'https://api.amadeus.com/v2',
    auth: 'oauth2',
    supports: ['flights', 'hotels', 'cars', 'trains', 'packages']
  },
  sabre: {
    name: 'Sabre',
    api: 'https://api.sabre.com/v2',
    auth: 'oauth2',
    supports: ['flights', 'hotels', 'cars']
  },
  travelport: {
    name: 'Travelport',
    api: 'https://api.travelport.com/v1',
    auth: 'apikey',
    supports: ['flights', 'hotels', 'cars', 'rail']
  }
};

// ── Flight Search ─────────────────────────────────────────────────

const AIRLINES = [
  { code: 'AI', name: 'Air India', logo: '🇮🇳' },
  { code: 'UK', name: 'Vistara', logo: '✈️' },
  { code: '6E', name: 'IndiGo', logo: '🔵' },
  { code: 'SG', name: 'SpiceJet', logo: '🟠' },
  { code: 'G8', name: 'GoAir', logo: '🟢' },
  { code: 'I5', name: 'AirAsia India', logo: '🔴' }
];

const ROUTES = [
  { from: 'BOM', to: 'DEL', name: 'Mumbai → Delhi' },
  { from: 'DEL', to: 'BOM', name: 'Delhi → Mumbai' },
  { from: 'BOM', to: 'BLR', name: 'Mumbai → Bangalore' },
  { from: 'DEL', to: 'BLR', name: 'Delhi → Bangalore' },
  { from: 'BOM', to: 'MAA', name: 'Mumbai → Chennai' },
  { from: 'DEL', to: 'GOI', name: 'Delhi → Goa' },
];

// ── Routes ───────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'gds-integration' }));

// List GDS providers
app.get('/api/providers', (_, res) => {
  res.json({
    success: true,
    providers: Object.entries(GDS_PROVIDERS).map(([id, p]) => ({ id, name: p.name, supports: p.supports }))
  });
});

// Search flights
app.get('/api/flights/search', async (req, res) => {
  const { origin, destination, departureDate, returnDate, adults, children, infants, travelClass } = req.query;

  // Simulate GDS search
  const flights = [];
  const route = ROUTES.find(r => r.from === origin && r.to === destination) || ROUTES[0];

  for (const airline of AIRLINES.slice(0, 5)) {
    const departTime = `${String(Math.floor(Math.random() * 12) + 5).padStart(2, '0')}:${Math.random() > 0.5 ? '00' : '30'}`;
    const duration = 120 + Math.floor(Math.random() * 60);

    flights.push({
      id: `${airline.code}${Date.now()}${Math.random().toString(36).substr(2, 4)}`.toUpperCase(),
      airline: airline.name,
      airlineCode: airline.code,
      logo: airline.logo,
      origin,
      destination,
      departureDate,
      departureTime: departTime,
      arrivalTime: `${String(Math.floor((parseInt(departTime.split(':')[0]) + Math.floor(duration/60)) % 24).toString().padStart(2,'0'))}:${parseInt(departTime.split(':')[1]) + (duration % 60) > 59 ? '30' : departTime.split(':')[1]}`,
      duration,
      stops: Math.random() > 0.7 ? 1 : 0,
      travelClass: travelClass || 'economy',
      price: {
        base: Math.floor(3000 + Math.random() * 5000),
        taxes: Math.floor(500 + Math.random() * 1000),
        total: Math.floor(3500 + Math.random() * 6000)
      },
      seats: Math.floor(5 + Math.random() * 20),
      gds: 'amadeus',
      fareType: Math.random() > 0.5 ? 'refundable' : 'non-refundable',
      baggage: { cabin: '7kg', checkin: '15kg' }
    });
  }

  // Sort by price
  flights.sort((a, b) => a.price.total - b.price.total);

  res.json({
    success: true,
    count: flights.length,
    flights,
    searchId: `S${Date.now()}`,
    searchedAt: new Date().toISOString()
  });
});

// Book flight
app.post('/api/flights/book', async (req, res) => {
  const { flightId, passengers, contact, paymentMethod } = req.body;

  if (!flightId || !passengers || passengers.length === 0) {
    return res.status(400).json({ error: 'flightId and passengers required' });
  }

  // Create PNR (Passenger Name Record)
  const pnr = Math.random().toString(36).substr(2, 6).toUpperCase();
  const bookingRef = `OTA${pnr}`;

  const booking = {
    id: `BK${Date.now()}`,
    pnr,
    bookingRef,
    flightId,
    passengers: passengers.map((p, i) => ({
      ...p,
      seat: `ABCDEFGHJKL`[Math.floor(Math.random() * 12)] + (Math.floor(Math.random() * 30) + 1)
    })),
    contact,
    paymentMethod,
    status: 'confirmed',
    gdsConfirmation: `AMD${Date.now()}`,
    eTicket: `${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
    issuedAt: new Date().toISOString()
  };

  res.status(201).json({ success: true, booking });
});

// Get booking
app.get('/api/flights/booking/:pnr', async (req, res) => {
  const { pnr } = req.params;

  // Simulate fetching booking
  const booking = {
    pnr,
    status: 'confirmed',
    flight: ROUTES[0],
    passengers: [{ name: 'DEMO PASSENGER', seat: '12A' }]
  };

  res.json({ success: true, booking });
});

// Cancel booking
app.post('/api/flights/cancel/:pnr', async (req, res) => {
  const { pnr } = req.params;
  const { reason, refundAmount } = req.body;

  res.json({
    success: true,
    cancellation: {
      pnr,
      status: 'cancelled',
      reason: reason || 'Customer request',
      refundAmount: refundAmount || 3500,
      refundStatus: 'processing',
      refundDays: '7-10 business days',
      cancelledAt: new Date().toISOString()
    }
  });
});

// Fare rules
app.get('/api/flights/fare-rules/:flightId', async (req, res) => {
  const { flightId } = req.params;

  res.json({
    success: true,
    fareRules: {
      flightId,
      cancellation: {
        beforeDeparture: { refundable: true, penalty: 500 },
        within24Hours: { refundable: true, penalty: 0 },
        afterBooking: { refundable: false, penalty: 0 }
      },
      baggage: { cabin: '7kg', checkin: '15kg' },
      meals: false,
      seatSelection: true,
      changeFee: 500
    }
  });
});

// Seat map
app.get('/api/flights/seats/:flightId', async (req, res) => {
  const { flightId } = req.params;

  const rows = [];
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let r = 1; r <= 30; r++) {
    const seats = [];
    for (const c of cols) {
      seats.push({
        id: `${r}${c}`,
        type: r <= 3 ? 'exit' : r <= 10 ? 'extra' : 'standard',
        price: r <= 3 ? 500 : r <= 10 ? 300 : 0,
        available: Math.random() > 0.3
      });
    }
    rows.push({ row: r, seats });
  }

  res.json({ success: true, seatMap: rows });
});

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════╗
║  GDS Integration — PORT ${PORT}         ║
║  Amadeus • Sabre • Travelport     ║
╠══════════════════════════════════════════╣
║  GET  /api/flights/search — Search  ║
║  POST /api/flights/book     — Book   ║
║  GET  /api/seats/:flightId  — Seats  ║
║  GET  /api/fare-rules/:id   — Rules  ║
╚══════════════════════════════════════════╝
`));

export default app;
