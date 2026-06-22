/**
 * Case Routes
 * Case Management API Endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory case storage (replace with MongoDB in production)
const cases: Map<string, any> = new Map();

// GET /api/cases - List all cases
router.get('/', (req: Request, res: Response) => {
  const { status, clientId, page = 1, limit = 20 } = req.query;

  let filteredCases = Array.from(cases.values());

  if (status) {
    filteredCases = filteredCases.filter(c => c.status === status);
  }
  if (clientId) {
    filteredCases = filteredCases.filter(c => c.clientId === clientId);
  }

  const start = (Number(page) - 1) * Number(limit);
  const paginatedCases = filteredCases.slice(start, start + Number(limit));

  res.json({
    success: true,
    cases: paginatedCases,
    total: filteredCases.length,
    page: Number(page),
    limit: Number(limit)
  });
});

// GET /api/cases/:id - Get case by ID
router.get('/:id', (req: Request, res: Response) => {
  const caseData = cases.get(req.params.id);

  if (!caseData) {
    return res.status(404).json({ error: 'Case not found' });
  }

  res.json({ success: true, case: caseData });
});

// POST /api/cases - Create new case
router.post('/', (req: Request, res: Response) => {
  const { clientId, caseType, title, description, court, judge, filingDate, priority } = req.body;

  if (!clientId || !caseType || !title) {
    return res.status(400).json({ error: 'Missing required fields: clientId, caseType, title' });
  }

  const caseId = uuidv4();
  const now = new Date().toISOString();

  const newCase = {
    caseId,
    clientId,
    caseType,
    title,
    description,
    court,
    judge,
    filingDate: filingDate || now,
    priority: priority || 'medium',
    status: 'active',
    stage: 'intake',
    deadlines: [],
    documents: [],
    hearings: [],
    expenses: [],
    createdAt: now,
    updatedAt: now
  };

  cases.set(caseId, newCase);

  res.status(201).json({ success: true, case: newCase });
});

// PATCH /api/cases/:id - Update case
router.patch('/:id', (req: Request, res: Response) => {
  const caseData = cases.get(req.params.id);

  if (!caseData) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const updates = req.body;
  const updatedCase = {
    ...caseData,
    ...updates,
    caseId: caseData.caseId,
    updatedAt: new Date().toISOString()
  };

  cases.set(req.params.id, updatedCase);

  res.json({ success: true, case: updatedCase });
});

// POST /api/cases/:id/deadlines - Add deadline
router.post('/:id/deadlines', (req: Request, res: Response) => {
  const caseData = cases.get(req.params.id);

  if (!caseData) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const { title, dueDate, type, priority } = req.body;

  if (!title || !dueDate) {
    return res.status(400).json({ error: 'Missing required fields: title, dueDate' });
  }

  const deadline = {
    id: uuidv4(),
    title,
    dueDate,
    type: type || 'general',
    priority: priority || 'medium',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  caseData.deadlines.push(deadline);
  caseData.updatedAt = new Date().toISOString();
  cases.set(req.params.id, caseData);

  res.json({ success: true, deadline });
});

// POST /api/cases/:id/hearings - Add hearing
router.post('/:id/hearings', (req: Request, res: Response) => {
  const caseData = cases.get(req.params.id);

  if (!caseData) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const { date, time, court, judge, notes } = req.body;

  if (!date || !court) {
    return res.status(400).json({ error: 'Missing required fields: date, court' });
  }

  const hearing = {
    id: uuidv4(),
    date,
    time,
    court,
    judge,
    notes,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  caseData.hearings.push(hearing);
  caseData.updatedAt = new Date().toISOString();
  cases.set(req.params.id, caseData);

  res.json({ success: true, hearing });
});

// POST /api/cases/:id/documents - Link document
router.post('/:id/documents', (req: Request, res: Response) => {
  const caseData = cases.get(req.params.id);

  if (!caseData) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const { documentId, documentType, title } = req.body;

  if (!documentId || !title) {
    return res.status(400).json({ error: 'Missing required fields: documentId, title' });
  }

  const documentLink = {
    documentId,
    documentType: documentType || 'general',
    title,
    linkedAt: new Date().toISOString()
  };

  caseData.documents.push(documentLink);
  caseData.updatedAt = new Date().toISOString();
  cases.set(req.params.id, caseData);

  res.json({ success: true, document: documentLink });
});

// DELETE /api/cases/:id - Delete case
router.delete('/:id', (req: Request, res: Response) => {
  if (!cases.has(req.params.id)) {
    return res.status(404).json({ error: 'Case not found' });
  }

  cases.delete(req.params.id);

  res.json({ success: true, message: 'Case deleted' });
});

export default router;
