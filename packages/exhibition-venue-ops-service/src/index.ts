/**
 * Exhibition Venue Operations Service
 * Port 5056
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5056;
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

const requests = new Map();

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-venue-ops-service', timestamp: new Date().toISOString() });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

app.get('/api/requests', (req, res) => {
  const exhibitionId = req.query.exhibition_id as string;
  const type = req.query.type as string;
  const status = req.query.status as string;

  let results = Array.from(requests.values());
  if (exhibitionId) results = results.filter((r: any) => r.exhibition_id === exhibitionId);
  if (type) results = results.filter((r: any) => r.type === type);
  if (status) results = results.filter((r: any) => r.status === status);

  res.json({ success: true, data: results });
});

app.post('/api/requests', (req, res) => {
  const { exhibition_id, exhibitor_id, booth_id, type, description, priority } = req.body;
  if (!exhibition_id || !type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const request: any = {
    id: `REQ-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibition_id,
    exhibitor_id,
    booth_id,
    type,
    description,
    priority: priority || 'normal',
    status: 'pending',
    assigned_to: null,
    notes: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  requests.set(request.id, request);
  res.status(201).json({ success: true, data: request });
});

app.patch('/api/requests/:id', (req, res) => {
  const request = requests.get(req.params.id) as any;
  if (!request) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });

  const { status, assigned_to, notes } = req.body;
  if (status) request.status = status;
  if (assigned_to !== undefined) request.assigned_to = assigned_to;
  if (notes) request.notes.push(...notes);
  request.updated_at = new Date().toISOString();
  requests.set(request.id, request);

  res.json({ success: true, data: request });
});

app.listen(PORT, () => {
  logger.info(`Venue Ops Service started on port ${PORT}`);
});

export default app;
