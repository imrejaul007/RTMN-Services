/**
 * Voice Hotkey Manager
 * ==================
 * Manages global hotkeys and voice overlay state.
 */

import type { HotkeyConfig, HotkeyAction, VoiceOverlayState, VoiceSession, QuickCommand } from '../types/index.js';

export class VoiceHotkeyManager {
  private sessions = new Map<string, VoiceSession>();
  private overlayState: VoiceOverlayState = {
    visible: false,
    mode: 'idle',
    transcript: '',
    partialTranscript: '',
  };
  private quickCommands: QuickCommand[] = [
    { id: '1', name: 'Order Food', phrase: 'order food', action: 'do-app:order', icon: '🍕' },
    { id: '2', name: 'Send Message', phrase: 'send message', action: 'slack:send', icon: '💬' },
    { id: '3', name: 'Book Meeting', phrase: 'book meeting', action: 'calendar:create', icon: '📅' },
    { id: '4', name: 'Search', phrase: 'search', action: 'browser:search', icon: '🔍' },
    { id: '5', name: 'Remind Me', phrase: 'remind me', action: 'reminder:create', icon: '⏰' },
    { id: '6', name: 'Make Shorter', phrase: 'make shorter', action: 'inline:shorter', icon: '✂️' },
    { id: '7', name: 'Make Formal', phrase: 'make formal', action: 'inline:formal', icon: '📝' },
    { id: '8', name: 'Reply', phrase: 'draft reply', action: 'inline:reply', icon: '↩️' },
  ];

  /**
   * Get overlay state
   */
  getOverlayState(): VoiceOverlayState {
    return { ...this.overlayState };
  }

  /**
   * Update overlay state
   */
  updateOverlayState(updates: Partial<VoiceOverlayState>): VoiceOverlayState {
    this.overlayState = { ...this.overlayState, ...updates };
    return this.overlayState;
  }

  /**
   * Toggle voice overlay
   */
  toggleOverlay(): VoiceOverlayState {
    this.overlayState.visible = !this.overlayState.visible;
    if (!this.overlayState.visible) {
      this.overlayState.mode = 'idle';
    }
    return this.overlayState;
  }

  /**
   * Show overlay
   */
  showOverlay(): VoiceOverlayState {
    this.overlayState.visible = true;
    return this.overlayState;
  }

  /**
   * Hide overlay
   */
  hideOverlay(): VoiceOverlayState {
    this.overlayState.visible = false;
    this.overlayState.mode = 'idle';
    this.overlayState.partialTranscript = '';
    return this.overlayState;
  }

  /**
   * Start listening
   */
  startListening(appContext?: VoiceOverlayState['appContext']): VoiceOverlayState {
    this.overlayState.visible = true;
    this.overlayState.mode = 'listening';
    if (appContext) {
      this.overlayState.appContext = appContext;
    }
    return this.overlayState;
  }

  /**
   * Start processing
   */
  startProcessing(): VoiceOverlayState {
    this.overlayState.mode = 'processing';
    return this.overlayState;
  }

  /**
   * Show response
   */
  showResponse(response: string): VoiceOverlayState {
    this.overlayState.mode = 'responding';
    this.overlayState.response = response;
    return this.overlayState;
  }

  /**
   * Update transcript
   */
  updateTranscript(text: string, isPartial: boolean = false): VoiceOverlayState {
    if (isPartial) {
      this.overlayState.partialTranscript = text;
    } else {
      this.overlayState.transcript = text;
      this.overlayState.partialTranscript = '';
    }
    return this.overlayState;
  }

  /**
   * Create a new session
   */
  createSession(userId: string): VoiceSession {
    const session: VoiceSession = {
      id: `session-${Date.now()}`,
      userId,
      startedAt: new Date().toISOString(),
      transcript: [],
      responses: [],
      actions: [],
      mode: 'voice',
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Add to session transcript
   */
  addToSession(sessionId: string, text: string): VoiceSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.transcript.push(text);
      return session;
    }
    return undefined;
  }

  /**
   * Add response to session
   */
  addResponseToSession(sessionId: string, response: string): VoiceSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.responses.push(response);
      return session;
    }
    return undefined;
  }

  /**
   * End session
   */
  endSession(sessionId: string): VoiceSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endedAt = new Date().toISOString();
      session.duration = Math.floor(
        (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
      );
      return session;
    }
    return undefined;
  }

  /**
   * Get all sessions for user
   */
  getUserSessions(userId: string): VoiceSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  /**
   * Get quick commands
   */
  getQuickCommands(): QuickCommand[] {
    return [...this.quickCommands];
  }

  /**
   * Add quick command
   */
  addQuickCommand(cmd: Omit<QuickCommand, 'id'>): QuickCommand {
    const newCmd: QuickCommand = {
      ...cmd,
      id: `cmd-${Date.now()}`,
    };
    this.quickCommands.push(newCmd);
    return newCmd;
  }

  /**
   * Remove quick command
   */
  removeQuickCommand(id: string): boolean {
    const index = this.quickCommands.findIndex(c => c.id === id);
    if (index !== -1) {
      this.quickCommands.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Detect quick command from phrase
   */
  detectQuickCommand(phrase: string): QuickCommand | null {
    const phraseLower = phrase.toLowerCase();
    return this.quickCommands.find(cmd =>
      phraseLower.includes(cmd.phrase.toLowerCase()) ||
      phraseLower === cmd.phrase.toLowerCase()
    ) || null;
  }

  /**
   * Get hotkey configuration for platform
   */
  getHotkeyConfig(platform: 'mac' | 'windows' | 'linux'): HotkeyConfig[] {
    const baseHotkeys: HotkeyConfig[] = [
      { key: 'Space', modifiers: ['alt'], action: 'toggle-voice' },
      { key: 'D', modifiers: ['ctrl', 'shift'], action: 'show-overlay' },
      { key: 'Escape', modifiers: [], action: 'hide-overlay' },
      { key: 'L', modifiers: ['ctrl', 'shift'], action: 'interrupt' },
    ];

    if (platform === 'mac') {
      return baseHotkeys.map(h => ({
        ...h,
        modifiers: h.modifiers.map(m => m === 'ctrl' ? 'cmd' : m === 'cmd' ? 'cmd' : m) as HotkeyConfig['modifiers'],
      }));
    }

    return baseHotkeys;
  }
}
