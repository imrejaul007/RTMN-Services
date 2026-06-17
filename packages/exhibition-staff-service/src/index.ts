import express from 'express';

const app = express();
const PORT = 5057;

app.use(express.json());

// Mock data
const volunteers = [
  { id: '1', name: 'Alice Johnson', role: 'registration', shift: 'morning', status: 'active', hours: 0 },
  { id: '2', name: 'Bob Smith', role: 'guidance', shift: 'afternoon', status: 'active', hours: 0 },
  { id: '3', name: 'Carol Davis', role: 'technical', shift: 'evening', status: 'inactive', hours: 0 },
];

const shifts = [
  { id: '1', name: 'Morning Shift', start: '08:00', end: '14:00', slots: 20, filled: 15 },
  { id: '2', name: 'Afternoon Shift', start: '14:00', end: '20:00', slots: 20, filled: 12 },
  { id: '3', name: 'Evening Shift', start: '20:00', end: '23:00', slots: 10, filled: 8 },
];

const assignments = [
  { id: '1', volunteerId: '1', shiftId: '1', zone: 'Registration Desk', tasks: ['Check-in visitors', 'Issue badges'] },
  { id: '2', volunteerId: '2', shiftId: '2', zone: 'Hall A', tasks: ['Guide visitors', 'Answer questions'] },
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-staff-service', port: PORT });
});

// Get all volunteers
app.get('/api/volunteers', (req, res) => {
  const { status, role } = req.query;
  let filtered = volunteers;
  if (status) filtered = filtered.filter(v => v.status === status);
  if (role) filtered = filtered.filter(v => v.role === role);
  res.json({ success: true, data: filtered });
});

// Get volunteer by ID
app.get('/api/volunteers/:id', (req, res) => {
  const volunteer = volunteers.find(v => v.id === req.params.id);
  if (!volunteer) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Volunteer not found' } });
  }
  res.json({ success: true, data: volunteer });
});

// Create volunteer
app.post('/api/volunteers', (req, res) => {
  const newVolunteer = {
    id: String(volunteers.length + 1),
    ...req.body,
    status: 'active',
    hours: 0,
  };
  volunteers.push(newVolunteer);
  res.status(201).json({ success: true, data: newVolunteer });
});

// Update volunteer
app.patch('/api/volunteers/:id', (req, res) => {
  const index = volunteers.findIndex(v => v.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Volunteer not found' } });
  }
  volunteers[index] = { ...volunteers[index], ...req.body };
  res.json({ success: true, data: volunteers[index] });
});

// Get shifts
app.get('/api/shifts', (req, res) => {
  res.json({ success: true, data: shifts });
});

// Create shift
app.post('/api/shifts', (req, res) => {
  const newShift = {
    id: String(shifts.length + 1),
    ...req.body,
    filled: 0,
  };
  shifts.push(newShift);
  res.status(201).json({ success: true, data: newShift });
});

// Get assignments
app.get('/api/assignments', (req, res) => {
  res.json({ success: true, data: assignments });
});

// Create assignment
app.post('/api/assignments', (req, res) => {
  const newAssignment = {
    id: String(assignments.length + 1),
    ...req.body,
  };
  assignments.push(newAssignment);
  res.status(201).json({ success: true, data: newAssignment });
});

// Get volunteer by ID
app.get('/api/volunteers/:id/assignments', (req, res) => {
  const volunteerAssignments = assignments.filter(a => a.volunteerId === req.params.id);
  res.json({ success: true, data: volunteerAssignments });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const analytics = {
    totalVolunteers: volunteers.length,
    activeVolunteers: volunteers.filter(v => v.status === 'active').length,
    totalShifts: shifts.length,
    shiftCoverage: `${Math.round((shifts.reduce((sum, s) => sum + s.filled, 0) / shifts.reduce((sum, s) => sum + s.slots, 0)) * 100)}%`,
    byRole: {
      registration: volunteers.filter(v => v.role === 'registration').length,
      guidance: volunteers.filter(v => v.role === 'guidance').length,
      technical: volunteers.filter(v => v.role === 'technical').length,
    },
    totalHoursLogged: volunteers.reduce((sum, v) => sum + v.hours, 0),
  };
  res.json({ success: true, data: analytics });
});

app.listen(PORT, () => {
  console.log(`Exhibition Staff Service running on port ${PORT}`);
});

export default app;
