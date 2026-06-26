/**
 * Notification Orchestrator - Port: 4764
 * Route notifications to appropriate channels
 */

import express, { Request, Response } from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '4764', 10);
app.use(express.json());

interface Notification { id: string; employeeId: string; channel: 'push' | 'email' | 'slack' | 'teams'; message: string; status: 'pending' | 'sent' | 'failed'; createdAt: string; }
const notifications = new Map<string, Notification>();

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'notification-orchestrator' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.post('/api/notifications/send', (req: Request, res: Response) => {
  const { employeeId, channel, message } = req.body;
  const n: Notification = { id: `n_${Date.now()}`, employeeId, channel: channel || 'push', message, status: 'sent', createdAt: new Date().toISOString() };
  notifications.set(n.id, n);
  res.status(201).json({ success: true, data: n });
});

app.get('/api/notifications/:employeeId', (req, res) => {
  const empNotifs = Array.from(notifications.values()).filter(n => n.employeeId === req.params.employeeId);
  res.json({ success: true, data: { notifications: empNotifs, total: empNotifs.length } });
});

const server = app.listen(PORT, () => console.log(`Notification Orchestrator - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
