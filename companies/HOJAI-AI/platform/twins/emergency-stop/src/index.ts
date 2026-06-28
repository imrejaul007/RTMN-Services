import { requireAuth } from '@rtmn/shared/auth';
/**
 * Emergency Stop Service - Port: 4763
 * Safety mechanism to halt all twin operations
 */

import express, { Request, Response } from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '4763', 10);
app.use(express.json());

let globalStop = false;
interface StopEvent { id: string; employeeId: string; reason: string; triggeredAt: string; status: 'triggered' | 'acknowledged' | 'resolved'; }
const events: StopEvent[] = [];

app.get('/health', (_r, res) => res.json({ status: globalStop ? 'degraded' : 'healthy', service: 'emergency-stop', globalStop }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.post('/api/emergency/stop',requireAuth,  (req: Request, res: Response) => {
  const { employeeId, reason } = req.body;
  globalStop = true;
  const event: StopEvent = { id: `e_${Date.now()}`, employeeId, reason: reason || 'Manual stop', triggeredAt: new Date().toISOString(), status: 'triggered' };
  events.push(event);
  res.json({ success: true, data: { stopped: true, eventId: event.id } });
});

app.post('/api/emergency/resume',requireAuth,  (req: Request, res: Response) => {
  globalStop = false;
  res.json({ success: true, data: { resumed: true, timestamp: new Date().toISOString() } });
});

app.get('/api/emergency/status', (_r, res) => res.json({ success: true, data: { stopped: globalStop, events } }));
app.get('/api/emergency/events', (_r, res) => res.json({ success: true, data: { events, total: events.length } }));

const server = app.listen(PORT, () => console.log(`Emergency Stop - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
