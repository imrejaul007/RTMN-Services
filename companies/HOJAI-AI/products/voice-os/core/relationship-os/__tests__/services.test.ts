/**
 * Relationship OS - Service Tests
 */

import { describe, it, expect } from 'vitest';
import { RelationshipGraphService } from '../src/services/relationshipGraph.js';

describe('RelationshipGraphService', () => {
  const createService = () => new RelationshipGraphService();

  describe('createRelationship', () => {
    it('should create a family relationship', () => {
      const service = createService();
      const rel = service.createRelationship('user-1', 'mom-1', 'Mom', 'human', 'family');

      expect(rel.userId).toBe('user-1');
      expect(rel.targetName).toBe('Mom');
      expect(rel.type).toBe('family');
      expect(rel.trustLevel).toBe('close');
      expect(rel.trustScore).toBe(80);
    });

    it('should create a colleague relationship', () => {
      const service = createService();
      const rel = service.createRelationship('user-1', 'colleague-1', 'John', 'human', 'colleague');

      expect(rel.type).toBe('colleague');
      expect(rel.trustLevel).toBe('trusted');
      expect(rel.context.formalityLevel).toBeGreaterThan(0.5);
    });

    it('should create a friend relationship', () => {
      const service = createService();
      const rel = service.createRelationship('user-1', 'friend-1', 'Alex', 'human', 'friend');

      expect(rel.type).toBe('friend');
      expect(rel.context.emotionalTone).toBe('casual');
    });

    it('should throw error for duplicate relationship', () => {
      const service = createService();
      service.createRelationship('user-1', 'friend-1', 'Alex', 'human', 'friend');

      expect(() => {
        service.createRelationship('user-1', 'friend-1', 'Alex', 'human', 'friend');
      }).toThrow('Relationship already exists');
    });
  });

  describe('getRelationship', () => {
    it('should return relationship by ID', () => {
      const service = createService();
      const created = service.createRelationship('user-1', 'mom-1', 'Mom', 'human', 'family');

      const found = service.getRelationship(created.id);
      expect(found).toBeDefined();
      expect(found!.targetName).toBe('Mom');
    });

    it('should return undefined for non-existent', () => {
      const service = createService();
      const found = service.getRelationship('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllForUser', () => {
    it('should return all relationships for user', () => {
      const service = createService();
      service.createRelationship('user-1', 'mom-1', 'Mom', 'human', 'family');
      service.createRelationship('user-1', 'friend-1', 'Alex', 'human', 'friend');
      service.createRelationship('user-2', 'boss-1', 'Boss', 'human', 'boss');

      const user1Rels = service.getAllForUser('user-1');
      expect(user1Rels.length).toBe(2);
    });
  });

  describe('updateTrust', () => {
    it('should increase trust score', () => {
      const service = createService();
      const rel = service.createRelationship('user-1', 'friend-1', 'Alex', 'human', 'friend');
      const initialScore = rel.trustScore;

      const updated = service.updateTrust(rel.id, 10, 'Great conversation', 'voice');

      expect(updated.trustScore).toBeGreaterThan(initialScore);
      expect(updated.trustLevel).toBeTruthy();
    });

    it('should decrease trust score', () => {
      const service = createService();
      const rel = service.createRelationship('user-1', 'colleague-1', 'John', 'human', 'colleague');

      const updated = service.updateTrust(rel.id, -20, 'Missed deadline');

      expect(updated.trustScore).toBeLessThan(50);
    });

    it('should bound trust score at 0', () => {
      const service = createService();
      const rel = service.createRelationship('user-1', 'stranger-1', 'Stranger', 'human', 'acquaintance');

      const updated = service.updateTrust(rel.id, -50, 'Very bad experience');

      expect(updated.trustScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('buildGraph', () => {
    it('should build graph with clusters', () => {
      const service = createService();
      service.createRelationship('user-1', 'mom-1', 'Mom', 'human', 'family');
      service.createRelationship('user-1', 'dad-1', 'Dad', 'human', 'family');
      service.createRelationship('user-1', 'colleague-1', 'John', 'human', 'colleague');
      service.createRelationship('user-1', 'friend-1', 'Alex', 'human', 'friend');

      const graph = service.buildGraph('user-1');

      expect(graph.nodes.length).toBe(4);
      expect(graph.clusters.length).toBeGreaterThan(0);
    });
  });

  describe('getVoicePreferences', () => {
    it('should return voice preferences', () => {
      const service = createService();
      const rel = service.createRelationship('user-1', 'mom-1', 'Mom', 'human', 'family');

      const prefs = service.getVoicePreferences(rel.id);

      expect(prefs).toBeDefined();
      expect(prefs!.greeting).toBeTruthy();
      expect(prefs!.humorLevel).toBe('moderate');
    });
  });

  describe('getByType', () => {
    it('should filter by type', () => {
      const service = createService();
      service.createRelationship('user-1', 'mom-1', 'Mom', 'human', 'family');
      service.createRelationship('user-1', 'friend-1', 'Alex', 'human', 'friend');
      service.createRelationship('user-1', 'colleague-1', 'John', 'human', 'colleague');

      const family = service.getByType('user-1', 'family');

      expect(family.length).toBe(1);
      expect(family[0].targetName).toBe('Mom');
    });
  });
});
