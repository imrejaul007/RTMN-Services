/**
 * Permits Routes
 * License and permit management endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const permits: Map<string, any> = new Map();

// Permit types
const permitTypes = [
  { id: 'trade-license', name: 'Trade License', department: 'Municipal', validity: 1, fee: 5000 },
  { id: 'building-permit', name: 'Building Permit', department: 'PWD', validity: 2, fee: 50000 },
  { id: 'fire-noc', name: 'Fire NOC', department: 'Fire Dept', validity: 1, fee: 10000 },
  { id: 'food-license', name: 'Food License', department: 'FSSAI', validity: 3, fee: 3000 },
  { id: 'pollution-cert', name: 'Pollution Certificate', department: 'PCB', validity: 1, fee: 15000 },
  { id: 'signage-permit', name: 'Signage Permit', department: 'Municipal', validity: 2, fee: 2000 }
];

// GET /api/permits/types - List permit types
router.get('/types', (req: Request, res: Response) => {
  const { department } = req.query;

  let filtered = permitTypes;
  if (department) {
    filtered = permitTypes.filter(p => p.department === department);
  }

  res.json({ success: true, permitTypes: filtered });
});

// GET /api/permits/types/:id - Get permit type
router.get('/types/:id', (req: Request, res: Response) => {
  const permitType = permitTypes.find(p => p.id === req.params.id);

  if (!permitType) {
    return res.status(404).json({ error: 'Permit type not found' });
  }

  res.json({ success: true, permitType });
});

// POST /api/permits - Apply for permit
router.post('/', (req: Request, res: Response) => {
  const { permitTypeId, applicantId, businessName, address, documents } = req.body;

  if (!permitTypeId || !applicantId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const permitType = permitTypes.find(p => p.id === permitTypeId);
  if (!permitType) {
    return res.status(400).json({ error: 'Invalid permit type' });
  }

  const permitId = uuidv4();
  const now = new Date();

  const permit = {
    permitId,
    permitTypeId,
    permitTypeName: permitType.name,
    applicantId,
    businessName,
    address,
    documents: documents || [],
    status: 'pending',
    fee: permitType.fee,
    paid: false,
    validFrom: null,
    validUntil: null,
    renewalDate: null,
    inspections: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  permits.set(permitId, permit);

  res.status(201).json({ success: true, permit });
});

// GET /api/permits - List permits
router.get('/', (req: Request, res: Response) => {
  const { applicantId, status, type } = req.query;

  let filtered = Array.from(permits.values());

  if (applicantId) filtered = filtered.filter(p => p.applicantId === applicantId);
  if (status) filtered = filtered.filter(p => p.status === status);
  if (type) filtered = filtered.filter(p => p.permitTypeId === type);

  res.json({ success: true, permits: filtered });
});

// GET /api/permits/:id - Get permit details
router.get('/:id', (req: Request, res: Response) => {
  const permit = permits.get(req.params.id);

  if (!permit) {
    return res.status(404).json({ error: 'Permit not found' });
  }

  res.json({ success: true, permit });
});

// PATCH /api/permits/:id - Update permit
router.patch('/:id', (req: Request, res: Response) => {
  const permit = permits.get(req.params.id);

  if (!permit) {
    return res.status(404).json({ error: 'Permit not found' });
  }

  const updated = { ...permit, ...req.body, updatedAt: new Date().toISOString() };
  permits.set(req.params.id, updated);

  res.json({ success: true, permit: updated });
});

// POST /api/permits/:id/approve - Approve permit
router.post('/:id/approve', (req: Request, res: Response) => {
  const permit = permits.get(req.params.id);

  if (!permit) {
    return res.status(404).json({ error: 'Permit not found' });
  }

  const permitType = permitTypes.find(p => p.id === permit.permitTypeId);
  const validityYears = permitType?.validity || 1;

  const now = new Date();
  const validUntil = new Date(now.getFullYear() + validityYears, now.getMonth(), now.getDate());

  permit.status = 'approved';
  permit.validFrom = now.toISOString();
  permit.validUntil = validUntil.toISOString();
  permit.renewalDate = new Date(validUntil.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  permit.updatedAt = now.toISOString();

  permits.set(req.params.id, permit);

  res.json({ success: true, permit });
});

// POST /api/permits/:id/reject - Reject permit
router.post('/:id/reject', (req: Request, res: Response) => {
  const permit = permits.get(req.params.id);

  if (!permit) {
    return res.status(404).json({ error: 'Permit not found' });
  }

  const { reason } = req.body;

  permit.status = 'rejected';
  permit.rejectionReason = reason;
  permit.updatedAt = new Date().toISOString();

  permits.set(req.params.id, permit);

  res.json({ success: true, permit });
});

// POST /api/permits/:id/renew - Renew permit
router.post('/:id/renew', (req: Request, res: Response) => {
  const permit = permits.get(req.params.id);

  if (!permit) {
    return res.status(404).json({ error: 'Permit not found' });
  }

  const permitType = permitTypes.find(p => p.id === permit.permitTypeId);
  const validityYears = permitType?.validity || 1;

  const now = new Date();
  const validUntil = new Date(now.getFullYear() + validityYears, now.getMonth(), now.getDate());

  permit.status = 'approved';
  permit.validFrom = now.toISOString();
  permit.validUntil = validUntil.toISOString();
  permit.renewalDate = new Date(validUntil.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  permit.renewed = true;
  permit.updatedAt = now.toISOString();

  permits.set(req.params.id, permit);

  res.json({ success: true, permit });
});

export default router;
