/**
 * Scheduler
 * Port: 4831
 *
 * Role: Shift planning, meeting scheduling, resource allocation, calendar management
 * Persona: Organized planner, efficient coordinator, fair balancer, conflict resolver
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4831;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  availability: Record<string, string[]>;
  skills: string[];
  preferences: { maxHoursPerDay: number; preferredShift: string };
}

interface Shift {
  id: string;
  employeeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'morning' | 'afternoon' | 'night' | 'flexible';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  department: string;
  notes?: string;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  organizer: string;
  type: '1:1' | 'team' | 'all-hands' | 'external';
  location?: string;
  virtualLink?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  recurrence?: { frequency: 'daily' | 'weekly' | 'monthly'; until: Date };
}

interface Resource {
  id: string;
  name: string;
  type: 'room' | 'equipment' | 'vehicle';
  capacity?: number;
  location?: string;
  available: boolean;
  bookings: { start: Date; end: Date; meetingId: string }[];
}

// Seed data
const employees: Employee[] = [
  { id: 'emp-1', name: 'Priya Sharma', role: 'Support Lead', department: 'Support', email: 'priya@company.com', availability: { monday: ['9-18'], tuesday: ['9-18'], wednesday: ['9-18'], thursday: ['9-18'], friday: ['9-17'] }, skills: ['support', 'training', 'escalation'], preferences: { maxHoursPerDay: 8, preferredShift: 'morning' } },
  { id: 'emp-2', name: 'Raj Kumar', role: 'Support Agent', department: 'Support', email: 'raj@company.com', availability: { monday: ['10-19'], tuesday: ['10-19'], wednesday: ['10-19'], thursday: ['10-19'], friday: ['10-18'] }, skills: ['support', 'technical'], preferences: { maxHoursPerDay: 8, preferredShift: 'afternoon' } },
  { id: 'emp-3', name: 'Amit Patel', role: 'Sales Rep', department: 'Sales', email: 'amit@company.com', availability: { monday: ['8-17'], tuesday: ['8-17'], wednesday: ['8-17'], thursday: ['8-17'], friday: ['8-16'] }, skills: ['sales', 'negotiation'], preferences: { maxHoursPerDay: 9, preferredShift: 'morning' } },
  { id: 'emp-4', name: 'Sunita Verma', role: 'Engineer', department: 'Engineering', email: 'sunita@company.com', availability: { monday: ['9-18'], tuesday: ['9-18'], wednesday: ['9-18'], thursday: ['9-18'], friday: ['9-17'] }, skills: ['development', 'code-review', 'architecture'], preferences: { maxHoursPerDay: 8, preferredShift: 'morning' } }
];

const shifts: Shift[] = [
  { id: 'shift-1', employeeId: 'emp-1', date: new Date(), startTime: '09:00', endTime: '17:00', type: 'morning', status: 'scheduled', department: 'Support' },
  { id: 'shift-2', employeeId: 'emp-2', date: new Date(), startTime: '10:00', endTime: '18:00', type: 'afternoon', status: 'scheduled', department: 'Support' }
];

const resources: Resource[] = [
  { id: 'room-1', name: 'Conference Room A', type: 'room', capacity: 10, location: 'Floor 1', available: true, bookings: [] },
  { id: 'room-2', name: 'Meeting Room B', type: 'room', capacity: 4, location: 'Floor 2', available: true, bookings: [] },
  { id: 'room-3', name: 'Board Room', type: 'room', capacity: 20, location: 'Floor 3', available: true, bookings: [] },
  { id: 'equip-1', name: 'Projector Alpha', type: 'equipment', available: true, bookings: [] }
];

// Generate weekly schedule
function generateWeeklySchedule(weekStart: Date, department?: string): Shift[] {
  const schedule: Shift[] = [];
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  employees.forEach(emp => {
    if (department && emp.department !== department) return;

    const shiftTypes = ['morning', 'afternoon'] as const;
    let shiftIndex = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dayName = days[date.getDay()];

      if (!emp.availability[dayName]) continue;

      const shiftType = shiftTypes[shiftIndex % 2];
      const times = shiftType === 'morning' ? { start: '09:00', end: '17:00' } : { start: '10:00', end: '18:00' };

      schedule.push({
        id: `shift-${emp.id}-${i}`,
        employeeId: emp.id,
        date,
        startTime: times.start,
        endTime: times.end,
        type: shiftType,
        status: 'scheduled',
        department: emp.department
      });

      shiftIndex++;
    }
  });

  return schedule;
}

// Find available time slot
function findAvailableSlot(attendees: string[], duration: number, date: Date): { start: string; end: string } | null {
  const workHours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  for (const hour of workHours) {
    const startHour = parseInt(hour.split(':')[0]);
    const endHour = startHour + Math.ceil(duration / 60);

    if (endHour > 18) continue;

    const slot = {
      start: hour,
      end: `${endHour.toString().padStart(2, '0')}:00`
    };

    // Check availability (simplified)
    return slot;
  }

  return null;
}

// Get weekly schedule
app.get('/api/schedule', (req: Request, res: Response) => {
  const { weekStart, department } = req.query;

  const start = weekStart ? new Date(weekStart as string) : new Date();
  start.setDate(start.getDate() - start.getDay()); // Start of week

  const schedule = generateWeeklySchedule(start, department as string);

  res.json({
    schedule,
    summary: {
      totalShifts: schedule.length,
      byType: schedule.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {}),
      byDepartment: schedule.reduce((acc, s) => {
        acc[s.department] = (acc[s.department] || 0) + 1;
        return acc;
      }, {})
    }
  });
});

// Create shift
app.post('/api/shifts', (req: Request, res: Response) => {
  const { employeeId, date, startTime, endTime, type, department, notes } = req.body;

  const shift: Shift = {
    id: `shift-${Date.now()}`,
    employeeId,
    date: new Date(date),
    startTime,
    endTime,
    type: type || 'morning',
    status: 'scheduled',
    department: department || 'General',
    notes
  };

  shifts.push(shift);

  res.json({
    shift,
    notification: {
      employee: employees.find(e => e.id === employeeId)?.email,
      message: `New shift scheduled: ${startTime} - ${endTime} on ${date}`
    }
  });
});

// Get employee shifts
app.get('/api/shifts/employee/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  const employeeShifts = shifts.filter(s => {
    if (s.employeeId !== id) return false;
    if (startDate && new Date(s.date) < new Date(startDate as string)) return false;
    if (endDate && new Date(s.date) > new Date(endDate as string)) return false;
    return true;
  });

  const totalHours = employeeShifts.reduce((sum, s) => {
    const start = parseInt(s.startTime.split(':')[0]);
    const end = parseInt(s.endTime.split(':')[0]);
    return sum + (end - start);
  }, 0);

  res.json({
    employee: employees.find(e => e.id === id),
    shifts: employeeShifts,
    summary: {
      totalShifts: employeeShifts.length,
      totalHours,
      avgHoursPerShift: Math.round(totalHours / employeeShifts.length * 10) / 10
    }
  });
});

// Create meeting
app.post('/api/meetings', (req: Request, res: Response) => {
  const { title, description, attendees, startTime, endTime, type, location, recurrence } = req.body;

  const meeting: Meeting = {
    id: `mtg-${Date.now()}`,
    title,
    description,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    attendees,
    organizer: attendees[0],
    type: type || 'team',
    location,
    status: 'scheduled',
    recurrence
  };

  // Check resource availability
  const availableRooms = resources.filter(r => {
    if (r.type !== 'room') return true;
    const conflict = r.bookings.some(b =>
      new Date(b.start) < meeting.endTime && new Date(b.end) > meeting.startTime
    );
    return !conflict;
  });

  res.json({
    meeting,
    details: {
      duration: `${Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60))} minutes`,
      attendees: attendees.map(id => employees.find(e => e.id === id)?.name || id)
    },
    suggestedRooms: availableRooms.filter(r => r.type === 'room').slice(0, 3),
    conflicts: attendees.length > 5 ? ['Consider splitting into smaller groups'] : []
  });
});

// Get meetings
app.get('/api/meetings', (req: Request, res: Response) => {
  const { startDate, endDate, employeeId } = req.query;

  const meetings: Meeting[] = [
    { id: 'mtg-1', title: 'Team Standup', startTime: new Date(), endTime: new Date(Date.now() + 30 * 60 * 1000), attendees: ['emp-1', 'emp-2'], organizer: 'emp-1', type: 'team', status: 'scheduled' },
    { id: 'mtg-2', title: 'QBR Review', startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), attendees: ['emp-1', 'emp-3', 'emp-4'], organizer: 'emp-3', type: 'team', status: 'scheduled' }
  ];

  let filtered = meetings;
  if (employeeId) {
    filtered = filtered.filter(m => m.attendees.includes(employeeId as string));
  }

  res.json({
    meetings: filtered,
    summary: {
      total: filtered.length,
      byType: filtered.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {})
    }
  });
});

// Schedule optimization
app.get('/api/optimize', (req: Request, res: Response) => {
  const { department } = req.query;

  const coverage = {
    monday: { morning: 3, afternoon: 3, evening: 2 },
    tuesday: { morning: 3, afternoon: 3, evening: 2 },
    wednesday: { morning: 3, afternoon: 3, evening: 2 },
    thursday: { morning: 3, afternoon: 3, evening: 2 },
    friday: { morning: 3, afternoon: 2, evening: 1 },
    saturday: { morning: 1, afternoon: 1, evening: 0 },
    sunday: { morning: 0, afternoon: 0, evening: 0 }
  };

  const recommendations = [
    { type: 'coverage', message: 'Consider adding Saturday morning coverage', impact: 'medium' },
    { type: 'balance', message: 'Evening shifts need more support', impact: 'high' },
    { type: 'skill', message: 'Cross-train 2 more employees on escalation handling', impact: 'low' }
  ];

  res.json({
    coverage,
    recommendations,
    optimizationScore: 85,
    suggestions: [
      'Add flex shifts on Fridays',
      'Rotate weekend coverage equally',
      'Implement buddy system for complex issues'
    ]
  });
});

// Find available slot
app.post('/api/slots/find', (req: Request, res: Response) => {
  const { attendees, duration, date, preferences } = req.body;

  const slots = [
    { start: '09:00', end: '09:30', available: true },
    { start: '10:00', end: '10:30', available: true },
    { start: '11:00', end: '11:30', available: false, reason: 'Calendar conflict' },
    { start: '14:00', end: '14:30', available: true },
    { start: '15:00', end: '15:30', available: true }
  ];

  const availableSlots = slots.filter(s => s.available);

  res.json({
    date,
    attendees,
    duration,
    slots,
    recommended: availableSlots[0] || null,
    alternatives: availableSlots.slice(0, 3)
  });
});

// Resource management
app.get('/api/resources', (req: Request, res: Response) => {
  const { type, date } = req.query;

  let filtered = resources;
  if (type) {
    filtered = resources.filter(r => r.type === type);
  }

  res.json({
    resources: filtered,
    summary: {
      total: filtered.length,
      available: filtered.filter(r => r.available).length,
      booked: filtered.filter(r => !r.available).length
    }
  });
});

// Book resource
app.post('/api/resources/:id/book', (req: Request, res: Response) => {
  const { id } = req.params;
  const { meetingId, start, end } = req.body;

  const resource = resources.find(r => r.id === id);

  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  resource.bookings.push({ start: new Date(start), end: new Date(end), meetingId });
  resource.available = false;

  res.json({
    resource,
    booking: { start, end, meetingId },
    confirmation: 'Resource booked successfully'
  });
});

// Time-off management
app.post('/api/time-off', (req: Request, res: Response) => {
  const { employeeId, startDate, endDate, type, reason } = req.body;

  const request = {
    id: `pto-${Date.now()}`,
    employeeId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    type: type || 'vacation',
    reason,
    status: 'pending',
    submittedAt: new Date()
  };

  res.json({
    request,
    workflow: {
      approvers: ['manager@company.com'],
      autoApprove: false,
      leadTime: '2 weeks required'
    },
    coverage: {
      shiftCoverage: 'Team will cover',
      handover: 'Please document pending tasks'
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'scheduler',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Scheduler running on port ${PORT}`);
  console.log('Role: Shift planning, meeting scheduling, resource allocation');
});

export default app;
