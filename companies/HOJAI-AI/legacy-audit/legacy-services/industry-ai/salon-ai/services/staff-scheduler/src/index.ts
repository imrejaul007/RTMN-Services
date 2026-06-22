/**
 * HOJAI Salon Staff Scheduler
 * Shift management, break tracking, rota planning
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'absent';
  breaks: { start: string; end: string; type: 'lunch' | 'short' }[];
  notes?: string;
}

interface Leave {
  id: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  type: 'sick' | 'vacation' | 'personal' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

const shifts = new Map<string, Shift>();
const leaves = new Map<string, Leave>();

// Create shift
router.post('/shifts', async (req, res) => {
  try {
    const { staffId, staffName, date, startTime, endTime, role, notes } = req.body;

    const shift: Shift = {
      id: uuidv4(),
      staffId,
      staffName,
      date,
      startTime,
      endTime,
      role: role || 'stylist',
      status: 'scheduled',
      breaks: [],
      notes,
    };

    shifts.set(shift.id, shift);
    res.status(201).json({ success: true, shift });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

// Get shifts
router.get('/shifts', async (req, res) => {
  try {
    const { date, staffId, month } = req.query;
    let result = Array.from(shifts.values());

    if (date) result = result.filter(s => s.date === date);
    if (staffId) result = result.filter(s => s.staffId === staffId);
    if (month) {
      const [year, mon] = (month as string).split('-');
      result = result.filter(s => {
        const [y, m] = s.date.split('-');
        return y === year && m === mon;
      });
    }

    res.json({ shifts: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get shifts' });
  }
});

// Generate weekly rota
router.post('/rota/generate', async (req, res) => {
  try {
    const { startDate, staff, workingHours } = req.body;

    const weekShifts: Shift[] = [];
    const start = new Date(startDate);

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);

      staff.forEach((s: { id: string; name: string }) => {
        // Simple rota: morning shift 9-14, evening shift 14-20
        weekShifts.push({
          id: uuidv4(),
          staffId: s.id,
          staffName: s.name,
          date: day.toISOString().split('T')[0],
          startTime: i % 2 === 0 ? '09:00' : '14:00',
          endTime: i % 2 === 0 ? '14:00' : '20:00',
          role: 'stylist',
          status: 'scheduled',
          breaks: [{ start: '12:00', end: '12:30', type: 'lunch' }],
        });
      });
    }

    weekShifts.forEach(s => shifts.set(s.id, s));

    res.json({ success: true, shifts: weekShifts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate rota' });
  }
});

// Apply leave
router.post('/leave', async (req, res) => {
  try {
    const { staffId, staffName, startDate, endDate, type, reason } = req.body;

    const leave: Leave = {
      id: uuidv4(),
      staffId,
      staffName,
      startDate,
      endDate,
      type,
      status: 'pending',
      reason,
    };

    leaves.set(leave.id, leave);

    // Auto-approve if not conflicting
    const conflicts = Array.from(shifts.values())
      .filter(s => s.staffId === staffId)
      .filter(s => {
        const shiftDate = new Date(s.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return shiftDate >= start && shiftDate <= end;
      });

    if (conflicts.length === 0) {
      leave.status = 'approved';
      leaves.set(leave.id, leave);
    }

    res.status(201).json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply leave' });
  }
});

router.get('/leave', async (req, res) => {
  try {
    const { staffId, status } = req.query;
    let result = Array.from(leaves.values());

    if (staffId) result = result.filter(l => l.staffId === staffId);
    if (status) result = result.filter(l => l.status === status);

    res.json({ leaves: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaves' });
  }
});

export { router, shifts, leaves };
