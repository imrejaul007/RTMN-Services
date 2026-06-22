/**
 * Document Routes
 * Document Management API Endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory document storage
const documents: Map<string, any> = new Map();

// Clause library
const clauseLibrary: Map<string, any> = new Map([
  ['confidentiality', {
    clauseId: 'confidentiality',
    title: 'Confidentiality Clause',
    content: 'The Receiving Party agrees to hold in confidence all Confidential Information disclosed by the Disclosing Party and to use such Confidential Information solely for the purposes contemplated by this Agreement.',
    category: 'general',
    tags: ['confidentiality', 'nda', 'privacy']
  }],
  ['indemnity', {
    clauseId: 'indemnity',
    title: 'Indemnification Clause',
    content: 'Each Party shall indemnify, defend, and hold harmless the other Party from and against any and all claims, damages, losses, costs, and expenses arising out of or relating to any breach of this Agreement.',
    category: 'liability',
    tags: ['indemnity', 'liability', 'damages']
  }],
  ['termination', {
    clauseId: 'termination',
    title: 'Termination Clause',
    content: 'Either Party may terminate this Agreement upon thirty (30) days written notice to the other Party. Upon termination, all rights and obligations shall cease except those that by their nature should survive.',
    category: 'general',
    tags: ['termination', 'exit', 'notice']
  }],
  ['force-majeure', {
    clauseId: 'force-majeure',
    title: 'Force Majeure Clause',
    content: 'Neither Party shall be liable for any failure or delay in performing their obligations under this Agreement if such failure or delay results from circumstances beyond the reasonable control of that Party.',
    category: 'liability',
    tags: ['force-majeure', 'act-of-god', 'liability']
  }]
]);

// GET /api/documents - List all documents
router.get('/', (req: Request, res: Response) => {
  const { type, status, page = 1, limit = 20 } = req.query;

  let filteredDocs = Array.from(documents.values());

  if (type) {
    filteredDocs = filteredDocs.filter(d => d.type === type);
  }
  if (status) {
    filteredDocs = filteredDocs.filter(d => d.status === status);
  }

  const start = (Number(page) - 1) * Number(limit);
  const paginatedDocs = filteredDocs.slice(start, start + Number(limit));

  res.json({
    success: true,
    documents: paginatedDocs,
    total: filteredDocs.length,
    page: Number(page),
    limit: Number(limit)
  });
});

// GET /api/documents/:id - Get document by ID
router.get('/:id', (req: Request, res: Response) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json({ success: true, document });
});

// POST /api/documents - Create new document
router.post('/', (req: Request, res: Response) => {
  const { title, type, content, caseId, clientId, tags, metadata } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Missing required field: title' });
  }

  const documentId = uuidv4();
  const now = new Date().toISOString();

  const newDocument = {
    documentId,
    title,
    type: type || 'general', // contract, pleading, correspondence, evidence, general
    content,
    caseId,
    clientId,
    status: 'draft', // draft, review, approved, executed, archived
    tags: tags || [],
    metadata: metadata || {},
    versions: [{
      versionId: uuidv4(),
      content,
      createdAt: now,
      createdBy: 'system'
    }],
    createdAt: now,
    updatedAt: now
  };

  documents.set(documentId, newDocument);

  res.status(201).json({ success: true, document: newDocument });
});

// PATCH /api/documents/:id - Update document
router.patch('/:id', (req: Request, res: Response) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const { content, ...updates } = req.body;
  const now = new Date().toISOString();

  // Track version history
  if (content && content !== document.content) {
    document.versions.push({
      versionId: uuidv4(),
      content: document.content,
      createdAt: now,
      createdBy: 'system'
    });
  }

  const updatedDocument = {
    ...document,
    ...updates,
    documentId: document.documentId,
    updatedAt: now
  };

  if (content) {
    updatedDocument.content = content;
  }

  documents.set(req.params.id, updatedDocument);

  res.json({ success: true, document: updatedDocument });
});

// POST /api/documents/:id/versions - Create new version
router.post('/:id/versions', (req: Request, res: Response) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const { content, createdBy } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Missing required field: content' });
  }

  const version = {
    versionId: uuidv4(),
    content,
    createdAt: new Date().toISOString(),
    createdBy: createdBy || 'system'
  };

  document.versions.push(version);
  document.content = content;
  document.updatedAt = new Date().toISOString();
  documents.set(req.params.id, document);

  res.json({ success: true, version });
});

// GET /api/documents/:id/versions - Get version history
router.get('/:id/versions', (req: Request, res: Response) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json({ success: true, versions: document.versions });
});

// GET /api/documents/clauses - Get clause library
router.get('/clauses/library', (req: Request, res: Response) => {
  const { category, tag } = req.query;

  let clauses = Array.from(clauseLibrary.values());

  if (category) {
    clauses = clauses.filter(c => c.category === category);
  }
  if (tag) {
    clauses = clauses.filter(c => c.tags.includes(tag as string));
  }

  res.json({ success: true, clauses });
});

// GET /api/documents/clauses/:id - Get specific clause
router.get('/clauses/:id', (req: Request, res: Response) => {
  const clause = clauseLibrary.get(req.params.id);

  if (!clause) {
    return res.status(404).json({ error: 'Clause not found' });
  }

  res.json({ success: true, clause });
});

// POST /api/documents/clauses - Add clause to library
router.post('/clauses', (req: Request, res: Response) => {
  const { title, content, category, tags } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Missing required fields: title, content' });
  }

  const clauseId = title.toLowerCase().replace(/\s+/g, '-');

  const clause = {
    clauseId,
    title,
    content,
    category: category || 'general',
    tags: tags || [],
    createdAt: new Date().toISOString()
  };

  clauseLibrary.set(clauseId, clause);

  res.status(201).json({ success: true, clause });
});

// POST /api/documents/:id/sign - Sign document (e-signature)
router.post('/:id/sign', (req: Request, res: Response) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const { signedBy, signatureData } = req.body;

  if (!signedBy) {
    return res.status(400).json({ error: 'Missing required field: signedBy' });
  }

  document.signatures = document.signatures || [];
  document.signatures.push({
    signatoryId: signedBy,
    signatureData,
    signedAt: new Date().toISOString(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  if (document.signatures.length >= 2) {
    document.status = 'executed';
  }

  document.updatedAt = new Date().toISOString();
  documents.set(req.params.id, document);

  res.json({ success: true, signatures: document.signatures });
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', (req: Request, res: Response) => {
  if (!documents.has(req.params.id)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  documents.delete(req.params.id);

  res.json({ success: true, message: 'Document deleted' });
});

export default router;
