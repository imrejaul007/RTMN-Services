/**
 * Routing Intelligence — Voice Gateway v1.1
 * ========================================
 * Adaptive engine selection based on:
 *   - Language (Sarvam for Indic, Whisper for English)
 *   - Cost (cheapest for batch, premium for real-time)
 *   - Latency (fast for voice UX, slower for accuracy)
 *   - Confidence history (per-domain accuracy tracking)
 *   - Audio quality (VAD-suggested quality level)
 */

import { config } from '../config/index.js';
import type { STTEngine, TTSEngine } from '../types/index.js';

// ── Engine cost & latency profiles ──────────────────────────────────────────────
// Approximate USD per minute (STT) and per 1000 chars (TTS)
// Latency: p50 round-trip in ms

const STT_PROFILES: Record<STTEngine, { costPerMin: number; latencyMs: number; accuracy: number; languages: string[] }> = {
  whisper:   { costPerMin: 0.006, latencyMs: 250,  accuracy: 0.85, languages: ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'kn', 'ml', 'gu', 'or', 'as', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'ar'] },
  deepgram:   { costPerMin: 0.0044, latencyMs: 180,  accuracy: 0.88, languages: ['en', 'es', 'fr', 'de', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar'] },
  google:     { costPerMin: 0.009, latencyMs: 300,  accuracy: 0.87, languages: ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'kn', 'ml', 'gu', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'ar'] },
  sarvam:    { costPerMin: 0.008, latencyMs: 400,  accuracy: 0.82, languages: ['hi', 'bn', 'ta', 'te', 'mr', 'kn', 'ml', 'en'] },
  hojai:     { costPerMin: 0.000, latencyMs: 80,   accuracy: 0.0,  languages: ['en', 'hi', 'ta', 'te', 'bn', 'mr'] },
};

const TTS_PROFILES: Record<TTSEngine, { costPer1k: number; latencyMs: number; quality: number; languages: string[] }> = {
  elevenlabs: { costPer1k: 0.30, latencyMs: 400,  quality: 95, languages: ['en', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'pl', 'tr', 'ru', 'ja', 'ko', 'zh', 'ar'] },
  cartesia:   { costPer1k: 0.25, latencyMs: 300,  quality: 92, languages: ['en', 'hi', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko', 'ar'] },
  hojai:     { costPer1k: 0.000, latencyMs: 60,  quality: 88,  languages: ['en', 'hi', 'ta', 'te', 'bn', 'mr'] },
};

// ── Routing modes ────────────────────────────────────────────────────────────────

export type RoutingMode = 'auto' | 'cheapest' | 'fastest' | 'most_accurate' | 'indic_first' | 'balanced';

export interface RouteContext {
  language?: string;
  domain?: string;         // e.g. 'restaurant', 'healthcare', 'ecommerce'
  audioDurationMs?: number;
  isRealTime?: boolean;    // user waiting synchronously
  budgetMode?: RoutingMode;
  minQuality?: number;    // 0-100
  forceEngine?: STTEngine | TTSEngine | 'auto';
}

// ── Language → best engine mapping ──────────────────────────────────────────────

const LANGUAGE_ENGINE_MAP: Record<string, STTEngine> = {
  // Indian languages — Sarvam has proprietary Indic models
  hi: 'sarvam', bn: 'sarvam', ta: 'sarvam', te: 'sarvam',
  mr: 'sarvam', kn: 'sarvam', ml: 'sarvam',
  gu: 'sarvam', pa: 'sarvam', or: 'sarvam', as: 'sarvam',
  // Others — Whisper covers most well
  en: 'whisper', es: 'whisper', fr: 'whisper', de: 'whisper',
  pt: 'whisper', ru: 'whisper', zh: 'google', ja: 'whisper',
  ko: 'whisper', ar: 'whisper',
};

// ── Domain → accuracy weight ────────────────────────────────────────────────────

const DOMAIN_ACCURACY_WEIGHT: Record<string, number> = {
  // High-stakes domains need highest accuracy
  healthcare: 1.0, legal: 1.0, finance: 1.0, government: 1.0,
  // Medium stakes — balanced
  ecommerce: 0.7, restaurant: 0.6, hotel: 0.6, retail: 0.6,
  // Low stakes — speed/price OK
  entertainment: 0.3, social: 0.3, gaming: 0.2,
};

// ── Per-engine accuracy history per domain ─────────────────────────────────────

// In production this would be in Redis; here we use in-memory with a sliding window
const accuracyHistory = new Map<string, { total: number; count: number }>(); // key: `${engine}:${domain}:${lang}`

export function recordAccuracy(engine: string, transcript: string, groundTruth: string, domain?: string, language?: string): void {
  const key = `${engine}:${domain ?? 'general'}:${language ?? 'en'}`;
  const existing = accuracyHistory.get(key) ?? { total: 0, count: 0 };
  // Rough accuracy: count matching words
  const refWords = new Set(groundTruth.toLowerCase().split(/\s+/));
  const hypWords = transcript.toLowerCase().split(/\s+/);
  const correct = hypWords.filter(w => refWords.has(w)).length;
  const acc = refWords.size > 0 ? correct / refWords.size : 1;
  existing.total += acc;
  existing.count++;
  accuracyHistory.set(key, existing);
}

function getDomainAccuracy(engine: string, domain?: string, language?: string): number {
  const key = `${engine}:${domain ?? 'general'}:${language ?? 'en'}`;
  const h = accuracyHistory.get(key);
  return h && h.count > 5 ? h.total / h.count : (STT_PROFILES[engine as STTEngine]?.accuracy ?? 0.8);
}

// ── STT Router ─────────────────────────────────────────────────────────────────

export function routeSTT(ctx: RouteContext): { engine: STTEngine; reason: string; confidence: number } {
  // 1. Force engine always wins
  if (ctx.forceEngine && ctx.forceEngine !== 'auto') {
    return { engine: ctx.forceEngine as STTEngine, reason: `forced by request`, confidence: 1.0 };
  }

  // 2. HOJAI promotion check — if promoted, prefer HOJAI for supported languages
  if (config.stt.hojaiAccuracyThreshold > 0) {
    const hojaiAcc = getDomainAccuracy('hojai', ctx.domain, ctx.language);
    if (hojaiAcc >= config.stt.hojaiAccuracyThreshold) {
      const lang = ctx.language ?? 'en';
      if (STT_PROFILES.hojai.languages.includes(lang)) {
        return { engine: 'hojai', reason: `HOJAI accuracy (${(hojaiAcc * 100).toFixed(1)}%) >= threshold`, confidence: hojaiAcc };
      }
    }
  }

  // 3. Language-based routing
  const lang = ctx.language ?? 'en';
  if (LANGUAGE_ENGINE_MAP[lang]) {
    const suggested = LANGUAGE_ENGINE_MAP[lang];
    if (suggested !== 'hojai' || ctx.budgetMode !== 'cheapest') {
      return { engine: suggested, reason: `best for language "${lang}"`, confidence: 0.9 };
    }
  }

  // 4. Mode-based routing
  const mode = ctx.budgetMode ?? 'balanced';

  if (mode === 'indic_first') {
    const indic = ['hi', 'bn', 'ta', 'te', 'mr', 'kn', 'ml', 'gu', 'pa', 'or', 'as'].includes(lang) ? 'sarvam' : 'whisper';
    return { engine: indic, reason: `indic_first mode, language="${lang}"`, confidence: 0.85 };
  }

  if (mode === 'cheapest') {
    const sorted = (['whisper', 'deepgram', 'google', 'sarvam'] as STTEngine[])
      .filter(e => STT_PROFILES[e].languages.includes(lang))
      .sort((a, b) => STT_PROFILES[a].costPerMin - STT_PROFILES[b].costPerMin);
    const engine = sorted[0] ?? 'whisper';
    return { engine, reason: `cheapest for language="${lang}"`, confidence: 0.8 };
  }

  if (mode === 'fastest') {
    const sorted = (['deepgram', 'whisper', 'google', 'sarvam'] as STTEngine[])
      .filter(e => STT_PROFILES[e].languages.includes(lang))
      .sort((a, b) => STT_PROFILES[a].latencyMs - STT_PROFILES[b].latencyMs);
    const engine = sorted[0] ?? 'whisper';
    return { engine, reason: `fastest for language="${lang}"`, confidence: 0.8 };
  }

  if (mode === 'most_accurate') {
    const domainWeight = DOMAIN_ACCURACY_WEIGHT[ctx.domain ?? ''] ?? 0.5;
    const sorted = (['deepgram', 'whisper', 'google', 'sarvam'] as STTEngine[])
      .filter(e => STT_PROFILES[e].languages.includes(lang))
      .sort((a, b) => {
        const accA = getDomainAccuracy(a, ctx.domain, ctx.language) * domainWeight + STT_PROFILES[a].accuracy * (1 - domainWeight);
        const accB = getDomainAccuracy(b, ctx.domain, ctx.language) * domainWeight + STT_PROFILES[b].accuracy * (1 - domainWeight);
        return accB - accA;
      });
    const engine = sorted[0] ?? 'whisper';
    const topAcc = getDomainAccuracy(engine, ctx.domain, ctx.language);
    return { engine, reason: `most accurate (domain=${ctx.domain ?? 'general'})`, confidence: topAcc };
  }

  // 5. Balanced (default): cost + accuracy + latency trade-off
  // Score = (accuracy_weight * accuracy) - (cost_weight * cost) - (latency_weight * latency_penalty)
  const weights = { accuracy: 0.5, cost: 0.3, latency: 0.2 };
  const maxCost = 0.009;
  const maxLatency = 500;

  const sorted = (['deepgram', 'whisper', 'google', 'sarvam'] as STTEngine[])
    .filter(e => STT_PROFILES[e].languages.includes(lang))
    .map(e => {
      const domainAcc = getDomainAccuracy(e, ctx.domain, ctx.language);
      const overallAcc = domainAcc * 0.4 + STT_PROFILES[e].accuracy * 0.6;
      const score = weights.accuracy * overallAcc
        - weights.cost * (STT_PROFILES[e].costPerMin / maxCost)
        - weights.latency * (STT_PROFILES[e].latencyMs / maxLatency);
      return { engine: e, score };
    })
    .sort((a, b) => b.score - a.score);

  const engine = sorted[0]?.engine ?? 'whisper';
  return { engine, reason: `balanced routing, language="${lang}"`, confidence: 0.75 };
}

// ── TTS Router ─────────────────────────────────────────────────────────────────

export function routeTTS(ctx: RouteContext): { engine: TTSEngine; reason: string; quality: number } {
  if (ctx.forceEngine && ctx.forceEngine !== 'auto') {
    return { engine: ctx.forceEngine as TTSEngine, reason: `forced by request`, quality: TTS_PROFILES[ctx.forceEngine as TTSEngine]?.quality ?? 80 };
  }

  const lang = ctx.language ?? 'en';

  if (config.tts.hojaiAccuracyThreshold > 0) {
    const hojaiQ = TTS_PROFILES.hojai.quality;
    if (hojaiQ > 0 && hojaiQ >= config.tts.hojaiAccuracyThreshold) {
      if (TTS_PROFILES.hojai.languages.includes(lang)) {
        return { engine: 'hojai', reason: `HOJAI quality meets threshold`, quality: hojaiQ };
      }
    }
  }

  // TTS: prefer lower cost for long texts, higher quality for short
  const textLength = 0; // ctx.textLength would be passed in

  if (ctx.budgetMode === 'cheapest') {
    const sorted = (['cartesia', 'elevenlabs'] as TTSEngine[])
      .filter(e => TTS_PROFILES[e].languages.includes(lang))
      .sort((a, b) => TTS_PROFILES[a].costPer1k - TTS_PROFILES[b].costPer1k);
    const engine = sorted[0] ?? 'elevenlabs';
    return { engine, reason: `cheapest for language="${lang}"`, quality: TTS_PROFILES[engine].quality };
  }

  if (ctx.budgetMode === 'fastest') {
    const sorted = (['cartesia', 'elevenlabs'] as TTSEngine[])
      .filter(e => TTS_PROFILES[e].languages.includes(lang))
      .sort((a, b) => TTS_PROFILES[a].latencyMs - TTS_PROFILES[b].latencyMs);
    const engine = sorted[0] ?? 'elevenlabs';
    return { engine, reason: `fastest for language="${lang}"`, quality: TTS_PROFILES[engine].quality };
  }

  // Balanced: Cartesia for Indic languages, ElevenLabs for others
  const indic = ['hi', 'bn', 'ta', 'te', 'mr', 'kn', 'ml'].includes(lang);
  const engine: TTSEngine = indic ? 'cartesia' : 'elevenlabs';
  return { engine, reason: `balanced for language="${lang}"`, quality: TTS_PROFILES[engine].quality };
}

// ── Fallback chain ─────────────────────────────────────────────────────────────

export function getFallbackChain(primary: STTEngine): STTEngine[] {
  const chain: STTEngine[] = [primary];
  const all: STTEngine[] = ['whisper', 'deepgram', 'google', 'sarvam'];
  const idx = all.indexOf(primary);
  if (idx >= 0) {
    for (let i = 0; i < all.length; i++) {
      if (i !== idx && !chain.includes(all[i])) chain.push(all[i]);
    }
  }
  return chain;
}

export default { routeSTT, routeTTS, getFallbackChain, recordAccuracy };
