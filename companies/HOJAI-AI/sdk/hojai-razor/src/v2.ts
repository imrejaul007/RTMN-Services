/**
 * @hojai/razor SDK v2 — RAZO Keyboard Communication OS v2.1
 *
 * Complete SDK with 84+ endpoints covering:
 * - v2: Magic Wand, Emotion Detection, Voice, i18n, Family, Pay, Life
 * - Phase 2: Founder Mode, Negotiation Mode, Photo Intelligence
 * - Phase 4: MemoryOS/TwinOS Integration
 */

import { request } from './utils.js';

// ── Config ──────────────────────────────────────────────────────────────

export interface RazorConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  logger?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
}

function getBaseUrl(config: RazorConfig): string {
  const base = config.baseUrl || 'http://localhost:4299';
  if (!base.startsWith('http')) return `http://${base}`;
  return base;
}

function apiRequest<T>(config: RazorConfig, method: string, path: string, body?: unknown): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request({ baseUrl: getBaseUrl(config), apiKey: config.apiKey, timeout: config.timeout, maxRetries: config.maxRetries, fetchImpl: config.fetchImpl, logger: config.logger } as any, method, path, body);
}

// ── Magic Wand ──────────────────────────────────────────────────────────

export interface MagicHelpRequest { text: string; userId?: string; sessionId?: string; context?: Record<string, unknown>; }
export interface MagicHelpResponse { success: boolean; intent: string; entities: Record<string, unknown>; text: string; options: unknown[]; recommended: unknown; action: string; primaryAction: string; language?: string; }

export class MagicWandClient {
  constructor(private config: RazorConfig) {}
  async help(req: MagicHelpRequest): Promise<MagicHelpResponse> {
    return apiRequest<MagicHelpResponse>(this.config, 'POST', '/api/magic/help', req);
  }
  async execute(req: { actionId: string; userId?: string; context?: Record<string, unknown> }): Promise<{ success: boolean; result: unknown }> {
    return apiRequest(this.config, 'POST', '/api/magic/execute', req);
  }
}

// ── Emotion Detection ───────────────────────────────────────────────────

export interface EmotionAnalyzeRequest { message: string; context?: Record<string, unknown>; }
export interface EmotionResponse { success: boolean; emotion: string; intensity: number; buttons: unknown[]; suggestions?: string[]; }

export class EmotionClient {
  constructor(private config: RazorConfig) {}
  async analyze(req: EmotionAnalyzeRequest): Promise<EmotionResponse> {
    return apiRequest<EmotionResponse>(this.config, 'POST', '/api/emotion/analyze', req);
  }
}

// ── Voice Gateway ──────────────────────────────────────────────────────

export interface VoiceSTTRequest { audio: string; userId?: string; language?: string; }
export interface VoiceTTSRequest { text: string; userId?: string; voice?: string; speed?: number; }

export class VoiceClient {
  constructor(private config: RazorConfig) {}
  async stt(req: VoiceSTTRequest): Promise<{ success: boolean; text: string; language?: string }> {
    return apiRequest(this.config, 'POST', '/api/voice/stt', req);
  }
  async tts(req: VoiceTTSRequest): Promise<{ success: boolean; audio: string }> {
    return apiRequest(this.config, 'POST', '/api/voice/tts', req);
  }
  async startSession(userId?: string): Promise<{ sessionId: string }> {
    return apiRequest(this.config, 'POST', '/api/voice/session/start', { userId });
  }
  async processSession(sessionId: string, audio: string): Promise<{ text: string; intent?: string }> {
    return apiRequest(this.config, 'POST', `/api/voice/session/${sessionId}/process`, { audio });
  }
  async endSession(sessionId: string): Promise<{ success: boolean }> {
    return apiRequest(this.config, 'POST', `/api/voice/session/${sessionId}/end`, {});
  }
}

// ── i18n ────────────────────────────────────────────────────────────────

export interface I18nTranslateRequest { text: string; targetLanguage: string; sourceLanguage?: string; }
export interface I18nGreetingRequest { userId?: string; language?: string; context?: Record<string, unknown>; }

export class I18nClient {
  constructor(private config: RazorConfig) {}
  async detect(text: string): Promise<{ language: string; confidence: number }> {
    return apiRequest(this.config, 'POST', '/api/i18n/detect', { text });
  }
  async translate(req: I18nTranslateRequest): Promise<{ success: boolean; translated: string }> {
    return apiRequest(this.config, 'POST', '/api/i18n/translate', req);
  }
  async greeting(req: I18nGreetingRequest): Promise<{ greeting: string; language: string; timeOfDay: string }> {
    return apiRequest(this.config, 'POST', '/api/i18n/greeting', req);
  }
  async festival(festival: string): Promise<{ greeting: string; language: string }> {
    return apiRequest(this.config, 'GET', `/api/i18n/festival/${encodeURIComponent(festival)}`, {});
  }
}

// ── Family Quick Reply ─────────────────────────────────────────────────

export interface FamilyReplyRequest { message: string; sender?: string; relationship?: string; userId: string; }
export interface FamilyReplyResponse { success: boolean; relationship?: string; replies: string[]; actions: unknown[]; tone?: string; }

export class FamilyClient {
  constructor(private config: RazorConfig) {}
  async detect(req: { sender?: string; userId: string }): Promise<{ relationship?: string; confidence: number }> {
    return apiRequest(this.config, 'POST', '/api/family/detect', req);
  }
  async reply(req: FamilyReplyRequest): Promise<FamilyReplyResponse> {
    return apiRequest<FamilyReplyResponse>(this.config, 'POST', '/api/family/reply', req);
  }
}

// ── Pay Anyone ─────────────────────────────────────────────────────────

export interface PayVoiceRequest { audio?: string; text?: string; userId: string; }
export interface PayContactRequest { recipientId: string; amount: number; userId: string; note?: string; }
export interface PayQRRequest { qrData: string; userId: string; }

export class PayClient {
  constructor(private config: RazorConfig) {}
  async voice(req: PayVoiceRequest): Promise<{ success: boolean; recipient?: string; amount?: number; status: string; message?: string }> {
    return apiRequest(this.config, 'POST', '/api/pay/voice', req);
  }
  async qr(req: PayQRRequest): Promise<{ success: boolean; recipient?: string; amount?: number; status: string }> {
    return apiRequest(this.config, 'POST', '/api/pay/qr', req);
  }
  async contact(req: PayContactRequest): Promise<{ success: boolean; transactionId?: string; status: string }> {
    return apiRequest(this.config, 'POST', '/api/pay/contact', req);
  }
  async recent(userId: string): Promise<{ recipients: unknown[] }> {
    return apiRequest(this.config, 'GET', `/api/pay/recent/${userId}`, {});
  }
}

// ── Auto Life Assistant ─────────────────────────────────────────────────

export interface LifeCheckRequest { userId: string; categories?: string[]; }

export class LifeClient {
  constructor(private config: RazorConfig) {}
  async check(req: LifeCheckRequest): Promise<{ success: boolean; suggestions: unknown[]; todayCount: number; maxPerDay: number }> {
    return apiRequest(this.config, 'GET', `/api/life/check/${req.userId}`, { categories: req.categories });
  }
  async snooze(suggestionId: string, hours = 24): Promise<{ success: boolean }> {
    return apiRequest(this.config, 'POST', '/api/life/snooze', { suggestionId, hours });
  }
  async disableCategory(userId: string, category: string): Promise<{ success: boolean }> {
    return apiRequest(this.config, 'POST', '/api/life/disable-category', { userId, category });
  }
  async track(suggestionId: string, action: string): Promise<{ success: boolean }> {
    return apiRequest(this.config, 'POST', '/api/life/track', { suggestionId, action });
  }
}

// ── Phase 2: Founder Mode ──────────────────────────────────────────────

export interface FounderGenerateRequest { text?: string; audience: string; tone: string; userId?: string; }
export interface FounderGenerateResponse { success: boolean; content: string; options: string[]; metadata: unknown; }

export class FounderClient {
  constructor(private config: RazorConfig) {}
  async generate(req: FounderGenerateRequest): Promise<FounderGenerateResponse> {
    return apiRequest<FounderGenerateResponse>(this.config, 'POST', '/api/modes/founder/generate', req);
  }
  async templates(audience: string): Promise<{ templates: unknown[] }> {
    return apiRequest(this.config, 'GET', `/api/modes/founder/templates/${audience}`, {});
  }
}

// ── Phase 2: Negotiation Mode ─────────────────────────────────────────

export interface NegotiationStartRequest { userId?: string; sellerPrice: number; item: string; category?: string; }
export interface NegotiationStartResponse { success: boolean; negotiationId: string; currentOffer: number; sellerPrice: number; fairPrice?: number; targetSavings: number; recommendedTactics: string[]; tips: string[]; round: number; maxRounds: number; }

export class NegotiationClient {
  constructor(private config: RazorConfig) {}
  async start(req: NegotiationStartRequest): Promise<NegotiationStartResponse> {
    return apiRequest<NegotiationStartResponse>(this.config, 'POST', '/api/modes/negotiation/start', req);
  }
  async counter(req: { negotiationId: string; yourOffer: number; message?: string; tactic?: string }): Promise<{ success: boolean; status: string; finalPrice?: number; sellerCounterOffer?: number; discountPercent?: number; message?: string }> {
    return apiRequest(this.config, 'POST', '/api/modes/negotiation/counter', req);
  }
  async accept(negotiationId: string): Promise<{ success: boolean; finalPrice: number; discountPercent: number }> {
    return apiRequest(this.config, 'POST', '/api/modes/negotiation/accept', { negotiationId });
  }
  async walkAway(negotiationId: string): Promise<{ success: boolean; alternatives?: string[] }> {
    return apiRequest(this.config, 'POST', '/api/modes/negotiation/walk-away', { negotiationId });
  }
}

// ── Phase 2: Photo Intelligence ───────────────────────────────────────

export interface PhotoAnalyzeRequest { imageData: string; photoType: string; action?: string; userId?: string; }
export interface PhotoAnalyzeResponse { success: boolean; type: string; data: Record<string, unknown>; summary: string; actions: unknown[]; confidence?: number; }

export class PhotoClient {
  constructor(private config: RazorConfig) {}
  async analyze(req: PhotoAnalyzeRequest): Promise<PhotoAnalyzeResponse> {
    return apiRequest<PhotoAnalyzeResponse>(this.config, 'POST', '/api/modes/photo/analyze', req);
  }
  async actions(extractedData: Record<string, unknown>): Promise<{ success: boolean; suggestedActions: unknown[] }> {
    return apiRequest(this.config, 'POST', '/api/modes/photo/action', { extractedData });
  }
}

// ── Phase 4: MemoryOS ─────────────────────────────────────────────────

export interface MemoryContextResponse { success: boolean; context: Record<string, unknown>; }

export class MemoryClient {
  constructor(private config: RazorConfig) {}
  async getContext(userId: string): Promise<MemoryContextResponse> {
    return apiRequest<MemoryContextResponse>(this.config, 'GET', `/api/memory/context/${userId}`, {});
  }
  async saveContext(userId: string, ctx: Record<string, unknown>): Promise<{ success: boolean }> {
    return apiRequest(this.config, 'POST', `/api/memory/context/${userId}`, { context: ctx });
  }
  async history(userId: string, limit = 50): Promise<{ history: unknown[] }> {
    return apiRequest(this.config, 'GET', `/api/memory/history/${userId}?limit=${limit}`, {});
  }
  async preferences(userId: string): Promise<{ preferences: Record<string, unknown> }> {
    return apiRequest(this.config, 'GET', `/api/memory/preferences/${userId}`, {});
  }
  async updatePreferences(userId: string, prefs: Record<string, unknown>): Promise<{ success: boolean }> {
    return apiRequest(this.config, 'PUT', `/api/memory/preferences/${userId}`, prefs);
  }
  async learn(userId: string, beh: Record<string, unknown>): Promise<{ success: boolean }> {
    return apiRequest(this.config, 'POST', `/api/memory/learn/${userId}`, beh);
  }
  async recommendations(userId: string): Promise<{ success: boolean; recommendations: unknown[] }> {
    return apiRequest(this.config, 'GET', `/api/memory/recommendations/${userId}`, {});
  }
  async search(userId: string, query: string): Promise<{ results: unknown[] }> {
    return apiRequest(this.config, 'GET', `/api/memory/search/${userId}?q=${encodeURIComponent(query)}`, {});
  }
  async getCustomerTwin(userId: string): Promise<{ twin: Record<string, unknown> | null }> {
    return apiRequest(this.config, 'GET', `/api/memory/twin/customer/${userId}`, {});
  }
  async getMerchantTwin(merchantId: string): Promise<{ twin: Record<string, unknown> | null }> {
    return apiRequest(this.config, 'GET', `/api/memory/twin/merchant/${merchantId}`, {});
  }
}

// ── Modes Client ──────────────────────────────────────────────────────

export class ModesClient {
  constructor(private config: RazorConfig) {}
  async momMode(): Promise<{ success: boolean; buttons: unknown[]; tagline: string }> {
    return apiRequest(this.config, 'GET', '/api/modes/mom-mode', {});
  }
  async actions(): Promise<{ actions: unknown }> {
    return apiRequest(this.config, 'GET', '/api/modes/actions', {});
  }
}

// ── Main Razor Class ───────────────────────────────────────────────────

export class Razor {
  magic = new MagicWandClient({} as RazorConfig);
  emotion = new EmotionClient({} as RazorConfig);
  voice = new VoiceClient({} as RazorConfig);
  i18n = new I18nClient({} as RazorConfig);
  family = new FamilyClient({} as RazorConfig);
  pay = new PayClient({} as RazorConfig);
  life = new LifeClient({} as RazorConfig);
  founder = new FounderClient({} as RazorConfig);
  negotiation = new NegotiationClient({} as RazorConfig);
  photo = new PhotoClient({} as RazorConfig);
  memory = new MemoryClient({} as RazorConfig);
  modes = new ModesClient({} as RazorConfig);

  constructor(config: RazorConfig = {}) {
    const cfg = { ...config, baseUrl: getBaseUrl(config) };
    this.magic = new MagicWandClient(cfg);
    this.emotion = new EmotionClient(cfg);
    this.voice = new VoiceClient(cfg);
    this.i18n = new I18nClient(cfg);
    this.family = new FamilyClient(cfg);
    this.pay = new PayClient(cfg);
    this.life = new LifeClient(cfg);
    this.founder = new FounderClient(cfg);
    this.negotiation = new NegotiationClient(cfg);
    this.photo = new PhotoClient(cfg);
    this.memory = new MemoryClient(cfg);
    this.modes = new ModesClient(cfg);
  }
}
