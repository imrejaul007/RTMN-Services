/**
 * Exhibition Document Service
 * Port 5059
 *
 * Catalogs, Brochures, Documents
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5059;
const SERVICE_NAME = 'exhibition-document-service';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })],
});

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================
// DATA MODELS
// ============================================

interface Document {
  id: string;
  exhibition_id: string;
  exhibitor_id?: string;
  type: 'catalog' | 'brochure' | 'datasheet' | 'certificate' | 'contract' | 'price_list' | 'presentation' | 'other';
  name: string;
  description?: string;
  file_url: string;
  file_type: string; // pdf, pptx, jpg, etc.
  file_size?: number; // bytes
  category?: string;
  tags: string[];
  is_public: boolean;
  download_count: number;
  viewer_count: number;
  created_at: string;
  updated_at: string;
}

interface Collection {
  id: string;
  exhibition_id: string;
  exhibitor_id: string;
  name: string;
  description?: string;
  documents: string[]; // document IDs
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Stores
const documents = new Map<string, Document>();
const collections = new Map<string, Collection>();

// ============================================
// HEALTH
// ============================================

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString(), stats: { documents: documents.size, collections: collections.size } });
});

app.get('/health/live', (_req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', (_req, res) => res.json({ status: 'ready' }));

// ============================================
// DOCUMENTS
// ============================================

app.get('/api/documents', (req, res) => {
  const { exhibition_id, exhibitor_id, type, search, tags, page = '1', limit = '20' } = req.query;
  let results = Array.from(documents.values()).filter((d) => d.is_public || exhibitor_id);

  if (exhibition_id) results = results.filter((d) => d.exhibition_id === exhibition_id);
  if (exhibitor_id) results = results.filter((d) => d.exhibitor_id === exhibitor_id);
  if (type) results = results.filter((d) => d.type === type);
  if (tags) {
    const tagList = (tags as string).split(',');
    results = results.filter((d) => d.tags.some((t) => tagList.includes(t)));
  }
  if (search) {
    const s = (search as string).toLowerCase();
    results = results.filter((d) => d.name.toLowerCase().includes(s) || d.description?.toLowerCase().includes(s));
  }

  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const start = (pageNum - 1) * limitNum;

  res.json({ success: true, data: { documents: results.slice(start, start + limitNum), total: results.length } });
});

app.get('/api/documents/:id', (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });

  doc.viewer_count++;
  documents.set(doc.id, doc);

  res.json({ success: true, data: doc });
});

app.post('/api/documents', (req, res) => {
  const { exhibition_id, exhibitor_id, type, name, description, file_url, file_type, file_size, category, tags, is_public = true } = req.body;

  if (!exhibition_id || !type || !name || !file_url) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const doc: Document = {
    id: `DOC-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibition_id,
    exhibitor_id,
    type,
    name,
    description,
    file_url,
    file_type: file_type || 'pdf',
    file_size,
    category,
    tags: tags || [],
    is_public,
    download_count: 0,
    viewer_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  documents.set(doc.id, doc);
  logger.info('Document uploaded', { id: doc.id, name, type });

  res.status(201).json({ success: true, data: doc });
});

app.patch('/api/documents/:id', (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });

  const updated = { ...doc, ...req.body, updated_at: new Date().toISOString() };
  documents.set(doc.id, updated);

  res.json({ success: true, data: updated });
});

// Track download
app.post('/api/documents/:id/download', (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });

  doc.download_count++;
  documents.set(doc.id, doc);

  logger.info('Document downloaded', { id: doc.id, name: doc.name });

  res.json({ success: true, data: { download_count: doc.download_count } });
});

// ============================================
// COLLECTIONS
// ============================================

app.get('/api/collections', (req, res) => {
  const { exhibition_id, exhibitor_id } = req.query;
  let results = Array.from(collections.values());

  if (exhibition_id) results = results.filter((c) => c.exhibition_id === exhibition_id);
  if (exhibitor_id) results = results.filter((c) => c.exhibitor_id === exhibitor_id);

  res.json({ success: true, data: results });
});

app.post('/api/collections', (req, res) => {
  const { exhibition_id, exhibitor_id, name, description, documents: docIds, is_public = true } = req.body;

  if (!exhibition_id || !exhibitor_id || !name) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const collection: Collection = {
    id: `COL-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibition_id,
    exhibitor_id,
    name,
    description,
    documents: docIds || [],
    is_public,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  collections.set(collection.id, collection);
  res.status(201).json({ success: true, data: collection });
});

app.post('/api/collections/:id/documents', (req, res) => {
  const collection = collections.get(req.params.id);
  if (!collection) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Collection not found' } });

  const { document_id } = req.body;
  if (!collection.documents.includes(document_id)) {
    collection.documents.push(document_id);
    collection.updated_at = new Date().toISOString();
    collections.set(collection.id, collection);
  }

  res.json({ success: true, data: collection });
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  logger.info(`📄 Exhibition Document Service started on port ${PORT}`);
});

export default app;