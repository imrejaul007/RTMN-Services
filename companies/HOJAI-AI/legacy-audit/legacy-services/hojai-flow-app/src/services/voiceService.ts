import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:4033';

class VoiceService {
  private isRecording = false;
  private recording: Audio.Recording | null = null;

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      this.recording = recording;
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and get audio data
   */
  async stopRecording(): Promise<{ uri: string; base64?: string }> {
    try {
      if (!this.recording) {
        throw new Error('No recording in progress');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      this.recording = null;
      this.isRecording = false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      return { uri: uri || '' };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Speech to Text using voice service
   */
  async speechToText(audioUri: string): Promise<string> {
    try {
      const formData = new FormData();

      // Get filename from URI
      const filename = audioUri.split('/').pop() || 'recording.m4a';

      formData.append('audio', {
        uri: audioUri,
        name: filename,
        type: 'audio/m4a',
      } as unknown as Blob);

      const response = await fetch(`${VOICE_SERVICE_URL}/api/stt`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('STT request failed');
      }

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error('Speech to text failed:', error);
      throw error;
    }
  }

  /**
   * Text to Speech using voice service
   */
  async textToSpeech(text: string): Promise<string> {
    try {
      const response = await fetch(`${VOICE_SERVICE_URL}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const data = await response.json();
      return data.audioUrl || '';
    } catch (error) {
      console.error('Text to speech failed:', error);
      throw error;
    }
  }

  /**
   * Speak text using device TTS (fallback)
   */
  async speak(text: string, options?: { language?: string; rate?: number }): Promise<void> {
    try {
      Speech.speak(text, {
        language: options?.language || 'en',
        rate: options?.rate || 1.0,
        onDone: () => console.log('Speech complete'),
        onError: (error) => console.error('Speech error:', error),
      });
    } catch (error) {
      console.error('Failed to speak:', error);
      throw error;
    }
  }

  /**
   * Stop any ongoing speech
   */
  async stopSpeaking(): Promise<void> {
    try {
      Speech.stop();
    } catch (error) {
      console.error('Failed to stop speaking:', error);
    }
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Full voice flow: Record → STT → Process → TTS → Play
   */
  async voiceFlow(
    onTranscript: (text: string) => void,
    onSpeaking: () => void,
    onComplete: () => void
  ): Promise<string> {
    try {
      // 1. Start recording
      await this.startRecording();

      // 2. Wait for stop (user presses button)
      // This should be triggered by UI
      onSpeaking();

      // 3. Stop recording
      const { uri } = await this.stopRecording();

      // 4. Speech to text
      const text = await this.speechToText(uri);
      onTranscript(text);

      // 5. Return text for processing
      onComplete();

      return text;
    } catch (error) {
      console.error('Voice flow failed:', error);
      throw error;
    }
  }
}

export const voiceService = new VoiceService();
export default voiceService;
