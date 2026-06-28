import { requireAuth } from '@rtmn/shared/auth';
/**
 * Communication Twin Service
 * Port: 4743
 *
 * Captures and learns communication patterns including:
 * - Writing style (vocabulary, structure, patterns)
 * - Tone (formal/friendly, emotional range)
 * - Response patterns (timing, channel preferences)
 * - Negotiation style
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4743', 10);
const VERSION = '1.0.0';

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// ============================================================
// IN-MEMORY STORAGE
// ============================================================

interface WritingProfile {
  employeeId: string;
  vocabulary: {
    common: string[];
    technical: string[];
    formal: string[];
    casual: string[];
  };
  sentenceStructure: {
    avgLength: number;
    complexity: 'simple' | 'moderate' | 'complex';
    paragraphStyle: 'short' | 'medium' | 'long';
    usesBulletPoints: boolean;
    usesNumberedLists: boolean;
  };
  patterns: {
    greetingPatterns: string[];
    closingPatterns: string[];
    signaturePhrases: string[];
    commonPhrases: string[];
  };
  emojiUsage: number;
  formality: number;
  humorUsage: number;
  grammarAccuracy: number;
  confidence: number;
  learnedFrom: number;
  lastUpdated: string;
  status: 'learning' | 'stable' | 'outdated';
}

interface ToneProfile {
  employeeId: string;
  baseline: {
    formal: number;
    friendly: number;
    urgent: number;
    positive: number;
    persuasive: number;
    confident: number;
    empathetic: number;
  };
  perChannel: {
    email: Record<string, number>;
    slack: Record<string, number>;
    chat: Record<string, number>;
    meeting: Record<string, number>;
    document: Record<string, number>;
  };
  negotiationStyle: 'aggressive' | 'collaborative' | 'compromising' | 'accommodating' | 'principled';
  responseTime: {
    email: number;
    slack: number;
    chat: number;
  };
  emotionalRange: number;
  empathyLevel: number;
  assertivenessLevel: number;
  confidence: number;
  lastUpdated: string;
  status: 'learning' | 'stable' | 'outdated';
}

interface CommunicationSample {
  id: string;
  employeeId: string;
  channel: 'email' | 'slack' | 'chat' | 'meeting' | 'document';
  content: string;
  subject?: string;
  recipientType: 'internal' | 'external' | 'customer' | 'vendor' | 'executive' | 'peer';
  sentiment: 'positive' | 'negative' | 'neutral';
  analyzed: boolean;
  createdAt: string;
}

interface CommunicationPattern {
  id: string;
  employeeId: string;
  channel: string;
  type: 'greeting' | 'closing' | 'signature' | 'phrase' | 'timing';
  pattern: string;
  frequency: number;
  lastUsed: string;
}

// Storage
const writingProfiles = new Map<string, WritingProfile>();
const toneProfiles = new Map<string, ToneProfile>();
const samples = new Map<string, CommunicationSample>();
const patterns = new Map<string, CommunicationPattern>();

// ============================================================
// HELPERS
// ============================================================

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

function analyzeText(text: string): {
  words: string[];
  avgSentenceLength: number;
  complexity: 'simple' | 'moderate' | 'complex';
  formalWords: string[];
  casualWords: string[];
  emojiCount: number;
} {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;

  const formalIndicators = ['therefore', 'however', 'moreover', 'furthermore', 'consequently', 'subsequently', 'accordingly', 'thus', 'hence'];
  const casualIndicators = ['btw', 'lol', 'omg', 'gonna', 'wanna', 'yeah', 'okay', 'cool', 'hey', 'sup'];

  const formalWords = words.filter(w => formalIndicators.some(fi => w.includes(fi)));
  const casualWords = words.filter(w => casualIndicators.some(ci => w.includes(ci)));

  const emojiRegex = /[\u{1F600}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojiCount = (text.match(emojiRegex) || []).length;

  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (avgSentenceLength > 25 || formalWords.length > 3) complexity = 'complex';
  else if (avgSentenceLength > 15 || formalWords.length > 1) complexity = 'moderate';

  return { words, avgSentenceLength, complexity, formalWords, casualWords, emojiCount };
}

function calculateFormality(text: string): number {
  const formalIndicators = ['dear', 'sincerely', 'regards', 'kindly', 'please', 'would', 'could', 'may i'];
  const casualIndicators = ['hey', 'hi', 'thanks', 'cheers', 'got it', 'sure', 'cool'];

  const lower = text.toLowerCase();
  const formalCount = formalIndicators.filter(w => lower.includes(w)).length;
  const casualCount = casualIndicators.filter(w => lower.includes(w)).length;

  const total = formalCount + casualCount;
  if (total === 0) return 0.5;
  return formalCount / total;
}

// ============================================================
// ERROR HANDLER
// ============================================================

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(`[Error] ${(_req as any).requestId}:`, err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
  });
};

// ============================================================
// ROUTES
// ============================================================

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'communication-twin',
    version: VERSION,
    timestamp: new Date().toISOString(),
    stats: {
      writingProfiles: writingProfiles.size,
      toneProfiles: toneProfiles.size,
      samples: samples.size,
      patterns: patterns.size
    }
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, service: 'communication-twin', timestamp: new Date().toISOString() });
});

// ============================================================
// WRITING STYLE
// ============================================================

/**
 * Analyze and learn writing style from a text sample
 */
app.post('/api/twin/:employeeId/communication/style',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { text, channel = 'email' } = req.body;

    if (!text || typeof text !== 'string') {
      const err: ApiError = new Error('Text is required');
      err.statusCode = 400;
      throw err;
    }

    // Analyze the text
    const analysis = analyzeText(text);
    const formality = calculateFormality(text);

    // Get or create profile
    let profile = writingProfiles.get(employeeId);
    if (!profile) {
      profile = {
        employeeId,
        vocabulary: { common: [], technical: [], formal: [], casual: [] },
        sentenceStructure: { avgLength: 0, complexity: 'simple', paragraphStyle: 'medium', usesBulletPoints: false, usesNumberedLists: false },
        patterns: { greetingPatterns: [], closingPatterns: [], signaturePhrases: [], commonPhrases: [] },
        emojiUsage: 0,
        formality: 0.5,
        humorUsage: 0,
        grammarAccuracy: 100,
        confidence: 0,
        learnedFrom: 0,
        lastUpdated: new Date().toISOString(),
        status: 'learning'
      };
      writingProfiles.set(employeeId, profile);
    }

    // Update vocabulary
    const wordFreq: Record<string, number> = {};
    analysis.words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });

    // Add top words to common
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([w]) => w);

    profile.vocabulary.common = [...new Set([...profile.vocabulary.common, ...topWords])].slice(0, 500);

    // Categorize words
    if (analysis.formalWords.length > 0) {
      profile.vocabulary.formal = [...new Set([...profile.vocabulary.formal, ...analysis.formalWords])].slice(0, 100);
    }
    if (analysis.casualWords.length > 0) {
      profile.vocabulary.casual = [...new Set([...profile.vocabulary.casual, ...analysis.casualWords])].slice(0, 100);
    }

    // Update sentence structure
    profile.sentenceStructure.avgLength = (profile.sentenceStructure.avgLength * profile.learnedFrom + analysis.avgSentenceLength) / (profile.learnedFrom + 1);
    profile.sentenceStructure.complexity = analysis.complexity;
    profile.sentenceStructure.usesBulletPoints = text.includes('•') || text.includes('- ') || text.includes('* ');
    profile.sentenceStructure.usesNumberedLists = /\d+\./.test(text);

    // Update patterns
    const greetings = ['hi', 'hello', 'dear', 'hey', 'greetings'];
    const closings = ['thanks', 'regards', 'best', 'sincerely', 'cheers', 'kind regards'];

    greetings.forEach(g => {
      if (text.toLowerCase().includes(g)) {
        if (!profile!.patterns.greetingPatterns.includes(g)) {
          profile!.patterns.greetingPatterns.push(g);
        }
      }
    });

    closings.forEach(c => {
      if (text.toLowerCase().includes(c)) {
        if (!profile!.patterns.closingPatterns.includes(c)) {
          profile!.patterns.closingPatterns.push(c);
        }
      }
    });

    // Update metrics
    profile.emojiUsage = (profile.emojiUsage * profile.learnedFrom + analysis.emojiCount) / (profile.learnedFrom + 1);
    profile.formality = (profile.formality * profile.learnedFrom + formality) / (profile.learnedFrom + 1);
    profile.learnedFrom += 1;
    profile.confidence = Math.min(100, profile.learnedFrom * 5);
    profile.lastUpdated = new Date().toISOString();

    // Store sample
    const sample: CommunicationSample = {
      id: generateId('sample'),
      employeeId,
      channel,
      content: text,
      recipientType: 'peer',
      sentiment: 'neutral',
      analyzed: true,
      createdAt: new Date().toISOString()
    };
    samples.set(sample.id, sample);

    res.json({
      success: true,
      data: {
        profile,
        analysis: {
          wordCount: analysis.words.length,
          avgSentenceLength: analysis.avgSentenceLength.toFixed(1),
          formality: Math.round(formality * 100),
          emojiUsage: analysis.emojiCount
        }
      }
    });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({
      success: false,
      error: { code: 'ANALYSIS_ERROR', message: error.message }
    });
  }
});

/**
 * Get writing profile for an employee
 */
app.get('/api/twin/:employeeId/communication/profile', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const profile = writingProfiles.get(employeeId);

  if (!profile) {
    return res.json({
      success: true,
      data: {
        employeeId,
        exists: false,
        message: 'No writing profile found. Send samples to build profile.'
      }
    });
  }

  res.json({ success: true, data: { ...profile, exists: true } });
});

/**
 * Update specific aspects of writing profile
 */
app.patch('/api/twin/:employeeId/communication/style',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const updates = req.body;

    let profile = writingProfiles.get(employeeId);
    if (!profile) {
      const err: ApiError = new Error('Profile not found');
      err.statusCode = 404;
      throw err;
    }

    // Apply updates
    if (updates.vocabulary) profile.vocabulary = { ...profile.vocabulary, ...updates.vocabulary };
    if (updates.sentenceStructure) profile.sentenceStructure = { ...profile.sentenceStructure, ...updates.sentenceStructure };
    if (updates.patterns) profile.patterns = { ...profile.patterns, ...updates.patterns };
    if (typeof updates.emojiUsage === 'number') profile.emojiUsage = updates.emojiUsage;
    if (typeof updates.formality === 'number') profile.formality = updates.formality;
    if (typeof updates.humorUsage === 'number') profile.humorUsage = updates.humorUsage;
    if (updates.status) profile.status = updates.status;

    profile.lastUpdated = new Date().toISOString();

    res.json({ success: true, data: profile });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

// ============================================================
// TONE ANALYSIS
// ============================================================

/**
 * Analyze tone of a text
 */
app.post('/api/twin/:employeeId/communication/tone',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { text, channel = 'email' } = req.body;

    if (!text || typeof text !== 'string') {
      const err: ApiError = new Error('Text is required');
      err.statusCode = 400;
      throw err;
    }

    // Simple rule-based tone analysis
    const lower = text.toLowerCase();

    const tone = {
      formal: calculateFormality(text),
      friendly: ['hi', 'hello', 'hey', 'thanks', 'appreciate', 'great'].filter(w => lower.includes(w)).length / 5,
      urgent: ['urgent', 'asap', 'immediately', 'priority', 'deadline'].filter(w => lower.includes(w)).length / 3,
      positive: ['great', 'excellent', 'amazing', 'thank', 'appreciate', 'wonderful', 'fantastic'].filter(w => lower.includes(w)).length / 4,
      persuasive: ['should', 'would', 'could', 'recommend', 'suggest', 'consider', 'benefit'].filter(w => lower.includes(w)).length / 4,
      confident: ['will', 'definitely', 'certainly', 'absolutely', 'sure', 'guarantee'].filter(w => lower.includes(w)).length / 4,
      empathetic: ['understand', 'feel', 'sorry', 'appreciate', 'concerned', 'support'].filter(w => lower.includes(w)).length / 4
    };

    // Normalize to 0-1
    Object.keys(tone).forEach(k => {
      tone[k as keyof typeof tone] = Math.min(1, tone[k as keyof typeof tone]);
    });

    // Get or create tone profile
    let profile = toneProfiles.get(employeeId);
    if (!profile) {
      profile = {
        employeeId,
        baseline: { formal: 0.5, friendly: 0.5, urgent: 0.2, positive: 0.6, persuasive: 0.4, confident: 0.5, empathetic: 0.5 },
        perChannel: { email: {}, slack: {}, chat: {}, meeting: {}, document: {} },
        negotiationStyle: 'collaborative',
        responseTime: { email: 60, slack: 30, chat: 15 },
        emotionalRange: 0.5,
        empathyLevel: 0.5,
        assertivenessLevel: 0.5,
        confidence: 0,
        lastUpdated: new Date().toISOString(),
        status: 'learning'
      };
      toneProfiles.set(employeeId, profile);
    }

    // Update baseline with weighted average
    const weight = 0.1;
    Object.keys(tone).forEach(k => {
      profile!.baseline[k as keyof typeof profile.baseline] =
        profile!.baseline[k as keyof typeof profile.baseline] * (1 - weight) + tone[k as keyof typeof tone] * weight;
    });

    // Update per-channel
    if (profile.perChannel[channel as keyof typeof profile.perChannel]) {
      Object.keys(tone).forEach(k => {
        profile!.perChannel[channel as keyof typeof profile.perChannel][k] =
          (profile!.perChannel[channel as keyof typeof profile.perChannel][k] || 0.5) * (1 - weight) + tone[k as keyof typeof tone] * weight;
      });
    }

    profile.confidence = Math.min(100, (profile.confidence || 0) + 5);
    profile.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      data: {
        tone,
        profile: {
          baseline: profile.baseline,
          confidence: profile.confidence
        }
      }
    });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'TONE_ERROR', message: error.message } });
  }
});

/**
 * Get tone history/progression
 */
app.get('/api/twin/:employeeId/communication/tone-history', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const profile = toneProfiles.get(employeeId);

  if (!profile) {
    return res.json({ success: true, data: { employeeId, history: [], message: 'No tone history yet' } });
  }

  res.json({
    success: true,
    data: {
      employeeId,
      currentBaseline: profile.baseline,
      perChannel: profile.perChannel,
      negotiationStyle: profile.negotiationStyle,
      confidence: profile.confidence,
      lastUpdated: profile.lastUpdated
    }
  });
});

/**
 * Set negotiation style
 */
app.post('/api/twin/:employeeId/communication/negotiation-style',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { style } = req.body;

    const validStyles = ['aggressive', 'collaborative', 'compromising', 'accommodating', 'principled'];
    if (!validStyles.includes(style)) {
      const err: ApiError = new Error(`Invalid style. Must be one of: ${validStyles.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    let profile = toneProfiles.get(employeeId);
    if (!profile) {
      profile = {
        employeeId,
        baseline: { formal: 0.5, friendly: 0.5, urgent: 0.2, positive: 0.6, persuasive: 0.4, confident: 0.5, empathetic: 0.5 },
        perChannel: { email: {}, slack: {}, chat: {}, meeting: {}, document: {} },
        negotiationStyle: style,
        responseTime: { email: 60, slack: 30, chat: 15 },
        emotionalRange: 0.5,
        empathyLevel: 0.5,
        assertivenessLevel: 0.5,
        confidence: 50,
        lastUpdated: new Date().toISOString(),
        status: 'stable'
      };
      toneProfiles.set(employeeId, profile);
    } else {
      profile.negotiationStyle = style;
      profile.lastUpdated = new Date().toISOString();
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'STYLE_ERROR', message: error.message } });
  }
});

// ============================================================
// PATTERNS
// ============================================================

/**
 * Get communication patterns
 */
app.get('/api/twin/:employeeId/communication/patterns', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { channel, type } = req.query;

  let result = Array.from(patterns.values()).filter(p => p.employeeId === employeeId);

  if (channel) result = result.filter(p => p.channel === channel);
  if (type) result = result.filter(p => p.type === type);

  res.json({ success: true, data: { patterns: result, total: result.length } });
});

/**
 * Add a communication pattern
 */
app.post('/api/twin/:employeeId/communication/patterns',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { channel, type, pattern } = req.body;

    if (!channel || !type || !pattern) {
      const err: ApiError = new Error('channel, type, and pattern are required');
      err.statusCode = 400;
      throw err;
    }

    const existing = Array.from(patterns.values()).find(
      p => p.employeeId === employeeId && p.channel === channel && p.type === type && p.pattern === pattern
    );

    if (existing) {
      existing.frequency += 1;
      existing.lastUsed = new Date().toISOString();
      return res.json({ success: true, data: existing });
    }

    const newPattern: CommunicationPattern = {
      id: generateId('pattern'),
      employeeId,
      channel,
      type,
      pattern,
      frequency: 1,
      lastUsed: new Date().toISOString()
    };

    patterns.set(newPattern.id, newPattern);
    res.status(201).json({ success: true, data: newPattern });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'PATTERN_ERROR', message: error.message } });
  }
});

/**
 * Simulate communication response
 */
app.post('/api/twin/:employeeId/communication/simulate',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { context, recipientType = 'peer', channel = 'email' } = req.body;

    const writingProfile = writingProfiles.get(employeeId);
    const toneProfile = toneProfiles.get(employeeId);

    if (!writingProfile) {
      const err: ApiError = new Error('No writing profile found. Send samples first.');
      err.statusCode = 404;
      throw err;
    }

    // Generate simulated response based on profile
    const formality = writingProfile.formality > 0.6 ? 'formal' : writingProfile.formality < 0.4 ? 'casual' : 'neutral';

    const greeting = writingProfile.patterns.greetingPatterns[0] || (formality === 'formal' ? 'Dear' : 'Hi');
    const closing = writingProfile.patterns.closingPatterns[0] || (formality === 'formal' ? 'Best regards' : 'Thanks');

    const response = {
      suggested: {
        greeting,
        closing,
        tone: toneProfile?.baseline || writingProfile.formality,
        formality: writingProfile.formality,
        channel,
        recipientType
      },
      profile: {
        confidence: writingProfile.confidence,
        learnedFrom: writingProfile.learnedFrom,
        status: writingProfile.status
      },
      suggestions: [
        `Consider ${writingProfile.sentenceStructure.usesBulletPoints ? 'using bullet points' : 'varying sentence length'}`,
        `Your ${writingProfile.emojiUsage > 0.1 ? 'frequent' : 'occasional'} emoji usage may be appropriate for this context`
      ]
    };

    res.json({ success: true, data: response });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'SIMULATE_ERROR', message: error.message } });
  }
});

// ============================================================
// STATS
// ============================================================

app.get('/api/twin/:employeeId/communication/stats', (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const writingProfile = writingProfiles.get(employeeId);
  const toneProfile = toneProfiles.get(employeeId);
  const employeeSamples = Array.from(samples.values()).filter(s => s.employeeId === employeeId);
  const employeePatterns = Array.from(patterns.values()).filter(p => p.employeeId === employeeId);

  res.json({
    success: true,
    data: {
      employeeId,
      writingProfile: writingProfile ? {
        confidence: writingProfile.confidence,
        learnedFrom: writingProfile.learnedFrom,
        formality: writingProfile.formality,
        vocabularySize: writingProfile.vocabulary.common.length,
        status: writingProfile.status
      } : null,
      toneProfile: toneProfile ? {
        confidence: toneProfile.confidence,
        negotiationStyle: toneProfile.negotiationStyle,
        status: toneProfile.status
      } : null,
      samplesAnalyzed: employeeSamples.length,
      patternsLearned: employeePatterns.length
    }
  });
});

// ============================================================
// CATCH-ALL
// ============================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

// ============================================================
// SERVER
// ============================================================

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Communication Twin Service - Started               ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Writing Style, Tone Analysis, Pattern Learning    ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

const gracefulShutdown = (signal: string) => {
  console.log(`\n[${signal}] Shutdown signal received...`);
  server.close(() => {
    console.log('[Communication Twin] Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
