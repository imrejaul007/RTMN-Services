/**
 * useRazo - React Hooks for RAZO Keyboard v2.1
 *
 * @example
 * ```tsx
 * import { useRazo, MagicWandButton, EmotionButtons, PhotoCapture } from '@hojai/razor/hooks';
 *
 * function App() {
 *   const { razor, loading, error } = useRazo();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error error={error} />;
 *
 *   return (
 *     <Chat>
 *       <MagicWandButton razor={razor} />
 *       <EmotionButtons razor={razor} />
 *     </Chat>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Razor } from '../src/v2.js';

// ── Config ──────────────────────────────────────────────────────────────

export interface UseRazoConfig {
  baseUrl?: string;
  apiKey?: string;
  userId?: string;
  autoConnect?: boolean;
}

// ── Main Hook ─────────────────────────────────────────────────────────

export interface UseRazoReturn {
  razor: Razor | null;
  loading: boolean;
  error: Error | null;
  magic: MagicWandHook;
  emotion: EmotionHook;
  voice: VoiceHook;
  i18n: I18nHook;
  family: FamilyHook;
  pay: PayHook;
  life: LifeHook;
  founder: FounderHook;
  negotiation: NegotiationHook;
  photo: PhotoHook;
  memory: MemoryHook;
  modes: ModesHook;
}

export function useRazo(config: UseRazoConfig = {}) {
  const [razor, setRazor] = useState<Razor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (config.autoConnect !== false) {
      try {
        const r = new Razor({
          baseUrl: config.baseUrl || 'http://localhost:4299',
          apiKey: config.apiKey,
        });
        setRazor(r);
        setError(null);
      } catch (e) {
        setError(e as Error);
      }
    }
    setLoading(false);
  }, [config.baseUrl, config.apiKey, config.autoConnect]);

  // ── Magic Wand Hook ───────────────────────────────────────────────

  const magic = useMagicWand(razor, config.userId);

  // ── Emotion Hook ─────────────────────────────────────────────────

  const emotion = useEmotion(razor);

  // ── Voice Hook ──────────────────────────────────────────────────

  const voice = useVoice(razor, config.userId);

  // ── i18n Hook ───────────────────────────────────────────────────

  const i18n = useI18n(razor);

  // ── Family Hook ─────────────────────────────────────────────────

  const family = useFamily(razor, config.userId);

  // ── Pay Hook ────────────────────────────────────────────────────

  const pay = usePay(razor, config.userId);

  // ── Life Hook ──────────────────────────────────────────────────

  const life = useLife(razor, config.userId);

  // ── Founder Hook ────────────────────────────────────────────────

  const founder = useFounder(razor, config.userId);

  // ── Negotiation Hook ────────────────────────────────────────────

  const negotiation = useNegotiation(razor, config.userId);

  // ── Photo Hook ─────────────────────────────────────────────────

  const photo = usePhoto(razor, config.userId);

  // ── Memory Hook ─────────────────────────────────────────────────

  const memory = useMemory(razor, config.userId);

  // ── Modes Hook ──────────────────────────────────────────────────

  const modes = useModes(razor);

  return {
    razor,
    loading,
    error,
    magic,
    emotion,
    voice,
    i18n,
    family,
    pay,
    life,
    founder,
    negotiation,
    photo,
    memory,
    modes,
  };
}

// ── Magic Wand Hook ──────────────────────────────────────────────────

export interface MagicWandHook {
  help: (text: string) => Promise<unknown>;
  execute: (actionId: string) => Promise<unknown>;
  loading: boolean;
  error: Error | null;
  result: unknown | null;
  options: unknown[];
  recommended: unknown | null;
}

export function useMagicWand(razor: Razor | null, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<unknown | null>(null);
  const [options, setOptions] = useState<unknown[]>([]);
  const [recommended, setRecommended] = useState<unknown | null>(null);

  const help = useCallback(async (text: string) => {
    if (!razor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.magic.help({ text, userId });
      setResult(res);
      setOptions(res.options || []);
      setRecommended(res.recommended || null);
      return res;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const execute = useCallback(async (actionId: string) => {
    if (!razor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.magic.execute({ actionId, userId });
      return res;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  return { help, execute, loading, error, result, options, recommended };
}

// ── Emotion Hook ──────────────────────────────────────────────────────

export interface EmotionHook {
  analyze: (message: string) => Promise<unknown>;
  emotion: string | null;
  intensity: number;
  buttons: unknown[];
  loading: boolean;
  error: Error | null;
}

export function useEmotion(razor: Razor | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(0);
  const [buttons, setButtons] = useState<unknown[]>([]);

  const analyze = useCallback(async (message: string) => {
    if (!razor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.emotion.analyze({ message });
      setEmotion(res.emotion);
      setIntensity(res.intensity);
      setButtons(res.buttons || []);
      return res;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor]);

  return { analyze, emotion, intensity, buttons, loading, error };
}

// ── Voice Hook ────────────────────────────────────────────────────────

export interface VoiceHook {
  stt: (audio: string) => Promise<string | null>;
  tts: (text: string) => Promise<string | null>;
  startSession: () => Promise<string | null>;
  processSession: (sessionId: string, audio: string) => Promise<string | null>;
  endSession: (sessionId: string) => Promise<boolean>;
  sessionId: string | null;
  loading: boolean;
  error: Error | null;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => Promise<string | null>;
}

export function useVoice(razor: Razor | null, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const stt = useCallback(async (audio: string) => {
    if (!razor) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.voice.stt({ audio, userId });
      return res.text;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const tts = useCallback(async (text: string) => {
    if (!razor) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.voice.tts({ text, userId });
      return res.audio;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const startSession = useCallback(async () => {
    if (!razor) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.voice.startSession(userId);
      setSessionId(res.sessionId);
      return res.sessionId;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const processSession = useCallback(async (sid: string, audio: string) => {
    if (!razor) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.voice.processSession(sid, audio);
      return res.text;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor]);

  const endSession = useCallback(async (sid: string) => {
    if (!razor) return false;
    setLoading(true);
    setError(null);
    try {
      await razor.voice.endSession(sid);
      setSessionId(null);
      return true;
    } catch (e) {
      setError(e as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [razor]);

  const startRecording = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
      mediaRecorder.current.start();
      setIsRecording(true);
    }).catch(e => setError(e as Error));
  }, []);

  const stopRecording = useCallback(async () => {
    return new Promise<string | null>((resolve) => {
      if (!mediaRecorder.current || !razor) {
        resolve(null);
        return;
      }
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const text = await stt(base64);
          setIsRecording(false);
          resolve(text);
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.current?.stop();
      mediaRecorder.current?.stream.getTracks().forEach(t => t.stop());
    });
  }, [razor, stt]);

  return {
    stt, tts, startSession, processSession, endSession,
    sessionId, loading, error, isRecording, startRecording, stopRecording
  };
}

// ── i18n Hook ────────────────────────────────────────────────────────

export interface I18nHook {
  detect: (text: string) => Promise<string | null>;
  translate: (text: string, targetLang: string) => Promise<string | null>;
  greeting: (language?: string) => Promise<unknown>;
  festival: (name: string) => Promise<string | null>;
  loading: boolean;
  error: Error | null;
}

export function useI18n(razor: Razor | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const detect = useCallback(async (text: string) => {
    if (!razor) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.i18n.detect(text);
      return res.language;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor]);

  const translate = useCallback(async (text: string, targetLang: string) => {
    if (!razor) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.i18n.translate({ text, targetLanguage: targetLang });
      return res.translated;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor]);

  const greeting = useCallback(async (language?: string) => {
    if (!razor) return null;
    setLoading(true);
    setError(null);
    try {
      return await razor.i18n.greeting({ language });
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor]);

  const festival = useCallback(async (name: string) => {
    if (!razor) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.i18n.festival(name);
      return res.greeting;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor]);

  return { detect, translate, greeting, festival, loading, error };
}

// ── Family Hook ──────────────────────────────────────────────────────

export interface FamilyHook {
  reply: (message: string, sender?: string) => Promise<unknown>;
  relationship: string | null;
  replies: string[];
  actions: unknown[];
  loading: boolean;
  error: Error | null;
}

export function useFamily(razor: Razor | null, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [relationship, setRelationship] = useState<string | null>(null);
  const [replies, setReplies] = useState<string[]>([]);
  const [actions, setActions] = useState<unknown[]>([]);

  const reply = useCallback(async (message: string, sender?: string) => {
    if (!razor || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.family.reply({ message, sender, userId });
      setRelationship(res.relationship || null);
      setReplies(res.replies || []);
      setActions(res.actions || []);
      return res;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  return { reply, relationship, replies, actions, loading, error };
}

// ── Pay Hook ─────────────────────────────────────────────────────────

export interface PayHook {
  voice: (text: string) => Promise<unknown>;
  qr: (qrData: string) => Promise<unknown>;
  contact: (recipientId: string, amount: number) => Promise<unknown>;
  recent: () => Promise<unknown[]>;
  loading: boolean;
  error: Error | null;
}

export function usePay(razor: Razor | null, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const voice = useCallback(async (text: string) => {
    if (!razor || !userId) return;
    setLoading(true);
    setError(null);
    try {
      return await razor.pay.voice({ text, userId });
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const qr = useCallback(async (qrData: string) => {
    if (!razor || !userId) return;
    setLoading(true);
    setError(null);
    try {
      return await razor.pay.qr({ qrData, userId });
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const contact = useCallback(async (recipientId: string, amount: number) => {
    if (!razor || !userId) return;
    setLoading(true);
    setError(null);
    try {
      return await razor.pay.contact({ recipientId, amount, userId });
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const recent = useCallback(async () => {
    if (!razor || !userId) return [];
    setLoading(true);
    setError(null);
    try {
      const res = await razor.pay.recent(userId);
      return res.recipients || [];
    } catch (e) {
      setError(e as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  return { voice, qr, contact, recent, loading, error };
}

// ── Life Hook ────────────────────────────────────────────────────────

export interface LifeHook {
  check: (categories?: string[]) => Promise<unknown[]>;
  snooze: (suggestionId: string, hours?: number) => Promise<boolean>;
  track: (suggestionId: string, action: string) => Promise<boolean>;
  suggestions: unknown[];
  loading: boolean;
  error: Error | null;
}

export function useLife(razor: Razor | null, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [suggestions, setSuggestions] = useState<unknown[]>([]);

  const check = useCallback(async (categories?: string[]) => {
    if (!razor || !userId) return [];
    setLoading(true);
    setError(null);
    try {
      const res = await razor.life.check({ userId, categories });
      setSuggestions(res.suggestions || []);
      return res.suggestions || [];
    } catch (e) {
      setError(e as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const snooze = useCallback(async (suggestionId: string, hours = 24) => {
    if (!razor) return false;
    try {
      await razor.life.snooze(suggestionId, hours);
      setSuggestions(prev => prev.filter((s: any) => s.id !== suggestionId));
      return true;
    } catch {
      return false;
    }
  }, [razor]);

  const track = useCallback(async (suggestionId: string, action: string) => {
    if (!razor) return false;
    try {
      await razor.life.track(suggestionId, action);
      setSuggestions(prev => prev.filter((s: any) => s.id !== suggestionId));
      return true;
    } catch {
      return false;
    }
  }, [razor]);

  return { check, snooze, track, suggestions, loading, error };
}

// ── Founder Hook ─────────────────────────────────────────────────────

export interface FounderHook {
  generate: (text: string, audience: string, tone: string) => Promise<unknown>;
  content: string | null;
  loading: boolean;
  error: Error | null;
}

export function useFounder(razor: Razor | null, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [content, setContent] = useState<string | null>(null);

  const generate = useCallback(async (text: string, audience: string, tone: string) => {
    if (!razor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.founder.generate({ text, audience, tone, userId });
      setContent(res.content);
      return res;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  return { generate, content, loading, error };
}

// ── Negotiation Hook ─────────────────────────────────────────────────

export interface NegotiationHook {
  start: (sellerPrice: number, item: string, category?: string) => Promise<unknown>;
  counter: (yourOffer: number) => Promise<unknown>;
  accept: () => Promise<boolean>;
  walkAway: () => Promise<boolean>;
  negotiation: unknown | null;
  status: string | null;
  loading: boolean;
  error: Error | null;
}

export function useNegotiation(razor: Razor | null, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [negotiation, setNegotiation] = useState<unknown | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const start = useCallback(async (sellerPrice: number, item: string, category?: string) => {
    if (!razor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.negotiation.start({ sellerPrice, item, category, userId });
      setNegotiation(res);
      setStatus('active');
      return res;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const counter = useCallback(async (yourOffer: number) => {
    if (!razor || !negotiation) return;
    setLoading(true);
    setError(null);
    try {
      const neg = negotiation as any;
      const res = await razor.negotiation.counter({ negotiationId: neg.negotiationId, yourOffer });
      setStatus(res.status);
      return res;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, negotiation]);

  const accept = useCallback(async () => {
    if (!razor || !negotiation) return false;
    try {
      const neg = negotiation as any;
      await razor.negotiation.accept(neg.negotiationId);
      setStatus('accepted');
      return true;
    } catch {
      return false;
    }
  }, [razor, negotiation]);

  const walkAway = useCallback(async () => {
    if (!razor || !negotiation) return false;
    try {
      const neg = negotiation as any;
      await razor.negotiation.walkAway(neg.negotiationId);
      setStatus('walked_away');
      return true;
    } catch {
      return false;
    }
  }, [razor, negotiation]);

  return { start, counter, accept, walkAway, negotiation, status, loading, error };
}

// ── Photo Hook ───────────────────────────────────────────────────────

export interface PhotoHook {
  analyze: (imageData: string, photoType: string) => Promise<unknown>;
  result: unknown | null;
  loading: boolean;
  error: Error | null;
}

export function usePhoto(razor: Razor | null, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<unknown | null>(null);

  const analyze = useCallback(async (imageData: string, photoType: string) => {
    if (!razor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.photo.analyze({ imageData, photoType, userId });
      setResult(res);
      return res;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  return { analyze, result, loading, error };
}

// ── Memory Hook ──────────────────────────────────────────────────────

export interface MemoryHook {
  getContext: () => Promise<unknown>;
  saveContext: (context: Record<string, unknown>) => Promise<boolean>;
  getPreferences: () => Promise<unknown>;
  learn: (behavior: Record<string, unknown>) => Promise<boolean>;
  search: (query: string) => Promise<unknown[]>;
  context: unknown | null;
  preferences: unknown | null;
  loading: boolean;
  error: Error | null;
}

export function useMemory(razor: Razor | null, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [context, setContext] = useState<unknown | null>(null);
  const [preferences, setPreferences] = useState<unknown | null>(null);

  const getContext = useCallback(async () => {
    if (!razor || !userId) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.memory.getContext(userId);
      setContext(res.context);
      return res.context;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const saveContext = useCallback(async (ctx: Record<string, unknown>) => {
    if (!razor || !userId) return false;
    try {
      await razor.memory.saveContext(userId, ctx);
      setContext(ctx);
      return true;
    } catch {
      return false;
    }
  }, [razor, userId]);

  const getPreferences = useCallback(async () => {
    if (!razor || !userId) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.memory.preferences(userId);
      setPreferences(res.preferences);
      return res.preferences;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  const learn = useCallback(async (behavior: Record<string, unknown>) => {
    if (!razor || !userId) return false;
    try {
      await razor.memory.learn(userId, behavior);
      return true;
    } catch {
      return false;
    }
  }, [razor, userId]);

  const search = useCallback(async (query: string) => {
    if (!razor || !userId) return [];
    setLoading(true);
    setError(null);
    try {
      const res = await razor.memory.search(userId, query);
      return res.results || [];
    } catch (e) {
      setError(e as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [razor, userId]);

  return { getContext, saveContext, getPreferences, learn, search, context, preferences, loading, error };
}

// ── Modes Hook ───────────────────────────────────────────────────────

export interface ModesHook {
  momMode: () => Promise<unknown>;
  buttons: unknown[];
  loading: boolean;
  error: Error | null;
}

export function useModes(razor: Razor | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [buttons, setButtons] = useState<unknown[]>([]);

  const momMode = useCallback(async () => {
    if (!razor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await razor.modes.momMode();
      setButtons(res.buttons || []);
      return res;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [razor]);

  return { momMode, buttons, loading, error };
}
