/**
 * Complaints Routes
 * Grievance redressal endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const complaints: Map<string, any> = new Map();

// Departments
const departments = [
  { id: 'municipal', name: 'Municipal Corporation', phone: '1916' },
  { id: 'police', name: 'Police Department', phone: '100' },
  { id: 'health', name: 'Health Department', phone: '104' },
  { id: 'education', name: 'Education Department', phone: '1800-XXX-XXXX' },
  { id: 'revenue', name: 'Revenue Department', phone: '1800-XXX-XXXX' },
  { id: 'transport', name: 'Transport Department', phone: '1800-XXX-XXXX' }
];

// GET /api/complaints/departments - List departments
router.get('/departments', (req: Request, res: Response) => {
  res.json({ success: true, departments });
});

// POST /api/complaints - Submit complaint
router.post('/', (req: Request, res: Response) => {
  const { citizenId, departmentId, category, subject, description, location, priority } = req.body;

  if (!citizenId || !departmentId || !subject) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const complaintId = uuidv4();
  const now = new Date();
  const referenceNumber = `GRIEV-${now.getFullYear()}-${String(complaints.size + 1).padStart(6, '0')}`;

  const complaint = {
    complaintId,
    referenceNumber,
    citizenId,
    departmentId,
    category: category || 'general',
    subject,
    description,
    location,
    priority: priority || 'medium',
    status: 'submitted',
    timeline: [{
      status: 'submitted',
      timestamp: now.toISOString(),
      note: 'Complaint received'
    }],
    assignedTo: null,
    resolution: null,
    feedback: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  complaints.set(complaintId, complaint);

  res.status(201).json({
    success: true,
    complaint,
    message: `Complaint registered with reference: ${referenceNumber}`
  });
});

// GET /api/complaints - List complaints
router.get('/', (req: Request, res: Response) => {
  const { citizenId, departmentId, status, priority } = req.query;

  let filtered = Array.from(complaints.values());

  if (citizenId) filtered = filtered.filter(c => c.citizenId === citizenId);
  if (departmentId) filtered = filtered.filter(c => c.departmentId === departmentId);
  if (status) filtered = filtered.filter(c => c.status === status);
  if (priority) filtered = filtered.filter(c => c.priority === priority);

  res.json({ success: true, complaints: filtered });
});

// GET /api/complaints/:id - Get complaint details
router.get('/:id', (req: Request, res: Response) => {
  const complaint = complaints.get(req.params.id);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  res.json({ success: true, complaint });
});

// PATCH /api/complaints/:id - Update complaint
router.patch('/:id', (req: Request, res: Response) => {
  const complaint = complaints.get(req.params.id);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { status, note, assignedTo } = req.body;
  const now = new Date();

  if (status) {
    complaint.status = status;
    complaint.timeline.push({
      status,
      timestamp: now.toISOString(),
      note: note || `Status changed to ${status}`
    });
  }

  if (assignedTo) complaint.assignedTo = assignedTo;
  complaint.updatedAt = now.toISOString();

  complaints.set(req.params.id, complaint);

  res.json({ success: true, complaint });
});

// POST /api/complaints/:id/escalate - Escalate complaint
router.post('/:id/escalate', (req: Request, res: Response) => {
  const complaint = complaints.get(req.params.id);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { reason, escalateTo } = req.body;
  const now = new Date();

  complaint.priority = 'high';
  complaint.status = 'escalated';
  complaint.escalationLevel = (complaint.escalationLevel || 0) + 1;
  complaint.escalatedTo = escalateTo || 'higher-authority';
  complaint.timeline.push({
    status: 'escalated',
    timestamp: now.toISOString(),
    note: reason || 'Escalated due to delayed resolution'
  });
  complaint.updatedAt = now.toISOString();

  complaints.set(req.params.id, complaint);

  res.json({ success: true, complaint, message: 'Complaint escalated' });
});

// POST /api/complaints/:id/resolve - Resolve complaint
router.post('/:id/resolve', (req: Request, res: Response) => {
  const complaint = complaints.get(req.params.id);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { resolution } = req.body;
  const now = new Date();

  complaint.status = 'resolved';
  complaint.resolution = {
    text: resolution,
    resolvedAt: now.toISOString(),
    resolvedBy: 'system'
  };
  complaint.timeline.push({
    status: 'resolved',
    timestamp: now.toISOString(),
    note: resolution || 'Complaint resolved'
  });
  complaint.updatedAt = now.toISOString();

  complaints.set(req.params.id, complaint);

  res.json({ success: true, complaint, message: 'Complaint resolved' });
});

// POST /api/complaints/:id/feedback - Submit feedback
router.post('/:id/feedback', (req: Request, res: Response) => {
  const complaint = complaints.get(req.params.id);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  if (complaint.status !== 'resolved') {
    return res.status(400).json({ error: 'Can only provide feedback for resolved complaints' });
  }

  const { rating, comment } = req.body;

  complaint.feedback = {
    rating: rating || 5,
    comment,
    submittedAt: new Date().toISOString()
  };
  complaint.status = 'closed';
  complaint.updatedAt = new Date().toISOString();

  complaints.set(req.params.id, complaint);

  res.json({ success: true, complaint, message: 'Feedback submitted' });
});

// GET /api/complaints/stats - Get complaint statistics
router.get('/stats/overview', (req: Request, res: Response) => {
  const all = Array.from(complaints.values());

  const stats = {
    total: all.length,
    submitted: all.filter(c => c.status === 'submitted').length,
    inProgress: all.filter(c => c.status === 'in-progress').length,
    escalated: all.filter(c => c.status === 'escalated').length,
    resolved: all.filter(c => c.status === 'resolved').length,
    closed: all.filter(c => c.status === 'closed').length,
    avgResolutionDays: 7.5,
    satisfactionScore: 4.2
  };

  res.json({ success: true, stats });
});

export default router;
