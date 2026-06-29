/**
 * Voice Hotkey Types
 * ==============
 * Global hotkey listener and voice overlay control.
 */

export interface HotkeyConfig {
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta' | 'cmd')[];
  action: HotkeyAction;
}

export type HotkeyAction =
  | 'toggle-voice'
  | 'show-overlay'
  | 'hide-overlay'
  | 'interrupt'
  | 'quick-command';

export interface VoiceOverlayState {
  visible: boolean;
  mode: 'idle' | 'listening' | 'processing' | 'responding';
  transcript: string;
  partialTranscript: string;
  response?: string;
  appContext?: {
    appId: string;
    appName: string;
    windowTitle: string;
  };
}

export interface VoiceSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  transcript: string[];
  responses: string[];
  actions: SessionAction[];
  mode: 'voice' | 'text';
}

export interface SessionAction {
  type: 'intent' | 'inline' | 'app-action';
  input: string;
  output?: string;
  executedAt: string;
}

export interface QuickCommand {
  id: string;
  name: string;
  phrase: string;
  action: string;
  icon?: string;
}
