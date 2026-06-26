/**
 * CrisisOS - Port: 4863
 *
 * Incidents, war rooms, disaster recovery, business continuity
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4863', 10);
app.use(express.json());

interface Incident { id: string; title: string; severity: 'low' | 'medium' | 'high' | 'critical'; status: 'detected' | 'investigating' | 'mitigating' | 'resolved'; affected: string[]; timeline: any[]; createdAt: string; }
interface Playbook { id: string; name: string; trigger: string; steps: any[]; }
interface Backup { id: string; type: string; frequency: string; lastRun?: string; status: 'active' | 'paused'; }
interface WarRoom { id: string; incidentId: string; participants: string[]; status: 'active' | 'closed'; link?: string; }

const incidents = new Map();
const playbooks = new Map();
const backups = new Map();
const warRooms = new Map();

const defaults: Playbook[] = [
  { id: 'aws_outage', name: 'AWS Outage Response', trigger: 'cloud_provider.down', steps: [{ order: 1, action: 'Activate backup region' }, { order: 2, action: 'Notify stakeholders' }] },
  { id: 'data_breach', name: 'Data Breach Protocol', trigger: 'security.breach', steps: [{ order: 1, action: 'Contain and isolate' }, { order: 2, action: 'Legal notification' }, { order: 3, action: 'Customer communication' }] },
];

defaults.forEach(p => playbooks.set(p.id, p));

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'crisis-os' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/incidents', (req, res) => {
  const { status, severity } = req.query;
  let all = Array.from(incidents.values());
  if (status) all = all.filter(i => i.status === status);
  if (severity) all = all.filter(i => i.severity === severity);
  res.json({ success: true, data: { incidents: all } });
});

app.post('/api/incidents', (req, res) => {
  const { title, severity, affected } = req.body;
  const incident: Incident = { id: uuidv4(), title, severity: severity || 'medium', status: 'detected', affected: affected || [], timeline: [], createdAt: new Date().toISOString() };
  incidents.set(incident.id, incident);
  res.status(201).json({ success: true, data: incident });
});

app.patch('/api/incidents/:id', (req, res) => {
  const i = incidents.get(req.params.id);
  if (!i) return res.status(404).json({ success: false });
  Object.assign(i, req.body);
  res.json({ success: true, data: i });
});

app.post('/api/incidents/:id/timeline', (req, res) => {
  const i = incidents.get(req.params.id);
  if (!i) return res.status(404).json({ success: false });
  i.timeline.push({ ...req.body, timestamp: new Date().toISOString() });
  res.json({ success: true, data: i });
});

app.get('/api/playbooks', (_r, res) => res.json({ success: true, data: { playbooks: Array.from(playbooks.values()) } }));

app.post('/api/war-rooms', (req, res) => {
  const { incidentId, participants } = req.body;
  const room = { id: uuidv4(), incidentId, participants: participants || [], status: 'active' };
  warRooms.set(room.id, room);
  res.status(201).json({ success: true, data: room });
});

app.get('/api/backups', (_r, res) => res.json({ success: true, data: { backups: Array.from(backups.values()) } }));

app.listen(PORT, () => console.log(`CrisisOS - Port ${PORT}`));
process.on('SIGTERM', () => process.exit(0));
export default app;
