// aviation-os (5273) - Aviation Management.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'aviation-os';
const PORT = parseInt(process.env.PORT || '5273', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const aircraft = new Map();   // acId -> { id, tail_number, model, manufacturer, capacity, range_km, status, hours_flown }
const flights = new Map();    // flId -> { id, flight_number, aircraft_id, origin, destination, departure_at, arrival_at, status, base_price }
const bookings = new Map();   // bId -> { id, flight_id, passenger_id, seat, class, price, status, pnr, created }
const passengers = new Map(); // pId -> { id, name, email, passport, loyalty_tier, miles }
const crews = new Map();      // cId -> { id, name, role, certifications[], assigned_flight_id, hours_logged }
const maintenance = new Map(); // mId -> { id, aircraft_id, type, performed_at, hours, technician, notes, next_due_hours }
const airports = new Map();   // apId -> { id, iata, name, city, country, timezone }

// Seed
(function seed() {
  ['N123AA', 'N456BB'].forEach(tail => {
    const id = uuid();
    aircraft.set(id, { id, tail_number: tail, model: '737-800', manufacturer: 'Boeing',
      capacity: 189, range_km: 5400, status: 'active', hours_flown: 12500 });
  });
  ['LAX', 'JFK', 'ORD'].forEach(iata => {
    const id = uuid();
    const airports_seed = {
      LAX: { name: 'Los Angeles International', city: 'Los Angeles', country: 'USA', timezone: 'America/Los_Angeles' },
      JFK: { name: 'John F. Kennedy International', city: 'New York', country: 'USA', timezone: 'America/New_York' },
      ORD: { name: 'O\'Hare International', city: 'Chicago', country: 'USA', timezone: 'America/Chicago' }
    };
    airports.set(id, { id, iata, ...airports_seed[iata] });
  });
  // Seed a flight
  const ac = [...aircraft.values()][0];
  const la = [...airports.values()].find(a => a.iata === 'LAX');
  const ny = [...airports.values()].find(a => a.iata === 'JFK');
  flights.set(uuid(), { id: uuid(), flight_number: 'AA100', aircraft_id: ac.id,
    origin: la.id, destination: ny.id,
    departure_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    arrival_at: new Date(Date.now() + 28 * 3600 * 1000).toISOString(),
    status: 'scheduled', base_price: 350 });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/aircraft', '/api/flights', '/api/bookings', '/api/passengers', '/api/crews', '/api/maintenance', '/api/airports']
})));

// Aircraft
app.get('/api/aircraft', (_req, res) => res.json(ok({ aircraft: [...aircraft.values()] })));
app.post('/api/aircraft', (req, res) => {
  const { tail_number, model, manufacturer, capacity = 0, range_km = 0 } = req.body || {};
  if (!tail_number || !model) return res.status(400).json(fail('tail_number + model required'));
  const id = uuid();
  aircraft.set(id, { id, tail_number, model, manufacturer: manufacturer || 'unknown',
    capacity, range_km, status: 'active', hours_flown: 0 });
  res.status(201).json(ok({ aircraft: aircraft.get(id) }));
});

// Airports
app.get('/api/airports', (_req, res) => res.json(ok({ airports: [...airports.values()] })));
app.post('/api/airports', (req, res) => {
  const { iata, name, city, country = 'USA', timezone = 'UTC' } = req.body || {};
  if (!iata || !name) return res.status(400).json(fail('iata + name required'));
  const id = uuid();
  airports.set(id, { id, iata: iata.toUpperCase(), name, city, country, timezone });
  res.status(201).json(ok({ airport: airports.get(id) }));
});

// Flights
app.get('/api/flights', (req, res) => {
  let list = [...flights.values()];
  if (req.query.status) list = list.filter(f => f.status === req.query.status);
  if (req.query.flight_number) list = list.filter(f => f.flight_number === req.query.flight_number);
  res.json(ok({ flights: list }));
});
app.post('/api/flights', (req, res) => {
  const { flight_number, aircraft_id, origin, destination, departure_at, arrival_at, base_price = 0 } = req.body || {};
  if (!flight_number || !aircraft_id || !origin || !destination || !departure_at) {
    return res.status(400).json(fail('flight_number + aircraft_id + origin + destination + departure_at required'));
  }
  if (!aircraft.has(aircraft_id)) return res.status(400).json(fail('aircraft_id invalid'));
  if (!airports.has(origin)) return res.status(400).json(fail('origin invalid'));
  if (!airports.has(destination)) return res.status(400).json(fail('destination invalid'));
  const id = uuid();
  flights.set(id, { id, flight_number, aircraft_id, origin, destination, departure_at,
    arrival_at: arrival_at || null, status: 'scheduled', base_price });
  res.status(201).json(ok({ flight: flights.get(id) }));
});
app.patch('/api/flights/:id', (req, res) => {
  const f = flights.get(req.params.id);
  if (!f) return res.status(404).json(fail('flight not found'));
  ['status', 'departure_at', 'arrival_at', 'base_price'].forEach(k => { if (req.body[k] !== undefined) f[k] = req.body[k]; });
  flights.set(f.id, f);
  res.json(ok({ flight: f }));
});

// Passengers
app.get('/api/passengers', (_req, res) => res.json(ok({ passengers: [...passengers.values()] })));
app.post('/api/passengers', (req, res) => {
  const { name, email, passport, loyalty_tier = 'standard' } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  passengers.set(id, { id, name, email: email || null, passport: passport || null, loyalty_tier, miles: 0 });
  res.status(201).json(ok({ passenger: passengers.get(id) }));
});

// Bookings
app.get('/api/bookings', (req, res) => {
  let list = [...bookings.values()];
  if (req.query.flight_id) list = list.filter(b => b.flight_id === req.query.flight_id);
  if (req.query.passenger_id) list = list.filter(b => b.passenger_id === req.query.passenger_id);
  res.json(ok({ bookings: list }));
});
app.post('/api/bookings', (req, res) => {
  const { flight_id, passenger_id, seat, class: cls = 'economy' } = req.body || {};
  if (!flight_id || !passenger_id || !seat) return res.status(400).json(fail('flight_id + passenger_id + seat required'));
  if (!flights.has(flight_id)) return res.status(400).json(fail('flight_id invalid'));
  if (!passengers.has(passenger_id)) return res.status(400).json(fail('passenger_id invalid'));
  const f = flights.get(flight_id);
  const ac = aircraft.get(f.aircraft_id);
  // Seat conflict
  const taken = [...bookings.values()].find(b => b.flight_id === flight_id && b.seat === seat && b.status !== 'cancelled');
  if (taken) return res.status(400).json(fail(`seat ${seat} already taken`));
  // Check capacity
  const seatsTaken = [...bookings.values()].filter(b => b.flight_id === flight_id && b.status !== 'cancelled').length;
  if (seatsTaken >= ac.capacity) return res.status(400).json(fail('flight full'));
  const classMultiplier = { economy: 1.0, business: 2.5, first: 4.0 };
  const price = +(f.base_price * (classMultiplier[cls] || 1.0)).toFixed(2);
  const id = uuid();
  const pnr = String(Math.random()).slice(2, 8);
  bookings.set(id, { id, flight_id, passenger_id, seat, class: cls, price, status: 'confirmed', pnr,
    created: new Date().toISOString() });
  // Award miles
  const p = passengers.get(passenger_id);
  p.miles += Math.floor(price / 10);
  passengers.set(p.id, p);
  res.status(201).json(ok({ booking: bookings.get(id) }));
});

// Crews
app.get('/api/crews', (req, res) => {
  let list = [...crews.values()];
  if (req.query.role) list = list.filter(c => c.role === req.query.role);
  res.json(ok({ crews: list }));
});
app.post('/api/crews', (req, res) => {
  const { name, role = 'pilot', certifications = [], assigned_flight_id = null } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  if (assigned_flight_id && !flights.has(assigned_flight_id)) return res.status(400).json(fail('assigned_flight_id invalid'));
  const id = uuid();
  crews.set(id, { id, name, role, certifications, assigned_flight_id, hours_logged: 0 });
  res.status(201).json(ok({ crew: crews.get(id) }));
});

// Maintenance
app.get('/api/maintenance', (req, res) => {
  let list = [...maintenance.values()];
  if (req.query.aircraft_id) list = list.filter(m => m.aircraft_id === req.query.aircraft_id);
  res.json(ok({ maintenance: list }));
});
app.post('/api/maintenance', (req, res) => {
  const { aircraft_id, type, hours, technician, notes = '', next_due_hours = 0 } = req.body || {};
  if (!aircraft_id || !type || hours === undefined || !technician) return res.status(400).json(fail('aircraft_id + type + hours + technician required'));
  if (!aircraft.has(aircraft_id)) return res.status(400).json(fail('aircraft_id invalid'));
  const id = uuid();
  maintenance.set(id, { id, aircraft_id, type, performed_at: new Date().toISOString(),
    hours, technician, notes, next_due_hours });
  // Update aircraft hours_flown
  const ac = aircraft.get(aircraft_id);
  ac.hours_flown += hours;
  aircraft.set(ac.id, ac);
  res.status(201).json(ok({ maintenance_log: maintenance.get(id) }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
