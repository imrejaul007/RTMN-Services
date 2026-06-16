/**
 * Exhibition Staff Service
 * Port 5057
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5057;
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

const staff = new Map();

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-staff-service', timestamp: new Date().toISOString() });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

app.get('/api/staff', (req, res) => {
  const exhibitionId = req.query.exhibition_id as string;
  const role = req.query.role as string;

  let results = Array.from(staff.values());
  if (exhibitionId) results = results.filter((s: any) => s.exhibition_id === exhibitionId);
  if (role) results = results.filter((s: any) => s.role === role);

  res.json({ success: true, data: results });
});

app.post('/api/staff', (req, res) => {
  const { exhibition_id, name, email, phone, role } = req.body;
  if (!exhibition_id || !name || !role) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const member: any = {
    id: `STAFF-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibition_id,
    name,
    email,
    phone,
    role,
    status: 'active',
    check_in_time: null,
    check_out_time: null,
    tasks_completed: 0,
    created_at: new Date().toISOString(),
  };

  staff.set(member.id, member);
  res.status(201).json({ success: true, data: member });
});

app.post('/api/staff/:id/checkin', (req, res) => {
  const member = staff.get(req.params.id) as any;
  if (!member) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Staff not found' } });

  member.check_in_time = new Date().toISOString();
  staff.set(member.id, member);
  res.json({ success: true, data: member });
});

app.listen(PORT, () => {
  logger.info(`Staff Service started on port ${PORT}`);
});

export default app;
