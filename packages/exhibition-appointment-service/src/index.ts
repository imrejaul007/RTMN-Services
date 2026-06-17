import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5053;

app.use(cors());
app.use(express.json());

// Mock data
interface Appointment {
  id: string;
  title: string;
  description: string;
  hostId: string;
  hostName: string;
  attendeeId: string;
  attendeeName: string;
  startTime: string;
  endTime: string;
  location: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  boothId?: string;
  notes?: string;
}

const appointments: Appointment[] = [
  {
    id: '1',
    title: 'Product Demo',
    description: 'Live demo of our new AI platform',
    hostId: '1',
    hostName: 'Alice Johnson',
    attendeeId: '2',
    attendeeName: 'Bob Smith',
    startTime: '2026-06-16T10:00:00Z',
    endTime: '2026-06-16T10:30:00Z',
    location: 'Booth A-12',
    status: 'confirmed'
  },
  {
    id: '2',
    title: 'Partnership Discussion',
    description: 'Exploring collaboration opportunities',
    hostId: '3',
    hostName: 'Carol Williams',
    attendeeId: '1',
    attendeeName: 'Alice Johnson',
    startTime: '2026-06-16T14:00:00Z',
    endTime: '2026-06-16T14:45:00Z',
    location: 'Meeting Room 3',
    status: 'pending'
  }
];

const booths = [
  { id: 'A-12', name: 'Tech Innovations', x: 1, y: 12 },
  { id: 'A-15', name: 'Design Studio', x: 1, y: 15 },
  { id: 'B-03', name: 'Green Energy Co', x: 2, y: 3 },
  { id: 'B-08', name: 'HealthTech Solutions', x: 2, y: 8 }
];

const timeSlots = [
  { start: '09:00', end: '09:30' },
  { start: '09:30', end: '10:00' },
  { start: '10:00', end: '10:30' },
  { start: '10:30', end: '11:00' },
  { start: '11:00', end: '11:30' },
  { start: '11:30', end: '12:00' },
  { start: '14:00', end: '14:30' },
  { start: '14:30', end: '15:00' },
  { start: '15:00', end: '15:30' },
  { start: '15:30', end: '16:00' },
  { start: '16:00', end: '16:30' }
];

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'exhibition-appointment-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Appointments
app.get('/api/appointments', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (userId) {
    const userAppointments = appointments.filter(
      a => a.hostId === userId || a.attendeeId === userId
    );
    return res.json({ success: true, data: userAppointments });
  }
  res.json({ success: true, data: appointments });
});

app.get('/api/appointments/:id', (req: Request, res: Response) => {
  const appointment = appointments.find(a => a.id === req.params.id);
  if (!appointment) {
    return res.status(404).json({ success: false, error: 'Appointment not found' });
  }
  res.json({ success: true, data: appointment });
});

app.post('/api/appointments', (req: Request, res: Response) => {
  const newAppointment: Appointment = {
    id: uuidv4(),
    title: req.body.title,
    description: req.body.description || '',
    hostId: req.body.hostId,
    hostName: req.body.hostName,
    attendeeId: req.body.attendeeId,
    attendeeName: req.body.attendeeName,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    location: req.body.location || 'TBD',
    status: 'pending',
    boothId: req.body.boothId,
    notes: req.body.notes
  };
  appointments.push(newAppointment);
  res.status(201).json({ success: true, data: newAppointment });
});

app.patch('/api/appointments/:id', (req: Request, res: Response) => {
  const appointment = appointments.find(a => a.id === req.params.id);
  if (!appointment) {
    return res.status(404).json({ success: false, error: 'Appointment not found' });
  }
  Object.assign(appointment, req.body);
  res.json({ success: true, data: appointment });
});

app.delete('/api/appointments/:id', (req: Request, res: Response) => {
  const index = appointments.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Appointment not found' });
  }
  appointments.splice(index, 1);
  res.json({ success: true, message: 'Appointment cancelled' });
});

// Booths
app.get('/api/booths', (_req: Request, res: Response) => {
  res.json({ success: true, data: booths });
});

app.get('/api/booths/:id', (req: Request, res: Response) => {
  const booth = booths.find(b => b.id === req.params.id);
  if (!booth) {
    return res.status(404).json({ success: false, error: 'Booth not found' });
  }
  res.json({ success: true, data: booth });
});

// Time slots
app.get('/api/timeslots', (req: Request, res: Response) => {
  const date = req.query.date as string;
  const boothId = req.query.boothId as string;

  // Return all time slots with availability status
  const slots = timeSlots.map(slot => {
    const isBooked = appointments.some(a => {
      const appointmentDate = a.startTime.split('T')[0];
      const slotStart = `${date}T${slot.start}:00Z`;
      const slotEnd = `${date}T${slot.end}:00Z`;
      return a.boothId === boothId &&
             appointmentDate === date &&
             ((a.startTime < slotEnd && a.endTime > slotStart) || a.status === 'cancelled');
    });
    return { ...slot, date, boothId, available: !isBooked };
  });

  res.json({ success: true, data: slots });
});

// Available slots for a user
app.get('/api/availability', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const date = req.query.date as string;

  // Simulate user's booked slots
  const bookedSlots = appointments
    .filter(a => (a.hostId === userId || a.attendeeId === userId) && a.status !== 'cancelled')
    .map(a => a.startTime);

  const availableSlots = timeSlots.filter(slot => {
    const slotTime = `${date}T${slot.start}:00Z`;
    return !bookedSlots.some(booked => booked === slotTime);
  });

  res.json({ success: true, data: availableSlots });
});

app.listen(PORT, () => {
  console.log(`Exhibition Appointment Service running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

export default app;
