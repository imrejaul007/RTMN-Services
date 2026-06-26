/**
 * @hojai/genie-client — Official TypeScript/JavaScript SDK for HOJAI Genie AI
 * Supports Node.js (CommonJS + ESM) and browser environments.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// ============================================================================
// Error Types
// ============================================================================

export class GenieError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'UNKNOWN',
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'GenieError';
  }

  static fromAxios(e: unknown, defaultMsg = 'Request failed'): GenieError {
    if (axios.isAxiosError(e)) {
      const status = e.response?.status;
      const data = e.response?.data;
      const msg = data?.error?.message || data?.message || e.message || defaultMsg;
      if (status === 401 || status === 403) return new GenieError(msg, 'AUTH', status, data);
      if (status === 429) return new GenieError(msg, 'RATE_LIMIT', status, data);
      if (status && status >= 500) return new GenieError(msg, 'SERVER_ERROR', status, data);
      return new GenieError(msg, 'API_ERROR', status, data);
    }
    if (e instanceof Error) return new GenieError(e.message, 'UNKNOWN', undefined, e);
    return new GenieError(String(e), 'UNKNOWN');
  }
}

// ============================================================================
// Data Models
// ============================================================================

export interface GenieAction {
  type: string;
  payload?: Record<string, unknown>;
}

export interface GenieResponse {
  responseId: string;
  text: string;
  actions?: GenieAction[];
  context?: Record<string, unknown>;
  timestamp?: string;
  success?: boolean;
  data?: unknown;
}

export enum BriefingType {
  Morning = 'morning',
  Evening = 'evening',
  Weekly = 'weekly',
}

export interface BriefingSection {
  title: string;
  content: string;
  icon?: string;
}

export interface Briefing {
  type: BriefingType;
  title: string;
  sections: BriefingSection[];
  generatedAt: string;
}

export interface Memory {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  tags?: string[];
  relevance?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  description?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  onboardingComplete: boolean;
  preferences?: Record<string, unknown>;
  goals?: string[];
  createdAt: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface VoiceConfig {
  sampleRate?: number;
  codec?: string;
  language?: string;
  wakeWordEnabled?: boolean;
}

// ============================================================================
// Voice Session
// ============================================================================

export type VoiceTranscriptCallback = (text: string) => void;
export type VoiceResponseCallback = (response: GenieResponse) => void;
export type VoiceErrorCallback = (error: GenieError) => void;

export class VoiceSession {
  private _active = false;

  constructor(
    private readonly client: GenieClient,
    public readonly config: VoiceConfig,
    public readonly onTranscript: VoiceTranscriptCallback,
    public readonly onResponse: VoiceResponseCallback,
    public readonly onError: VoiceErrorCallback
  ) {}

  get active(): boolean {
    return this._active;
  }

  async start(): Promise<void> {
    this._active = true;
    try {
      await this.client._post('/api/genie/voice/session/start', {
        sampleRate: this.config.sampleRate ?? 16000,
        codec: this.config.codec ?? 'pcm_s16le',
        language: this.config.language ?? 'en-US',
        wakeWordEnabled: this.config.wakeWordEnabled ?? true,
      });
    } catch (e) {
      this._active = false;
      throw GenieError.fromAxios(e, 'Failed to start voice session');
    }
  }

  async stop(): Promise<void> {
    if (!this._active) return;
    this._active = false;
    try {
      await this.client._post('/api/genie/voice/session/end', {});
    } catch {
      // best-effort
    }
  }

  /** Stream audio chunk to Genie. Call this from your audio capture loop. */
  async sendAudioChunk(_audioData: ArrayBuffer): Promise<void> {
    if (!this._active) return;
    // In production, stream via WebSocket or chunked upload
  }
}

// ============================================================================
// Genie Client
// ============================================================================

export interface GenieClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export class GenieClient {
  private readonly _http: AxiosInstance;
  private _authToken?: string;
  public readonly config: Required<GenieClientConfig>;

  constructor(config: GenieClientConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? 'https://api.hojai.ai',
      timeout: config.timeout ?? 30000,
    };

    this._http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this._http.interceptors.request.use((req) => {
      const token = this._authToken ?? this.config.apiKey;
      req.headers.Authorization = `Bearer ${token}`;
      return req;
    });

    this._http.interceptors.response.use(
      (res) => res,
      (err) => {
        throw GenieError.fromAxios(err, 'API request failed');
      }
    );
  }

  /** Update the auth token (e.g., after user login). */
  setAuthToken(token: string): void {
    this._authToken = token;
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  async sendMessage(
    text: string,
    context?: Record<string, unknown>
  ): Promise<GenieResponse> {
    const payload: Record<string, unknown> = { question: text };
    if (context) payload.context = context;

    const res = await this._post<GenieResponse>('/api/genie/chat', payload);
    return res.data;
  }

  // ── Briefing ──────────────────────────────────────────────────────────────

  async getBriefing(type: BriefingType): Promise<Briefing> {
    const res = await this._get<Briefing>(`/api/genie/briefing?type=${type}`);
    return res.data;
  }

  // ── Memory ───────────────────────────────────────────────────────────────

  async searchMemories(query: string, limit = 10): Promise<Memory[]> {
    const res = await this._get<{ memories: Memory[] }>(
      `/api/genie/memory/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return res.data.memories ?? [];
  }

  // ── Calendar ─────────────────────────────────────────────────────────────

  async getCalendarEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const res = await this._get<{ events: CalendarEvent[] }>(`/api/genie/calendar/events?${params}`);
    return res.data.events ?? [];
  }

  // ── User ─────────────────────────────────────────────────────────────────

  async getUser(): Promise<UserProfile> {
    const res = await this._get<GenieResponse>('/api/genie/user');
    return res.data as unknown as UserProfile;
  }

  async updatePreferences(prefs: Record<string, unknown>): Promise<void> {
    await this._put('/api/genie/user/preferences', prefs);
  }

  // ── Voice Session ────────────────────────────────────────────────────────

  /**
   * Create and start a voice session.
   * Remember to call `session.stop()` when done.
   */
  async startVoiceSession(
    config: VoiceConfig,
    callbacks: {
      onTranscript: VoiceTranscriptCallback;
      onResponse: VoiceResponseCallback;
      onError: VoiceErrorCallback;
    }
  ): Promise<VoiceSession> {
    const session = new VoiceSession(this, config, callbacks.onTranscript, callbacks.onResponse, callbacks.onError);
    await session.start();
    return session;
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  async _get<T>(url: string, config?: AxiosRequestConfig): Promise<{ data: T }> {
    return this._http.get(url, config);
  }

  async _post<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<{ data: T }> {
    return this._http.post(url, data, config);
  }

  async _put<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<{ data: T }> {
    return this._http.put(url, data, config);
  }
}

// ============================================================================
// Exports
// ============================================================================

export default GenieClient;
export { GenieClient as Client };
export { VoiceSession };
export { GenieError as Error };
