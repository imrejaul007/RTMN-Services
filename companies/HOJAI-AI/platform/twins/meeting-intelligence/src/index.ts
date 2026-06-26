/**
 * Meeting Intelligence Service - Port: 4749
 * Meeting transcription, decisions, and action items
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4749', 10);
app.use(express.json());

interface Meeting { id: string; title: string; participants: string[]; transcript: string; decisions: string[]; actionItems: { description: string; assignee: string; dueDate?: string; status: string }[]; createdAt: string; }
const meetings = new Map<string, Meeting>();

function generateId(p: string) { return `${p}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`; }

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'meeting-intelligence', version: '1.0.0' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.post('/api/meetings/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const { title, participants = [] } = req.body;
  const meeting: Meeting = { id: generateId('mtg'), title: title || '', participants: [employeeId, ...participants], transcript: '', decisions: [], actionItems: [], createdAt: new Date().toISOString() };
  meetings.set(meeting.id, meeting);
  res.status(201).json({ success: true, data: meeting });
});

app.get('/api/meetings/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const empMeetings = Array.from(meetings.values()).filter(m => m.participants.includes(employeeId));
  res.json({ success: true, data: { meetings: empMeetings, total: empMeetings.length } });
});

app.post('/api/meetings/:meetingId/transcribe', (req, res) => {
  const { meetingId } = req.params;
  const { transcript } = req.body;
  const meeting = meetings.get(meetingId);
  if (!meeting) return res.status(404).json({ success: false, error: 'Meeting not found' });
  meeting.transcript = transcript;
  res.json({ success: true, data: meeting });
});

app.post('/api/meetings/:meetingId/decisions', (req, res) => {
  const { meetingId } = req.params;
  const { decision } = req.body;
  const meeting = meetings.get(meetingId);
  if (!meeting) return res.status(404).json({ success: false, error: 'Meeting not found' });
  meeting.decisions.push(decision);
  res.json({ success: true, data: meeting });
});

app.post('/api/meetings/:meetingId/actions', (req, res) => {
  const { meetingId } = req.params;
  const { description, assignee, dueDate } = req.body;
  const meeting = meetings.get(meetingId);
  if (!meeting) return res.status(404).json({ success: false, error: 'Meeting not found' });
  meeting.actionItems.push({ description, assignee, dueDate, status: 'pending' });
  res.json({ success: true, data: meeting });
});

const server = app.listen(PORT, () => console.log(`Meeting Intelligence - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
