/**
 * Audio Preprocessor — Voice Gateway v1.1
 * ======================================
 * Preprocessing pipeline before STT:
 *   1. Format detection and normalization (resample to 16kHz mono PCM)
 *   2. Voice Activity Detection (silence removal)
 *   3. Noise reduction (spectral gating — stub for real implementation)
 *   4. Audio quality scoring
 *   5. Format conversion (webm → wav, mp3 → wav, etc.)
 *
 * Uses the Web Audio API concepts for analysis. For real production,
 * wire to a native library like webrtc-vad, rnnoise, or a Python
 * preprocessing microservice.
 */

import crypto from 'crypto';

// ── Audio format detection ───────────────────────────────────────────────────────

export interface AudioMetadata {
  format: string;           // 'webm', 'mp3', 'wav', 'ogg', 'mp4', 'unknown'
  mimeType: string;
  durationMs: number;
  sampleRate: number;
  channels: number;
  bitDepth?: number;
  estimatedSizeBytes: number;
  isSpeechLikely: boolean;
  hasAudio: boolean;
  qualityScore: number;     // 0-100
}

/** Detect format from magic bytes and MIME type */
export function detectFormat(buffer: Buffer, mimeHint?: string): AudioMetadata {
  const size = buffer.length;

  // Magic bytes for common formats
  const magic: [string, string, number][] = [
    ['RIFF....WAVE', 'audio/wav', 12],
    ['fLaC', 'audio/flac', 4],
    ['ID3', 'audio/mpeg', 0],
    ['\x89PNG\r\n\x1a\n', 'audio/ogg', 0],   // OGG container
    ['OggS', 'audio/ogg', 0],
    ['ftypisom', 'audio/mp4', 4],
    ['ftypmp4', 'audio/mp4', 4],
    ['ftypqt', 'audio/mp4', 4],
    ['\x1aE\xdf\xa3', 'audio/webm', 0],  // WebM/Opus
  ];

  let detectedFormat = 'unknown';
  let detectedMime = mimeHint ?? 'application/octet-stream';
  let sampleRate = 16000;
  let channels = 1;
  let durationMs = 0;

  for (const [magicStr, mime, offset] of magic) {
    if (size > offset + magicStr.replace(/\./g, '').length) {
      let match = true;
      let si = 0;
      for (const ch of magicStr) {
        if (ch !== '.' && buffer[offset + si] !== ch.charCodeAt(0)) {
          match = false;
          break;
        }
        si++;
      }
      if (match) {
        detectedFormat = mime.split('/')[1]?.replace('mpeg', 'mp3').replace('x-matroska', 'mkv') ?? 'unknown';
        detectedMime = mime;
        break;
      }
    }
  }

  // Estimate duration based on format and size
  // These are rough estimates for compressed audio
  const bytesPerSec: Record<string, number> = {
    webm: 12000, mp3: 16000, mp4: 8000, wav: 32000, ogg: 10000, flac: 14000,
  };
  const bps = bytesPerSec[detectedFormat] ?? 12000;
  durationMs = Math.round((size / bps) * 1000);

  // Quality scoring
  const hasAudio = size > 1000;
  const qualityScore = Math.min(100, Math.round(
    (hasAudio ? 40 : 0) +
    (size > 50000 ? 20 : size > 10000 ? 10 : 0) +
    (detectedFormat !== 'unknown' ? 20 : 0) +
    (durationMs > 500 && durationMs < 120000 ? 20 : durationMs < 300000 ? 10 : 0)
  ));

  // Rough speech likelihood based on size and duration
  const isSpeechLikely = hasAudio && size / Math.max(1, durationMs) > 0.5 && durationMs < 120000;

  return {
    format: detectedFormat,
    mimeType: detectedMime,
    durationMs,
    sampleRate,
    channels,
    estimatedSizeBytes: size,
    isSpeechLikely,
    hasAudio,
    qualityScore,
  };
}

// ── Simple VAD (Voice Activity Detection) ──────────────────────────────────────

/**
 * Lightweight energy-based VAD.
 * Computes RMS energy in frames and marks frames as speech if energy > threshold.
 *
 * For production: use WebRTC VAD (Goertzel algorithm) or Silero VAD.
 */
export interface VADResult {
  hasSpeech: boolean;
  speechMs: number;
  silenceMs: number;
  speechRatio: number;       // 0-1
  avgEnergy: number;
  peakEnergy: number;
  segments: Array<{ startMs: number; endMs: number; energy: number }>;
  recommendedEngine?: string;
}

const FRAME_SIZE_MS = 30;
const ENERGY_THRESHOLD = 0.02; // RMS threshold for speech detection

export function detectVoiceActivity(audioBuffer: Buffer, format: string): VADResult {
  // Simplified VAD — real implementation would decode audio to PCM samples
  // Here we use file size and duration heuristics

  const durationMs = Math.round(audioBuffer.length / 12); // rough estimate
  const frames = Math.floor(durationMs / FRAME_SIZE_MS);

  // Simulate energy levels based on buffer entropy (not real audio analysis)
  let totalEnergy = 0;
  let peakEnergy = 0;
  const segments: VADResult['segments'] = [];
  let inSpeech = false;
  let segmentStart = 0;
  let speechMs = 0;

  for (let i = 0; i < frames; i++) {
    // Pseudo-random energy based on buffer content
    const frameStart = Math.floor((i * audioBuffer.length) / frames);
    const frameEnd = Math.floor(((i + 1) * audioBuffer.length) / frames);
    let frameSum = 0;
    for (let j = frameStart; j < Math.min(frameEnd, audioBuffer.length); j++) {
      frameSum += Math.abs(audioBuffer[j] - 128);
    }
    const energy = frameSum / Math.max(1, frameEnd - frameStart) / 128;

    totalEnergy += energy;
    peakEnergy = Math.max(peakEnergy, energy);

    const isSpeechFrame = energy > ENERGY_THRESHOLD;

    if (isSpeechFrame !== inSpeech) {
      if (inSpeech) {
        segments.push({
          startMs: segmentStart * FRAME_SIZE_MS,
          endMs: (i - 1) * FRAME_SIZE_MS,
          energy: peakEnergy,
        });
        speechMs += (i - segmentStart) * FRAME_SIZE_MS;
      }
      inSpeech = isSpeechFrame;
      segmentStart = i;
    }
  }

  if (inSpeech) {
    speechMs += (frames - segmentStart) * FRAME_SIZE_MS;
  }

  const avgEnergy = totalEnergy / frames;
  const silenceMs = durationMs - speechMs;
  const speechRatio = durationMs > 0 ? speechMs / durationMs : 0;

  const hasSpeech = speechRatio > 0.1; // At least 10% speech

  // Recommend engine based on audio quality
  let recommendedEngine: string | undefined;
  if (!hasSpeech) {
    recommendedEngine = 'skip'; // No speech detected
  } else if (speechRatio < 0.3) {
    recommendedEngine = 'sarvam'; // Lots of silence — Sarvam handles noisy/quiet better
  } else if (speechRatio > 0.9) {
    recommendedEngine = 'whisper'; // Clean speech — Whisper excels
  }

  return {
    hasSpeech,
    speechMs,
    silenceMs,
    speechRatio: Math.round(speechRatio * 10000) / 10000,
    avgEnergy: Math.round(avgEnergy * 10000) / 10000,
    peakEnergy: Math.round(peakEnergy * 10000) / 10000,
    segments,
    recommendedEngine,
  };
}

// ── Preprocessing recommendations ───────────────────────────────────────────────

export interface PreprocessingRecommendation {
  needsResampling: boolean;   // Need 16kHz conversion
  needsNoiseReduction: boolean;
  trimSilences: boolean;
  recommendedFormat: string;   // 'wav' or 'webm'
  estimatedProcessingMs: number;
  warnings: string[];
  detectedLanguage?: string;
  confidenceBoost?: number;   // How much preprocessing will boost accuracy
}

export function getPreprocessingRecommendation(metadata: AudioMetadata, vad: VADResult): PreprocessingRecommendation {
  const warnings: string[] = [];
  let estimatedMs = 0;

  if (metadata.sampleRate !== 16000) {
    estimatedMs += metadata.durationMs * 0.1;
    warnings.push(`Audio is ${metadata.sampleRate}Hz — will resample to 16kHz`);
  }

  if (vad.speechRatio < 0.5) {
    warnings.push(`Only ${(vad.speechRatio * 100).toFixed(0)}% speech — ${vad.silenceMs}ms of silence detected`);
    estimatedMs += metadata.durationMs * 0.05;
  }

  if (metadata.qualityScore < 50) {
    warnings.push(`Low quality score (${metadata.qualityScore}/100) — noise reduction recommended`);
    estimatedMs += metadata.durationMs * 0.15;
  }

  return {
    needsResampling: metadata.sampleRate !== 16000,
    needsNoiseReduction: metadata.qualityScore < 50,
    trimSilences: vad.speechRatio < 0.7,
    recommendedFormat: 'wav',
    estimatedProcessingMs: Math.round(estimatedMs),
    warnings,
    confidenceBoost: vad.speechRatio < 0.5 ? 0.1 : undefined,
  };
}

// ── Format conversion hints ───────────────────────────────────────────────────────

export const FORMAT_CONVERSION_HINTS: Record<string, { targetFormat: string; sampleRate: number; channels: number; codecHint: string }> = {
  mp3:  { targetFormat: 'wav', sampleRate: 16000, channels: 1, codecHint: 'pcm_s16le' },
  mp4:  { targetFormat: 'wav', sampleRate: 16000, channels: 1, codecHint: 'pcm_s16le' },
  webm: { targetFormat: 'wav', sampleRate: 16000, channels: 1, codecHint: 'pcm_s16le' },
  ogg:  { targetFormat: 'wav', sampleRate: 16000, channels: 1, codecHint: 'pcm_s16le' },
  wav:  { targetFormat: 'wav', sampleRate: 16000, channels: 1, codecHint: 'already pcm_s16le' },
  flac: { targetFormat: 'wav', sampleRate: 16000, channels: 1, codecHint: 'pcm_s16le' },
};

export function getConversionHint(format: string) {
  return FORMAT_CONVERSION_HINTS[format] ?? FORMAT_CONVERSION_HINTS['mp3'];
}

export default { detectFormat, detectVoiceActivity, getPreprocessingRecommendation, getConversionHint };
