/**
 * Founder Mode Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import FounderMode from '../../src/modes/founder.js';

describe('FounderMode', () => {
  let founderMode;
  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  beforeEach(() => {
    founderMode = new FounderMode(mockLogger, {
      genieGateway: 'http://localhost:4701',
      corpid: 'http://localhost:4702',
      memoryOS: 'http://localhost:4703',
      twinOS: 'http://localhost:4705',
      maxLength: 280
    });
  });

  describe('getUIConfig()', () => {
    it('should return founder mode UI config', () => {
      const config = founderMode.getUIConfig();

      expect(config.id).toBe('founder_mode');
      expect(config.consumer.icon).toBe('📢');
      expect(config.consumer.label).toBe('Share Update');
      expect(config.advanced.icon).toBe('👨‍💼');
      expect(config.advanced.label).toBe('Founder Mode');
    });

    it('should include all audiences', () => {
      const config = founderMode.getUIConfig();

      expect(config.audiences).toHaveLength(5);
      expect(config.audiences.map(a => a.id)).toEqual(
        expect.arrayContaining(['investor', 'team', 'media', 'customer', 'advisor'])
      );
    });

    it('should include all tone options', () => {
      const config = founderMode.getUIConfig();

      expect(config.toneOptions).toHaveLength(5);
      expect(config.toneOptions.map(t => t.id)).toEqual(
        expect.arrayContaining(['confident', 'humble', 'urgent', 'celebratory', 'transparent'])
      );
    });
  });

  describe('getTemplates()', () => {
    it('should return investor templates', () => {
      const templates = founderMode.getTemplates('investor');

      expect(templates).toHaveLength(4);
      expect(templates[0].id).toBe('metrics_update');
    });

    it('should return team templates', () => {
      const templates = founderMode.getTemplates('team');

      expect(templates).toHaveLength(4);
      expect(templates[0].id).toBe('all_hands');
    });

    it('should return media templates', () => {
      const templates = founderMode.getTemplates('media');

      expect(templates).toHaveLength(3);
    });

    it('should default to investor templates for unknown audience', () => {
      const templates = founderMode.getTemplates('unknown');

      expect(templates).toHaveLength(4); // Same as investor
    });
  });

  describe('getMilestoneTypes()', () => {
    it('should return all milestone types', () => {
      const types = founderMode.getMilestoneTypes();

      expect(types).toHaveLength(6);
      expect(types.map(t => t.id)).toEqual(
        expect.arrayContaining(['product', 'revenue', 'user', 'funding', 'team', 'partner'])
      );
    });

    it('should include examples for each type', () => {
      const types = founderMode.getMilestoneTypes();

      types.forEach(type => {
        expect(type.examples).toBeDefined();
        expect(type.examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateContent()', () => {
    it('should generate content for investor audience', async () => {
      const result = await founderMode.generateContent({
        text: 'Weekly metrics update',
        audience: 'investor',
        tone: 'confident',
        userId: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.metadata.audience).toBe('investor');
      expect(result.metadata.tone).toBe('confident');
    });

    it('should generate content for team audience', async () => {
      const result = await founderMode.generateContent({
        text: 'All hands meeting notes',
        audience: 'team',
        tone: 'humble',
        userId: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.metadata.audience).toBe('team');
    });

    it('should generate content for media audience', async () => {
      const result = await founderMode.generateContent({
        text: 'Press release for new feature',
        audience: 'media',
        tone: 'celebratory',
        userId: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.metadata.audience).toBe('media');
    });

    it('should use fallback when services unavailable', async () => {
      // Create founder mode with unreachable services
      const offlineMode = new FounderMode(mockLogger, {
        genieGateway: 'http://localhost:9999',
        maxLength: 280
      });

      const result = await offlineMode.generateContent({
        text: 'Test update',
        audience: 'investor',
        tone: 'confident',
        userId: 'user-1'
      });

      // Should still return something (fallback or content)
      expect(result.success).toBe(true);
      expect(result.content || result.fallback).toBeDefined();
    });
  });

  describe('getStats()', () => {
    it('should track total requests', async () => {
      // Generate a few contents
      await founderMode.generateContent({
        audience: 'investor',
        tone: 'confident',
        userId: 'user-1'
      });

      const stats = founderMode.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.generatedContent).toBeGreaterThan(0);
    });
  });
});
