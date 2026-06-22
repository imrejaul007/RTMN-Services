/**
 * HOJAI Gym Attendance Service
 * Track member check-ins and gym visits
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  checkInTime: string;
  checkOutTime?: string;
  type: 'gym' | 'class' | 'both';
  classId?: string;
  staffId?: string;
  notes?: string;
}

const attendanceRecords = new Map<string, AttendanceRecord>();
const dailyStats = new Map<string, { date: string; count: number; peakHour: number }>();

// Manual check-in
router.post('/checkin', async (req, res) => {
  try {
    const { memberId, memberName, type, classId, staffId } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: 'Member ID required' });
    }

    // Check if already checked in today
    const today = new Date().toDateString();
    const existing = Array.from(attendanceRecords.values())
      .find(r => r.memberId === memberId && !r.checkOutTime && r.checkInTime.includes(today));

    if (existing) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const record: AttendanceRecord = {
      id: uuidv4(),
      memberId,
      memberName: memberName || 'Unknown',
      checkInTime: new Date().toISOString(),
      type: type || 'gym',
      classId,
      staffId,
    };

    attendanceRecords.set(record.id, record);
    updateDailyStats(record.checkInTime);

    res.status(201).json({ success: true, record });
  } catch (error) {
    res.status(500).json({ error: 'Check-in failed' });
  }
});

// Check-out
router.post('/checkout/:id', async (req, res) => {
  try {
    const record = attendanceRecords.get(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (record.checkOutTime) {
      return res.status(400).json({ error: 'Already checked out' });
    }

    record.checkOutTime = new Date().toISOString();
    attendanceRecords.set(record.id, record);

    const duration = Math.round(
      (new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / 60000
    );

    res.json({ success: true, duration: `${duration} minutes` });
  } catch (error) {
    res.status(500).json({ error: 'Check-out failed' });
  }
});

// Get attendance by date
router.get('/attendance', async (req, res) => {
  try {
    const { date, memberId } = req.query;
    let result = Array.from(attendanceRecords.values());

    if (date) {
      const targetDate = new Date(date as string).toDateString();
      result = result.filter(r => r.checkInTime.includes(targetDate));
    }
    if (memberId) {
      result = result.filter(r => r.memberId === memberId);
    }

    result.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

    res.json({ records: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Get current members in gym
router.get('/current', async (req, res) => {
  try {
    const today = new Date().toDateString();
    const current = Array.from(attendanceRecords.values())
      .filter(r => r.checkInTime.includes(today) && !r.checkOutTime);

    res.json({ currentMembers: current, count: current.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get current members' });
  }
});

// Daily stats
router.get('/stats/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date
      ? new Date(date as string).toDateString()
      : new Date().toDateString();

    const dayRecords = Array.from(attendanceRecords.values())
      .filter(r => r.checkInTime.includes(targetDate));

    const hourlyBreakdown: { [hour: number]: number } = {};
    let peakHour = 0;
    let peakCount = 0;

    dayRecords.forEach(r => {
      const hour = new Date(r.checkInTime).getHours();
      hourlyBreakdown[hour] = (hourlyBreakdown[hour] || 0) + 1;
      if (hourlyBreakdown[hour] > peakCount) {
        peakCount = hourlyBreakdown[hour];
        peakHour = hour;
      }
    });

    const stats = {
      date: targetDate,
      totalVisits: dayRecords.length,
      uniqueMembers: new Set(dayRecords.map(r => r.memberId)).size,
      peakHour,
      peakCount,
      hourlyBreakdown,
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Weekly stats
router.get('/stats/weekly', async (req, res) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    const weeklyStats = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayStr = day.toDateString();

      const dayRecords = Array.from(attendanceRecords.values())
        .filter(r => r.checkInTime.includes(dayStr));

      weeklyStats.push({
        date: dayStr,
        totalVisits: dayRecords.length,
        uniqueMembers: new Set(dayRecords.map(r => r.memberId)).size,
      });
    }

    res.json({ weeklyStats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get weekly stats' });
  }
});

// Member attendance history
router.get('/member/:memberId', async (req, res) => {
  try {
    const { days } = req.query;
    const daysBack = parseInt(days as string) || 30;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);

    const records = Array.from(attendanceRecords.values())
      .filter(r => r.memberId === req.params.memberId)
      .filter(r => new Date(r.checkInTime) >= cutoff)
      .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

    const totalMinutes = records.reduce((sum, r) => {
      const out = r.checkOutTime ? new Date(r.checkOutTime) : new Date();
      return sum + Math.round((out.getTime() - new Date(r.checkInTime).getTime()) / 60000);
    }, 0);

    res.json({
      records,
      summary: {
        totalVisits: records.length,
        totalMinutes,
        avgDuration: records.length > 0 ? Math.round(totalMinutes / records.length) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get member attendance' });
  }
});

// Helper
function updateDailyStats(checkInTime: string): void {
  const date = new Date(checkInTime).toDateString();
  const existing = dailyStats.get(date);

  if (existing) {
    existing.count++;
  } else {
    dailyStats.set(date, {
      date,
      count: 1,
      peakHour: new Date(checkInTime).getHours(),
    });
  }
}

export { router, attendanceRecords };
export type { AttendanceRecord };
