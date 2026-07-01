/**
 * OperationsOS - Resource Management + Capacity + Incident + Quality
 */
import { Router } from 'express';
const router = Router();

export interface Resource { id: string; name: string; type: 'human'|'equipment'|'space'; skills?: string[]; costPerHour: number; available: boolean; }
export interface Capacity { resourceId: string; date: string; allocated: number; available: number; utilization: number; }
export interface Incident { id: string; title: string; severity: 'critical'|'high'|'medium'|'low'; status: 'open'|'in_progress'|'resolved'|'closed'; assignee?: string; createdAt: Date; resolvedAt?: Date; }
export interface QualityCheck { id: string; type: 'audit'|'inspection'|'test'; result: 'pass'|'fail'|'warning'; findings: string[]; inspector: string; date: Date; }

const resources = new Map<string, Resource>();
const incidents = new Map<string, Incident[]>();

router.post('/resources', (req, res) => { const r: Resource = { id: crypto.randomUUID(), ...req.body }; resources.set(r.id, r); res.status(201).json({ success: true, resource: r }); });
router.get('/resources', (req, res) => { res.json({ success: true, resources: Array.from(resources.values()) }); });
router.patch('/resources/:id', (req, res) => { const r = resources.get(req.params.id); if (!r) return res.status(404).json({ error: 'Not found' }); Object.assign(r, req.body); resources.set(req.params.id, r); res.json({ success: true, resource: r }); });

router.post('/incidents', (req, res) => { const i: Incident = { id: crypto.randomUUID(), ...req.body, status: 'open', createdAt: new Date() }; const existing = incidents.get(i.severity) || []; existing.push(i); incidents.set(i.severity, existing); res.status(201).json({ success: true, incident: i }); });
router.get('/incidents', (req, res) => { const all = Array.from(incidents.values()).flat(); res.json({ success: true, incidents: all }); });
router.patch('/incidents/:id/resolve', (req, res) => {
  for (const [severity, list] of incidents) {
    const i = list.find(x => x.id === req.params.id);
    if (i) { i.status = 'resolved'; i.resolvedAt = new Date(); incidents.set(severity, list); res.json({ success: true, incident: i }); return; }
  }
  res.status(404).json({ error: 'Not found' });
});

router.get('/reports/capacity', (req, res) => {
  const all = Array.from(resources.values());
  res.json({ success: true, utilization: all.length > 0 ? all.filter(r => r.available).length / all.length * 100 : 0 });
});

export default router;