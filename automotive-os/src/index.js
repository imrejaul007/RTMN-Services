import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5080;
const logger = winston.createLogger({ level: 'info', format: winston.format.combine(winston.format.timestamp(), winston.format.json()), transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })] });
app.use(helmet()); app.use(cors()); app.use(express.json());

const vehicles = new Map(), customers = new Map(), services = new Map(), appointments = new Map(), invoices = new Map();

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'automotive-os', version: '1.0.0' }));

app.get('/api/vehicles', (req, res) => {
  let result = Array.from(vehicles.values());
  if (req.query.status) result = result.filter(v => v.status === req.query.status);
  if (req.query.brand) result = result.filter(v => v.brand === req.query.brand);
  res.json({ success: true, count: result.length, vehicles: result });
});

app.post('/api/vehicles', (req, res) => {
  const { make, model, year, vin, licensePlate, customerId, mileage } = req.body;
  if (!make || !model || !vin) return res.status(400).json({ success: false, error: 'make, model, and VIN required' });
  const vehicle = { id: uuidv4(), make, model, year: year || 2026, vin, licensePlate: licensePlate || null, customerId: customerId || null, mileage: mileage || 0, status: 'active', createdAt: new Date().toISOString() };
  vehicles.set(vehicle.id, vehicle);
  res.status(201).json({ success: true, vehicle });
});

app.get('/api/customers', (req, res) => res.json({ success: true, count: customers.size, customers: Array.from(customers.values()) }));
app.post('/api/customers', (req, res) => {
  const { name, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const customer = { id: uuidv4(), name, email: email || null, phone: phone || null, address: address || {}, status: 'active', createdAt: new Date().toISOString() };
  customers.set(customer.id, customer);
  res.status(201).json({ success: true, customer });
});

app.get('/api/services', (req, res) => res.json({ success: true, count: services.size, services: Array.from(services.values()) }));
app.post('/api/services', (req, res) => {
  const { name, category, price, duration, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const service = { id: uuidv4(), name, category: category || 'general', price: price || 0, duration: duration || 60, description: description || '', status: 'active', createdAt: new Date().toISOString() };
  services.set(service.id, service);
  res.status(201).json({ success: true, service });
});

app.get('/api/appointments', (req, res) => res.json({ success: true, count: appointments.size, appointments: Array.from(appointments.values()) }));
app.post('/api/appointments', (req, res) => {
  const { vehicleId, serviceId, date, time, notes } = req.body;
  if (!vehicleId || !serviceId || !date) return res.status(400).json({ success: false, error: 'vehicleId, serviceId, and date required' });
  const appt = { id: uuidv4(), vehicleId, serviceId, date, time: time || '09:00', notes: notes || '', status: 'scheduled', createdAt: new Date().toISOString() };
  appointments.set(appt.id, appt);
  res.status(201).json({ success: true, appointment: appt });
});

app.get('/api/analytics', (req, res) => {
  res.json({ success: true, analytics: { totalVehicles: vehicles.size, totalCustomers: customers.size, totalServices: services.size, totalAppointments: appointments.size, scheduledAppointments: Array.from(appointments.values()).filter(a => a.status === 'scheduled').length } });
});

app.use((err, req, res) => { logger.error(err); res.status(500).json({ success: false, error: err.message }); });
app.listen(PORT, () => logger.info(`🚗 Automotive OS running on port ${PORT}`));
export default app;
