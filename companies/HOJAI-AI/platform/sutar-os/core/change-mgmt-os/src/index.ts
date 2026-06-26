/**
 * ChangeManagementOS - Port: 4864
 * Migrations, rollouts, adoption tracking
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
const app = express();
const PORT = parseInt(process.env.PORT || '4864', 10);
app.use(express.json());
interface Change { id: string; title: string; type: string; status: 'draft' | 'testing' | 'rolling' | 'complete' | 'rollback'; affected: string[]; phases: { name: string; status: string }[]; adoption: number; incidents: number; }
const changes = new Map();
app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'change-mgmt-os' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));
app.get('/api/changes', (req, res) => {
  let all = Array.from(changes.values());
  if (req.query.status) all = all.filter(c => c.status === req.query.status);
  res.json({ success: true, data: { changes: all, total: all.length } });
});
app.post('/api/changes', (req, res) => {
  const { title, type, affected } = req.body;
  const change: Change = { id: uuidv4(), title: title || '', type: type || 'feature', status: 'draft', affected: affected || [], phases: [], adoption: 0, incidents: 0 };
  changes.set(change.id, change);
  res.status(201).json({ success: true, data: change });
});
app.patch('/api/changes/:id', (req, res) => {
  const c = changes.get(req.params.id);
  if (!c) return res.status(404).json({ success: false });
  Object.assign(c, req.body);
  res.json({ success: true, data: c });
});
const server = app.listen(PORT, () => console.log(`ChangeManagementOS - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
