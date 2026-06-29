/**
 * Conversation Physics Engine - Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TurnManager } from '../src/services/turnManager.js';
import { SilenceIntelligence } from '../src/services/silenceIntelligence.js';
import { RepairEngine } from '../src/services/repairEngine.js';
import type { ConversationSession, ConversationContext } from '../src/types/index.js';

describe('TurnManager', () => {
  let mockSession: ConversationSession;

  beforeEach(() => {
    mockSession = {
      id: 'test-session',
      userId: 'user-123',
      state: 'idle',
      turns: [],
      currentTurn: null,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      totalUserSpeechMs: 0,
      totalAISpeechMs: 0,
      totalSilenceMs: 0,
      interruptions: 0,
      backchannels: 0,
      context: {},
      metrics: {
        avgUserTurnLength: 0,
        avgAITurnLength: 0,
        userSpeechRatio: 0,
        interruptionsPerMinute: 0,
        backchannelsPerMinute: 0,
        silenceRatio: 0,
        topicChanges: 0,
        corrections: 0,
        emotionalTrajectory: []
      }
    };
  });

  it('should decide to speak after user finishes normally', () => {
    const decision = TurnManager.decide(mockSession, true, 'Hello, how are you?');

    expect(decision.action).toBe('speak');
    expect(decision.confidence).toBeGreaterThan(0.8);
  });

  it('should wait when user appears to interrupt themselves', () => {
    const decision = TurnManager.decide(mockSession, true, 'Actually wait, I mean Mumbai');

    expect(decision.action).toBe('wait');
    expect(decision.reason).toContain('correcting');
  });

  it('should generate backchannel after long silence', () => {
    mockSession.turns.push({
      id: 'turn-1',
      speaker: 'user',
      startTime: Date.now() - 5000,
      endTime: Date.now(),
      transcript: 'Let me think...',
      isComplete: true,
      wasInterrupted: false,
      hadSilence: true,
      silenceDurationMs: 5000,
      backchannels: []
    });

    const decision = TurnManager.decide(mockSession, true);

    expect(decision.action).toBe('backchannel');
    expect(decision.suggestedBackchannel).toBeTruthy();
  });

  it('should continue for short confirmation', () => {
    const decision = TurnManager.decide(mockSession, true, 'Yes, exactly');

    expect(decision.action).toBe('continue');
  });

  it('should wait after AI speaks', () => {
    mockSession.turns.push({
      id: 'turn-1',
      speaker: 'ai',
      startTime: Date.now() - 2000,
      endTime: Date.now(),
      transcript: 'How can I help you?',
      isComplete: true,
      wasInterrupted: false,
      hadSilence: false,
      backchannels: []
    });

    const decision = TurnManager.decide(mockSession, false);

    expect(decision.action).toBe('wait');
  });

  it('should select relationship-appropriate backchannels', () => {
    mockSession.context = { relationship: 'mother' };

    const backchannel = TurnManager.selectBackchannel(mockSession.context);

    expect(backchannel).toContain('beta');
  });

  it('should detect interruption within overlap window', () => {
    const timestamp = Date.now();
    const aiEndTime = timestamp - 200; // 200ms overlap

    const isInterruption = TurnManager.detectInterruption(
      'Some AI speech',
      'User interjection',
      timestamp,
      aiEndTime
    );

    expect(isInterruption).toBe(true);
  });
});

describe('SilenceIntelligence', () => {
  it('should classify thinking silence correctly', () => {
    const result = SilenceIntelligence.analyze(300);

    expect(result.meaning).toBe('THINKING');
    expect(result.urgency).toBe('low');
    expect(result.response).toBeNull();
  });

  it('should classify confusion silence correctly', () => {
    const result = SilenceIntelligence.analyze(5000);

    expect(result.meaning).toBe('CONFUSION');
    expect(result.urgency).toBe('medium');
    expect(result.response).toBeTruthy();
  });

  it('should classify distracted silence correctly', () => {
    const result = SilenceIntelligence.analyze(15000);

    expect(result.meaning).toBe('DISTRACTED');
    expect(result.urgency).toBe('high');
    expect(result.response).toBeTruthy();
  });

  it('should classify abandoned conversation correctly', () => {
    const result = SilenceIntelligence.analyze(60000);

    expect(result.meaning).toBe('ABANDONED');
    expect(result.urgency).toBe('high');
    expect(result.response).toBeTruthy();
  });

  it('should generate mother-relationship response', () => {
    const result = SilenceIntelligence.analyze(5000, { relationship: 'mother' });

    expect(result.response).toContain('Beta');
  });

  it('should generate friend-relationship response', () => {
    const result = SilenceIntelligence.analyze(15000, { relationship: 'friend' });

    expect(result.response).toContain('Bro');
  });
});

describe('RepairEngine', () => {
  it('should detect self-correction with dash', () => {
    const result = RepairEngine.detectSelfCorrection('Delhi—sorry—Mumbai');

    expect(result).not.toBeNull();
    expect(result!.type).toBe('replacement');
    expect(result!.originalText).toContain('Delhi');
    expect(result!.correctedText).toContain('Mumbai');
  });

  it('should detect self-correction with sorry', () => {
    const result = RepairEngine.detectSelfCorrection('Actually, sorry, I meant Mumbai');

    expect(result).not.toBeNull();
  });

  it('should extract final intent correctly', () => {
    const result = RepairEngine.extractFinalIntent('Delhi—sorry—Mumbai');

    expect(result).toContain('Mumbai');
    expect(result).not.toContain('sorry');
  });

  it('should generate repair acknowledgment for friend', () => {
    const correction = {
      type: 'replacement' as const,
      originalText: 'wrong',
      correctedText: 'right',
      position: { start: 0, end: 5 }
    };

    const response = RepairEngine.generateRepairAcknowledgment(correction, 'friend');

    expect(response).toContain('No worries');
  });

  it('should detect topic transition', () => {
    const result = RepairEngine.detectTopicTransition('Anyway, let\'s talk about something else', []);

    expect(result).not.toBeNull();
    expect(result!.isTransition).toBe(true);
  });

  it('should detect conversation end', () => {
    const result = RepairEngine.detectTopicTransition('That\'s all, thanks!', []);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('conversation_end');
  });

  it('should return null for normal speech', () => {
    const result = RepairEngine.detectSelfCorrection('I would like to order pizza');

    expect(result).toBeNull();
  });
});
