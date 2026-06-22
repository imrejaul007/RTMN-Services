/**
 * RAZO Keyboard - React Hook
 *
 * Easy-to-use hook for integrating RAZO keyboard into React Native apps
 */

import { useState, useEffect, useCallback } from 'react';
import RazoKeyboard, {
  KeyboardState,
  Prediction,
  Suggestion,
  GenieResponse,
  SyncStatus,
  PasswordEntry,
} from './RazoKeyboardModule';

// Hook return type
export interface UseRazoKeyboardReturn {
  // State
  state: KeyboardState;
  predictions: Prediction[];
  suggestions: Suggestion[];
  transcript: string;
  isListening: boolean;
  isAuthenticated: boolean;
  syncStatus: SyncStatus;

  // Actions
  startVoice: () => Promise<void>;
  stopVoice: () => Promise<void>;
  getPredictions: (text: string) => Promise<void>;
  askGenie: (command: string) => Promise<GenieResponse>;
  authenticate: () => Promise<boolean>;
  sync: () => Promise<void>;
  setState: (state: KeyboardState) => Promise<void>;

  // Vault
  getPassword: (site: string) => Promise<PasswordEntry | null>;
  savePassword: (entry: PasswordEntry) => Promise<boolean>;

  // Search
  search: (query: string) => Promise<any[]>;
  launchApp: (appId: string) => Promise<boolean>;
}

// Provider context
export const RazoKeyboardContext = React.createContext<UseRazoKeyboardReturn | null>(null);

import React from 'react';

/**
 * RazoKeyboardProvider
 *
 * Wrap your app with this provider to enable RAZO keyboard functionality
 */
export const RazoKeyboardProvider: React.FC<{
  userId: string;
  children: React.ReactNode;
  serverUrl?: string;
}> = ({ userId, children, serverUrl }) => {
  const [state, setState] = useState(KeyboardState.DEFAULT);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: 0,
    pendingChanges: 0,
    status: 'synced',
  });

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await RazoKeyboard.initialize({
        userId,
        serverUrl,
      });

      // Check auth status
      const authed = await RazoKeyboard.isAuthenticated();
      setIsAuthenticated(authed);

      // Get initial suggestions
      const briefs = await RazoKeyboard.getGenieBriefs();
      setSuggestions(briefs);

      // Get sync status
      const status = await RazoKeyboard.getSyncStatus();
      setSyncStatus(status);
    };

    init();

    // Set up event listeners
    const unsubTranscript = RazoKeyboard.onTranscript((text) => {
      setTranscript(text);
    });

    const unsubPredictions = RazoKeyboard.onPredictions((preds) => {
      setPredictions(preds);
    });

    const unsubSuggestions = RazoKeyboard.onSuggestions((sugs) => {
      setSuggestions(sugs);
    });

    const unsubSyncStatus = RazoKeyboard.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubTranscript();
      unsubPredictions();
      unsubSuggestions();
      unsubSyncStatus();
    };
  }, [userId, serverUrl]);

  // Voice actions
  const startVoice = useCallback(async () => {
    setIsListening(true);
    await RazoKeyboard.startVoiceInput();
  }, []);

  const stopVoice = useCallback(async () => {
    setIsListening(false);
    await RazoKeyboard.stopVoiceInput();
  }, []);

  // Predictions
  const getPredictions = useCallback(async (text: string) => {
    const preds = await RazoKeyboard.getPredictions(text);
    setPredictions(preds);
  }, []);

  // Genie
  const askGenie = useCallback(async (command: string): Promise<GenieResponse> => {
    return RazoKeyboard.askGenie(command);
  }, []);

  // Auth
  const authenticate = useCallback(async (): Promise<boolean> => {
    const result = await RazoKeyboard.authenticateWithBiometric();
    setIsAuthenticated(result);
    return result;
  }, []);

  // Sync
  const sync = useCallback(async () => {
    await RazoKeyboard.sync();
  }, []);

  // State
  const handleSetState = useCallback(async (newState: KeyboardState) => {
    await RazoKeyboard.setState(newState);
    setState(newState);
  }, []);

  // Vault
  const getPassword = useCallback(async (site: string) => {
    return RazoKeyboard.getPassword(site);
  }, []);

  const savePassword = useCallback(async (entry: PasswordEntry) => {
    return RazoKeyboard.savePassword(entry);
  }, []);

  // Search
  const search = useCallback(async (query: string) => {
    return RazoKeyboard.search(query);
  }, []);

  const launchApp = useCallback(async (appId: string) => {
    return RazoKeyboard.launchApp(appId);
  }, []);

  const value: UseRazoKeyboardReturn = {
    state,
    predictions,
    suggestions,
    transcript,
    isListening,
    isAuthenticated,
    syncStatus,
    startVoice,
    stopVoice,
    getPredictions,
    askGenie,
    authenticate,
    sync,
    setState: handleSetState,
    getPassword,
    savePassword,
    search,
    launchApp,
  };

  return (
    <RazoKeyboardContext.Provider value={value}>
      {children}
    </RazoKeyboardContext.Provider>
  );
};

/**
 * useRazoKeyboard
 *
 * Hook to access RAZO keyboard functionality
 */
export const useRazoKeyboard = (): UseRazoKeyboardReturn => {
  const context = React.useContext(RazoKeyboardContext);
  if (!context) {
    throw new Error('useRazoKeyboard must be used within RazoKeyboardProvider');
  }
  return context;
};

/**
 * useRazoKeyboardStandalone
 *
 * Hook for standalone usage without provider
 */
export const useRazoKeyboardStandalone = (
  userId: string,
  serverUrl?: string
): UseRazoKeyboardReturn => {
  const [state, setState] = useState(KeyboardState.DEFAULT);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: 0,
    pendingChanges: 0,
    status: 'synced',
  });

  // Initialize
  useEffect(() => {
    const init = async () => {
      await RazoKeyboard.initialize({ userId, serverUrl });
      const authed = await RazoKeyboard.isAuthenticated();
      setIsAuthenticated(authed);
    };
    init();
  }, [userId, serverUrl]);

  // Event listeners
  useEffect(() => {
    const unsubTranscript = RazoKeyboard.onTranscript(setTranscript);
    const unsubPredictions = RazoKeyboard.onPredictions(setPredictions);
    const unsubSuggestions = RazoKeyboard.onSuggestions(setSuggestions);
    const unsubSyncStatus = RazoKeyboard.onSyncStatusChange(setSyncStatus);

    return () => {
      unsubTranscript();
      unsubPredictions();
      unsubSuggestions();
      unsubSyncStatus();
    };
  }, []);

  const startVoice = useCallback(async () => {
    setIsListening(true);
    await RazoKeyboard.startVoiceInput();
  }, []);

  const stopVoice = useCallback(async () => {
    setIsListening(false);
    await RazoKeyboard.stopVoiceInput();
  }, []);

  const getPredictions = useCallback(async (text: string) => {
    setPredictions(await RazoKeyboard.getPredictions(text));
  }, []);

  const askGenie = useCallback(async (command: string) => {
    return RazoKeyboard.askGenie(command);
  }, []);

  const authenticate = useCallback(async () => {
    const result = await RazoKeyboard.authenticateWithBiometric();
    setIsAuthenticated(result);
    return result;
  }, []);

  const sync = useCallback(async () => {
    await RazoKeyboard.sync();
  }, []);

  const handleSetState = useCallback(async (newState: KeyboardState) => {
    await RazoKeyboard.setState(newState);
    setState(newState);
  }, []);

  const getPassword = useCallback(async (site: string) => {
    return RazoKeyboard.getPassword(site);
  }, []);

  const savePassword = useCallback(async (entry: PasswordEntry) => {
    return RazoKeyboard.savePassword(entry);
  }, []);

  const search = useCallback(async (query: string) => {
    return RazoKeyboard.search(query);
  }, []);

  const launchApp = useCallback(async (appId: string) => {
    return RazoKeyboard.launchApp(appId);
  }, []);

  return {
    state,
    predictions,
    suggestions,
    transcript,
    isListening,
    isAuthenticated,
    syncStatus,
    startVoice,
    stopVoice,
    getPredictions,
    askGenie,
    authenticate,
    sync,
    setState: handleSetState,
    getPassword,
    savePassword,
    search,
    launchApp,
  };
};