/**
 * Multi-Person Presence Tests
 */

import { describe, it, expect } from 'vitest';
import { MultiPersonDetector } from '../src/services/multiPersonDetector.js';

describe('MultiPersonDetector', () => {
  const createDetector = () => new MultiPersonDetector();

  describe('createSession', () => {
    it('should create a multi-person session', () => {
      const detector = createDetector();
      const session = detector.createSession('meeting-1', ['user-1', 'user-2', 'user-3']);

      expect(session.sessionId).toBe('meeting-1');
      expect(session.participants.length).toBe(3);
      expect(session.groupDynamics).toBeDefined();
    });

    it('should initialize participants correctly', () => {
      const detector = createDetector();
      const session = detector.createSession('meeting-2', ['alice', 'bob']);

      const alice = session.participants.find(p => p.userId === 'alice');
      expect(alice).toBeDefined();
      expect(alice!.speaking).toBe(false);
    });
  });

  describe('recordTurn', () => {
    it('should record a conversation turn', () => {
      const detector = createDetector();
      detector.createSession('meeting-1', ['user-1', 'user-2']);

      const turn = detector.recordTurn(
        'meeting-1',
        'user-1',
        new Date().toISOString(),
        new Date(Date.now() + 5000).toISOString()
      );

      expect(turn).toBeDefined();
      expect(turn!.speakerId).toBe('user-1');
    });
  });

  describe('startSpeaking', () => {
    it('should mark participant as speaking', () => {
      const detector = createDetector();
      detector.createSession('meeting-1', ['user-1', 'user-2']);

      detector.startSpeaking('meeting-1', 'user-1');

      const session = detector.getSession('meeting-1');
      const user1 = session!.participants.find(p => p.userId === 'user-1');
      expect(user1!.speaking).toBe(true);
    });
  });

  describe('detectConversationMode', () => {
    it('should detect casual conversation', () => {
      const detector = createDetector();
      const session = detector.createSession('meeting-1', ['user-1', 'user-2']);

      const mode = detector.detectConversationMode('meeting-1');

      expect(['casual', 'meeting', 'presentation']).toContain(mode);
    });

    it('should return casual for unknown session', () => {
      const detector = createDetector();
      const mode = detector.detectConversationMode('unknown');

      expect(mode).toBe('casual');
    });
  });

  describe('generateGroupAdaptation', () => {
    it('should generate adaptation', () => {
      const detector = createDetector();
      detector.createSession('meeting-1', ['user-1', 'user-2']);

      const adaptation = detector.generateGroupAdaptation('meeting-1');

      expect(adaptation).toBeDefined();
      expect(adaptation.responsePace).toBeGreaterThan(0);
      expect(adaptation.formality).toBeGreaterThanOrEqual(0);
      expect(adaptation.formality).toBeLessThanOrEqual(1);
    });
  });

  describe('endSession', () => {
    it('should end session and return summary', () => {
      const detector = createDetector();
      detector.createSession('meeting-1', ['user-1', 'user-2']);

      const summary = detector.endSession('meeting-1');

      expect(summary).toBeDefined();
      expect(summary!.sessionId).toBe('meeting-1');
      expect(summary!.participantCount).toBe(2);
    });

    it('should return undefined for unknown session', () => {
      const detector = createDetector();
      const summary = detector.endSession('unknown');

      expect(summary).toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('should return session by ID', () => {
      const detector = createDetector();
      detector.createSession('meeting-1', ['user-1']);

      const session = detector.getSession('meeting-1');

      expect(session).toBeDefined();
      expect(session!.sessionId).toBe('meeting-1');
    });

    it('should return undefined for unknown', () => {
      const detector = createDetector();
      const session = detector.getSession('unknown');

      expect(session).toBeUndefined();
    });
  });
});
