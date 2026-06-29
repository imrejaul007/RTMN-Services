/**
 * Beauty Industry Extension
 *
 * Port: 5090
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {
  appointmentService,
  stylistService,
  serviceCatalog,
  membershipService,
} from './service';

const PORT = process.env.PORT || 5090;
const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'beauty-extension', version: '1.0.0', port: PORT });
});

// ============================================
// APPOINTMENTS
// ============================================

app.get('/api/appointments', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  const { date, stylistId } = req.query;
  res.json({ appointments: appointmentService.list(tenantId, { date: date as string, stylistId: stylistId as string }) });
});

app.post('/api/appointments', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  const appt = appointmentService.create(tenantId, req.body);
  res.status(201).json(appt);
});

app.patch('/api/appointments/:id/status', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  const appt = appointmentService.updateStatus(tenantId, req.params.id, req.body.status);
  appt ? res.json(appt) : res.status(404).json({ error: 'Not found' });
});

// ============================================
// STYLISTS
// ============================================

app.get('/api/stylists', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  res.json({ stylists: stylistService.list(tenantId) });
});

app.post('/api/stylists', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  const stylist = stylistService.create(tenantId, req.body);
  res.status(201).json(stylist);
});

// ============================================
// SERVICES
// ============================================

app.get('/api/services', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  const { category } = req.query;
  res.json({ services: serviceCatalog.list(tenantId, category as string) });
});

app.post('/api/services', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  const service = serviceCatalog.create(tenantId, req.body);
  res.status(201).json(service);
});

// ============================================
// MEMBERSHIPS
// ============================================

app.get('/api/memberships', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  res.json({ message: 'GET memberships - use service connector' });
});

app.post('/api/memberships', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  const mem = membershipService.create(tenantId, req.body);
  res.status(201).json(mem);
});

app.post('/api/memberships/:id/visit', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) { res.status(401).json({ error: 'Missing X-Tenant-ID' }); return; }
  const mem = membershipService.useVisit(tenantId, req.params.id);
  mem ? res.json(mem) : res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Beauty Extension running on port ${PORT}`);
});

export default app;
