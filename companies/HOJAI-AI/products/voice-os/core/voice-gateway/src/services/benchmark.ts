/**
 * Benchmark Runner — Voice Gateway v1.1
 * ====================================
 * Runs real accuracy benchmarks against a test corpus.
 * Computes WER (Word Error Rate) and WAcc (Word Accuracy)
 * for each engine vs ground truth.
 *
 * Corpus format: <dataset-path>/benchmark/{sample_id}.webm + {sample_id}.txt (ground truth)
 * Also supports inline ground truth via TrainingSampleWithGroundTruth type.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/index.js';
import { sttAdapters } from '../adapters/stt/index.js';
import type { STTEngine } from '../types/index.js';
import type { TranscriptionResult } from '../adapters/stt/index.js';

// ── Benchmark corpus entry ───────────────────────────────────────────────────────

export interface BenchmarkSample {
  id: string;
  audioPath: string;
  groundTruth: string;
  language: string;
  domain?: string;
}

export interface EngineBenchmarkResult {
  engine: STTEngine;
  accuracy: number;        // WAcc = 1 - WER (0..1)
  wordErrorRate: number;  // WER (0..1, lower is better)
  samplesTested: number;
  samplesPassed: number;  // WER < threshold
  avgLatencyMs: number;
  avgConfidence: number;
  testedAt: number;
  perSample: Array<{
    sampleId: string;
    transcript: string;
    groundTruth: string;
    wer: number;
    wacc: number;
    confidence: number;
    latencyMs: number;
    passed: boolean;
  }>;
  wins: number;   // samples where this engine beat hojai
  losses: number; // samples where this engine lost to hojai
  ties: number;
}

// ── WER / WAcc calculation ────────────────────────────────────────────────────

/**
 * Compute Word Error Rate using dynamic programming (Levenshtein distance at word level).
 * WER = (Substitutions + Deletions + Insertions) / Total Words in Reference
 * WAcc = 1 - WER
 */
export function computeWER(reference: string, hypothesis: string): { wer: number; wacc: number; aligned: string } {
  const refWords = reference.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const hypWords = hypothesis.toLowerCase().trim().split(/\s+/).filter(Boolean);

  const m = refWords.length;
  const n = hypWords.length;

  // DP table: dp[i][j] = min cost to transform ref[0..i] to hyp[0..j]
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j - 1],  // substitution
          dp[i - 1][j],      // deletion
          dp[i][j - 1]       // insertion
        );
      }
    }
  }

  const errors = dp[m][n];
  const wer = m === 0 ? 0 : errors / m;
  const wacc = 1 - Math.min(1, wer);

  return { wer: Math.round(wer * 10000) / 10000, wacc: Math.round(wacc * 10000) / 10000, aligned: '' };
}

/**
 * Load benchmark corpus from disk.
 * Expects: {datasetPath}/benchmark/{id}.webm + {id}.txt (ground truth)
 * Also supports: {datasetPath}/benchmark/manifest.json with inline ground truth.
 */
export function loadCorpus(datasetPath: string): BenchmarkSample[] {
  const benchmarkDir = path.join(datasetPath, 'benchmark');

  if (!fs.existsSync(benchmarkDir)) {
    console.warn(`[benchmark] No benchmark corpus at ${benchmarkDir}`);
    return [];
  }

  // Check for manifest.json first
  const manifestPath = path.join(benchmarkDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as { samples: BenchmarkSample[] };
      console.log(`[benchmark] Loaded ${manifest.samples.length} samples from manifest`);
      return manifest.samples;
    } catch {
      console.warn(`[benchmark] Failed to parse manifest.json`);
    }
  }

  // Fall back: scan for .txt files and pair with .webm
  const txtFiles = fs.readdirSync(benchmarkDir).filter(f => f.endsWith('.txt'));
  const samples: BenchmarkSample[] = [];

  for (const txtFile of txtFiles) {
    const id = txtFile.replace('.txt', '');
    const audioPath = path.join(benchmarkDir, `${id}.webm`);
    if (!fs.existsSync(audioPath)) continue;

    samples.push({
      id,
      audioPath,
      groundTruth: fs.readFileSync(path.join(benchmarkDir, txtFile), 'utf-8').trim(),
      language: 'en',
      domain: undefined,
    });
  }

  console.log(`[benchmark] Loaded ${samples.length} samples from disk scan`);
  return samples;
}

// ── Benchmark runner ─────────────────────────────────────────────────────────────

const WER_THRESHOLD = 0.15; // Pass if WER < 15%

export async function runBenchmark(
  engines: STTEngine[],
  corpus?: BenchmarkSample[]
): Promise<Map<STTEngine, EngineBenchmarkResult>> {
  const samples = corpus ?? loadCorpus(config.training.datasetPath);
  if (samples.length === 0) {
    console.warn('[benchmark] No corpus — benchmark skipped');
    return new Map();
  }

  const results = new Map<STTEngine, EngineBenchmarkResult>();
  const hojaiResults: EngineBenchmarkResult['perSample'] | null = null;
  let hojaiPerSample: EngineBenchmarkResult['perSample'] = [];

  for (const engine of engines) {
    const perSample: EngineBenchmarkResult['perSample'] = [];
    let totalLatency = 0;
    let totalConfidence = 0;
    let passed = 0;
    let wins = 0;
    let losses = 0;
    let ties = 0;

    for (const sample of samples) {
      const audioBuffer = fs.existsSync(sample.audioPath)
        ? fs.readFileSync(sample.audioPath)
        : Buffer.alloc(0);

      if (audioBuffer.length === 0) continue;

      const start = Date.now();
      let result: TranscriptionResult;
      try {
        const adapter = sttAdapters[engine];
        result = await adapter.transcribe(audioBuffer, path.basename(sample.audioPath), sample.language);
      } catch (err) {
        console.warn(`[benchmark] ${engine} failed on ${sample.id}: ${err}`);
        continue;
      }

      const { wer, wacc } = computeWER(sample.groundTruth, result.text);
      const samplePassed = wer < WER_THRESHOLD;

      perSample.push({
        sampleId: sample.id,
        transcript: result.text,
        groundTruth: sample.groundTruth,
        wer,
        wacc,
        confidence: result.confidence ?? 0.85,
        latencyMs: result.processingTimeMs,
        passed: samplePassed,
      });

      totalLatency += result.processingTimeMs;
      totalConfidence += result.confidence ?? 0.85;
      if (samplePassed) passed++;

      // Compare against HOJAI (if available and already benchmarked)
      const hojaiSample = hojaiPerSample.find(h => h.sampleId === sample.id);
      if (hojaiSample) {
        if (wer < hojaiSample.wer) wins++;
        else if (wer > hojaiSample.wer) losses++;
        else ties++;
      }
    }

    const accuracy = perSample.length > 0
      ? perSample.reduce((s, p) => s + p.wacc, 0) / perSample.length
      : 0;
    const wordErrorRate = 1 - accuracy;

    const result: EngineBenchmarkResult = {
      engine,
      accuracy: Math.round(accuracy * 10000) / 10000,
      wordErrorRate: Math.round(wordErrorRate * 10000) / 10000,
      samplesTested: perSample.length,
      samplesPassed: passed,
      avgLatencyMs: perSample.length > 0 ? Math.round(totalLatency / perSample.length) : 0,
      avgConfidence: perSample.length > 0 ? Math.round((totalConfidence / perSample.length) * 100) / 100 : 0,
      testedAt: Date.now(),
      perSample,
      wins,
      losses,
      ties,
    };

    results.set(engine, result);
    if (engine === 'hojai') hojaiPerSample = perSample;

    console.log(`[benchmark] ${engine}: WER=${wordErrorRate.toFixed(4)}, WAcc=${accuracy.toFixed(4)}, ` +
      `${passed}/${perSample.length} passed, avgLatency=${result.avgLatencyMs}ms`);
  }

  return results;
}

/**
 * Determine if HOJAI should be promoted based on benchmark results.
 * Criteria:
 *   1. HOJAI WER < best external engine WER
 *   2. HOJAI WER is at least 5% better than current default
 *   3. HOJAI has been tested on at least 10 samples
 */
export function evaluatePromotion(
  results: Map<STTEngine, EngineBenchmarkResult>,
  currentDefault: STTEngine
): { shouldPromote: boolean; reason: string; hojaiVsDefault: string } {
  const hojai = results.get('hojai');
  if (!hojai || hojai.samplesTested < 10) {
    return { shouldPromote: false, reason: 'Insufficient samples (< 10)', hojaiVsDefault: '' };
  }

  // Find best external engine
  let bestExternalWER = Infinity;
  let bestExternalEngine = '';
  for (const [engine, result] of results.entries()) {
    if (engine !== 'hojai' && result.samplesTested > 0 && result.wordErrorRate < bestExternalWER) {
      bestExternalWER = result.wordErrorRate;
      bestExternalEngine = engine;
    }
  }

  if (bestExternalWER === Infinity) {
    return { shouldPromote: false, reason: 'No external engines tested', hojaiVsDefault: '' };
  }

  const improvement = bestExternalWER - hojai.wordErrorRate;
  const improvementPct = (improvement / bestExternalWER) * 100;

  const defaultResult = results.get(currentDefault);
  const vsDefaultWER = defaultResult ? defaultResult.wordErrorRate : bestExternalWER;
  const hojaiVsDefault = defaultResult
    ? `${((vsDefaultWER - hojai.wordErrorRate) / vsDefaultWER * 100).toFixed(1)}% better`
    : `${improvementPct.toFixed(1)}% better than ${bestExternalEngine}`;

  const shouldPromote = improvementPct >= 5 && hojai.wordErrorRate < bestExternalWER;

  return {
    shouldPromote,
    reason: shouldPromote
      ? `HOJAI WER (${hojai.wordErrorRate.toFixed(4)}) beats ${bestExternalEngine} (${bestExternalWER.toFixed(4)}) by ${improvementPct.toFixed(1)}%`
      : `HOJAI WER (${hojai.wordErrorRate.toFixed(4)}) not better than ${bestExternalEngine} (${bestExternalWER.toFixed(4)})`,
    hojaiVsDefault,
  };
}

/**
 * Save benchmark results to disk for tracking over time.
 */
export function saveBenchmarkHistory(
  results: Map<STTEngine, EngineBenchmarkResult>,
  datasetPath: string
): string {
  const historyPath = path.join(datasetPath, 'benchmark_history.json');
  const existing: Record<string, unknown[]> = {};

  if (fs.existsSync(historyPath)) {
    try {
      Object.assign(existing, JSON.parse(fs.readFileSync(historyPath, 'utf-8')));
    } catch { /* ignore */ }
  }

  const timestamp = new Date().toISOString();
  for (const [engine, result] of results.entries()) {
    if (!existing[engine]) existing[engine] = [];
    existing[engine].push({
      timestamp,
      accuracy: result.accuracy,
      wordErrorRate: result.wordErrorRate,
      samplesTested: result.samplesTested,
      samplesPassed: result.samplesPassed,
      avgLatencyMs: result.avgLatencyMs,
    });
  }

  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.writeFileSync(historyPath, JSON.stringify(existing, null, 2));
  return historyPath;
}

export default { runBenchmark, loadCorpus, computeWER, evaluatePromotion, saveBenchmarkHistory };
