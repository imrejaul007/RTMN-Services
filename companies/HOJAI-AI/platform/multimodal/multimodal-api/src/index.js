/**
 * multimodal-api — Multi-Modal API Gateway (port 5342)
 *
 * Exposes a unified entry point for the 8 multi-modal sub-services.
 * - Service catalog: lists all downstream services with port, purpose, status
 * - Capability map: routes a capability name → which service(s) provide it
 * - Health aggregation: probes each sub-service
 * - Proxy: any unmatched route is proxied via /services/<name>/* when known
 *
 * Endpoints:
 *   GET  /                           info + service catalog
 *   GET  /health                     liveness
 *   GET  /ready                      probes all sub-services
 *   GET  /services                   list downstream services
 *   GET  /services/:name             single service info
 *   GET  /capabilities               capability → services map
 *   GET  /capabilities/:name         services for one capability
 *   POST /pipeline/analyze           end-to-end analyze (stub): routes to ocr, embed, etc.
 *   GET  /stats                      aggregate counts from assets + embeddings
 *
 * Storage: none (proxy/aggregator)
 * Auth:    X-Internal-Token
 */

const express = require('express');
const http = require('http');

const PORT = parseInt(process.env.PORT || '5342', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'multimodal-api-internal-token';

const SERVICES = {
  'mm-asset-store':         { port: 5339, purpose: 'Raw bytes + metadata store with content-hash dedup', modalities: ['image', 'audio', 'video', 'document', 'other'] },
  'image-pipeline':         { port: 5343, purpose: 'Image decode/resize/thumbnail/normalize/EXIF-strip', modalities: ['image'] },
  'audio-pipeline':         { port: 5344, purpose: 'Audio decode/resample/VAD/chunk', modalities: ['audio'] },
  'video-pipeline':         { port: 5345, purpose: 'Video probe/frame/keyframe/audio-split/thumbnail', modalities: ['video'] },
  'mm-embedder':            { port: 5347, purpose: 'OpenAI text-embedding-3-small + cosine similarity search', modalities: ['image', 'audio', 'video', 'text', 'document'] },
  'mm-vector-index':        { port: 5348, purpose: 'Per-modality buckets + cosine similarity search', modalities: ['image', 'audio', 'video', 'text', 'document'] },
  'mm-chunker':             { port: 5340, purpose: 'Text/audio/video/OCR chunking strategies', modalities: ['text', 'audio', 'video', 'ocr'] },
  'mm-image-understanding': { port: 5371, purpose: 'GPT-4o Vision: detect_objects, classify_scene, caption, extract_text', modalities: ['image'] },
  'mm-audio-transcription': { port: 5370, purpose: 'OpenAI Whisper: transcribe, detect_language, VAD, speaker diarization', modalities: ['audio'] },
  'mm-ocr':                 { port: 5372, purpose: 'GPT-4o Vision OCR: extract text from documents with layout blocks', modalities: ['image'] },
  'mm-visual-generator':    { port: 5373, purpose: 'DALL-E image generation + SVG fallback + layout suggestions', modalities: ['text', 'image'] },
  'mm-video-analysis':      { port: 5353, purpose: 'FFmpeg: scene detection, shot boundaries, keyframe extraction', modalities: ['video'] },
};

const CAPABILITY_MAP = {
  // Asset management
  store_asset:         ['mm-asset-store'],
  get_asset_bytes:     ['mm-asset-store'],
  dedup_asset:         ['mm-asset-store'],
  // Image pipeline
  decode_image:        ['image-pipeline'],
  resize_image:        ['image-pipeline'],
  thumbnail_image:     ['image-pipeline'],
  normalize_image:     ['image-pipeline'],
  strip_exif:          ['image-pipeline'],
  // Audio pipeline
  decode_audio:        ['audio-pipeline'],
  resample_audio:      ['audio-pipeline'],
  vad_audio:           ['audio-pipeline'],
  chunk_audio:         ['audio-pipeline'],
  // Video pipeline
  probe_video:         ['video-pipeline'],
  extract_frames:      ['video-pipeline'],
  extract_keyframes:   ['video-pipeline'],
  split_audio_track:   ['video-pipeline'],
  video_thumbnail:     ['video-pipeline'],
  // Vision understanding
  detect_objects:      ['mm-image-understanding'],
  classify_scene:      ['mm-image-understanding'],
  caption_image:       ['mm-image-understanding'],
  extract_image_text:  ['mm-image-understanding'],
  extract_dominant_colors: ['mm-image-understanding'],
  // Audio transcription
  transcribe_audio:    ['mm-audio-transcription'],
  detect_language:     ['mm-audio-transcription'],
  voice_activity_detection: ['mm-audio-transcription'],
  speaker_diarization:  ['mm-audio-transcription'],
  summarize_audio:      ['mm-audio-transcription'],
  // OCR
  ocr_document:         ['mm-ocr'],
  extract_layout:       ['mm-ocr'],
  // Visual generation
  generate_image:       ['mm-visual-generator'],
  suggest_layout:       ['mm-visual-generator'],
  // Video analysis
  detect_scenes:         ['mm-video-analysis'],
  detect_shots:          ['mm-video-analysis'],
  classify_action:       ['mm-video-analysis'],
  extract_video_keyframes: ['mm-video-analysis'],
  summarize_video:       ['mm-video-analysis'],
  // Embeddings
  embed:                ['mm-embedder'],
  embed_batch:          ['mm-embedder'],
  // Similarity search
  search_similar:        ['mm-vector-index'],
  cosine_search:         ['mm-vector-index'],
  // Chunking
  chunk_text:            ['mm-chunker'],
  chunk_audio_segment:   ['mm-chunker'],
  chunk_video_scene:     ['mm-chunker'],
  chunk_ocr:             ['mm-chunker'],
  // Legacy OCR alias
  ocr:                  ['mm-ocr'],
  ocr_batch:             ['mm-ocr'],
};

function nowIso() { return new Date().toISOString(); }

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function probe(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1', port, method: 'GET', path: '/health', timeout: 1500,
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode === 200, body }));
    });
    req.on('error', (e) => resolve({ status: 0, ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, ok: false, error: 'timeout' }); });
    req.end();
  });
}

function proxyRequest(targetPort, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port: targetPort, method, path,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'X-Internal-Token': token } : {}),
      },
      timeout: 10000,
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : null }); }
        catch (_) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  app.get('/', (_req, res) => res.json({
    service: 'multimodal-api', port: PORT,
    description: 'Multi-modal gateway — image, audio, video, OCR, embeddings, search',
    services: SERVICES,
    capabilities: Object.keys(CAPABILITY_MAP).length,
  }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'multimodal-api', port: PORT }));
  app.get('/ready', async (_req, res) => {
    const checks = await Promise.all(
      Object.entries(SERVICES).map(async ([name, info]) => ({ name, ...info, ...(await probe(info.port)) }))
    );
    const allOk = checks.every((c) => c.ok);
    res.status(allOk ? 200 : 503).json({ ok: allOk, services: checks });
  });

  app.get('/services', requireInternal, (_req, res) => {
    const items = Object.entries(SERVICES).map(([name, info]) => ({ name, ...info }));
    res.json({ count: items.length, services: items });
  });

  app.get('/services/:name', requireInternal, (req, res) => {
    const info = SERVICES[req.params.name];
    if (!info) return res.status(404).json({ error: 'unknown_service' });
    res.json({ name: req.params.name, ...info });
  });

  app.get('/capabilities', requireInternal, (_req, res) => {
    res.json({ count: Object.keys(CAPABILITY_MAP).length, capabilities: CAPABILITY_MAP });
  });

  app.get('/capabilities/:name', requireInternal, (req, res) => {
    const services = CAPABILITY_MAP[req.params.name];
    if (!services) return res.status(404).json({ error: 'unknown_capability' });
    res.json({ capability: req.params.name, services });
  });

  app.post('/pipeline/analyze', requireInternal, async (req, res) => {
    // End-to-end stub: store asset → decode → embed → return summary
    const { modality, data, mime_type } = req.body || {};
    if (!modality || !data) return res.status(400).json({ error: 'modality + data required' });
    const steps = [];
    try {
      // Step 1: store asset
      const storeResp = await proxyRequest(SERVICES['mm-asset-store'].port, 'POST', '/assets', { data, modality, mime_type }, INTERNAL_TOKEN);
      steps.push({ step: 'store', service: 'mm-asset-store', status: storeResp.status, asset_id: storeResp.body?.id });
      const assetId = storeResp.body?.id;

      // Step 2: decode if image/audio/video
      if (['image', 'audio', 'video'].includes(modality)) {
        const pipelineName = `${modality}-pipeline`;
        const decodeResp = await proxyRequest(SERVICES[pipelineName].port, 'POST', '/decode', { data, mime_type }, INTERNAL_TOKEN);
        steps.push({ step: 'decode', service: pipelineName, status: decodeResp.status, info: decodeResp.body?.result });
      }

      // Step 3: embed
      const embedResp = await proxyRequest(SERVICES['mm-embedder'].port, 'POST', '/embed', { data, modality, asset_id: assetId }, INTERNAL_TOKEN);
      steps.push({ step: 'embed', service: 'mm-embedder', status: embedResp.status, embedding_id: embedResp.body?.id, dimensions: embedResp.body?.dimensions });

      res.status(201).json({
        modality,
        asset_id: assetId,
        embedding_id: embedResp.body?.id,
        steps,
        completed_at: nowIso(),
      });
    } catch (e) {
      res.status(502).json({ error: 'pipeline_failed', message: e.message, steps });
    }
  });

  app.get('/stats', requireInternal, async (_req, res) => {
    const checks = await Promise.all(
      Object.entries(SERVICES).map(async ([name, info]) => ({ name, port: info.port, ...(await probe(info.port)) }))
    );
    const upCount = checks.filter((c) => c.ok).length;
    res.json({ service_count: Object.keys(SERVICES).length, up: upCount, down: Object.keys(SERVICES).length - upCount });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`multimodal-api listening on ${PORT}`));
}

module.exports = { createApp };