import { requireAuth } from '@rtmn/shared/auth';
/**
 * Document Twin Service v1.0
 * Digital twin for employee documents
 * Port: 4902
 */

import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface Document {
  id: string;
  employeeId: string;
  type: DocumentType;
  name: string;
  url?: string;
  content?: string;
  metadata: Record<string, any>;
  status: 'pending' | 'verified' | 'expired' | 'rejected';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 'contract' | 'id' | 'certificate' | 'license' | 'policy' | 'other';

export function createDocumentTwinService() {
  const documents: Map<string, Document> = new Map();

  const app = express();
  app.use(express.json());

  app.post('/api/documents',requireAuth,  (req: Request, res: Response) => {
    const { employeeId, type, name, url, content, metadata, expiresAt } = req.body;
    if (!employeeId || !type || !name) {
      return res.status(400).json({ error: 'employeeId, type, and name are required' });
    }

    const doc: Document = {
      id: uuidv4(),
      employeeId,
      type,
      name,
      url,
      content,
      metadata: metadata || {},
      status: 'pending',
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    documents.set(doc.id, doc);
    return res.status(201).json(doc);
  });

  app.get('/api/documents', (req: Request, res: Response) => {
    const { employeeId, type, status } = req.query;
    let filtered = Array.from(documents.values());
    if (employeeId) filtered = filtered.filter(d => d.employeeId === employeeId);
    if (type) filtered = filtered.filter(d => d.type === type);
    if (status) filtered = filtered.filter(d => d.status === status);
    return res.status(200).json({ documents: filtered, total: filtered.length });
  });

  app.get('/api/documents/analytics', (_req: Request, res: Response) => {
    const allDocs = Array.from(documents.values());
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    allDocs.forEach(d => {
      byType[d.type] = (byType[d.type] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    });
    return res.status(200).json({ total: allDocs.length, byType, byStatus });
  });

  app.get('/api/documents/:id', (req: Request, res: Response) => {
    const doc = documents.get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    return res.status(200).json(doc);
  });

  app.put('/api/documents/:id',requireAuth,  (req: Request, res: Response) => {
    const doc = documents.get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (req.body.status) doc.status = req.body.status;
    if (req.body.url) doc.url = req.body.url;
    if (req.body.content) doc.content = req.body.content;
    if (req.body.metadata) doc.metadata = req.body.metadata;
    doc.updatedAt = new Date().toISOString();

    documents.set(doc.id, doc);
    return res.status(200).json(doc);
  });

  app.delete('/api/documents/:id',requireAuth,  (req: Request, res: Response) => {
    if (!documents.has(req.params.id)) return res.status(404).json({ error: 'Document not found' });
    documents.delete(req.params.id);
    return res.status(204).send();
  });

  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({ status: 'healthy', service: 'document-twin', timestamp: new Date().toISOString() });
  });

  return app;
}

export default createDocumentTwinService;