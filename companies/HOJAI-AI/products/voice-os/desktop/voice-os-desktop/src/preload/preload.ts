/**
 * Preload script - Bridge between main and renderer
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose API to renderer
contextBridge.exposeInMainWorld('voiceOS', {
  // Overlay control
  hide: () => ipcRenderer.send('hide-overlay'),
  show: () => ipcRenderer.send('show-overlay'),
  toggle: () => ipcRenderer.send('toggle-overlay'),
  isVisible: () => ipcRenderer.invoke('is-overlay-visible'),

  // Listen for events
  onVisible: (callback: (visible: boolean) => void) => {
    ipcRenderer.on('overlay-visible', (_event, visible) => callback(visible));
  },

  // Voice API
  speak: async (text: string) => {
    const response = await fetch('http://localhost:4898/api/voice/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'desktop', input: text }),
    });
    return response.json();
  },

  // Commands API
  parseCommands: async (transcript: string) => {
    const response = await fetch('http://localhost:4885/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });
    return response.json();
  },

  // Memory API
  remember: async (key: string, value: unknown) => {
    await fetch('http://localhost:4703/api/memory/remember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'desktop', key, value }),
    });
  },

  recall: async (key: string) => {
    const response = await fetch(`http://localhost:4703/api/memory/desktop/${key}`);
    return response.json();
  },
});
