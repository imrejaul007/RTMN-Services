/**
 * Client Routes
 * Client Management API Endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory client storage
const clients: Map<string, any> = new Map();

// GET /api/clients - List all clients
router.get('/', (req: Request, res: Response) => {
  const { type, status, page = 1, limit = 20 } = req.query;

  let filteredClients = Array.from(clients.values());

  if (type) {
    filteredClients = filteredClients.filter(c => c.type === type);
  }
  if (status) {
    filteredClients = filteredClients.filter(c => c.status === status);
  }

  const start = (Number(page) - 1) * Number(limit);
  const paginatedClients = filteredClients.slice(start, start + Number(limit));

  res.json({
    success: true,
    clients: paginatedClients,
    total: filteredClients.length,
    page: Number(page),
    limit: Number(limit)
  });
});

// GET /api/clients/:id - Get client by ID
router.get('/:id', (req: Request, res: Response) => {
  const client = clients.get(req.params.id);

  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  res.json({ success: true, client });
});

// POST /api/clients - Create new client
router.post('/', (req: Request, res: Response) => {
  const { name, email, phone, type, company, address, gstin, pan, notes } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields: name, email' });
  }

  // Check for duplicate email
  const existingClient = Array.from(clients.values()).find(c => c.email === email);
  if (existingClient) {
    return res.status(409).json({ error: 'Client with this email already exists' });
  }

  const clientId = uuidv4();
  const now = new Date().toISOString();

  const newClient = {
    clientId,
    name,
    email,
    phone,
    type: type || 'individual', // individual, corporate, government
    company,
    address,
    gstin,
    pan,
    status: 'active',
    cases: [],
    invoices: [],
    notes,
    createdAt: now,
    updatedAt: now
  };

  clients.set(clientId, newClient);

  res.status(201).json({ success: true, client: newClient });
});

// PATCH /api/clients/:id - Update client
router.patch('/:id', (req: Request, res: Response) => {
  const client = clients.get(req.params.id);

  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const updates = req.body;
  const updatedClient = {
    ...client,
    ...updates,
    clientId: client.clientId,
    updatedAt: new Date().toISOString()
  };

  clients.set(req.params.id, updatedClient);

  res.json({ success: true, client: updatedClient });
});

// POST /api/clients/:id/cases - Link case to client
router.post('/:id/cases', (req: Request, res: Response) => {
  const client = clients.get(req.params.id);

  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const { caseId, caseTitle, caseType } = req.body;

  if (!caseId) {
    return res.status(400).json({ error: 'Missing required field: caseId' });
  }

  const caseLink = {
    caseId,
    caseTitle,
    caseType,
    linkedAt: new Date().toISOString()
  };

  client.cases.push(caseLink);
  client.updatedAt = new Date().toISOString();
  clients.set(req.params.id, client);

  res.json({ success: true, caseLink });
});

// GET /api/clients/:id/cases - Get client cases
router.get('/:id/cases', (req: Request, res: Response) => {
  const client = clients.get(req.params.id);

  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  res.json({ success: true, cases: client.cases });
});

// POST /api/clients/:id/invoices - Add invoice
router.post('/:id/invoices', (req: Request, res: Response) => {
  const client = clients.get(req.params.id);

  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const { amount, description, dueDate, caseId } = req.body;

  if (!amount || !description) {
    return res.status(400).json({ error: 'Missing required fields: amount, description' });
  }

  const invoice = {
    invoiceId: uuidv4(),
    amount,
    description,
    dueDate,
    caseId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  client.invoices.push(invoice);
  client.updatedAt = new Date().toISOString();
  clients.set(req.params.id, client);

  res.json({ success: true, invoice });
});

// GET /api/clients/:id/invoices - Get client invoices
router.get('/:id/invoices', (req: Request, res: Response) => {
  const client = clients.get(req.params.id);

  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  res.json({ success: true, invoices: client.invoices });
});

// DELETE /api/clients/:id - Delete client
router.delete('/:id', (req: Request, res: Response) => {
  if (!clients.has(req.params.id)) {
    return res.status(404).json({ error: 'Client not found' });
  }

  clients.delete(req.params.id);

  res.json({ success: true, message: 'Client deleted' });
});

export default router;
