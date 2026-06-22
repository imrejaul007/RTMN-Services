/**
 * RAZO KEYBOARD - STATE MACHINE
 * All 6 keyboard states with transitions
 */

import React, { useState, useCallback, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

type KeyboardState =
  | 'default'      // Normal typing
  | 'voice'        // Voice input mode
  | 'genie'        // AI assistant mode
  | 'suggestions'  // Smart suggestion cards
  | 'launcher'     // App/agent launcher
  | 'action';      // Genie execution mode

interface KeyboardContext {
  state: KeyboardState;
  userId: string;
  currentApp?: string;
  predictions: string[];
  suggestions: any[];
  feed: any;
}

const KEYBOARD_STATES: Record<KeyboardState, string> = {
  default: 'DEFAULT TYPING LAYOUT',
  voice: 'VOICE INPUT MODE',
  genie: 'GENIE MODE (AI)',
  suggestions: 'SUGGESTION CARDS',
  launcher: 'APP LAUNCHER',
  action: 'ACTION MODE',
};

// ============================================
// STATE MACHINE HOOK
// ============================================

export function useKeyboardState() {
  const [state, setState] = useState<KeyboardState>('default');
  const [context, setContext] = useState<KeyboardContext>({
    state: 'default',
    userId: '',
    predictions: [],
    suggestions: [],
    feed: null,
  });

  // State transitions
  const transition = useCallback((newState: KeyboardState) => {
    console.log(`RAZO Keyboard: ${KEYBOARD_STATES[state]} → ${KEYBOARD_STATES[newState]}`);
    setState(newState);
    setContext(prev => ({ ...prev, state: newState }));
  }, [state]);

  // Mode-specific transitions
  const toVoiceMode = useCallback(() => transition('voice'), [transition]);
  const toGenieMode = useCallback(() => transition('genie'), [transition]);
  const toSuggestions = useCallback(() => transition('suggestions'), [transition]);
  const toLauncher = useCallback(() => transition('launcher'), [transition]);
  const toAction = useCallback(() => transition('action'), [transition]);
  const toDefault = useCallback(() => transition('default'), [transition]);

  // Voice input detection
  const handleVoiceInput = useCallback((text: string) => {
    const lower = text.toLowerCase();

    // Check for wake words
    if (lower.includes('hey genie') || lower.includes('genie')) {
      toGenieMode();
      return 'genie';
    }

    if (lower.includes('hey copilot') || lower.includes('copilot')) {
      toGenieMode();
      return 'copilot';
    }

    // Normal voice typing
    toVoiceMode();
    return 'voice_typing';
  }, [toGenieMode, toVoiceMode]);

  // Context detection
  const detectContext = useCallback((app: string) => {
    setContext(prev => ({ ...prev, currentApp: app }));

    // App-specific states
    if (app === 'whatsapp' || app === 'messages') {
      toSuggestions();
    }
  }, [toSuggestions]);

  return {
    state,
    context,
    transition,
    toVoiceMode,
    toGenieMode,
    toSuggestions,
    toLauncher,
    toAction,
    toDefault,
    handleVoiceInput,
    detectContext,
    isState: (s: KeyboardState) => state === s,
  };
}

// ============================================
// KEYBOARD CONTEXT
// ============================================

const KeyboardContext = React.createContext<ReturnType<typeof useKeyboardState> | null>(null);

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const keyboardState = useKeyboardState();

  return (
    <KeyboardContext.Provider value={keyboardState}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  const context = React.useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within KeyboardProvider');
  }
  return context;
}

// ============================================
// STATE INDICATOR
// ============================================

export function StateIndicator() {
  const { state, transition } = useKeyboard();

  const stateConfig: Record<KeyboardState, { color: string; icon: string; label: string }> = {
    default: { color: '#007AFF', icon: '⌨️', label: 'Typing' },
    voice: { color: '#FF3B30', icon: '🎤', label: 'Voice' },
    genie: { color: '#5856D6', icon: '🤖', label: 'Genie' },
    suggestions: { color: '#FF9500', icon: '💡', label: 'Suggestions' },
    launcher: { color: '#34C759', icon: '🚀', label: 'Launcher' },
    action: { color: '#AF52DE', icon: '⚡', label: 'Action' },
  };

  const config = stateConfig[state];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: `${config.color}20`,
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
    }}>
      <span>{config.icon}</span>
      <span style={{ color: config.color }}>{config.label}</span>
    </div>
  );
}

export default useKeyboardState;