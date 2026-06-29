/**
 * App Detection Tests
 */

import { describe, it, expect } from 'vitest';
import { AppDetector } from '../src/services/appDetector.js';

describe('AppDetector', () => {
  const createDetector = () => new AppDetector();

  describe('detectAppFromTitle', () => {
    it('should detect Slack from title', () => {
      const detector = createDetector();
      const appId = detector.detectAppFromTitle('Slack - #general');
      expect(appId).toBe('slack');
    });

    it('should detect VS Code from title', () => {
      const detector = createDetector();
      const appId = detector.detectAppFromTitle('Visual Studio Code - main.ts');
      expect(appId).toBe('vscode');
    });

    it('should detect Notion from title', () => {
      const detector = createDetector();
      const appId = detector.detectAppFromTitle('Notion - Meeting Notes');
      expect(appId).toBe('notion');
    });

    it('should default to browser', () => {
      const detector = createDetector();
      const appId = detector.detectAppFromTitle('Random App');
      expect(appId).toBe('browser');
    });
  });

  describe('getAppContext', () => {
    it('should return app context with actions', () => {
      const detector = createDetector();
      const context = detector.getAppContext('slack');

      expect(context.appId).toBe('slack');
      expect(context.appName).toBe('Slack');
      expect(context.appCategory).toBe('communication');
      expect(context.availableActions.length).toBeGreaterThan(0);
    });

    it('should include send message action for Slack', () => {
      const detector = createDetector();
      const context = detector.getAppContext('slack');

      const sendAction = context.availableActions.find(a => a.name === 'Send Message');
      expect(sendAction).toBeDefined();
    });
  });

  describe('detectInlineCommand', () => {
    it('should detect make shorter command', () => {
      const detector = createDetector();
      const cmd = detector.detectInlineCommand('make this shorter', 'communication');

      expect(cmd).toBeDefined();
      expect(cmd!.id).toBe('shorter');
    });

    it('should detect formal command', () => {
      const detector = createDetector();
      const cmd = detector.detectInlineCommand('make it more formal', 'communication');

      expect(cmd).toBeDefined();
      expect(cmd!.id).toBe('formal');
    });

    it('should return null for unrecognized command', () => {
      const detector = createDetector();
      const cmd = detector.detectInlineCommand('random text', 'communication');

      expect(cmd).toBeNull();
    });
  });

  describe('processVoiceInput', () => {
    it('should detect inline command', () => {
      const detector = createDetector();
      const result = detector.processVoiceInput('make this shorter', 'slack', 'some selected text');

      expect(result.type).toBe('inline_command');
      expect(result.inlineCommand).toBeDefined();
    });

    it('should detect app action', () => {
      const detector = createDetector();
      const result = detector.processVoiceInput('send this message', 'slack', 'hello');

      expect(result.type).toBe('app_action');
      expect(result.action).toBeDefined();
    });

    it('should return general for unrecognized input', () => {
      const detector = createDetector();
      const result = detector.processVoiceInput('hello world', 'slack');

      expect(result.type).toBe('general');
    });
  });

  describe('getSupportedApps', () => {
    it('should return list of supported apps', () => {
      const detector = createDetector();
      const apps = detector.getSupportedApps();

      expect(apps.length).toBeGreaterThan(5);
      expect(apps.some(a => a.id === 'slack')).toBe(true);
      expect(apps.some(a => a.id === 'notion')).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    it('should recommend VS Code for coding context', () => {
      const detector = createDetector();
      const recs = detector.getRecommendations('I need to write some code');

      expect(recs.some(r => r.appId === 'vscode')).toBe(true);
    });

    it('should recommend Slack for messaging context', () => {
      const detector = createDetector();
      const recs = detector.getRecommendations('I need to message my team');

      expect(recs.some(r => r.appId === 'slack')).toBe(true);
    });
  });
});
