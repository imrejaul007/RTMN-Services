/**
 * Voice Commands Tests
 */

import { describe, it, expect } from 'vitest';
import { VoiceCommandParser } from '../src/services/commandParser.js';

describe('VoiceCommandParser', () => {
  const parser = new VoiceCommandParser();

  describe('parse', () => {
    it('should parse new line command', () => {
      const result = parser.parse('hello new line world');
      expect(result.commands.length).toBeGreaterThan(0);
    });

    it('should parse period command', () => {
      const result = parser.parse('hello period world');
      expect(result.commands.some((c: any) => c.action === 'period')).toBe(true);
    });

    it('should parse comma command', () => {
      const result = parser.parse('hello comma world');
      expect(result.commands.some((c: any) => c.action === 'comma')).toBe(true);
    });

    it('should parse delete that command', () => {
      const result = parser.parse('hello delete that');
      expect(result.commands.some((c: any) => c.action === 'delete')).toBe(true);
    });

    it('should parse scratch that command', () => {
      const result = parser.parse('hello scratch that');
      expect(result.commands.some((c: any) => c.action === 'scratch_that')).toBe(true);
    });

    it('should parse select all command', () => {
      const result = parser.parse('select all');
      expect(result.commands.some((c: any) => c.action === 'select_all')).toBe(true);
    });

    it('should parse AI command summarize', () => {
      const result = parser.parse('summarize this text');
      expect(result.commands.some((c: any) => c.action === 'summarize')).toBe(true);
    });

    it('should return cleaned transcript', () => {
      const result = parser.parse('hello new line world');
      expect(result.cleanedTranscript).toContain('Hello'); // Auto-capitalized
      expect(result.cleanedTranscript).not.toContain('new line');
    });
  });

  describe('detectAICommand', () => {
    it('should detect translate command', () => {
      const cmd = parser.detectAICommand('translate to french');
      expect(cmd).toBeTruthy();
      expect(cmd?.action).toBe('translate');
    });

    it('should detect send command', () => {
      const cmd = parser.detectAICommand('send this email');
      expect(cmd).toBeTruthy();
      expect(cmd?.action).toBe('send');
    });

    it('should return null for non-AI', () => {
      const cmd = parser.detectAICommand('hello world');
      expect(cmd).toBeNull();
    });
  });

  describe('executeCommand', () => {
    it('should execute format command', () => {
      const result = parser.executeCommand(
        { type: 'format', raw: 'period', action: 'period', value: '.' },
        'hello world',
        5
      );
      expect(result.text).toContain('.');
    });

    it('should execute navigation to start', () => {
      const result = parser.executeCommand(
        { type: 'navigation', raw: 'go to start', action: 'go_to_start' },
        'hello world',
        11
      );
      expect(result.cursorPosition).toBe(0);
    });
  });

  describe('getAICCommands', () => {
    it('should return AI commands', () => {
      const cmds = parser.getAICCommands();
      expect(cmds.length).toBeGreaterThan(5);
      expect(cmds).toContain('translate');
      expect(cmds).toContain('summarize');
    });
  });
});
