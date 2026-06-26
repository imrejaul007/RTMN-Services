/**
 * DO Mobility - Passenger App
 * Port: 4610
 * Voice-first ride booking
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors(), express.json());

const PORT = 4610;

// In-memory stores
const users = new Map();
const rides = new Map();

// Demo user
const demoUser = {
  id: 'user_1',
  name: 'Rahul Sharma',
  phone: '+919876543210',
  wallet: 2500,
  rating: 4.8,
  home: 'Koramangala, Bangalore',
  work: 'MG Road, Bangalore'
};
users.set(demoUser.id, demoUser);

app.get('/health', (_, res) => res.json({ status: 'ok', app: 'do-mobility-passenger', port: PORT }));

// Voice booking endpoint
app.post('/api/book/voice', (req, res) => {
  const { command, userId = demoUser.id } = req.body;

  // Parse voice command
  let destination = 'Airport';
  let time = 'now';
  let vehicleType = 'auto';

  if (command?.toLowerCase().includes('premier') || command?.toLowerCase().includes('sedan')) vehicleType = 'sedan';
  if (command?.toLowerCase().includes('suv') || command?.toLowerCase().includes('xl')) vehicleType = 'suv';
  if (command?.toLowerCase().includes('auto')) vehicleType = 'auto';
  if (command?.toLowerCase().includes('7 am')) time = '7:00 AM';
  if (command?.toLowerCase().includes('8 am')) time = '8:00 AM';

  // Create ride
  const ride = {
    id: uuidv4(),
    userId,
    pickup: demoUser.home,
    destination,
    time,
    vehicleType,
    fare: vehicleType === 'auto' ? 180 : vehicleType === 'sedan' ? 250 : 350,
    status: 'matching',
    createdAt: new Date().toISOString()
  };
  rides.set(ride.id, ride);

  // Simulate driver match
  setTimeout(() => {
    ride.status = 'driver_assigned';
    ride.driver = { name: 'Ramesh K.', rating: 4.9, phone: '+919988776655', vehicle: 'Maruti Swift' };
    ride.eta = '4 mins';
  }, 2000);

  res.json({
    success: true,
    ride,
    message: `Booking ${vehicleType} to ${destination}`,
    voice: `Driver Ramesh will arrive in 4 minutes. Fare ₹${ride.fare}`
  });
});

// Quick booking
app.post('/api/book', (req, res) => {
  const { destination, vehicleType = 'auto', userId = demoUser.id } = req.body;

  const fares = { auto: 180, sedan: 250, suv: 350, bike: 60 };
  const ride = {
    id: uuidv4(),
    userId,
    pickup: demoUser.home,
    destination,
    vehicleType,
    fare: fares[vehicleType] || 180,
    status: 'matching',
    createdAt: new Date().toISOString()
  };
  rides.set(ride.id, ride);

  res.status(201).json({ success: true, ride });
});

// Get ride status
app.get('/api/rides/:id', (req, res) => {
  const ride = rides.get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  res.json({ success: true, ride });
});

// Trip history
app.get('/api/rides', (req, res) => {
  const userRides = Array.from(rides.values()).filter(r => r.userId === demoUser.id);
  res.json({ success: true, count: userRides.length, rides: userRides });
});

// User profile
app.get('/api/user', (req, res) => {
  res.json({ success: true, user: demoUser });
});

// Wallet
app.get('/api/wallet', (req, res) => {
  res.json({ success: true, balance: demoUser.wallet, currency: 'INR' });
});

app.listen(PORT, () => console.log(`
╔═══════════════════════════════╗
║  DO Mobility — Passenger  ║
║  PORT ${PORT}               ║
║  Voice-first booking      ║
╚═══════════════════════════════╝
`));

export default app;
