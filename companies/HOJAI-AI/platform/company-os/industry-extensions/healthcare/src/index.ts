/**
 * Healthcare Extension - Patients, Appointments, Prescriptions, Billing
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5020;

interface Store { patients: Map<string, any>; appointments: Map<string, any>; prescriptions: Map<string, any>; invoices: Map<string, any>; }
const stores = new Map<string, Store>();
const getStore = (tid: string) => {
  if (!stores.has(tid)) stores.set(tid, { patients: new Map(), appointments: new Map(), prescriptions: new Map(), invoices: new Map() });
  return stores.get(tid)!;
};

app.get('/api/patients', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ patients: Array.from(getStore(tid).patients.values()) });
});
app.post('/api/patients', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const patient = { id: `pat_${uuidv4().slice(0,8)}`, tenantId: tid, ...req.body };
  getStore(tid).patients.set(patient.id, patient);
  res.status(201).json(patient);
});
app.get('/api/appointments', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ appointments: Array.from(getStore(tid).appointments.values()) });
});
app.post('/api/appointments', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const apt = { id: `apt_${uuidv4().slice(0,8)}`, tenantId: tid, status: 'scheduled', ...req.body };
  getStore(tid).appointments.set(apt.id, apt);
  res.status(201).json(apt);
});
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'healthcare-extension', port: PORT }));
app.listen(PORT, () => console.log(`Healthcare Extension running on port ${PORT}`));
export default app;
