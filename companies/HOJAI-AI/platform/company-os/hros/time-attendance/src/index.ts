/**
 * HROS - Time & Attendance Platform
 *
 * Complete attendance and shift management
 * Inspired by: greythr + Attendance Labs + biometric integrations
 *
 * Modules:
 * - Attendance Tracking
 * - Shift Management
 * - Leave Management
 * - Overtime Calculation
 * - Geo-fencing
 * - Biometric Integration
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;          // '2026-07-02'

  // Clock In/Out
  clockIn?: Date;
  clockOut?: Date;
  workHours?: number;

  // Status
  status: 'present' | 'absent' | 'late' | 'half_day' | 'wfh' | 'leave';
  lateMinutes?: number;

  // Location
  location?: GeoLocation;
  geoFence?: { officeId: string; officeName: string };

  // Source
  source: 'web' | 'mobile' | 'biometric' | 'api';
  deviceId?: string;

  // Overtime
  overtimeHours: number;
  overtimeApproved: boolean;

  // Metadata
  approvals?: ApprovalInfo[];
  notes?: string;

  createdAt: Date;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export interface ApprovalInfo {
  type: 'overtime' | 'wfh' | 'shift_change' | 'missed_punch';
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface Shift {
  id: string;
  name: string;
  type: 'regular' | 'night' | 'rotational' | 'flexi';

  // Timing
  startTime: string;    // '09:00'
  endTime: string;       // '18:00'
  workingHours: number;
  breakDuration: number;  // minutes

  // Flexibility
  flexible: boolean;
  minHours?: number;
  maxHours?: number;

  // Weekoff
  weekoffDays: number[];  // 0=Sunday, 6=Saturday
  shiftAllowances?: {
    night?: number;
    weekend?: number;
    holiday?: number;
  };

  status: 'active' | 'archived';
}

export interface ShiftSchedule {
  id: string;
  employeeId: string;
  shiftId: string;
  shiftName: string;

  startDate: Date;
  endDate?: Date;

  // Rotation (for rotational shifts)
  rotationPattern?: {
    days: number;
    shiftIds: string[];
  };

  status: 'active' | 'scheduled' | 'completed';
}

export interface LeavePolicy {
  id: string;
  name: string;
  type: 'paid' | 'unpaid' | 'sick' | 'parental' | 'loss_of_pay';

  // Entitlement
  annualEntitlement: number;
  accrualType: 'monthly' | 'yearly' | 'one_time';
  accrualRate?: number;
  carryForward: boolean;
  maxCarryForward?: number;
  expiryMonths?: number;

  // Rules
  minTenureMonths?: number;
  requiresApproval: boolean;
  approverRoles: string[];
  canApplyInAdvance?: boolean;
  advanceNoticeDays?: number;

  // Restrictions
  blackoutDates?: string[];
  maxConsecutive?: number;
  minDaysNotice?: number;

  status: 'active' | 'archived';
}

export interface LeaveApplication {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;

  startDate: Date;
  endDate: Date;
  totalDays: number;
  workingDays: number;

  reason?: string;
  attachments?: string[];

  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;

  // Leave balance impact
  deductedDays: number;

  createdAt: Date;
}

export interface LeaveBalance {
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;

  year: string;
  entitlement: number;
  available: number;
  used: number;
  pending: number;
  carriedForward: number;
  expiresOn?: Date;
}

export interface Overtime {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  type: 'weekday' | 'weekend' | 'holiday';

  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;

  rate: number;         // 1.5x, 2x, etc.
  amount: number;       // Calculated payout

  createdAt: Date;
}

export interface GeoFence {
  id: string;
  name: string;
  type: 'office' | 'site' | 'home';

  center: GeoLocation;
  radius: number;       // meters

  employees: string[];   // Assigned employees
  isActive: boolean;
}

export interface AttendanceSummary {
  employeeId: string;
  month: string;        // '2026-07'

  workingDays: number;
  present: number;
  absent: number;
  late: number;
  halfDays: number;
  wfh: number;
  onLeave: number;

  totalWorkHours: number;
  avgWorkHours: number;
  overtimeHours: number;

  punctualityRate: number;
  attendanceRate: number;
}

// ============================================================
// STORAGE
// ============================================================

const attendance = new Map<string, Attendance[]>();      // employeeId -> Attendance[]
const shifts = new Map<string, Shift>();
const shiftSchedules = new Map<string, ShiftSchedule[]>();
const leavePolicies = new Map<string, LeavePolicy>();
const leaveApplications = new Map<string, LeaveApplication[]>();
const leaveBalances = new Map<string, LeaveBalance[]>();
const overtimes = new Map<string, Overtime[]>();
const geoFences = new Map<string, GeoFence>();

// ============================================================
// DEFAULT LEAVE POLICIES
// ============================================================

function initializeDefaultPolicies() {
  const defaultPolicies: LeavePolicy[] = [
    {
      id: 'PL',
      name: 'Privileged Leave',
      type: 'paid',
      annualEntitlement: 12,
      accrualType: 'monthly',
      accrualRate: 1,
      carryForward: true,
      maxCarryForward: 30,
      requiresApproval: true,
      approverRoles: ['manager', 'hr'],
      canApplyInAdvance: true,
      advanceNoticeDays: 7,
      status: 'active',
    },
    {
      id: 'CL',
      name: 'Casual Leave',
      type: 'paid',
      annualEntitlement: 6,
      accrualType: 'one_time',
      carryForward: false,
      requiresApproval: true,
      approverRoles: ['manager'],
      canApplyInAdvance: true,
      advanceNoticeDays: 3,
      status: 'active',
    },
    {
      id: 'SL',
      name: 'Sick Leave',
      type: 'sick',
      annualEntitlement: 12,
      accrualType: 'monthly',
      accrualRate: 1,
      carryForward: true,
      maxCarryForward: 24,
      expiryMonths: 12,
      requiresApproval: false,
      minTenureMonths: 0,
      status: 'active',
    },
    {
      id: 'EL',
      name: 'Earned Leave',
      type: 'paid',
      annualEntitlement: 24,
      accrualType: 'monthly',
      accrualRate: 2,
      carryForward: true,
      maxCarryForward: 60,
      requiresApproval: true,
      approverRoles: ['manager', 'hr'],
      canApplyInAdvance: true,
      advanceNoticeDays: 14,
      status: 'active',
    },
  ];

  defaultPolicies.forEach(policy => {
    leavePolicies.set(policy.id, policy);
  });

  console.log(`Initialized ${defaultPolicies.length} leave policies`);
}

initializeDefaultPolicies();

// ============================================================
// ROUTES - ATTENDANCE
// ============================================================

router.post('/clock-in', async (req, res) => {
  try {
    const { employeeId, location, source, geoFence } = req.body;

    const now = new Date();
    const date = now.toISOString().split('T')[0];

    const clockIn: Attendance = {
      id: crypto.randomUUID(),
      employeeId,
      date,
      clockIn: now,
      status: 'present',
      location,
      geoFence,
      source: source || 'web',
      overtimeHours: 0,
      createdAt: now,
    };

    const empAttendance = attendance.get(employeeId) || [];
    empAttendance.push(clockIn);
    attendance.set(employeeId, empAttendance);

    res.status(201).json({ success: true, attendance: clockIn });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/clock-out', async (req, res) => {
  try {
    const { employeeId, location } = req.body;

    const empAttendance = attendance.get(employeeId) || [];
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = empAttendance.find(a => a.date === today);

    if (!todayRecord) {
      return res.status(404).json({ success: false, error: 'No clock-in record found' });
    }

    const now = new Date();
    todayRecord.clockOut = now;

    // Calculate work hours
    const diff = now.getTime() - todayRecord.clockIn!.getTime();
    todayRecord.workHours = diff / (1000 * 60 * 60);

    // Check for late arrival
    const shiftStart = '09:00';
    const clockInTime = todayRecord.clockIn!.toTimeString().split(' ')[0];
    if (clockInTime > shiftStart) {
      todayRecord.status = 'late';
      const shiftStartMs = new Date(`2000-01-01T${shiftStart}:00`).getTime();
      const clockInMs = todayRecord.clockIn!.getTime();
      todayRecord.lateMinutes = Math.round((clockInMs - shiftStartMs) / (1000 * 60));
    }

    attendance.set(employeeId, empAttendance);

    res.json({ success: true, attendance: todayRecord });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/attendance/:employeeId', async (req, res) => {
  try {
    const { month, year, status } = req.query;
    let empAttendance = attendance.get(req.params.employeeId) || [];

    if (month && year) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      empAttendance = empAttendance.filter(a => a.date.startsWith(monthStr));
    }

    if (status) {
      empAttendance = empAttendance.filter(a => a.status === status);
    }

    res.json({ success: true, attendance: empAttendance, count: empAttendance.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/summary/:employeeId', async (req, res) => {
  try {
    const { month } = req.query;
    const monthStr = month || new Date().toISOString().slice(0, 7);
    const empAttendance = (attendance.get(req.params.employeeId) || [])
      .filter(a => a.date.startsWith(monthStr));

    const summary: AttendanceSummary = {
      employeeId: req.params.employeeId,
      month: monthStr,
      workingDays: empAttendance.length,
      present: empAttendance.filter(a => a.status === 'present').length,
      absent: empAttendance.filter(a => a.status === 'absent').length,
      late: empAttendance.filter(a => a.status === 'late').length,
      halfDays: empAttendance.filter(a => a.status === 'half_day').length,
      wfh: empAttendance.filter(a => a.status === 'wfh').length,
      onLeave: empAttendance.filter(a => a.status === 'leave').length,
      totalWorkHours: empAttendance.reduce((s, a) => s + (a.workHours || 0), 0),
      avgWorkHours: empAttendance.length > 0
        ? empAttendance.reduce((s, a) => s + (a.workHours || 0), 0) / empAttendance.length
        : 0,
      overtimeHours: empAttendance.reduce((s, a) => s + a.overtimeHours, 0),
      punctualityRate: empAttendance.length > 0
        ? (empAttendance.filter(a => a.status !== 'late').length / empAttendance.length * 100
        : 0,
      attendanceRate: empAttendance.length > 0
        ? (empAttendance.filter(a => a.status !== 'absent').length / empAttendance.length * 100
        : 0,
    };

    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - SHIFTS
// ============================================================

router.get('/shifts', async (req, res) => {
  try {
    const result = Array.from(shifts.values());
    res.json({ success: true, shifts: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/shifts', async (req, res) => {
  try {
    const shift: Shift = {
      id: crypto.randomUUID(),
      ...req.body,
      status: 'active',
    };

    shifts.set(shift.id, shift);
    res.status(201).json({ success: true, shift });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/shifts/:id/assign', async (req, res) => {
  try {
    const { employeeId, startDate, endDate, rotation } = req.body;
    const shift = shifts.get(req.params.id);

    if (!shift) {
      return res.status(404).json({ success: false, error: 'Shift not found' });
    }

    const schedule: ShiftSchedule = {
      id: crypto.randomUUID(),
      employeeId,
      shiftId: shift.id,
      shiftName: shift.name,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      rotationPattern: rotation,
      status: 'active',
    };

    const empSchedules = shiftSchedules.get(employeeId) || [];
    empSchedules.push(schedule);
    shiftSchedules.set(employeeId, empSchedules);

    res.status(201).json({ success: true, schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - LEAVE
// ============================================================

router.get('/leaves/policies', async (req, res) => {
  try {
    const result = Array.from(leavePolicies.values());
    res.json({ success: true, policies: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/leaves/apply', async (req, res) => {
  try {
    const { employeeId, leaveTypeId, startDate, endDate, reason, attachments } = req.body;

    const policy = leavePolicies.get(leaveTypeId);
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Leave type not found' });
    }

    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Calculate working days (exclude weekends)
    let workingDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) workingDays++;
    }

    // Check balance
    const balances = leaveBalances.get(employeeId) || [];
    const balance = balances.find(b => b.leaveTypeId === leaveTypeId);
    if (balance && balance.available < workingDays) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient leave balance',
        available: balance.available,
        requested: workingDays,
      });
    }

    const application: LeaveApplication = {
      id: crypto.randomUUID(),
      employeeId,
      leaveTypeId,
      leaveTypeName: policy.name,
      startDate: start,
      endDate: end,
      totalDays,
      workingDays,
      reason,
      attachments,
      status: policy.requiresApproval ? 'pending' : 'approved',
      deductedDays: workingDays,
      createdAt: new Date(),
    };

    if (!policy.requiresApproval) {
      application.approvedAt = new Date();
      application.approvedBy = 'system';
    }

    const empApplications = leaveApplications.get(employeeId) || [];
    empApplications.push(application);
    leaveApplications.set(employeeId, empApplications);

    // Update balance
    if (balance) {
      balance.pending += workingDays;
      leaveBalances.set(employeeId, balances);
    }

    res.status(201).json({ success: true, application });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/leaves/:employeeId', async (req, res) => {
  try {
    const { status, year } = req.query;
    let applications = leaveApplications.get(req.params.employeeId) || [];

    if (status) applications = applications.filter(a => a.status === status);
    if (year) {
      applications = applications.filter(a =>
        a.startDate.toString().startsWith(year)
      );
    }

    res.json({ success: true, applications, count: applications.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/leaves/:employeeId/balance', async (req, res) => {
  try {
    const { year } = req.query;
    let balances = leaveBalances.get(req.params.employeeId) || [];

    if (!balances.length) {
      // Initialize balances for employee
      balances = Array.from(leavePolicies.values()).map(policy => ({
        employeeId: req.params.employeeId,
        leaveTypeId: policy.id,
        leaveTypeName: policy.name,
        year: year || '2026',
        entitlement: policy.annualEntitlement,
        available: policy.annualEntitlement,
        used: 0,
        pending: 0,
        carriedForward: 0,
      }));
      leaveBalances.set(req.params.employeeId, balances);
    }

    res.json({ success: true, balances });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/leaves/:id/approve', async (req, res) => {
  try {
    const { approvedBy } = req.body;

    for (const [employeeId, applications] of leaveApplications) {
      const app = applications.find(a => a.id === req.params.id);
      if (app) {
        app.status = 'approved';
        app.approvedBy = approvedBy;
        app.approvedAt = new Date();

        // Deduct from balance
        const balances = leaveBalances.get(employeeId) || [];
        const balance = balances.find(b => b.leaveTypeId === app.leaveTypeId);
        if (balance) {
          balance.pending -= app.deductedDays;
          balance.available -= app.deductedDays;
          balance.used += app.deductedDays;
          leaveBalances.set(employeeId, balances);
        }

        leaveApplications.set(employeeId, applications);
        res.json({ success: true, application: app });
        return;
      }
    }

    res.status(404).json({ success: false, error: 'Application not found' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - OVERTIME
// ============================================================

router.post('/overtime', async (req, res) => {
  try {
    const { employeeId, date, hours, type, reason } = req.body;

    const rate = type === 'holiday' ? 2.0 : type === 'weekend' ? 1.5 : 1.0;
    const monthlySalary = 50000; // Would get from payroll
    const hourlyRate = monthlySalary / (22 * 8);
    const amount = hours * hourlyRate * rate;

    const overtime: Overtime = {
      id: crypto.randomUUID(),
      employeeId,
      date,
      hours,
      type,
      reason,
      status: 'pending',
      rate,
      amount,
      createdAt: new Date(),
    };

    const empOvertimes = overtimes.get(employeeId) || [];
    empOvertimes.push(overtime);
    overtimes.set(employeeId, empOvertimes);

    res.status(201).json({ success: true, overtime });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/overtime/:employeeId', async (req, res) => {
  try {
    const { month, year, status } = req.query;
    let empOvertimes = overtimes.get(req.params.employeeId) || [];

    if (month && year) {
      const filterStr = `${year}-${String(month).padStart(2, '0')}`;
      empOvertimes = empOvertimes.filter(o => o.date.startsWith(filterStr));
    }

    if (status) empOvertimes = empOvertimes.filter(o => o.status === status);

    res.json({ success: true, overtimes: empOvertimes, count: empOvertimes.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/overtime/:id/approve', async (req, res) => {
  try {
    const { approvedBy } = req.body;

    for (const [employeeId, empOvertimes] of overtimes) {
      const ot = empOvertimes.find(o => o.id === req.params.id);
      if (ot) {
        ot.status = 'approved';
        ot.approvedBy = approvedBy;

        // Update attendance record
        const empAttendance = attendance.get(employeeId) || [];
        const dayRecord = empAttendance.find(a => a.date === ot.date);
        if (dayRecord) {
          dayRecord.overtimeHours += ot.hours;
          dayRecord.overtimeApproved = true;
          attendance.set(employeeId, empAttendance);
        }

        overtimes.set(employeeId, empOvertimes);
        res.json({ success: true, overtime: ot });
        return;
      }
    }

    res.status(404).json({ success: false, error: 'Overtime not found' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - GEO-FENCING
// ============================================================

router.post('/geofences', async (req, res) => {
  try {
    const geoFence: GeoFence = {
      id: crypto.randomUUID(),
      ...req.body,
      isActive: true,
    };

    geoFences.set(geoFence.id, geoFence);
    res.status(201).json({ success: true, geoFence });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/geofences', async (req, res) => {
  try {
    const result = Array.from(geoFences.values()).filter(g => g.isActive);
    res.json({ success: true, geoFences: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/geofences/check', async (req, res) => {
  try {
    const { employeeId, latitude, longitude } = req.body;

    const isWithinFence = Array.from(geoFences.values())
      .filter(g => g.isActive && g.employees.includes(employeeId))
      .some(g => {
        const distance = calculateDistance(
          g.center.latitude, g.center.longitude,
          latitude, longitude
        );
        return distance <= g.radius;
      });

    res.json({ success: true, isWithinFence });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default router;
