/**
 * Citizen Services Routes
 * Government citizen service endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory storage
const applications: Map<string, any> = new Map();
const documents: Map<string, any> = new Map();

// Government schemes database
const schemes = [
  { id: 'pmay', name: 'Pradhan Mantri Awas Yojana', category: 'housing', benefits: 'Subsidy on home loan' },
  { id: 'pmjd', name: 'Pradhan Mantri Jan Dhan', category: 'banking', benefits: 'Zero balance account' },
  { id: 'pmayg', name: 'PM-KISAN', category: 'agriculture', benefits: '₹6000/year to farmers' },
  { id: 'sukanya', name: 'Sukanya Samriddhi', category: 'savings', benefits: 'Girl child welfare' },
  { id: 'pmjay', name: 'Ayushman Bharat', category: 'healthcare', benefits: '₹5 lakh coverage' }
];

// GET /api/citizen-services/schemes - List available schemes
router.get('/schemes', (req: Request, res: Response) => {
  const { category } = req.query;

  let filteredSchemes = schemes;
  if (category) {
    filteredSchemes = schemes.filter(s => s.category === category);
  }

  res.json({ success: true, schemes: filteredSchemes });
});

// GET /api/citizen-services/schemes/:id - Get scheme details
router.get('/schemes/:id', (req: Request, res: Response) => {
  const scheme = schemes.find(s => s.id === req.params.id);

  if (!scheme) {
    return res.status(404).json({ error: 'Scheme not found' });
  }

  res.json({ success: true, scheme });
});

// POST /api/citizen-services/check-eligibility - Check scheme eligibility
router.post('/check-eligibility', (req: Request, res: Response) => {
  const { schemeId, income, occupation, location, age, gender } = req.body;

  const scheme = schemes.find(s => s.id === schemeId);
  if (!scheme) {
    return res.status(404).json({ error: 'Scheme not found' });
  }

  // Simple eligibility logic
  let eligible = true;
  const reasons: string[] = [];

  if (income && income > 300000 && scheme.category === 'housing') {
    eligible = false;
    reasons.push('Income exceeds threshold for housing scheme');
  }

  res.json({
    success: true,
    eligible,
    scheme: scheme.name,
    reasons,
    recommendations: eligible ? ['Proceed with application'] : ['Review other available schemes']
  });
});

// POST /api/citizen-services/applications - Submit application
router.post('/applications', (req: Request, res: Response) => {
  const { citizenId, schemeId, documents: docList, formData } = req.body;

  if (!citizenId || !schemeId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const applicationId = uuidv4();
  const application = {
    applicationId,
    citizenId,
    schemeId,
    documents: docList || [],
    formData,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  applications.set(applicationId, application);

  res.status(201).json({ success: true, application });
});

// GET /api/citizen-services/applications - List applications
router.get('/applications', (req: Request, res: Response) => {
  const { citizenId, status } = req.query;

  let filtered = Array.from(applications.values());

  if (citizenId) {
    filtered = filtered.filter(a => a.citizenId === citizenId);
  }
  if (status) {
    filtered = filtered.filter(a => a.status === status);
  }

  res.json({ success: true, applications: filtered });
});

// GET /api/citizen-services/applications/:id - Get application status
router.get('/applications/:id', (req: Request, res: Response) => {
  const application = applications.get(req.params.id);

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  res.json({ success: true, application });
});

// PATCH /api/citizen-services/applications/:id - Update application
router.patch('/applications/:id', (req: Request, res: Response) => {
  const application = applications.get(req.params.id);

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const updated = { ...application, ...req.body };
  applications.set(req.params.id, updated);

  res.json({ success: true, application: updated });
});

// POST /api/citizen-services/documents/verify - Verify document
router.post('/documents/verify', (req: Request, res: Response) => {
  const { documentType, documentNumber, citizenId } = req.body;

  if (!documentType || !documentNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Simulate verification
  const verified = Math.random() > 0.1; // 90% success rate

  const record = {
    verificationId: uuidv4(),
    documentType,
    documentNumber,
    citizenId,
    status: verified ? 'verified' : 'pending',
    verifiedAt: verified ? new Date().toISOString() : null,
    confidence: verified ? 0.95 : 0.5
  };

  documents.set(record.verificationId, record);

  res.json({ success: true, verification: record });
});

// GET /api/citizen-services/documents/:id - Get document
router.get('/documents/:id', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json({ success: true, document: doc });
});

export default router;
