/**
 * HOJAI VOICE GATEWAY — v1.1
 * =============================
 * Advanced STT/TTS gateway with:
 *   - Training-aware routing (collect → benchmark → promote HOJAI)
 *   - Adaptive engine selection (language, cost, latency, domain)
 *   - Fallback chains (try multiple engines on failure)
 *   - Real-time streaming via WebSocket
 *   - Audio preprocessing (VAD, format detection)
 *   - Language auto-detection
 *   - Cost tracking per engine/user/day
 *   - Redis event bus for async training pipeline
 *   - Real WER-based benchmark runner
 *   - Speaker diarization (per-engine)
 *
 * Port: 4880
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { z } from 'zod';
import crypto from 'crypto';
import { config } from './config/index.js';
import { sttAdapters, isSTTEngine } from './adapters/stt/index.js';
import { ttsAdapters, isTTSEngine } from './adapters/tts/index.js';
import type { STTEngine, TTSEngine } from './types/index.js';
import type { TranscriptionResult } from './adapters/stt/index.js';

// ── Services ─────────────────────────────────────────────────────────────────────
import { runBenchmark, loadCorpus, evaluatePromotion, saveBenchmarkHistory } from './services/benchmark.js';
import { routeSTT, routeTTS, getFallbackChain, recordAccuracy } from './services/routing.js';
import {
  recordSTTCall, recordTTSCall, computeSTTCost, computeTTSCost,
  getDailyCostBreakdown, getMonthlyCostSummary, getUserCost, getTopUsers
} from './services/cost-tracking.js';
import { emitEvent, ensureConsumerGroup, drainQueue, isConnected, getQueueSize } from './services/event-bus.js';
import { detectFormat, detectVoiceActivity, getPreprocessingRecommendation } from './services/audio-preprocessor.js';
import { detectLanguageFromText, detectLanguageFromAudio, recommendEngine } from './services/language-detector.js';
import { attachWebSocketServer, getStreamStats } from './routes/stream.js';

// ── Stores ─────────────────────────────────────────────────────────────────────
const START_TIME = Date.now();
let sampleCounter = 0;
// TTL-bounded audio hash set: auto-evict entries older than 7 days
const audioHashSet = new Map<string, number>(); // hash → timestamp
const AUDIO_HASH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function addAudioHash(hash: string): void {
  audioHashSet.set(hash, Date.now());
  // Evict stale entries lazily (every 100th add)
  if (audioHashSet.size % 100 === 0) {
    const cutoff = Date.now() - AUDIO_HASH_TTL_MS;
    for (const [k, ts] of audioHashSet) { if (ts < cutoff) audioHashSet.delete(k); }
  }
}
function hasAudioHash(hash: string): boolean {
  const ts = audioHashSet.get(hash);
  if (!ts) return false;
  if (Date.now() - ts > AUDIO_HASH_TTL_MS) { audioHashSet.delete(hash); return false; }
  return true;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function audioHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer.slice(0, 4096)).digest('hex').slice(0, 24);
}

function shouldUseHojaiSTT(): boolean {
  const bench = getBenchmarkResult('hojai');
  if (!bench || bench.accuracy === 0) return false;
  return bench.accuracy >= config.stt.hojaiAccuracyThreshold;
}

// ── App setup ──────────────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
// Note: audio arrives as base64 in JSON bodies — no raw body parser needed

// Attach WebSocket server
attachWebSocketServer(httpServer);

const apiResponse = <T>(success: boolean, data?: T, error?: string) =>
  ({ success, data, error, timestamp: new Date().toISOString() });

const asyncRoute = (h: (req: express.Request, res: express.Response) => Promise<void>) =>
  async (req: express.Request, res: express.Response) => {
    try { await h(req, res); }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[voice-gateway]', msg);
      if (res.headersSent) return;
      // Distinguish error types for proper HTTP status codes
      if (e instanceof SyntaxError)      { res.status(400).json(apiResponse(false, undefined, `Invalid JSON: ${msg}`)); return; }
      if (msg.includes('not found') || msg.includes('Not found')) { res.status(404).json(apiResponse(false, undefined, msg)); return; }
      if (msg.includes('timeout') || msg.includes('Timeout'))    { res.status(504).json(apiResponse(false, undefined, msg)); return; }
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) { res.status(502).json(apiResponse(false, undefined, `Upstream error: ${msg}`)); return; }
      res.status(500).json(apiResponse(false, undefined, msg));
    }
  };

// ── Benchmark store (wired from benchmark service) ────────────────────────────────
// TTL-bounded benchmark results: stale entries auto-evicted after 24h
const benchmarkResults = new Map<string, { accuracy: number; wordErrorRate: number; samplesTested: number; testedAt: number }>();
const BENCHMARK_TTL_MS = 24 * 60 * 60 * 1000;
function getBenchmarkResult(engine: string) {
  const r = benchmarkResults.get(engine);
  if (!r) return null;
  if (Date.now() - r.testedAt > BENCHMARK_TTL_MS) { benchmarkResults.delete(engine); return null; }
  return r;
}

// ── Schemas ─────────────────────────────────────────────────────────────────────

const TranscribeSchema = z.object({
  audio: z.string(),                              // base64 audio
  filename: z.string().default('audio.webm'),
  language: z.string().optional(),
  engine: z.enum(['whisper', 'deepgram', 'google', 'sarvam', 'hojai', 'auto']).default('auto'),
  routingMode: z.enum(['auto', 'cheapest', 'fastest', 'most_accurate', 'indic_first', 'balanced']).default('auto'),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  domain: z.string().optional(),                  // e.g. 'healthcare', 'restaurant'
  detectLanguage: z.boolean().default(true),
  preprocess: z.boolean().default(true),
  skipFallback: z.boolean().default(false),
});

const SynthesizeSchema = z.object({
  text: z.string().max(10000),
  engine: z.enum(['elevenlabs', 'cartesia', 'hojai', 'auto']).default('auto'),
  routingMode: z.enum(['auto', 'cheapest', 'fastest', 'balanced']).default('auto'),
  voiceId: z.string().optional(),
  language: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

const BenchmarkSchema = z.object({
  corpus: z.string().optional(),                  // path to corpus override
  engines: z.array(z.enum(['whisper', 'deepgram', 'google', 'sarvam', 'hojai'])).optional(),
  force: z.boolean().default(false),
});

const BenchmarkSamplesSchema = z.object({
  samples: z.array(z.object({
    id: z.string(), groundTruth: z.string(), language: z.string().default('en'),
    domain: z.string().optional(),
  })),
});

// ── STT: Pre-flight analysis ──────────────────────────────────────────────────

function preflightAnalysis(audioBuffer: Buffer, filename: string) {
  const formatMeta = detectFormat(audioBuffer, filename);
  const vad = detectVoiceActivity(audioBuffer, formatMeta.format);
  const preprocess = getPreprocessingRecommendation(formatMeta, vad);
  return { format: formatMeta, vad, preprocess };
}

// ── STT: Core transcription with fallback chain ─────────────────────────────────

async function transcribeWithFallback(
  audioBuffer: Buffer,
  filename: string,
  engine: STTEngine,
  language?: string,
  skipFallback = false
): Promise<TranscriptionResult & { fallbackUsed?: string }> {
  const chain = skipFallback ? [engine] : getFallbackChain(engine);

  for (let attempt = 0; attempt < chain.length; attempt++) {
    const currentEngine = chain[attempt];
    try {
      const adapter = sttAdapters[currentEngine];
      const result = await adapter.transcribe(audioBuffer, filename, language);
      if (attempt > 0) {
        console.log(`[stt] Fallback: ${engine} → ${currentEngine} succeeded`);
      }
      return { ...result, fallbackUsed: attempt > 0 ? currentEngine : undefined };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[stt] Engine ${currentEngine} failed: ${msg}`);
      if (attempt === chain.length - 1) {
        throw new Error(`All engines in fallback chain failed. Last error: ${msg}`);
      }
    }
  }
  throw new Error('Fallback chain exhausted');
}

// ── STT Routes ─────────────────────────────────────────────────────────────────

app.post('/api/v1/stt',requireAuth,  asyncRoute(async (req, res) => {
  const validation = TranscribeSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`));
    return;
  }

  const { audio, filename, language: hintLang, engine: requestedEngine, routingMode, userId, sessionId, domain, detectLanguage: doDetectLang, preprocess: doPreprocess, skipFallback } = validation.data;
  const audioBuffer = Buffer.from(audio, 'base64');

  if (audioBuffer.length < 100) {
    res.status(400).json(apiResponse(false, undefined, 'Audio too short (< 100 bytes)'));
    return;
  }

  // 1. Pre-flight analysis
  const { format: formatMeta, vad, preprocess } = doPreprocess ? preflightAnalysis(audioBuffer, filename) : { format: null, vad: null, preprocess: null };

  // 2. Language detection (audio-based first)
  let detectedLang = hintLang;
  if (doDetectLang && !hintLang) {
    const audioLang = detectLanguageFromAudio(audioBuffer, formatMeta?.format ?? 'webm');
    if (audioLang.confidence > 0.65) {
      detectedLang = audioLang.detected;
    }
  }

  // 3. Route to engine
  const routing = routeSTT({
    language: detectedLang,
    domain,
    budgetMode: routingMode as 'auto' | 'cheapest' | 'fastest' | 'most_accurate' | 'indic_first' | 'balanced',
  });
  const effectiveEngine = requestedEngine === 'auto' ? routing.engine : requestedEngine as STTEngine;

  // 4. Check VAD — skip if no speech
  if (vad && !vad.hasSpeech) {
    res.json(apiResponse(true, {
      text: '',
      language: detectedLang ?? 'en',
      confidence: 0,
      engine: effectiveEngine,
      routing: routing.reason,
      vad: { hasSpeech: false, speechMs: 0, silenceMs: vad.silenceMs, ratio: vad.speechRatio },
      preflight: formatMeta ? { format: formatMeta.format, qualityScore: formatMeta.qualityScore } : null,
      latencyMs: 0,
      hojaiReady: shouldUseHojaiSTT(),
      hojaiAccuracy: getBenchmarkResult('hojai')?.accuracy ?? 0,
    }));
    return;
  }

  // 5. Transcribe with fallback
  const start = Date.now();
  let result: (TranscriptionResult & { fallbackUsed?: string });
  let error: string | undefined;

  try {
    result = await transcribeWithFallback(audioBuffer, filename, effectiveEngine, detectedLang, skipFallback ?? false);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    result = { text: '', language: detectedLang ?? 'en', confidence: 0, engine: effectiveEngine, processingTimeMs: Date.now() - start };
    await emitEvent({ type: 'engine_error', engine: effectiveEngine, metadata: { error, allEnginesFailed: true } });
  }

  // 6. Post-transcription language detection
  let finalLang = result.language;
  if (doDetectLang && result.text.length > 10) {
    const textLang = detectLanguageFromText(result.text);
    if (textLang.confidence > routing.confidence) {
      finalLang = textLang.detected;
      if (textLang.isCodeSwitched) {
        console.log(`[lang] Code-switched: ${textLang.codeSwitchedLanguages?.join(' + ')}`);
      }
    }
    // Record accuracy against ground truth if we have domain history
    // Accuracy tracking requires ground truth — only record when provided
  if (result.groundTruth) recordAccuracy(effectiveEngine, result.text, result.groundTruth, domain, finalLang);
  }

  // 7. Cost tracking
  const audioSeconds = audioBuffer.length / 16000; // rough
  const cost = computeSTTCost(effectiveEngine, audioSeconds);
  recordSTTCall({
    engine: effectiveEngine,
    audioSeconds,
    latencyMs: result.processingTimeMs,
    costUsd: cost,
    userId,
    sessionId,
    domain,
    success: !error,
    error,
  });

  // 8. Training sample (deduped by audio hash)
  const hash = audioHash(audioBuffer);
  if (!hasAudioHash(hash) && effectiveEngine !== 'hojai' && config.stt.trainingEnabled) {
    addAudioHash(hash);
    await emitEvent({
      type: 'stt_sample',
      engine: effectiveEngine,
      audioHash: hash,
      transcript: result.text,
      language: finalLang ?? hintLang ?? 'en',
      confidence: result.confidence ?? 0.85,
      audioDurationMs: Math.round(audioSeconds * 1000),
      costUsd: cost,
      metadata: { userId, sessionId, domain, fallbackUsed: result.fallbackUsed },
    });
  }

  res.json(apiResponse(true, {
    text: result.text,
    language: finalLang,
    confidence: result.confidence,
    engine: result.engine,
    fallbackUsed: result.fallbackUsed,
    routing: routing.reason,
    routingConfidence: routing.confidence,
    vad: vad ? { hasSpeech: vad.hasSpeech, speechMs: vad.speechMs, silenceMs: vad.silenceMs, speechRatio: vad.speechRatio, segments: vad.segments.length } : null,
    preflight: formatMeta ? { format: formatMeta.format, durationMs: formatMeta.durationMs, qualityScore: formatMeta.qualityScore, recommendedEngine: vad?.recommendedEngine } : null,
    latencyMs: result.processingTimeMs,
    costUsd: Math.round(cost * 1000000) / 1000000,
    hojaiReady: shouldUseHojaiSTT(),
    hojaiAccuracy: getBenchmarkResult('hojai')?.accuracy ?? 0,
  }));
}));

// Batch STT
app.post('/api/v1/stt/batch',requireAuth,  asyncRoute(async (req, res) => {
  const validation = z.object({ requests: z.array(TranscribeSchema) }).safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`));
    return;
  }
  const { requests } = validation.data;

  // Pre-compute engines per request
  const engines = requests.map(r =>
    r.engine === 'auto'
      ? routeSTT({ language: r.language, domain: r.domain }).engine
      : r.engine as STTEngine
  );

  const results = await Promise.allSettled(requests.map(async (r, i) => {
    const audioBuffer = Buffer.from(r.audio, 'base64');
    return transcribeWithFallback(audioBuffer, r.filename ?? 'batch.webm', engines[i], r.language ?? 'en', r.skipFallback ?? false);
  }));

  res.json(apiResponse(true, {
    results: results.map((r, i) => r.status === 'fulfilled'
      ? { success: true, text: r.value.text, language: r.value.language, confidence: r.value.confidence, engine: engines[i], fallbackUsed: r.value.fallbackUsed }
      : { success: false, error: r.reason instanceof Error ? r.reason.message : String(r.reason) }
    ),
  }));
}));

app.get('/api/v1/stt/engines', (_req, res) => {
  const hojaiReady = shouldUseHojaiSTT();
  res.json(apiResponse(true, {
    engines: [
      { engine: 'whisper',   name: 'OpenAI Whisper',      provider: 'OpenAI',   accuracy: benchmarkResults.get('whisper')?.accuracy ?? 0.85, wpmCost: 0.006, latencyMs: 250, bestFor: ['en', 'es', 'fr', 'de', 'general'] },
      { engine: 'deepgram',  name: 'Deepgram Nova-2',     provider: 'Deepgram', accuracy: benchmarkResults.get('deepgram')?.accuracy ?? 0.88, wpmCost: 0.0044, latencyMs: 180, bestFor: ['en', 'high-speed'] },
      { engine: 'google',    name: 'Google Speech-to-Text', provider: 'Google', accuracy: benchmarkResults.get('google')?.accuracy ?? 0.87, wpmCost: 0.009, latencyMs: 300, bestFor: ['zh', 'ja', 'ko', 'en'] },
      { engine: 'sarvam',   name: 'Sarvam AI',          provider: 'Sarvam',   accuracy: benchmarkResults.get('sarvam')?.accuracy ?? 0.82, wpmCost: 0.008, latencyMs: 400, bestFor: ['hi', 'bn', 'ta', 'te', 'mr', 'kn', 'ml', 'gu', 'pa', 'or', 'as', 'Indic'] },
      { engine: 'hojai',    name: 'HOJAI Voice Model',   provider: 'HOJAI',   accuracy: getBenchmarkResult('hojai')?.accuracy ?? 0,   wpmCost: 0, latencyMs: 80,  bestFor: ['en', 'hi', 'Indic'], promoted: hojaiReady },
    ],
    defaultEngine: config.stt.defaultEngine,
    hojaiReady,
    hojaiAccuracy: getBenchmarkResult('hojai')?.accuracy ?? 0,
  }));
});

// ── TTS Routes ─────────────────────────────────────────────────────────────────

app.post('/api/v1/tts',requireAuth,  asyncRoute(async (req, res) => {
  const validation = SynthesizeSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`));
    return;
  }
  const { text, engine: requestedEngine, routingMode, voiceId, language } = validation.data;

  const routing = routeTTS({ language, budgetMode: routingMode as 'auto' | 'cheapest' | 'fastest' | 'balanced' });
  const effectiveEngine = requestedEngine === 'auto' ? routing.engine : requestedEngine as TTSEngine;

  const adapter = ttsAdapters[effectiveEngine];
  const start = Date.now();
  let error: string | undefined;
  let result: Awaited<ReturnType<typeof adapter.synthesize>> | null = null;

  try {
    result = await adapter.synthesize(text, voiceId, language);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const cost = computeTTSCost(effectiveEngine, text.length);
  recordTTSCall({
    engine: effectiveEngine,
    textChars: text.length,
    latencyMs: result?.processingTimeMs ?? Date.now() - start,
    costUsd: cost,
    success: !error,
  });

  if (error) {
    res.status(500).json(apiResponse(false, undefined, error));
    return;
  }

  res.json(apiResponse(true, {
    audioBase64: result!.audioBase64,
    mimeType: result!.mimeType,
    durationMs: result!.durationMs,
    engine: result!.engine,
    latencyMs: result!.processingTimeMs,
    routing: routing.reason,
    costUsd: Math.round(cost * 1000000) / 1000000,
  }));
}));

app.get('/api/v1/tts/engines', (_req, res) => {
  res.json(apiResponse(true, {
    engines: [
      { engine: 'elevenlabs', name: 'ElevenLabs Multilingual v2', provider: 'ElevenLabs', quality: 95, per1kChars: 0.30, latencyMs: 400, bestFor: ['en', 'hi', 'es', 'fr', 'de', 'studio'] },
      { engine: 'cartesia',   name: 'Cartesia Sonic-2',          provider: 'Cartesia',   quality: 92, per1kChars: 0.25, latencyMs: 300, bestFor: ['en', 'hi', 'Indic', 'fast'] },
      { engine: 'hojai',      name: 'HOJAI Voice Model',        provider: 'HOJAI',      quality: 88, per1kChars: 0,     latencyMs: 60,  bestFor: ['en', 'hi', 'low-latency'] },
    ],
    defaultEngine: config.tts.defaultEngine,
  }));
});

// ── Language Detection ─────────────────────────────────────────────────────────

app.post('/api/v1/detect-language',requireAuth,  asyncRoute(async (req, res) => {
  const validation = z.object({
    audio: z.string().optional(),
    text: z.string().optional(),
  }).safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`));
    return;
  }
  const { audio, text } = validation.data;

  if (audio) {
    const buf = Buffer.from(audio, 'base64');
    const format = detectFormat(buf, 'audio.webm');
    const result = detectLanguageFromAudio(buf, format.format);
    res.json(apiResponse(true, { method: 'audio', ...result }));
  } else if (text) {
    const result = detectLanguageFromText(text);
    res.json(apiResponse(true, { method: 'text', ...result }));
  } else {
    res.status(400).json(apiResponse(false, undefined, 'Provide audio or text'));
  }
}));

// ── Audio Analysis ──────────────────────────────────────────────────────────────

app.post('/api/v1/analyze-audio',requireAuth,  asyncRoute(async (req, res) => {
  const validation = z.object({ audio: z.string(), filename: z.string().default('audio.webm') }).safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`));
    return;
  }
  const { audio, filename } = validation.data;
  const buf = Buffer.from(audio, 'base64');
  const format = detectFormat(buf, filename);
  const vad = detectVoiceActivity(buf, format.format);
  const preprocess = getPreprocessingRecommendation(format, vad);
  const langAudio = detectLanguageFromAudio(buf, format.format);

  res.json(apiResponse(true, {
    format: { ...format },
    vad: { ...vad, segments: vad.segments.length }, // truncate segments for response
    preprocess,
    suggestedLanguage: langAudio.detected,
    suggestedLanguageConfidence: langAudio.confidence,
    suggestedEngine: recommendEngine(langAudio.detected),
  }));
}));

// ── Benchmark ─────────────────────────────────────────────────────────────────

app.post('/api/v1/training/benchmark',requireAuth,  asyncRoute(async (req, res) => {
  const validation = BenchmarkSchema.parse(req.body);
  const { corpus, engines: requestedEngines, force } = validation;

  // Don't run if already recently benchmarked (unless forced)
  const hojaiBench = getBenchmarkResult('hojai');
  if (!force && hojaiBench && (Date.now() - hojaiBench.testedAt) < BENCHMARK_TTL_MS) {
    res.json(apiResponse(true, {
      results: Object.fromEntries(benchmarkResults),
      skipped: true,
      reason: `Recent benchmark exists (${Math.round((Date.now() - hojaiBench.testedAt) / 3600000)}h ago). Use force=true to re-run.`,
    }));
    return;
  }

  const corpusPath = corpus ?? config.training.datasetPath;
  const engineList = requestedEngines ?? (['whisper', 'deepgram', 'google', 'sarvam', 'hojai'] as STTEngine[]);

  const corpusSamples = loadCorpus(corpusPath);
  if (corpusSamples.length === 0) {
    res.status(400).json(apiResponse(false, undefined, `No benchmark corpus found at ${corpusPath}/benchmark/ (or use manifest.json)`));
    return;
  }

  await emitEvent({ type: 'benchmark_run', engine: 'all', metadata: { engines: engineList, corpusSize: corpusSamples.length } });

  const results = await runBenchmark(engineList, corpusSamples);

  // Update global benchmark results
  for (const [engine, result] of results.entries()) {
    benchmarkResults.set(engine, {
      accuracy: result.accuracy,
      wordErrorRate: result.wordErrorRate,
      samplesTested: result.samplesTested,
      testedAt: Date.now(),
    });
  }

  // Evaluate promotion
  const promotion = evaluatePromotion(results, config.stt.defaultEngine as STTEngine);
  if (promotion.shouldPromote) {
    await emitEvent({ type: 'hojai_promoted', engine: 'hojai', metadata: { ...promotion } });
  }

  // Save history
  const historyPath = saveBenchmarkHistory(results, corpusPath);

  await emitEvent({ type: 'benchmark_complete', engine: 'all', metadata: { results: Object.fromEntries(benchmarkResults) } });

  res.json(apiResponse(true, {
    results: Object.fromEntries(results),
    summary: Object.fromEntries(benchmarkResults),
    promotion,
    historyPath,
    corpusSize: corpusSamples.length,
  }));
}));

app.post('/api/v1/training/samples/upload',requireAuth,  asyncRoute(async (req, res) => {
  // Upload ground truth samples for benchmark corpus
  const { samples } = BenchmarkSamplesSchema.parse(req.body);

  const corpusDir = `${config.training.datasetPath}/benchmark`;
  const manifestPath = `${corpusDir}/manifest.json`;

  // Merge with existing manifest
  let existing: { samples: Array<{ id: string; groundTruth: string; language: string; domain?: string }> } = { samples: [] };
  try {
    const fs = await import('fs');
    if (fs.existsSync(manifestPath)) {
      existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }
  } catch { /* ignore */ }

  const existingIds = new Set(existing.samples.map(s => s.id));
  const newSamples = samples.filter(s => !existingIds.has(s.id));

  const merged = { samples: [...existing.samples, ...newSamples] };

  const fs = await import('fs');
  fs.mkdirSync(corpusDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 2));

  res.json(apiResponse(true, { uploaded: newSamples.length, total: merged.samples.length, path: manifestPath }));
}));

// ── Training ──────────────────────────────────────────────────────────────────

app.get('/api/v1/training/stats', (_req, res) => {
  const engineCounts: Record<string, number> = { hojai: audioHashSet.size };
  const eventBusConnected = isConnected();
  const queueSize = getQueueSize();

  res.json(apiResponse(true, {
    totalSamples: audioHashSet.size,
    eventBus: { connected: eventBusConnected, queueSize },
    benchmarks: Object.fromEntries(benchmarkResults),
    config: {
      trainingEnabled: config.stt.trainingEnabled,
      minSamplesRequired: config.stt.minSamplesBeforeBenchmark,
      hojaiAccuracyThreshold: config.stt.hojaiAccuracyThreshold,
      hojaiReady: shouldUseHojaiSTT(),
      redisConnected: eventBusConnected,
    },
    recommendation: audioHashSet.size >= config.stt.minSamplesBeforeBenchmark
      ? 'READY: Run benchmark to check accuracy and potentially promote HOJAI.'
      : `${config.stt.minSamplesBeforeBenchmark - audioHashSet.size} more samples needed.`,
  }));
});

app.post('/api/v1/training/export',requireAuth,  asyncRoute(async (req, res) => {
  const { format: exportFormat } = req.query;
  const fs = await import('fs');
  // Drain in-memory event queue for stt_sample events
  const { drainQueue } = await import('./services/event-bus.js');
  const drained = await drainQueue();
  // Read benchmark corpus manifest
  const manifestPath = `${config.training.datasetPath}/benchmark/manifest.json`;
  let corpus: Array<{ id: string; groundTruth: string; language: string; domain?: string }> = [];
  try {
    if (fs.existsSync(manifestPath)) corpus = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')).samples ?? [];
  } catch { /* no corpus yet */ }
  const output: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    corpusSamples: corpus.length,
    inMemoryEventsDrained: drained,
    audioHashCount: audioHashSet.size,
  };
  const ext = (exportFormat as string) ?? 'json';
  const outPath = `${config.training.outputPath}/stt_training_${Date.now()}.${ext}`;
  fs.mkdirSync(config.training.outputPath, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  res.json(apiResponse(true, { ...output, path: outPath }));
}));

app.delete('/api/v1/training/samples',requireAuth,  asyncRoute(async (_req, res) => {
  const count = audioHashSet.size;
  audioHashSet.clear();
  res.json(apiResponse(true, { cleared: count, message: 'Training samples cleared. Benchmark results retained.' }));
}));

// ── VoiceOS Pipeline ────────────────────────────────────────────────────────────

import { executePipeline, checkPipelineHealth } from './services/voice-pipeline.js';

app.post('/api/v1/pipeline/voice', requireAuth, asyncRoute(async (req, res) => {
  const validation = z.object({
    userId: z.string().min(1),
    audio: z.string(), // base64 audio
    mimeType: z.string().default('audio/webm'),
    context: z.object({
      relationship: z.string().optional(),
      conversationId: z.string().optional(),
      mode: z.enum(['casual', 'formal', 'intimate']).optional(),
    }).optional(),
  }).safeParse(req.body);

  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`));
    return;
  }

  const { userId, audio, mimeType, context } = validation.data;

  try {
    const result = await executePipeline({
      userId,
      audioBase64: audio,
      mimeType,
      context,
    });

    res.json(apiResponse(true, result));
  } catch (error) {
    console.error('[voice-pipeline]', error);
    res.status(500).json(apiResponse(false, undefined, 'Pipeline execution failed'));
  }
}));

app.get('/api/v1/pipeline/health', async (_req, res) => {
  const health = await checkPipelineHealth();
  res.json({
    ...apiResponse(true, health),
    timestamp: new Date().toISOString(),
  });
});

// ── Cost ────────────────────────────────────────────────────────────────────────

app.get('/api/v1/cost/daily', (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  res.json(apiResponse(true, getDailyCostBreakdown(date)));
});

app.get('/api/v1/cost/monthly', (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : undefined;
  res.json(apiResponse(true, getMonthlyCostSummary(month)));
});

app.get('/api/v1/cost/users/:userId', (req, res) => {
  res.json(apiResponse(true, getUserCost(req.params.userId)));
});

app.get('/api/v1/cost/top-users', (req, res) => {
  const limit = parseInt(String(req.query.limit ?? '10'));
  res.json(apiResponse(true, getTopUsers(limit)));
});

// ── Health ─────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-voice-gateway',
    version: '1.1.0',
    port: config.port,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    training: {
      enabled: config.stt.trainingEnabled,
      samples: audioHashSet.size,
      hojaiReady: shouldUseHojaiSTT(),
      hojaiAccuracy: getBenchmarkResult('hojai')?.accuracy ?? 0,
    },
    routing: { defaultStt: config.stt.defaultEngine, defaultTts: config.tts.defaultEngine },
    eventBus: { connected: isConnected(), queueSize: getQueueSize() },
    websocket: getStreamStats(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (_req, res) => {
  res.json({
    ready: true,
    eventBusConnected: isConnected(),
    benchmarked: benchmarkResults.size > 0,
    trainingSamples: audioHashSet.size,
    timestamp: new Date().toISOString(),
  });
});

// ── Start ────────────────────────────────────────────────────────────────────────

// Connect to Redis and set up consumer group
ensureConsumerGroup().catch(console.warn);

// Drain queue periodically
setInterval(() => drainQueue(), 30_000);

httpServer.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       HOJAI VOICE GATEWAY — v1.1                    ║
║       Training-Aware · Adaptive · Streaming           ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${String(config.port).padEnd(46)}║
║  STT Engine:  ${config.stt.defaultEngine.padEnd(46)}║
║  TTS Engine:  ${config.tts.defaultEngine.padEnd(46)}║
║  Training:    ${(config.stt.trainingEnabled ? 'enabled' : 'disabled').padEnd(46)}║
║  HOJAI STT:   ${(shouldUseHojaiSTT() ? 'PRODUCTION' : `training (${audioHashSet.size} samples)`).padEnd(46)}║
║  WebSocket:    ws://localhost:${config.port}/ws/stt           ║
╠══════════════════════════════════════════════════════════════╣
║  STT: whisper | deepgram | google | sarvam | hojai       ║
║  TTS: elevenlabs | cartesia | hojai                     ║
╠══════════════════════════════════════════════════════════════╣
║  Advanced features:                                       ║
║    ✓ Adaptive routing (language/cost/latency/domain)       ║
║    ✓ VAD + audio preprocessing                          ║
║    ✓ Language auto-detection (text + audio)             ║
║    ✓ Fallback chain (multiple engines on failure)         ║
║    ✓ Real WER benchmark (Levenshtein distance)            ║
║    ✓ Cost tracking per engine/user/day                   ║
║    ✓ Redis event bus + in-memory fallback               ║
║    ✓ WebSocket streaming with interim results            ║
║    ✓ Batch STT                                        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)); });
process.on('SIGINT',  () => { httpServer.close(() => process.exit(0)); });
