import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5090;
const logger = winston.createLogger({ level: 'info', format: winston.format.combine(winston.format.timestamp(), winston.format.json()), transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })] });
app.use(helmet()); app.use(cors()); app.use(express.json());

const clients = new Map(), services = new Map(), staff = new Map(), appointments = new Map(), products = new Map();

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'beauty-os', version: '1.0.0' }));

app.get('/api/clients', (req, res) => res.json({ success: true, count: clients.size, clients: Array.from(clients.values()) }));
app.post('/api/clients', (req, res) => {
  const { name, email, phone, preferences } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const client = { id: uuidv4(), name, email: email || null, phone: phone || null, preferences: preferences || {}, loyaltyPoints: 0, status: 'active', createdAt: new Date().toISOString() };
  clients.set(client.id, client);
  res.status(201).json({ success: true, client });
});

app.get('/api/services', (req, res) => {
  let result = Array.from(services.values());
  if (req.query.category) result = result.filter(s => s.category === req.query.category);
  res.json({ success: true, count: result.length, services: result });
});
app.post('/api/services', (req, res) => {
  const { name, category, price, duration } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const service = { id: uuidv4(), name, category: category || 'general', price: price || 0, duration: duration || 60, status: 'active', createdAt: new Date().toISOString() };
  services.set(service.id, service);
  res.status(201).json({ success: true, service });
});

app.get('/api/staff', (req, res) => res.json({ success: true, count: staff.size, staff: Array.from(staff.values()) }));
app.post('/api/staff', (req, res) => {
  const { name, role, specialties } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const member = { id: uuidv4(), name, role: role || 'stylist', specialties: specialties || [], status: 'available', createdAt: new Date().toISOString() };
  staff.set(member.id, member);
  res.status(201).json({ success: true, staff: member });
});

app.get('/api/appointments', (req, res) => res.json({ success: true, count: appointments.size, appointments: Array.from(appointments.values()) }));
app.post('/api/appointments', (req, res) => {
  const { clientId, serviceId, staffId, date, time } = req.body;
  if (!clientId || !serviceId || !date) return res.status(400).json({ success: false, error: 'clientId, serviceId, and date required' });
  const appt = { id: uuidv4(), clientId, serviceId, staffId: staffId || null, date, time: time || '10:00', status: 'scheduled', createdAt: new Date().toISOString() };
  appointments.set(appt.id, appt);
  res.status(201).json({ success: true, appointment: appt });
});

app.get('/api/products', (req, res) => res.json({ success: true, count: products.size, products: Array.from(products.values()) }));
app.post('/api/products', (req, res) => {
  const { name, category, price, stock } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const product = { id: uuidv4(), name, category: category || 'skincare', price: price || 0, stock: stock || 0, status: 'active', createdAt: new Date().toISOString() };
  products.set(product.id, product);
  res.status(201).json({ success: true, product });
});

app.get('/api/analytics', (req, res) => {
  res.json({ success: true, analytics: { totalClients: clients.size, totalServices: services.size, totalStaff: staff.size, totalAppointments: appointments.size, totalProducts: products.size } });
});

app.use((err, req, res) => { logger.error(err); res.status(500).json({ success: false, error: err.message }); });
app.listen(PORT, () => logger.info(`💄 Beauty OS running on port ${PORT}`));
export default app;
