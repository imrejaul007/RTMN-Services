/**
 * Crisis OS - Production Implementation
 * Incident Management, War Rooms, Business Continuity
 * Port: 4863
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4863;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'mitigating' | 'resolved' | 'cancelled';
  category: 'security' | 'infrastructure' | 'application' | 'data' | 'compliance';
  affectedServices: string[];
  affectedUsers?: number;
  timeline: TimelineEntry[];
  assignees: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  impact?: { revenue?: number; users?: number; sla?: number };
  rootCause?: string;
  resolution?: string;
}

interface TimelineEntry {
  id: string;
  action: string;
  user?: string;
  timestamp: string;
  note?: string;
  attachments?: string[];
}

interface Playbook {
  id: string;
  name: string;
  description: string;
  trigger: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  steps: PlaybookStep[];
  automated: boolean;
  lastRun?: string;
  runCount: number;
}

interface PlaybookStep {
  order: number;
  name: string;
  action: string;
  timeout?: number;
  required: boolean;
  approver?: string;
}

interface WarRoom {
  id: string;
  incidentId: string;
  name: string;
  participants: WarRoomParticipant[];
  status: 'active' | 'closed';
  link?: string;
  createdAt: string;
  notes: string[];
}

interface WarRoomParticipant {
  userId: string;
  name: string;
  role: 'lead' | 'responder' | 'observer';
  joinedAt?: string;
  leftAt?: string;
}

interface Backup {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retention: number;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'failed';
  target: string;
  size?: number;
}

interface DisasterRecovery {
  id: string;
  planName: string;
  rto: number; // Recovery Time Objective in minutes
  rpo: number; // Recovery Point Objective in minutes
  steps: string[];
  testedAt?: string;
  status: 'active' | 'draft' | 'testing';
}

// ============ STORES ============

const incidents = new Map<string, Incident>();
const playbooks = new Map<string, Playbook>();
const warRooms = new Map<string, WarRoom>();
const backups = new Map<string, Backup>();
const drPlans = new Map<string, DisasterRecovery>();

// ============ SEED DATA ============

const defaultPlaybooks: Playbook[] = [
  { id: 'aws-outage', name: 'AWS Outage Response', description: 'Response plan for AWS service disruptions', trigger: 'cloud_provider.down', severity: 'critical', automated: true, runCount: 5, steps: [{ order: 1, name: 'Check AWS Status', action: 'Check AWS status page and CloudWatch', required: true }, { order: 2, name: 'Activate Backup Region', action: 'Switch to backup region if available', timeout: 30, required: true }, { order: 3, name: 'Notify Stakeholders', action: 'Send incident notification', required: true, approver: 'cto' }, { order: 4, name: 'Update Status Page', action: 'Update public status page', required: true }] },
  { id: 'data-breach', name: 'Data Breach Protocol', description: 'GDPR/security breach response', trigger: 'security.breach', severity: 'critical', automated: false, runCount: 2, steps: [{ order: 1, name: 'Contain', action: 'Isolate affected systems', timeout: 15, required: true }, { order: 2, name: 'Assess', action: 'Determine scope of breach', required: true }, { order: 3, name: 'Legal Notification', action: 'Notify legal team within 72 hours', required: true, approver: 'cmo' }, { order: 4, name: 'Customer Communication', action: 'Notify affected customers', required: true }] },
  { id: 'ddos-attack', name: 'DDoS Attack Response', description: 'DDoS mitigation', trigger: 'network.ddos', severity: 'high', automated: true, runCount: 12, steps: [{ order: 1, name: 'Enable DDoS Protection', action: 'Activate WAF/DDoS protection', required: true }, { order: 2, name: 'Rate Limiting', action: 'Implement rate limiting', required: true }, { order: 3, name: 'IP Blocking', action: 'Block malicious IPs', required: false }] },
  { id: 'db-failure', name: 'Database Failure', description: 'Database failover procedure', trigger: 'database.down', severity: 'high', automated: true, runCount: 8, steps: [{ order: 1, name: 'Check Replica Status', action: 'Verify replica lag', required: true }, { order: 2, name: 'Initiate Failover', action: 'Promote replica to primary', timeout: 5, required: true }, { order: 3, name: 'Update Connection String', action: 'Update app config', required: true }] },
];
defaultPlaybooks.forEach(p => playbooks.set(p.id, p));

const seedBackups: Backup[] = [
  { id: 'backup-prod', name: 'Production Database', type: 'incremental', frequency: 'hourly', retention: 168, status: 'active', target: 's3://backup/prod-db', lastRun: new Date(Date.now() - 3600000).toISOString(), nextRun: new Date(Date.now() + 3600000).toISOString(), size: 50000000000 },
  { id: 'backup-user', name: 'User Data', type: 'daily', frequency: 'daily', retention: 30, status: 'active', target: 's3://backup/user-data', lastRun: new Date(Date.now() - 86400000).toISOString(), nextRun: new Date(Date.now() + 86400000).toISOString(), size: 200000000000 },
  { id: 'backup-config', name: 'Configuration Backup', type: 'full', frequency: 'weekly', retention: 52, status: 'active', target: 's3://backup/config', lastRun: new Date(Date.now() - 604800000).toISOString(), nextRun: new Date(Date.now() + 518400000).toISOString(), size: 1000000000 },
];
seedBackups.forEach(b => backups.set(b.id, b));

// ============ VALIDATION ============

const CreateIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.enum(['security', 'infrastructure', 'application', 'data', 'compliance']),
  affectedServices: z.array(z.string()),
  assignees: z.array(z.string()).optional(),
});

// ============ HEALTH ============

app.get('/health', (_req, res) => res.json({
  status: 'ok', service: 'crisis-os',
  uptime: Math.floor((Date.now() - START_TIME) / 1000),
  incidents: incidents.size, playbooks: playbooks.size, warRooms: warRooms.size,
}));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ INCIDENTS ============

app.get('/api/incidents', (req, res) => {
  const { status, severity, category, assignee } = req.query;
  let result = Array.from(incidents.values());
  if (status) result = result.filter(i => i.status === status);
  if (severity) result = result.filter(i => i.severity === severity);
  if (category) result = result.filter(i => i.category === category);
  if (assignee) result = result.filter(i => i.assignees.includes(assignee as string));
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ total: result.length, incidents: result });
});

app.get('/api/incidents/:id', (req, res) => {
  const incident = incidents.get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  res.json(incident);
});

app.post('/api/incidents', (req, res) => {
  try {
    const data = CreateIncidentSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date().toISOString();

    const incident: Incident = {
      id, ...data,
      status: 'detected',
      timeline: [{ id: uuidv4(), action: 'Incident created', timestamp: now }],
      assignees: data.assignees || [],
      createdBy: req.get('x-user-email') || 'system',
      createdAt: now, updatedAt: now,
    };

    incidents.set(id, incident);

    // Auto-trigger playbooks if matching
    for (const playbook of playbooks.values()) {
      if (playbook.trigger === data.category || playbook.severity === data.severity) {
        // Log playbook suggestion
        incident.timeline.push({ id: uuidv4(), action: `Suggested playbook: ${playbook.name}`, timestamp: now });
      }
    }

    res.status(201).json(incident);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/incidents/:id', (req, res) => {
  const incident = incidents.get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const { status, severity, assignees, rootCause, resolution } = req.body;
  const now = new Date().toISOString();

  if (status && status !== incident.status) {
    incident.status = status;
    incident.timeline.push({ id: uuidv4(), action: `Status changed to ${status}`, timestamp: now, user: req.get('x-user-email') });
    if (status === 'resolved') incident.resolvedAt = now;
  }
  if (severity) incident.severity = severity;
  if (assignees) incident.assignees = assignees;
  if (rootCause) incident.rootCause = rootCause;
  if (resolution) incident.resolution = resolution;
  incident.updatedAt = now;

  res.json(incident);
});

app.post('/api/incidents/:id/timeline', (req, res) => {
  const incident = incidents.get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const { action, note, attachments } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });

  const entry: TimelineEntry = { id: uuidv4(), action, user: req.get('x-user-email'), timestamp: new Date().toISOString(), note, attachments };
  incident.timeline.push(entry);
  incident.updatedAt = new Date().toISOString();

  res.json(entry);
});

app.post('/api/incidents/:id/escalate', (req, res) => {
  const incident = incidents.get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  incident.severity = 'critical';
  incident.timeline.push({ id: uuidv4(), action: 'Incident escalated to critical', timestamp: new Date().toISOString() });
  incident.updatedAt = new Date().toISOString();

  res.json(incident);
});

// ============ PLAYBOOKS ============

app.get('/api/playbooks', (req, res) => {
  const { trigger, severity, automated } = req.query;
  let result = Array.from(playbooks.values());
  if (trigger) result = result.filter(p => p.trigger.includes(trigger as string));
  if (severity) result = result.filter(p => p.severity === severity);
  if (automated === 'true') result = result.filter(p => p.automated);
  res.json({ total: result.length, playbooks: result });
});

app.get('/api/playbooks/:id', (req, res) => {
  const playbook = playbooks.get(req.params.id);
  if (!playbook) return res.status(404).json({ error: 'Playbook not found' });
  res.json(playbook);
});

app.post('/api/playbooks/:id/execute', (req, res) => {
  const playbook = playbooks.get(req.params.id);
  if (!playbook) return res.status(404).json({ error: 'Playbook not found' });

  const { incidentId } = req.body;
  playbook.lastRun = new Date().toISOString();
  playbook.runCount++;

  const execution = {
    playbookId: playbook.id,
    playbookName: playbook.name,
    incidentId,
    startedAt: new Date().toISOString(),
    steps: playbook.steps.map(s => ({ ...s, status: 'pending' })),
  };

  res.json({ execution, message: `Playbook "${playbook.name}" execution started` });
});

app.post('/api/playbooks', (req, res) => {
  const { name, description, trigger, severity, steps, automated } = req.body;
  if (!name || !trigger || !steps?.length) return res.status(400).json({ error: 'name, trigger, steps required' });

  const id = uuidv4();
  playbooks.set(id, { id, name, description: description || '', trigger, severity, steps, automated: automated || false, runCount: 0 });
  res.status(201).json(playbooks.get(id));
});

// ============ WAR ROOMS ============

app.get('/api/war-rooms', (req, res) => {
  const { status, incidentId } = req.query;
  let result = Array.from(warRooms.values());
  if (status) result = result.filter(w => w.status === status);
  if (incidentId) result = result.filter(w => w.incidentId === incidentId);
  res.json({ total: result.length, warRooms: result });
});

app.post('/api/war-rooms', (req, res) => {
  const { incidentId, name, participants } = req.body;
  if (!incidentId || !name) return res.status(400).json({ error: 'incidentId, name required' });

  const id = uuidv4();
  warRooms.set(id, {
    id, incidentId, name,
    participants: participants?.map((p: { userId: string; name: string; role: string }) => ({ ...p, role: p.role || 'observer' })) || [],
    status: 'active',
    link: `https://meet.company.com/war-room-${id.slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    notes: [],
  });

  res.status(201).json(warRooms.get(id));
});

app.post('/api/war-rooms/:id/join', (req, res) => {
  const room = warRooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'War room not found' });

  const { userId, name, role } = req.body;
  const participant = room.participants.find(p => p.userId === userId);
  if (participant) {
    participant.joinedAt = new Date().toISOString();
  } else {
    room.participants.push({ userId, name, role: role || 'observer', joinedAt: new Date().toISOString() });
  }

  res.json(room);
});

app.post('/api/war-rooms/:id/close', (req, res) => {
  const room = warRooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'War room not found' });

  room.status = 'closed';
  room.participants.forEach(p => { if (p.joinedAt && !p.leftAt) p.leftAt = new Date().toISOString(); });

  res.json(room);
});

app.post('/api/war-rooms/:id/notes', (req, res) => {
  const room = warRooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'War room not found' });

  const { note } = req.body;
  room.notes.push(note || '');
  res.json({ notes: room.notes });
});

// ============ BACKUPS ============

app.get('/api/backups', (req, res) => {
  const { status, type } = req.query;
  let result = Array.from(backups.values());
  if (status) result = result.filter(b => b.status === status);
  if (type) result = result.filter(b => b.type === type);
  res.json({ total: result.length, backups: result });
});

app.post('/api/backups', (req, res) => {
  const { name, type, frequency, retention, target } = req.body;
  if (!name || !type || !target) return res.status(400).json({ error: 'name, type, target required' });

  const id = uuidv4();
  backups.set(id, { id, name, type, frequency: frequency || 'daily', retention: retention || 30, status: 'active', target });
  res.status(201).json(backups.get(id));
});

app.post('/api/backups/:id/trigger', (req, res) => {
  const backup = backups.get(req.params.id);
  if (!backup) return res.status(404).json({ error: 'Backup not found' });

  backup.lastRun = new Date().toISOString();
  res.json({ success: true, backup });
});

// ============ STATS ============

app.get('/api/stats', (_req, res) => {
  const all = Array.from(incidents.values());
  res.json({
    totalIncidents: all.length,
    active: all.filter(i => i.status !== 'resolved' && i.status !== 'cancelled').length,
    bySeverity: { critical: all.filter(i => i.severity === 'critical').length, high: all.filter(i => i.severity === 'high').length, medium: all.filter(i => i.severity === 'medium').length, low: all.filter(i => i.severity === 'low').length },
    byCategory: Object.fromEntries(['security', 'infrastructure', 'application', 'data', 'compliance'].map(c => [c, all.filter(i => i.category === c).length])),
    avgResolutionTime: all.filter(i => i.resolvedAt).reduce((sum, i) => sum + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()), 0) / (all.filter(i => i.resolvedAt).length || 1) / 3600000,
    playbookRuns: Array.from(playbooks.values()).reduce((sum, p) => sum + p.runCount, 0),
    activeWarRooms: Array.from(warRooms.values()).filter(w => w.status === 'active').length,
  });
});

app.listen(PORT, () => console.log(`[crisis-os] listening on :${PORT}`));
export default app;