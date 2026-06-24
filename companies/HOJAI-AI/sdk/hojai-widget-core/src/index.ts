/**
 * HOJAI Widget Core — public API.
 *
 * Vanilla TypeScript, zero dependencies, browser-only.
 * Bundles to ~5KB minified.
 */

export type WidgetEvent =
  | 'open'
  | 'close'
  | 'message'
  | 'response'
  | 'error';

export type WidgetListener = (payload?: any) => void;

export interface WidgetTheme {
  name?: string;
  avatar?: string;
  color?: string;
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  language?: string;
  greeting?: string;
  voice?: { enabled?: boolean };
}

export interface WidgetUser {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

export interface HojaiWidgetConfig {
  apiKey: string;
  companyId: string;
  baseUrl?: string;
  containerId?: string | HTMLElement;
  config?: WidgetTheme;
  user?: WidgetUser;
  visitorId?: string;
  debug?: boolean;
}

export interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rich?: any;
  timestamp: number;
}

export interface WidgetSendOptions {
  context?: Record<string, any>;
}

export class HojaiWidget {
  private apiKey: string;
  private companyId: string;
  private baseUrl: string;
  private containerId?: string | HTMLElement;
  private config: Required<Omit<WidgetTheme, 'voice'>> & { voice: { enabled: boolean } };
  private user?: WidgetUser;
  private visitorId: string;
  private debug: boolean;

  private listeners: Map<WidgetEvent, Set<WidgetListener>> = new Map();
  private history: WidgetMessage[] = [];
  private isOpen = false;
  private rootEl?: HTMLElement;

  constructor(cfg: HojaiWidgetConfig) {
    if (!cfg.apiKey) throw new Error('HojaiWidget: apiKey is required');
    if (!cfg.companyId) throw new Error('HojaiWidget: companyId is required');

    this.apiKey = cfg.apiKey;
    this.companyId = cfg.companyId;
    this.baseUrl = cfg.baseUrl || 'https://api.hojai.ai';
    this.containerId = cfg.containerId;
    this.user = cfg.user;
    this.visitorId = cfg.visitorId || this._generateVisitorId();
    this.debug = !!cfg.debug;

    this.config = {
      name: cfg.config?.name || 'HOJAI Assistant',
      avatar: cfg.config?.avatar || '',
      color: cfg.config?.color || '#3B82F6',
      position: cfg.config?.position || 'bottom-right',
      language: cfg.config?.language || 'en',
      greeting:
        cfg.config?.greeting ||
        `Hi! I'm ${cfg.config?.name || 'HOJAI Assistant'}. How can I help you today?`,
      voice: { enabled: !!cfg.config?.voice?.enabled }
    };
  }

  render(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('HojaiWidget: render() must be called in a browser');
    }
    if (this.rootEl) return;

    injectStyles(this.config.color);

    let host: HTMLElement | null = null;
    if (this.containerId instanceof HTMLElement) {
      host = this.containerId;
    } else if (typeof this.containerId === 'string') {
      host = document.querySelector(this.containerId);
    }

    const root = document.createElement('div');
    root.className = `hojai-widget hojai-pos-${this.config.position}`;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', this.config.name);

    if (host) {
      root.classList.add('hojai-inline');
      root.innerHTML = `
        <div class="hojai-panel hojai-open">
          ${buildPanelHTML(this.config)}
        </div>
      `;
      host.appendChild(root);
    } else {
      root.innerHTML = `
        <button class="hojai-bubble" aria-label="Open chat">
          ${buildBubbleHTML(this.config)}
        </button>
        <div class="hojai-panel">
          ${buildPanelHTML(this.config)}
        </div>
      `;
      document.body.appendChild(root);
    }

    this.rootEl = root;
    this._wireEvents();
    this._log('rendered');
  }

  destroy(): void {
    if (this.rootEl) {
      this.rootEl.remove();
      this.rootEl = undefined;
    }
    this.listeners.clear();
  }

  open(): void {
    if (!this.rootEl) this.render();
    this.rootEl?.querySelector('.hojai-panel')?.classList.add('hojai-open');
    this.rootEl?.querySelector('.hojai-bubble')?.setAttribute('aria-expanded', 'true');
    this.isOpen = true;
    this._emit('open');
    const input = this.rootEl?.querySelector<HTMLInputElement>('.hojai-input');
    input?.focus();
  }

  close(): void {
    this.rootEl?.querySelector('.hojai-panel')?.classList.remove('hojai-open');
    this.rootEl?.querySelector('.hojai-bubble')?.setAttribute('aria-expanded', 'false');
    this.isOpen = false;
    this._emit('close');
  }

  async send(text: string, options: WidgetSendOptions = {}): Promise<WidgetMessage> {
    return this._sendUserMessage(text, options);
  }

  on(event: WidgetEvent, listener: WidgetListener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  getHistory(): WidgetMessage[] {
    return [...this.history];
  }

  identify(user: WidgetUser): void {
    this.user = { ...this.user, ...user };
  }

  // ──────────────────────────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────────────────────────

  private async _sendUserMessage(text: string, options: WidgetSendOptions): Promise<WidgetMessage> {
    const userMsg: WidgetMessage = {
      id: this._genId(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    this._appendMessage(userMsg);
    this._emit('message', userMsg);

    this._showTyping(true);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/widget/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          companyId: this.companyId,
          visitorId: this.visitorId,
          message: text,
          user: this.user,
          context: options.context,
          history: this.history.slice(-10).map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      this._showTyping(false);

      if (!response.ok) {
        const err = new Error(`HTTP ${response.status}`);
        this._emit('error', err);
        throw err;
      }

      const json: any = await response.json();
      const data = json.data || json;

      const assistantMsg: WidgetMessage = {
        id: data.messageId || this._genId(),
        role: 'assistant',
        content: data.reply || data.message || '',
        rich: data.rich || null,
        timestamp: Date.now()
      };
      this._appendMessage(assistantMsg);
      this._renderMessage(assistantMsg);
      this._emit('response', assistantMsg);
      return assistantMsg;
    } catch (err: any) {
      this._showTyping(false);
      this._emit('error', err);
      const fallback: WidgetMessage = {
        id: this._genId(),
        role: 'assistant',
        content:
          "Sorry, I'm having trouble reaching the AI right now. Please try again in a moment.",
        timestamp: Date.now()
      };
      this._appendMessage(fallback);
      this._renderMessage(fallback);
      return fallback;
    }
  }

  private _appendMessage(m: WidgetMessage): void {
    this.history.push(m);
  }

  private _renderMessage(m: WidgetMessage): void {
    const list = this.rootEl?.querySelector('.hojai-messages');
    if (!list) return;
    const el = document.createElement('div');
    el.className = `hojai-msg hojai-msg-${m.role}`;
    el.textContent = m.content;
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
  }

  private _showTyping(show: boolean): void {
    const t = this.rootEl?.querySelector('.hojai-typing');
    if (t) (t as HTMLElement).style.display = show ? 'flex' : 'none';
  }

  private _wireEvents(): void {
    if (!this.rootEl) return;

    const bubble = this.rootEl.querySelector<HTMLElement>('.hojai-bubble');
    const close = this.rootEl.querySelector<HTMLElement>('.hojai-close');
    const form = this.rootEl.querySelector<HTMLFormElement>('.hojai-form');
    const input = this.rootEl.querySelector<HTMLInputElement>('.hojai-input');

    bubble?.addEventListener('click', () => {
      if (this.isOpen) this.close();
      else this.open();
    });
    close?.addEventListener('click', () => this.close());

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input?.value?.trim();
      if (!text) return;
      if (input) input.value = '';
      this._renderMessage({
        id: this._genId(),
        role: 'user',
        content: text,
        timestamp: Date.now()
      });
      this._sendUserMessage(text, {}).catch(() => {});
    });

    const greetingEl = this.rootEl.querySelector('.hojai-greeting');
    if (greetingEl) greetingEl.textContent = this.config.greeting;
  }

  private _emit(event: WidgetEvent, payload?: any): void {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        if (this.debug) console.error('[hojai] listener error:', err);
      }
    });
  }

  private _log(...args: any[]): void {
    if (this.debug) console.log('[hojai]', ...args);
  }

  private _genId(): string {
    return 'm_' + Math.random().toString(36).slice(2, 11);
  }

  private _generateVisitorId(): string {
    if (typeof window === 'undefined') return 'v_' + Date.now();
    try {
      const KEY = 'hojai_vid';
      let id = window.localStorage.getItem(KEY);
      if (!id) {
        id = 'v_' + Math.random().toString(36).slice(2, 14);
        window.localStorage.setItem(KEY, id);
      }
      return id;
    } catch {
      return 'v_' + Math.random().toString(36).slice(2, 14);
    }
  }
}

function buildBubbleHTML(cfg: { name: string; avatar: string }): string {
  if (cfg.avatar) {
    return `<img class="hojai-avatar" src="${escapeAttr(cfg.avatar)}" alt="" />`;
  }
  return `<span class="hojai-bubble-icon" aria-hidden="true">💬</span>`;
}

function buildPanelHTML(cfg: { name: string; avatar: string; color: string; greeting: string }): string {
  return `
    <header class="hojai-header" style="background:${escapeAttr(cfg.color)}">
      <div class="hojai-title">
        ${cfg.avatar ? `<img class="hojai-avatar-sm" src="${escapeAttr(cfg.avatar)}" alt="" />` : ''}
        <span>${escapeHTML(cfg.name)}</span>
      </div>
      <button class="hojai-close" aria-label="Close chat">×</button>
    </header>
    <div class="hojai-messages" role="log" aria-live="polite">
      <div class="hojai-msg hojai-msg-assistant hojai-greeting">${escapeHTML(cfg.greeting)}</div>
      <div class="hojai-typing" style="display:none">
        <span></span><span></span><span></span>
      </div>
    </div>
    <form class="hojai-form">
      <input class="hojai-input" type="text" placeholder="Type your message..." aria-label="Message" autocomplete="off" />
      <button class="hojai-send" type="submit" aria-label="Send" style="background:${escapeAttr(cfg.color)}">→</button>
    </form>
  `;
}

function escapeHTML(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHTML(s);
}

let STYLES_INJECTED = false;

function injectStyles(color: string): void {
  if (STYLES_INJECTED) return;
  STYLES_INJECTED = true;
  const style = document.createElement('style');
  style.textContent = widgetStyles(color);
  document.head.appendChild(style);
}

function widgetStyles(color: string): string {
  return `
    .hojai-widget { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; }
    .hojai-widget *, .hojai-widget *::before, .hojai-widget *::after { box-sizing: border-box; }
    .hojai-pos-bottom-right { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; }
    .hojai-pos-bottom-left { position: fixed; left: 16px; bottom: 16px; z-index: 2147483000; }
    .hojai-bubble { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: ${color}; color: #fff; display:flex; align-items:center; justify-content:center; padding:0; overflow:hidden; }
    .hojai-bubble:hover { transform: scale(1.05); }
    .hojai-bubble-icon { font-size: 24px; }
    .hojai-avatar { width:100%; height:100%; object-fit:cover; }
    .hojai-panel { position: absolute; bottom: 72px; right: 0; width: 360px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 100px); background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); display: none; flex-direction: column; overflow: hidden; }
    .hojai-pos-bottom-left .hojai-panel { right: auto; left: 0; }
    .hojai-panel.hojai-open { display: flex; }
    .hojai-inline .hojai-panel { position: static; width: 100%; height: 100%; max-height: none; box-shadow: none; }
    .hojai-header { color: #fff; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
    .hojai-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }
    .hojai-avatar-sm { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
    .hojai-close { background: none; border: none; color: #fff; font-size: 24px; line-height: 1; cursor: pointer; padding: 0 4px; }
    .hojai-messages { flex: 1; overflow-y: auto; padding: 16px; background: #f9fafb; display: flex; flex-direction: column; gap: 8px; }
    .hojai-msg { max-width: 80%; padding: 8px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
    .hojai-msg-user { background: ${color}; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .hojai-msg-assistant { background: #fff; color: #111827; align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .hojai-typing { align-self: flex-start; display: flex; gap: 4px; padding: 8px 12px; background: #fff; border-radius: 12px; }
    .hojai-typing span { width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; animation: hojai-bounce 1.2s infinite; }
    .hojai-typing span:nth-child(2) { animation-delay: 0.15s; }
    .hojai-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes hojai-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
    .hojai-form { display: flex; padding: 8px; background: #fff; border-top: 1px solid #e5e7eb; gap: 8px; }
    .hojai-input { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; font-family: inherit; }
    .hojai-input:focus { border-color: ${color}; }
    .hojai-send { width: 36px; height: 36px; border: none; border-radius: 8px; color: #fff; font-size: 18px; cursor: pointer; }
    @media (max-width: 480px) {
      .hojai-panel { width: calc(100vw - 32px); height: calc(100vh - 100px); }
    }
  `;
}
