/**
 * Memory Multimodal Service
 * Image, audio, video, document memory processing
 *
 * Core concept: "80% of enterprise knowledge is in images, PDFs, and videos"
 * This service extracts, indexes, and retrieves multimodal memories.
 */

import express from 'express';
import crypto from 'crypto';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(express.json());

// In-memory stores
const assets = new Map();          // assetId -> { id, type, source, extractedText, embeddings, metadata, memoryLinks }
const processors = new Map();     // processorId -> { id, type, status, config }
const extractions = new Map();    // extractionId -> { id, assetId, processorType, content, entities, summaries }
const thumbnails = new Map();     // assetId -> thumbnail data
const transcripts = new Map();    // assetId -> transcript data for audio/video

function genId(prefix = 'mm') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// Supported types
const SUPPORTED_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
  document: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'],
  whiteboard: ['png', 'jpg'], // Special whiteboard images
};

// ============ ASSETS ============

// Upload/register an asset
app.post('/api/assets', requireInternal, (req, res) => {
  const { type, source, url, metadata, tags } = req.body;

  if (!type || !source) {
    return res.status(400).json({ error: 'type and source are required' });
  }

  // Validate type
  const validTypes = Object.keys(SUPPORTED_TYPES);
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: `Invalid type. Supported: ${validTypes.join(', ')}`
    });
  }

  const assetId = genId('asset');
  const asset = {
    id: assetId,
    type,
    source, // 'upload', 'url', 'camera', 'screen', 'capture'
    url: url || null,
    status: 'pending', // 'pending', 'processing', 'processed', 'failed'
    extractedText: '',
    embeddings: [],
    metadata: metadata || {},
    tags: tags || [],
    memoryLinks: [],
    processedAt: null,
    createdAt: new Date().toISOString(),
    fileSize: metadata?.fileSize || 0,
    duration: metadata?.duration || null, // For audio/video
    pageCount: metadata?.pageCount || null, // For documents
    dimensions: metadata?.dimensions || null, // For images
  };

  assets.set(assetId, asset);

  res.status(201).json({ id: assetId, asset });
});

// Get asset
app.get('/api/assets/:assetId', (req, res) => {
  const asset = assets.get(req.params.assetId);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json({ asset });
});

// List assets
app.get('/api/assets', (req, res) => {
  const { type, status, tag, search, limit, offset } = req.query;
  let result = Array.from(assets.values());

  if (type) result = result.filter(a => a.type === type);
  if (status) result = result.filter(a => a.status === status);
  if (tag) result = result.filter(a => a.tags.includes(tag));
  if (search) {
    const lower = search.toLowerCase();
    result = result.filter(a =>
      a.extractedText.toLowerCase().includes(lower) ||
      JSON.stringify(a.metadata).toLowerCase().includes(lower)
    );
  }

  const total = result.length;
  if (offset) result = result.slice(parseInt(offset));
  if (limit) result = result.slice(0, parseInt(limit));

  res.json({ assets: result, total, limit: parseInt(limit) || total });
});

// Update asset (after processing)
app.patch('/api/assets/:assetId', requireInternal, (req, res) => {
  const asset = assets.get(req.params.assetId);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const { status, extractedText, embeddings, metadata, tags } = req.body;

  if (status) asset.status = status;
  if (extractedText) asset.extractedText = extractedText;
  if (embeddings) asset.embeddings = embeddings;
  if (metadata) asset.metadata = { ...asset.metadata, ...metadata };
  if (tags) asset.tags = tags;

  if (status === 'processed') {
    asset.processedAt = new Date().toISOString();
  }

  res.json({ asset });
});

// Link asset to memory
app.post('/api/assets/:assetId/link', requireInternal, (req, res) => {
  const asset = assets.get(req.params.assetId);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const { memoryId, relationship } = req.body;
  if (!memoryId) {
    return res.status(400).json({ error: 'memoryId is required' });
  }

  asset.memoryLinks.push({
    memoryId,
    relationship: relationship || 'contains',
    linkedAt: new Date().toISOString(),
  });

  res.json({ asset });
});

// Delete asset
app.delete('/api/assets/:assetId', requireInternal, (req, res) => {
  if (!assets.has(req.params.assetId)) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  assets.delete(req.params.assetId);
  thumbnails.delete(req.params.assetId);
  transcripts.delete(req.params.assetId);

  res.json({ message: 'Asset deleted', id: req.params.assetId });
});

// ============ PROCESSORS ============

// Register a processor
app.post('/api/processors', requireInternal, (req, res) => {
  const { type, config } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }

  const processorId = genId('proc');
  const processor = {
    id: processorId,
    type, // 'ocr', 'asr', 'stt', 'tts', 'vision', 'document', 'scene'
    status: 'idle',
    config: config || {},
    totalProcessed: 0,
    lastProcessed: null,
    createdAt: new Date().toISOString(),
  };

  processors.set(processorId, processor);

  res.status(201).json({ id: processorId, processor });
});

// Get processor
app.get('/api/processors/:processorId', (req, res) => {
  const processor = processors.get(req.params.processorId);
  if (!processor) {
    return res.status(404).json({ error: 'Processor not found' });
  }
  res.json({ processor });
});

// List processors
app.get('/api/processors', (req, res) => {
  const { type, status } = req.query;
  let result = Array.from(processors.values());

  if (type) result = result.filter(p => p.type === type);
  if (status) result = result.filter(p => p.status === status);

  res.json({ processors: result, total: result.length });
});

// Update processor status
app.patch('/api/processors/:processorId', requireInternal, (req, res) => {
  const processor = processors.get(req.params.processorId);
  if (!processor) {
    return res.status(404).json({ error: 'Processor not found' });
  }

  const { status, config } = req.body;
  if (status) processor.status = status;
  if (config) processor.config = { ...processor.config, ...config };

  res.json({ processor });
});

// ============ EXTRACTIONS ============

// Process an asset (extract content)
app.post('/api/extract', requireInternal, (req, res) => {
  const { assetId, processorType } = req.body;

  if (!assetId) {
    return res.status(400).json({ error: 'assetId is required' });
  }

  const asset = assets.get(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Determine processor type based on asset type if not specified
  const type = processorType || getDefaultProcessorType(asset.type);

  const extractionId = genId('extract');
  const extraction = {
    id: extractionId,
    assetId,
    processorType: type,
    status: 'in_progress',
    content: '',
    entities: [],
    summaries: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  extractions.set(extractionId, extraction);

  // Simulate processing (in production, this would call actual ML models)
  const extracted = simulateExtraction(asset, type);
  extraction.content = extracted.text;
  extraction.entities = extracted.entities;
  extraction.status = 'completed';
  extraction.completedAt = new Date().toISOString();

  // Update asset
  asset.status = 'processed';
  asset.extractedText = extracted.text;
  asset.processedAt = new Date().toISOString();

  // Update processor stats
  const processor = Array.from(processors.values()).find(p => p.type === type);
  if (processor) {
    processor.totalProcessed++;
    processor.lastProcessed = new Date().toISOString();
  }

  res.status(201).json({ id: extractionId, extraction, content: extracted });
});

// Get extraction
app.get('/api/extractions/:extractionId', (req, res) => {
  const extraction = extractions.get(req.params.extractionId);
  if (!extraction) {
    return res.status(404).json({ error: 'Extraction not found' });
  }
  res.json({ extraction });
});

// List extractions for asset
app.get('/api/extractions', (req, res) => {
  const { assetId, processorType } = req.query;
  let result = Array.from(extractions.values());

  if (assetId) result = result.filter(e => e.assetId === assetId);
  if (processorType) result = result.filter(e => e.processorType === processorType);

  res.json({ extractions: result, total: result.length });
});

// ============ SEARCH ============

// Search across multimodal content
app.get('/api/search', (req, res) => {
  const { query, type, limit } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  const lowerQuery = query.toLowerCase();
  const maxResults = parseInt(limit) || 20;

  let results = Array.from(assets.values())
    .filter(a => a.status === 'processed')
    .map(a => {
      // Calculate relevance score
      let score = 0;
      if (a.extractedText.toLowerCase().includes(lowerQuery)) score += 0.8;
      if (a.tags.some(t => t.toLowerCase().includes(lowerQuery))) score += 0.5;
      if (JSON.stringify(a.metadata).toLowerCase().includes(lowerQuery)) score += 0.3;
      return { ...a, score };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  if (type) {
    results = results.filter(r => r.type === type);
  }

  res.json({ results, total: results.length, query });
});

// Find similar assets
app.post('/api/similar', requireInternal, (req, res) => {
  const { assetId, limit } = req.body;

  if (!assetId) {
    return res.status(400).json({ error: 'assetId is required' });
  }

  const sourceAsset = assets.get(assetId);
  if (!sourceAsset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const maxResults = parseInt(limit) || 10;

  // Find assets with similar embeddings (simplified)
  const similar = Array.from(assets.values())
    .filter(a => a.id !== assetId && a.status === 'processed')
    .map(a => {
      // Simple similarity based on tags overlap and type match
      const tagOverlap = a.tags.filter(t => sourceAsset.tags.includes(t)).length;
      const typeMatch = a.type === sourceAsset.type ? 0.3 : 0;
      const score = (tagOverlap * 0.2) + typeMatch;
      return { ...a, similarity: score };
    })
    .filter(a => a.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  res.json({ similar, total: similar.length });
});

// ============ TRANSCRIPTS (Audio/Video) ============

// Get/set transcript for audio/video
app.post('/api/transcripts', requireInternal, (req, res) => {
  const { assetId, segments, language } = req.body;

  if (!assetId || !segments) {
    return res.status(400).json({ error: 'assetId and segments are required' });
  }

  const asset = assets.get(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  if (!['audio', 'video'].includes(asset.type)) {
    return res.status(400).json({ error: 'Asset must be audio or video' });
  }

  const transcript = {
    assetId,
    segments,
    language: language || 'en',
    duration: asset.duration,
    createdAt: new Date().toISOString(),
  };

  transcripts.set(assetId, transcript);

  res.status(201).json({ transcript });
});

app.get('/api/transcripts/:assetId', (req, res) => {
  const transcript = transcripts.get(req.params.assetId);
  if (!transcript) {
    return res.status(404).json({ error: 'Transcript not found' });
  }
  res.json({ transcript });
});

// ============ THUMBNAILS ============

app.post('/api/thumbnails', requireInternal, (req, res) => {
  const { assetId, data, format } = req.body;

  if (!assetId || !data) {
    return res.status(400).json({ error: 'assetId and data are required' });
  }

  thumbnails.set(assetId, {
    assetId,
    data,
    format: format || 'jpeg',
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ success: true, assetId });
});

app.get('/api/thumbnails/:assetId', (req, res) => {
  const thumb = thumbnails.get(req.params.assetId);
  if (!thumb) {
    return res.status(404).json({ error: 'Thumbnail not found' });
  }
  res.json({ thumbnail: thumb });
});

// ============ ENTITY EXTRACTION ============

// Extract entities from text
app.post('/api/entities/extract', requireInternal, (req, res) => {
  const { text, types } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  // Simple entity extraction (in production, would use NER)
  const entities = extractEntities(text);

  const filtered = types
    ? entities.filter(e => types.includes(e.type))
    : entities;

  res.json({ entities: filtered, total: filtered.length });
});

// ============ STATS ============

app.get('/api/stats', (req, res) => {
  const assetList = Array.from(assets.values());

  res.json({
    totalAssets: assets.size,
    byType: assetList.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {}),
    byStatus: assetList.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {}),
    totalProcessors: processors.size,
    totalExtractions: extractions.size,
    totalTranscripts: transcripts.size,
    totalThumbnails: thumbnails.size,
  });
});

// ============ HEALTH ============

app.get('/health', (req, res) => {
  res.json({
    service: 'memory-multimodal',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ============ HELPER FUNCTIONS ============

function getDefaultProcessorType(assetType) {
  const mapping = {
    image: 'vision',
    document: 'ocr',
    audio: 'stt',
    video: 'scene',
    whiteboard: 'vision',
  };
  return mapping[assetType] || 'generic';
}

function simulateExtraction(asset, processorType) {
  // Simulated extraction results
  // In production, would call actual ML models

  const templates = {
    vision: {
      text: 'Whiteboard showing architecture diagram with boxes and arrows. Text labels include "API", "Database", "Cache".',
      entities: [
        { type: 'text', value: 'API', confidence: 0.95 },
        { type: 'text', value: 'Database', confidence: 0.92 },
        { type: 'text', value: 'Cache', confidence: 0.88 },
      ],
    },
    ocr: {
      text: 'Document discussing Q4 financial results. Revenue increased by 15% compared to previous quarter.',
      entities: [
        { type: 'metric', value: '15%', confidence: 0.99 },
        { type: 'time', value: 'Q4', confidence: 0.95 },
      ],
    },
    stt: {
      text: 'Meeting transcript discussing project timeline and deliverables for the next sprint.',
      entities: [
        { type: 'person', value: 'Team Lead', confidence: 0.80 },
        { type: 'action', value: 'Deliverables', confidence: 0.85 },
      ],
    },
    scene: {
      text: 'Video showing product demo with user interface interaction. Features demonstrated include dashboard and analytics.',
      entities: [
        { type: 'feature', value: 'Dashboard', confidence: 0.90 },
        { type: 'feature', value: 'Analytics', confidence: 0.88 },
      ],
    },
  };

  return templates[processorType] || {
    text: `Extracted content from ${asset.type} asset`,
    entities: [],
  };
}

function extractEntities(text) {
  // Simple rule-based entity extraction
  const entities = [];

  // Extract numbers/percentages
  const numbers = text.match(/\d+(\.\d+)?%?/g);
  if (numbers) {
    numbers.forEach(n => {
      entities.push({ type: 'number', value: n, confidence: 0.9 });
    });
  }

  // Extract capitalized words as potential proper nouns
  const capitalized = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
  if (capitalized) {
    capitalized.slice(0, 5).forEach(word => {
      entities.push({ type: 'proper_noun', value: word, confidence: 0.6 });
    });
  }

  return entities;
}

const PORT = process.env.PORT || 4802;
app.listen(PORT, () => {
  console.log(`Memory Multimodal running on port ${PORT}`);
});

export default app;