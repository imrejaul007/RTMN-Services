/**
 * Tests for Family Quick Reply
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const FamilyQuickReply = require('../../src/core/familyQuickReply');

describe('FamilyQuickReply', () => {
  let familyReply;
  let mockIntentRouter;
  let mockContextEngine;

  beforeEach(() => {
    mockIntentRouter = {
      detect: vi.fn().mockResolvedValue({ intent: 'event' })
    };

    mockContextEngine = {};

    familyReply = new FamilyQuickReply({
      intentRouter: mockIntentRouter,
      contextEngine: mockContextEngine,
      logger: { info: () => {} }
    });

    // Inject mock family data
    familyReply.mockFamily = {
      'mom_id': {
        name: 'Mom',
        relation: 'mother',
        language: 'hi',
        lastCall: '3 days ago',
        upcomingEvents: [
          { type: 'birthday', date: '2026-08-15', name: 'Mom Birthday' }
        ],
        preferences: { communicationStyle: 'warm' }
      },
      'dad_id': {
        name: 'Dad',
        relation: 'father',
        language: 'hi',
        upcomingEvents: []
      },
      'spouse_id': {
        name: 'Spouse',
        relation: 'spouse',
        language: 'en',
        upcomingEvents: []
      }
    };
  });

  describe('detectFamilyRelationship()', () => {
    it('should detect mother', async () => {
      const contact = await familyReply.detectFamilyRelationship('mom_id', 'user-1');
      expect(contact).toBeTruthy();
      expect(contact.relation).toBe('mother');
      expect(contact.name).toBe('Mom');
    });

    it('should detect father', async () => {
      const contact = await familyReply.detectFamilyRelationship('dad_id', 'user-1');
      expect(contact.relation).toBe('father');
    });

    it('should return null for non-family', async () => {
      const contact = await familyReply.detectFamilyRelationship('random_id', 'user-1');
      expect(contact).toBeNull();
    });
  });

  describe('generateFamilyReply()', () => {
    it('should return isFamily=false for non-family senders', async () => {
      const result = await familyReply.generateFamilyReply({
        message: 'Hello',
        senderId: 'unknown_id',
        userId: 'user-1'
      });
      expect(result.isFamily).toBe(false);
    });

    it('should generate warm replies for mother', async () => {
      const result = await familyReply.generateFamilyReply({
        message: 'Are you coming on Sunday?',
        senderId: 'mom_id',
        userId: 'user-1'
      });
      expect(result.isFamily).toBe(true);
      expect(result.relationship).toBe('mother');
      expect(result.replies.length).toBeGreaterThan(0);
      // Mother replies should be in Hindi
      expect(result.replies[0].language).toBe('hi');
    });

    it('should generate respectful replies for father', async () => {
      const result = await familyReply.generateFamilyReply({
        message: 'How are you?',
        senderId: 'dad_id',
        userId: 'user-1'
      });
      expect(result.relationship).toBe('father');
      expect(result.tone).toBe('respectful-brief');
    });

    it('should generate loving replies for spouse', async () => {
      const result = await familyReply.generateFamilyReply({
        message: 'See you tonight',
        senderId: 'spouse_id',
        userId: 'user-1'
      });
      expect(result.relationship).toBe('spouse');
      expect(result.tone).toBe('personal-intimate');
    });

    it('should include family-specific actions', async () => {
      const result = await familyReply.generateFamilyReply({
        message: 'How are you?',
        senderId: 'mom_id',
        userId: 'user-1'
      });
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
      // Mother should have call action as primary
      const callAction = result.actions.find(a => a.id === 'call_family');
      expect(callAction).toBeDefined();
      expect(callAction.primary).toBe(true);
    });

    it('should include upcoming events in actions', async () => {
      const result = await familyReply.generateFamilyReply({
        message: 'Hello',
        senderId: 'mom_id',
        userId: 'user-1'
      });
      const eventAction = result.actions.find(a => a.id && a.id.startsWith('event_'));
      expect(eventAction).toBeDefined();
      expect(eventAction.event).toBe('birthday');
    });

    it('should include memory context', async () => {
      const result = await familyReply.generateFamilyReply({
        message: 'Hello',
        senderId: 'mom_id',
        userId: 'user-1'
      });
      expect(result.memoryContext).toBeDefined();
      expect(result.memoryContext.relation).toBe('mother');
    });
  });

  describe('relationship configurations', () => {
    it('should have all key relationships configured', () => {
      expect(familyReply.relationships.mother).toBeDefined();
      expect(familyReply.relationships.father).toBeDefined();
      expect(familyReply.relationships.spouse).toBeDefined();
      expect(familyReply.relationships.sibling).toBeDefined();
      expect(familyReply.relationships.child).toBeDefined();
      expect(familyReply.relationships.grandparent).toBeDefined();
    });
  });

  describe('stats', () => {
    it('should track family messages detected', async () => {
      await familyReply.detectFamilyRelationship('mom_id', 'user-1');
      await familyReply.detectFamilyRelationship('dad_id', 'user-1');
      const stats = familyReply.getStats();
      expect(stats.familyMessagesDetected).toBe(2);
      expect(stats.relationshipBreakdown.mother).toBe(1);
      expect(stats.relationshipBreakdown.father).toBe(1);
    });
  });
});