/**
 * useHojai - Complete Hojai Flow hook
 *
 * Ties together:
 * - Voice capture
 * - VAD
 * - STT
 * - Intent detection
 * - Memory retrieval
 * - Context assembly
 * - TTS response
 */

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HojaiState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  intent: Intent | null;
  context: Context | null;
  response: string;
  error: string | null;
}

export interface Intent {
  type: 'dictation' | 'query' | 'action' | 'workflow' | 'agent' | 'multi_agent';
  subtype: string;
  entities: Record<string, string>;
  confidence: number;
}

export interface Context {
  currentApp: string;
  memories: Array<{ tier: string; content: string }>;
  knowledge: Array<{ title: string; content: string }>;
}

interface UseHojaiOptions {
  autoPrefetch?: boolean;
  enableTTS?: boolean;
  persona?: 'personal' | 'founder' | 'sales' | 'support';
}

export function useHojai(options: UseHojaiOptions = {}) {
  const { autoPrefetch = true, enableTTS = true, persona = 'personal' } = options;

  const [state, setState] = useState<HojaiState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    intent: null,
    context: null,
    response: '',
    error: null,
  });

  const [userId, setUserId] = useState<string>('current_user');

  // Initialize
  useEffect(() => {
    AsyncStorage.getItem('userId').then((id) => {
      if (id) setUserId(id);
    });
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    setState((s) => ({ ...s, isListening: true, error: null }));

    try {
      // Import dynamically to avoid issues
      const { hojaiVoiceLayer } = await import('../services/voiceLayer');
      await hojaiVoiceLayer.startCapture();
    } catch (error) {
      setState((s) => ({
        ...s,
        isListening: false,
        error: 'Failed to start listening',
      }));
    }
  }, []);

  // Stop listening and process
  const stopListening = useCallback(async () => {
    setState((s) => ({ ...s, isProcessing: true, isListening: false }));

    try {
      const { hojaiVoiceLayer } = await import('../services/voiceLayer');
      const { vadService } = await import('../services/vad');
      const { ttsService } = await import('../services/ttsResponse');
      const { contextAssembly } = await import('../services/contextAssembly');

      // Get audio
      const audioUri = await hojaiVoiceLayer.stopCapture();

      // VAD check
      const hasSpeech = await vadService.containsSpeech(audioUri);
      if (!hasSpeech) {
        setState((s) => ({ ...s, isProcessing: false }));
        return;
      }

      // Speech to text
      const voiceInput = await hojaiVoiceLayer.speechToText(audioUri, 'en');
      setState((s) => ({ ...s, transcript: voiceInput.rawTranscript }));

      // Intent detection
      const intent = await hojaiVoiceLayer.detectIntent(voiceInput.rawTranscript);
      setState((s) => ({ ...s, intent }));

      // Context
      const context = await contextAssembly.assemble(userId);
      setState((s) => ({ ...s, context }));

      // Generate response (mock)
      const response = `Processed: ${intent.type} - ${intent.subtype}`;
      setState((s) => ({ ...s, response, isProcessing: false }));

      // TTS response
      if (enableTTS && response) {
        try {
          await ttsService.speak(response, persona);
        } catch (e) {
          console.warn('[TTS] Failed:', e);
        }
      }
    } catch (error) {
      setState((s) => ({
        ...s,
        isProcessing: false,
        error: 'Processing failed',
      }));
    }
  }, [userId, persona, enableTTS]);

  // Cancel
  const cancel = useCallback(() => {
    setState({
      isListening: false,
      isProcessing: false,
      transcript: '',
      intent: null,
      context: null,
      response: '',
      error: null,
    });
  }, []);

  // Prefetch context
  const prefetchContext = useCallback(async (currentApp?: string) => {
    const { contextAssembly } = await import('../services/contextAssembly');
    await contextAssembly.assemble(userId, currentApp);
  }, [userId]);

  return {
    ...state,
    startListening,
    stopListening,
    cancel,
    prefetchContext,
    setUserId,
  };
}
