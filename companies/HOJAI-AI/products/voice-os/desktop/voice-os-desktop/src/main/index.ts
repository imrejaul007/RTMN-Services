/**
 * HOJAI VoiceOS Desktop - Main Process
 * Global hotkey + overlay control
 */

import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';

// Global state
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isOverlayVisible = false;

// Create main window (hidden by default)
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the overlay HTML
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'overlay.html'));

  // Position at bottom-right corner
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  mainWindow.setPosition(width - 620, height - 420);

  // Hide on blur
  mainWindow.on('blur', () => {
    if (isOverlayVisible) {
      hideOverlay();
    }
  });
}

// Show overlay
function showOverlay(): void {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    isOverlayVisible = true;
    mainWindow.webContents.send('overlay-visible', true);
  }
}

// Hide overlay
function hideOverlay(): void {
  if (mainWindow) {
    mainWindow.hide();
    isOverlayVisible = false;
    mainWindow.webContents.send('overlay-visible', false);
  }
}

// Toggle overlay
function toggleOverlay(): void {
  if (isOverlayVisible) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

// Create system tray
function createTray(): void {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');

  // Create a simple 16x16 icon if file doesn't exist
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADlSURBVDiNpZMxDoJAEEXfLBZaGBI9jS0ewNJoaewsrK0NNhQ2+gN2Yo1GExuDwd0Fu4RFIpJZZnYyk5nZ+WH+zOwCJoA7YA5YAj4Dq5QCw0AKODtnwBHQBRpAGXADfAJegGfgBXgH9oAukAUmQK4P1IASUAfyQKEL5IE8EOsC8wJQB2aBNlAEpoGZB9AHxoE0UANGQKYPHAFDIA0MAvU2EJoG0kAfKHVz0ASmgQ4w6QKTLpAApoC0m4MqkO0DCWC0C5SBKjDs5qAOFLv5B7h5Q7cL3H4H/gC7N3QLYLYPNAAAAABJRU5ErkJggg==') : icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show VoiceOS', click: showOverlay },
    { label: 'Toggle Voice', accelerator: 'Alt+Space', click: toggleOverlay },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setToolTip('HOJAI VoiceOS - Alt+Space to toggle');
  tray.setContextMenu(contextMenu);

  tray.on('click', toggleOverlay);
}

// Register global shortcuts
function registerShortcuts(): void {
  // Alt+Space - toggle voice overlay (Wispr Flow style)
  globalShortcut.register('Alt+Space', toggleOverlay);

  // Escape - hide overlay
  globalShortcut.register('Escape', () => {
    if (isOverlayVisible) hideOverlay();
  });

  console.log('✓ Global shortcuts registered: Alt+Space (toggle), Escape (hide)');
}

// IPC handlers
function setupIPC(): void {
  const { ipcMain } = require('electron');

  ipcMain.on('hide-overlay', hideOverlay);
  ipcMain.on('show-overlay', showOverlay);
  ipcMain.on('toggle-overlay', toggleOverlay);

  ipcMain.handle('is-overlay-visible', () => isOverlayVisible);
}

// App lifecycle
app.whenReady().then(() => {
  console.log('🚀 HOJAI VoiceOS Desktop starting...');
  createWindow();
  createTray();
  registerShortcuts();
  setupIPC();

  console.log('✓ HOJAI VoiceOS Desktop ready!');
  console.log('  Press Alt+Space to toggle voice overlay');
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Don't quit on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', toggleOverlay);
}
