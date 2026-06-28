import { requireAuth } from '@rtmn/shared/auth';
/**
 * Attendance Twin Service v1.0
 * Digital twin for employee attendance tracking
 * Port: 4899
 */

import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  type: AttendanceType;
  reason?: string;
  overtime?: number;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
export type AttendanceType = 'regular' | 'remote' | 'hybrid' | 'overtime' | 'travel';

export interface AttendanceCreate {
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: AttendanceStatus;
  type?: AttendanceType;
  reason?: string;
  overtime?: number;
}

export function createAttendanceTwinService() {
  const records: Map<string, AttendanceRecord> = new Map();

  const app = express();
  app.use(express.json());

  // POST /api/attendance - Create record
  app.post('/api/attendance',requireAuth,  (req: Request, res: Response) => {
    const { employeeId, date, checkIn, checkOut, status, type, reason, overtime } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ error: 'employeeId and date are required' });
    }

    const record: AttendanceRecord = {
      id: uuidv4(),
      employeeId,
      date,
      checkIn,
      checkOut,
      status: status || 'present',
      type: type || 'regular',
      reason,
      overtime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    records.set(record.id, record);
    return res.status(201).json(record);
  });

  // GET /api/attendance - List (MUST come before :id)
  app.get('/api/attendance', (req: Request, res: Response) => {
    const { employeeId, date, status, startDate, endDate } = req.query;
    let filtered = Array.from(records.values());

    if (employeeId) filtered = filtered.filter(r => r.employeeId === employeeId);
    if (date) filtered = filtered.filter(r => r.date === date);
    if (status) filtered = filtered.filter(r => r.status === status);
    if (startDate) filtered = filtered.filter(r => r.date >= startDate as string);
    if (endDate) filtered = filtered.filter(r => r.date <= endDate as string);

    return res.status(200).json({ records: filtered, total: filtered.length });
  });

  // GET /api/attendance/analytics - Analytics
  app.get('/api/attendance/analytics', (req: Request, res: Response) => {
    const { employeeId, startDate, endDate } = req.query;
    let filtered = Array.from(records.values());

    if (employeeId) filtered = filtered.filter(r => r.employeeId === employeeId);
    if (startDate) filtered = filtered.filter(r => r.date >= startDate as string);
    if (endDate) filtered = filtered.filter(r => r.date <= endDate as string);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalOvertime = 0;
    let presentDays = 0;

    filtered.forEach(record => {
      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      byType[record.type] = (byType[record.type] || 0) + 1;
      if (record.overtime) totalOvertime += record.overtime;
      if (record.status === 'present' || record.status === 'late') presentDays++;
    });

    return res.status(200).json({
      total: filtered.length,
      byStatus,
      byType,
      attendanceRate: filtered.length > 0 ? (presentDays / filtered.length) * 100 : 0,
      totalOvertime
    });
  });

  // GET /api/attendance/:id - Get record
  app.get('/api/attendance/:id', (req: Request, res: Response) => {
    const record = records.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Attendance record not found' });
    return res.status(200).json(record);
  });

  // PUT /api/attendance/:id - Update record
  app.put('/api/attendance/:id',requireAuth,  (req: Request, res: Response) => {
    const record = records.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Attendance record not found' });

    const updates = req.body;
    if (updates.checkIn) record.checkIn = updates.checkIn;
    if (updates.checkOut) record.checkOut = updates.checkOut;
    if (updates.status) record.status = updates.status;
    if (updates.type) record.type = updates.type;
    if (updates.reason) record.reason = updates.reason;
    if (updates.overtime !== undefined) record.overtime = updates.overtime;
    record.updatedAt = new Date().toISOString();

    records.set(record.id, record);
    return res.status(200).json(record);
  });

  // DELETE /api/attendance/:id
  app.delete('/api/attendance/:id',requireAuth,  (req: Request, res: Response) => {
    if (!records.has(req.params.id)) return res.status(404).json({ error: 'Attendance record not found' });
    records.delete(req.params.id);
    return res.status(204).send();
  });

  // GET /health
  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'healthy',
      service: 'attendance-twin',
      timestamp: new Date().toISOString(),
      records: records.size
    });
  });

  return app;
}

export default createAttendanceTwinService;