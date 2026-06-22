/**
 * HOJAI Enterprise Search Service
 * Port: 4620 - Glean competitor: Enterprise knowledge search with permissions
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 4620;
const app: Express = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Types
interface Document {
  id: string;
  title: string;
  content: string;
  source: 'confluence' | 'slack' | 'drive' | 'notion' | 'manual';
  url?: string;
  metadata: Record<string, string>;
  permissions: string[]; // role IDs that can access
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchResult {
  document: Document;
  score: number;
  highlights: string[];
  matchedFields: string[];
}

interface IndexConfig {
  id: string;
  name: string;
  source: Document['source'];
  connectorStatus: 'connected' | 'disconnected' | 'error';
  lastSync: Date | null;
  documentCount: number;
}

interface Permission {
  id: string;
  roleId: string;
  documentId: string;
  level: 'read' | 'write' | 'admin';
}

// In-memory storage
const documents: Map<string, Document> = new Map();
const indexes: Map<string, IndexConfig> = new Map();
const permissions: Map<string, Permission> = new Map();

// Simple text search (in production, would use vector DB + embeddings)
function simpleSearch(query: string, docs: Document[]): { doc: Document; score: number; highlights: string[] }[] {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const results: { doc: Document; score: number; highlights: string[] }[] = [];

  for (const doc of docs) {
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    const tagsLower = doc.tags.map(t => t.toLowerCase());

    let score = 0;
    const highlights: string[] = [];

    for (const term of queryTerms) {
      // Title match (highest weight)
      if (titleLower.includes(term)) {
        score += 10;
        const idx = titleLower.indexOf(term);
        highlights.push(`...${doc.title.slice(Math.max(0, idx - 20), idx + term.length + 20)}...`);
      }

      // Content match
      if (contentLower.includes(term)) {
        score += 5;
        const idx = contentLower.indexOf(term);
        highlights.push(`...${doc.content.slice(Math.max(0, idx - 30), idx + term.length + 30)}...`);
      }

      // Tag match
      if (tagsLower.some(t => t.includes(term))) {
        score += 3;
      }
    }

    if (score > 0) {
      results.push({ doc, score, highlights: [...new Set(highlights)] });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// Middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
};

app.use(requestLogger);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-enterprise-search',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ==================== SEARCH ====================

// Global search
app.post('/api/search', (req: Request, res: Response) => {
  const { query, filters, page = 1, limit = 20, userId, roleIds = [] } = req.body;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  // Filter documents user has access to
  let accessibleDocs = Array.from(documents.values()).filter(doc => {
    // Admin role always has access
    if (roleIds.includes('admin')) return true;
    // Check document permissions
    return doc.permissions.some(p => roleIds.includes(p));
  });

  // Apply source filter
  if (filters?.source) {
    accessibleDocs = accessibleDocs.filter(d => d.source === filters.source);
  }

  // Apply tag filter
  if (filters?.tags?.length) {
    accessibleDocs = accessibleDocs.filter(d =>
      filters.tags.some((t: string) => d.tags.includes(t))
    );
  }

  // Search
  const searchResults = simpleSearch(query, accessibleDocs);

  // Paginate
  const startIndex = (page - 1) * limit;
  const paginatedResults = searchResults.slice(startIndex, startIndex + limit);

  const results: SearchResult[] = paginatedResults.map(r => ({
    document: r.doc,
    score: r.score,
    highlights: r.highlights,
    matchedFields: ['title', 'content', 'tags']
  }));

  res.json({
    results,
    total: searchResults.length,
    page,
    limit,
    totalPages: Math.ceil(searchResults.length / limit)
  });
});

// ==================== DOCUMENTS ====================

// List documents
app.get('/api/documents', (req: Request, res: Response) => {
  const { source, tag, page = 1, limit = 20 } = req.query;
  let docs = Array.from(documents.values());

  if (source) {
    docs = docs.filter(d => d.source === source);
  }
  if (tag) {
    docs = docs.filter(d => d.tags.includes(tag as string));
  }

  const startIndex = ((page as number) - 1) * (limit as number);
  const paginated = docs.slice(startIndex, startIndex + (limit as number));

  res.json({
    documents: paginated,
    total: docs.length,
    page,
    limit
  });
});

// Create document
app.post('/api/documents', (req: Request, res: Response) => {
  const { title, content, source, url, metadata, permissions: docPermissions, tags, createdBy } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const doc: Document = {
    id: uuidv4(),
    title,
    content,
    source: source || 'manual',
    url,
    metadata: metadata || {},
    permissions: docPermissions || ['public'],
    tags: tags || [],
    createdBy: createdBy || 'system',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  documents.set(doc.id, doc);
  res.status(201).json({ document: doc });
});

// Get document
app.get('/api/documents/:id', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ document: doc });
});

// Update document
app.put('/api/documents/:id', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const { title, content, tags, permissions: docPermissions } = req.body;

  if (title) doc.title = title;
  if (content) doc.content = content;
  if (tags) doc.tags = tags;
  if (docPermissions) doc.permissions = docPermissions;
  doc.updatedAt = new Date();

  documents.set(doc.id, doc);
  res.json({ document: doc });
});

// Delete document
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  const deleted = documents.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ success: true });
});

// ==================== INDEX CONNECTORS ====================

// List connectors
app.get('/api/connectors', (_req: Request, res: Response) => {
  const connectorList = Array.from(indexes.values());
  res.json({ connectors: connectorList, count: connectorList.length });
});

// Create connector
app.post('/api/connectors', (req: Request, res: Response) => {
  const { name, source } = req.body;

  if (!name || !source) {
    return res.status(400).json({ error: 'Name and source are required' });
  }

  const connector: IndexConfig = {
    id: uuidv4(),
    name,
    source,
    connectorStatus: 'disconnected',
    lastSync: null,
    documentCount: 0
  };

  indexes.set(connector.id, connector);
  res.status(201).json({ connector });
});

// Connect/sync connector
app.post('/api/connectors/:id/sync', async (req: Request, res: Response) => {
  const connector = indexes.get(req.params.id);
  if (!connector) {
    return res.status(404).json({ error: 'Connector not found' });
  }

  connector.connectorStatus = 'connected';
  connector.lastSync = new Date();

  // Simulate sync (in production, would pull from actual source)
  setTimeout(() => {
    connector.documentCount = Array.from(documents.values()).filter(d => d.source === connector.source).length;
    indexes.set(connector.id, connector);
  }, 2000);

  res.json({ message: 'Sync started', connector });
});

// Disconnect connector
app.delete('/api/connectors/:id', (req: Request, res: Response) => {
  const connector = indexes.get(req.params.id);
  if (!connector) {
    return res.status(404).json({ error: 'Connector not found' });
  }

  connector.connectorStatus = 'disconnected';
  indexes.set(connector.id, connector);
  res.json({ success: true, connector });
});

// ==================== PERMISSIONS ====================

// Grant permission
app.post('/api/permissions', (req: Request, res: Response) => {
  const { roleId, documentId, level } = req.body;

  if (!roleId || !documentId) {
    return res.status(400).json({ error: 'RoleId and documentId are required' });
  }

  const doc = documents.get(documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Add to document permissions
  if (!doc.permissions.includes(roleId)) {
    doc.permissions.push(roleId);
    documents.set(doc.id, doc);
  }

  res.json({ success: true, document: doc });
});

// Revoke permission
app.delete('/api/permissions', (req: Request, res: Response) => {
  const { roleId, documentId } = req.body;

  const doc = documents.get(documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  doc.permissions = doc.permissions.filter(p => p !== roleId);
  documents.set(doc.id, doc);

  res.json({ success: true, document: doc });
});

// ==================== ANALYTICS ====================

// Search analytics
app.get('/api/analytics/searches', (_req: Request, res: Response) => {
  res.json({
    totalSearches: 0, // Would track in production
    avgLatency: 0,
    topQueries: [],
    noResultQueries: []
  });
});

// Document analytics
app.get('/api/analytics/documents', (_req: Request, res: Response) => {
  const docs = Array.from(documents.values());
  const bySource = docs.reduce((acc, d) => {
    acc[d.source] = (acc[d.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    total: docs.length,
    bySource,
    recentlyUpdated: docs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5)
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`HOJAI Enterprise Search running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`API: http://localhost:${PORT}/api/*`);
});

export default app;
