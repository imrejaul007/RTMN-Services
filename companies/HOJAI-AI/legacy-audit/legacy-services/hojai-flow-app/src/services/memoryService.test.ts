/**
 * Voice Layer Tests
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue({ uri: 'file://test.m4a' }),
      getStatusAsync: jest.fn().mockResolvedValue({ isRecording: true }),
      getURI: jest.fn().mockReturnValue('file://test.m4a'),
    })),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
}));

jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { text: 'Hello Hojai' } }),
  get: jest.fn().mockResolvedValue({ data: { words: [] } }),
}));

// Import after mocks
import { HojaiVoiceLayer } from '../services/voiceLayer';

describe('VoiceLayer', () => {
  let voiceLayer: HojaiVoiceLayer;

  beforeEach(() => {
    voiceLayer = new HojaiVoiceLayer();
  });

  describe('Language Detection', () => {
    test('detects English', async () => {
      const lang = await voiceLayer.detectLanguage('Hello how are you');
      expect(lang).toBe('en');
    });

    test('detects Hindi', async () => {
      const lang = await voiceLayer.detectLanguage('नमस्ते कैसे हैं');
      expect(lang).toBe('hi');
    });

    test('detects Hinglish', async () => {
      const lang = await voiceLayer.detectLanguage('bhai kya haal hai');
      expect(lang).toBe('hinglish');
    });
  });

  describe('Intent Detection', () => {
    test('detects dictation intent', async () => {
      const intent = await voiceLayer.detectIntent('Write email to Rahul');
      expect(intent.type).toBe('dictation');
      expect(intent.confidence).toBeGreaterThan(0.5);
    });

    test('detects query intent', async () => {
      const intent = await voiceLayer.detectIntent('What is the refund policy?');
      expect(intent.type).toBe('query');
    });

    test('detects action intent', async () => {
      const intent = await voiceLayer.detectIntent('Schedule meeting tomorrow');
      expect(intent.type).toBe('action');
    });

    test('extracts entities', async () => {
      const intent = await voiceLayer.detectIntent('Message Rahul tomorrow');
      expect(intent.entities.person).toBe('Rahul');
      expect(intent.entities.time).toBe('tomorrow');
    });
  });

  describe('Voice Capture', () => {
    test('starts capture', async () => {
      await expect(voiceLayer.startCapture()).resolves.not.toThrow();
    });

    test('stops capture', async () => {
      await voiceLayer.startCapture();
      const uri = await voiceLayer.stopCapture();
      expect(uri).toBeTruthy();
    });
  });
});
