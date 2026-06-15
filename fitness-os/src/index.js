import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5110;
const logger = winston.createLogger({ level: 'info', format: winston.format.combine(winston.format.timestamp(), winston.format.json()), transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })] });
app.use(helmet()); app.use(cors()); app.use(express.json());

const members = new Map(), trainers = new Map(), classes = new Map(), memberships = new Map(), attendance = new Map(), workouts = new Map();

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'fitness-os', version: '1.0.0' }));

app.get('/api/members', (req, res) => res.json({ success: true, count: members.size, members: Array.from(members.values()) }));
app.post('/api/members', (req, res) => {
  const { name, email, phone, emergencyContact } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const member = { id: uuidv4(), name, email: email || null, phone: phone || null, emergencyContact: emergencyContact || {}, membershipType: 'basic', status: 'active', createdAt: new Date().toISOString() };
  members.set(member.id, member);
  res.status(201).json({ success: true, member });
});

app.get('/api/trainers', (req, res) => res.json({ success: true, count: trainers.size, trainers: Array.from(trainers.values()) }));
app.post('/api/trainers', (req, res) => {
  const { name, specialties, certifications } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const trainer = { id: uuidv4(), name, specialties: specialties || [], certifications: certifications || [], status: 'available', createdAt: new Date().toISOString() };
  trainers.set(trainer.id, trainer);
  res.status(201).json({ success: true, trainer });
});

app.get('/api/classes', (req, res) => res.json({ success: true, count: classes.size, classes: Array.from(classes.values()) }));
app.post('/api/classes', (req, res) => {
  const { name, trainerId, schedule, capacity, duration } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const cls = { id: uuidv4(), name, trainerId: trainerId || null, schedule: schedule || {}, capacity: capacity || 20, duration: duration || 60, enrolled: 0, status: 'active', createdAt: new Date().toISOString() };
  classes.set(cls.id, cls);
  res.status(201).json({ success: true, class: cls });
});

app.get('/api/memberships', (req, res) => res.json({ success: true, count: memberships.size, memberships: Array.from(memberships.values()) }));
app.post('/api/memberships', (req, res) => {
  const { memberId, type, startDate, endDate, price } = req.body;
  if (!memberId) return res.status(400).json({ success: false, error: 'memberId required' });
  const membership = { id: uuidv4(), memberId, type: type || 'monthly', startDate: startDate || new Date().toISOString(), endDate: endDate || null, price: price || 0, status: 'active', createdAt: new Date().toISOString() };
  memberships.set(membership.id, membership);
  res.status(201).json({ success: true, membership });
});

app.get('/api/attendance', (req, res) => {
  let result = Array.from(attendance.values());
  if (req.query.memberId) result = result.filter(a => a.memberId === req.query.memberId);
  res.json({ success: true, count: result.length, attendance: result });
});
app.post('/api/attendance', (req, res) => {
  const { memberId, classId, checkIn, checkOut } = req.body;
  if (!memberId) return res.status(400).json({ success: false, error: 'memberId required' });
  const record = { id: uuidv4(), memberId, classId: classId || null, checkIn: checkIn || new Date().toISOString(), checkOut: checkOut || null, createdAt: new Date().toISOString() };
  attendance.set(record.id, record);
  res.status(201).json({ success: true, attendance: record });
});

app.get('/api/analytics', (req, res) => {
  res.json({ success: true, analytics: { totalMembers: members.size, totalTrainers: trainers.size, totalClasses: classes.size, totalMemberships: memberships.size, todayCheckIns: Array.from(attendance.values()).filter(a => a.checkIn.startsWith(new Date().toISOString().split('T')[0])).length } });
});

app.use((err, req, res) => { logger.error(err); res.status(500).json({ success: false, error: err.message }); });
app.listen(PORT, () => logger.info(`💪 Fitness OS running on port ${PORT}`));
export default app;
