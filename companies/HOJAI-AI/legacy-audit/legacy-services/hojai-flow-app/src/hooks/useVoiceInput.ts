/**
 * useVoiceInput Hook
 *
 * Handles voice recording and transcription
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

interface UseVoiceInputReturn {
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      Speech.stop();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      console.error('Start recording error:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    try {
      if (!recordingRef.current) {
        throw new Error('No recording in progress');
      }

      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Here you would send the audio to STT service
      // For now, we'll just return empty string
      setTranscript('');
      return '';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
      console.error('Stop recording error:', err);
      return '';
    }
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    try {
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: 'en',
        rate: 1.0,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
        onCancelled: () => setIsSpeaking(false),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to speak';
      setError(message);
      setIsSpeaking(false);
      console.error('Speak error:', err);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return {
    isRecording,
    isSpeaking,
    transcript,
    error,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
  };
}
