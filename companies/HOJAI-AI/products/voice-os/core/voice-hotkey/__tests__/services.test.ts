/**
 * Voice Hotkey Tests
 */

import { describe, it, expect } from 'vitest';
import { VoiceHotkeyManager } from '../src/services/hotkeyManager.js';

describe('VoiceHotkeyManager', () => {
  const createManager = () => new VoiceHotkeyManager();

  describe('overlay state', () => {
    it('should get initial overlay state', () => {
      const manager = createManager();
      const state = manager.getOverlayState();

      expect(state.visible).toBe(false);
      expect(state.mode).toBe('idle');
    });

    it('should toggle overlay', () => {
      const manager = createManager();

      manager.showOverlay();
      expect(manager.getOverlayState().visible).toBe(true);

      manager.toggleOverlay();
      expect(manager.getOverlayState().visible).toBe(false);
    });

    it('should show and hide overlay', () => {
      const manager = createManager();

      manager.showOverlay();
      expect(manager.getOverlayState().visible).toBe(true);

      manager.hideOverlay();
      expect(manager.getOverlayState().visible).toBe(false);
      expect(manager.getOverlayState().mode).toBe('idle');
    });
  });

  describe('listening mode', () => {
    it('should start listening', () => {
      const manager = createManager();
      const state = manager.startListening({ appId: 'slack', appName: 'Slack', windowTitle: '#general' });

      expect(state.mode).toBe('listening');
      expect(state.visible).toBe(true);
      expect(state.appContext?.appId).toBe('slack');
    });
  });

  describe('transcript', () => {
    it('should update partial transcript', () => {
      const manager = createManager();
      manager.updateTranscript('Hello', true);

      expect(manager.getOverlayState().partialTranscript).toBe('Hello');
    });

    it('should update full transcript', () => {
      const manager = createManager();
      manager.updateTranscript('Hello world', false);

      expect(manager.getOverlayState().transcript).toBe('Hello world');
      expect(manager.getOverlayState().partialTranscript).toBe('');
    });
  });

  describe('sessions', () => {
    it('should create session', () => {
      const manager = createManager();
      const session = manager.createSession('user-1');

      expect(session.userId).toBe('user-1');
      expect(session.id).toBeTruthy();
      expect(session.startedAt).toBeTruthy();
    });

    it('should add to transcript', () => {
      const manager = createManager();
      const session = manager.createSession('user-1');
      manager.addToSession(session.id, 'Hello');

      expect(manager.getSession(session.id)?.transcript).toContain('Hello');
    });

    it('should end session with duration', () => {
      const manager = createManager();
      const session = manager.createSession('user-1');

      // Small delay
      const ended = manager.endSession(session.id);

      expect(ended?.endedAt).toBeTruthy();
      expect(ended?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('quick commands', () => {
    it('should get default quick commands', () => {
      const manager = createManager();
      const commands = manager.getQuickCommands();

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should detect quick command', () => {
      const manager = createManager();
      const cmd = manager.detectQuickCommand('order food');

      expect(cmd).toBeTruthy();
      expect(cmd?.action).toContain('do-app');
    });

    it('should add and remove quick command', () => {
      const manager = createManager();
      const initialCount = manager.getQuickCommands().length;

      const newCmd = manager.addQuickCommand({
        name: 'Test Command',
        phrase: 'test',
        action: 'test:run',
      });

      expect(manager.getQuickCommands().length).toBe(initialCount + 1);

      manager.removeQuickCommand(newCmd.id);
      expect(manager.getQuickCommands().length).toBe(initialCount);
    });
  });

  describe('hotkey config', () => {
    it('should get mac hotkeys', () => {
      const manager = createManager();
      const hotkeys = manager.getHotkeyConfig('mac');

      expect(hotkeys.length).toBeGreaterThan(0);
      expect(hotkeys[0].modifiers).toContain('alt');
    });

    it('should get windows hotkeys', () => {
      const manager = createManager();
      const hotkeys = manager.getHotkeyConfig('windows');

      expect(hotkeys.length).toBeGreaterThan(0);
      expect(hotkeys[0].modifiers).toContain('ctrl');
    });
  });
});
