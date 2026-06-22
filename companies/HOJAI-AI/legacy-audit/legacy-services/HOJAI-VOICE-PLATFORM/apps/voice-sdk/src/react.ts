// ============================================================================
// HOJAI VOICE SDK - React Hook
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceAgent } from './VoiceAgent';
import { VoiceAgentOptions, SessionInfo, IntentResult, SentimentScore, ConnectionState } from './types';

export interface UseVoiceAgentOptions extends VoiceAgentOptions {
  autoStart?: boolean;
}

export interface UseVoiceAgentReturn {
  // State
  connected: boolean;
  sessionInfo: SessionInfo | null;
  error: Error | null;

  // Actions
  start: () => Promise<void>;
  stop: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  processAudio: (audio: Blob) => Promise<void>;

  // Streaming
  startStreaming: () => Promise<void>;
  stopStreaming: () => void;

  // Callbacks
  onSpeech: (callback: (text: string, intent?: IntentResult) => void) => void;
  onResponse: (callback: (text: string, audio?: string) => void) => void;
  onSentiment: (callback: (sentiment: SentimentScore) => void) => void;
}

export function useVoiceAgent(options: UseVoiceAgentOptions): UseVoiceAgentReturn {
  const {
    apiKey,
    agentId,
    language,
    voiceConfig,
    autoStart = false,
  } = options;

  const [connected, setConnected] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const agentRef = useRef<VoiceAgent | null>(null);
  const speechCallbackRef = useRef<((text: string, intent?: IntentResult) => void) | null>(null);
  const responseCallbackRef = useRef<((text: string, audio?: string) => void) | null>(null);
  const sentimentCallbackRef = useRef<((sentiment: SentimentScore) => void) | null>(null);
  const streamStopRef = useRef<(() => void) | null>(null);

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new VoiceAgent({
        apiKey,
        agentId,
        language,
        voiceConfig,
        autoConnect: false,
      });

      agentRef.current.on('connected', (session) => {
        setConnected(true);
        setSessionInfo(session);
      });

      agentRef.current.on('disconnected', () => {
        setConnected(false);
        setSessionInfo(null);
      });

      agentRef.current.on('error', (err) => {
        setError(err);
      });

      agentRef.current.on('speech', (text, intent) => {
        speechCallbackRef.current?.(text, intent);
      });

      agentRef.current.on('response', (text, audio) => {
        responseCallbackRef.current?.(text, audio);
      });

      agentRef.current.on('sentiment', (sentiment) => {
        sentimentCallbackRef.current?.(sentiment);
      });
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.stop();
        agentRef.current = null;
      }
    };
  }, [apiKey, agentId, language, voiceConfig]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && agentRef.current) {
      agentRef.current.start().catch(setError);
    }
  }, [autoStart]);

  const start = useCallback(async () => {
    if (agentRef.current) {
      try {
        await agentRef.current.start();
        setError(null);
      } catch (err) {
        setError(err as Error);
      }
    }
  }, []);

  const stop = useCallback(async () => {
    if (agentRef.current) {
      await agentRef.current.stop();
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (agentRef.current) {
      await agentRef.current.speak(text);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (agentRef.current) {
      await agentRef.current.sendMessage(text);
    }
  }, []);

  const processAudio = useCallback(async (audio: Blob) => {
    if (agentRef.current) {
      await agentRef.current.processAudio(audio);
    }
  }, []);

  const startStreaming = useCallback(async () => {
    if (agentRef.current) {
      const { stop } = await agentRef.current.startVoiceConversation(
        (text) => speechCallbackRef.current?.(text),
        (text, audio) => responseCallbackRef.current?.(text, audio),
        (err) => setError(err)
      );
      streamStopRef.current = stop;
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (streamStopRef.current) {
      streamStopRef.current();
      streamStopRef.current = null;
    }
  }, []);

  const onSpeech = useCallback((callback: (text: string, intent?: IntentResult) => void) => {
    speechCallbackRef.current = callback;
  }, []);

  const onResponse = useCallback((callback: (text: string, audio?: string) => void) => {
    responseCallbackRef.current = callback;
  }, []);

  const onSentiment = useCallback((callback: (sentiment: SentimentScore) => void) => {
    sentimentCallbackRef.current = callback;
  }, []);

  return {
    connected,
    sessionInfo,
    error,
    start,
    stop,
    speak,
    sendMessage,
    processAudio,
    startStreaming,
    stopStreaming,
    onSpeech,
    onResponse,
    onSentiment,
  };
}

export default useVoiceAgent;
