/**
 * RAZO Keyboard - React Native Module
 *
 * Cross-platform keyboard integration:
 * - Voice input
 * - Predictive typing
 * - Genie AI
 * - Password autofill
 * - Sync
 */

import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';

// Types
export interface RazoConfig {
  userId: string;
  deviceId?: string;
  serverUrl?: string;
}

export interface Prediction {
  word: string;
  score: number;
}

export interface Suggestion {
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  action: string;
  data?: Record<string, any>;
}

export interface PasswordEntry {
  site: string;
  username: string;
  password: string;
}

export interface GenieResponse {
  answer: string;
  actions?: string[];
}

export interface SyncStatus {
  lastSync: number;
  pendingChanges: number;
  status: 'synced' | 'syncing' | 'error';
}

// States
export enum KeyboardState {
  DEFAULT = 'default',
  VOICE = 'voice',
  GENIE = 'genie',
  SUGGESTIONS = 'suggestions',
  LAUNCHER = 'launcher',
  ACTIONS = 'actions',
}

// RazoKeyboardModule
const { RazoKeyboardModule } = NativeModules;

class RazoKeyboard {
  private static instance: RazoKeyboard;
  private config: RazoConfig;
  private eventEmitter: NativeEventEmitter;
  private isInitialized = false;

  private constructor() {
    this.config = {
      userId: '',
      deviceId: undefined,
      serverUrl: 'http://localhost',
    };
    this.eventEmitter = new NativeEventEmitter(RazoKeyboardModule);
  }

  static getInstance(): RazoKeyboard {
    if (!RazoKeyboard.instance) {
      RazoKeyboard.instance = new RazoKeyboard();
    }
    return RazoKeyboard.instance;
  }

  // ==================== Initialization ====================

  async initialize(config: RazoConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    // Request permissions
    await this.requestPermissions();

    // Initialize native module
    if (RazoKeyboardModule) {
      await RazoKeyboardModule.initialize(this.config);
    }

    this.isInitialized = true;
  }

  private async requestPermissions(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        // Microphone permission
        const micPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'RAZO needs microphone access for voice input',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        // Storage permission (for sync data)
        if (Platform.Version < 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
          );
        }
      } catch (err) {
        console.warn('Permission error:', err);
      }
    }
  }

  // ==================== Voice Input ====================

  /**
   * Start voice input
   */
  async startVoiceInput(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('RazoKeyboard not initialized');
    }
    return RazoKeyboardModule?.startVoiceInput();
  }

  /**
   * Stop voice input
   */
  async stopVoiceInput(): Promise<void> {
    return RazoKeyboardModule?.stopVoiceInput();
  }

  /**
   * Process voice input and route to appropriate handler
   */
  async processVoice(text: string): Promise<{
    mode: 'voice_typing' | 'genie' | 'copilot' | 'action';
    text: string;
  }> {
    return RazoKeyboardModule?.processVoice(text);
  }

  // ==================== Predictions ====================

  /**
   * Get word predictions
   */
  async getPredictions(text: string): Promise<Prediction[]> {
    return RazoKeyboardModule?.getPredictions(text) ?? [];
  }

  /**
   * Get emoji predictions
   */
  async getEmojiPredictions(text: string): Promise<string[]> {
    return RazoKeyboardModule?.getEmojiPredictions(text) ?? [];
  }

  /**
   * Get smart completions
   */
  async getSmartCompletions(text: string): Promise<string[]> {
    return RazoKeyboardModule?.getSmartCompletions(text) ?? [];
  }

  // ==================== Suggestions ====================

  /**
   * Get context-aware suggestions
   */
  async getSuggestions(context?: string): Promise<Suggestion[]> {
    return RazoKeyboardModule?.getSuggestions(context) ?? [];
  }

  /**
   * Get Genie Briefs
   */
  async getGenieBriefs(): Promise<Suggestion[]> {
    return RazoKeyboardModule?.getGenieBriefs() ?? [];
  }

  /**
   * Get action cards
   */
  async getActionCards(context?: string): Promise<Suggestion[]> {
    return RazoKeyboardModule?.getActionCards(context) ?? [];
  }

  // ==================== Genie AI ====================

  /**
   * Ask Genie
   */
  async askGenie(command: string): Promise<GenieResponse> {
    return RazoKeyboardModule?.askGenie(command) ?? { answer: '' };
  }

  /**
   * Ask CoPilot
   */
  async askCoPilot(command: string): Promise<GenieResponse> {
    return RazoKeyboardModule?.askCoPilot(command) ?? { answer: '' };
  }

  // ==================== Vault ====================

  /**
   * Get saved password for site
   */
  async getPassword(site: string): Promise<PasswordEntry | null> {
    return RazoKeyboardModule?.getPassword(site) ?? null;
  }

  /**
   * Save password to vault
   */
  async savePassword(entry: PasswordEntry): Promise<boolean> {
    return RazoKeyboardModule?.savePassword(entry) ?? false;
  }

  /**
   * Delete password
   */
  async deletePassword(site: string): Promise<boolean> {
    return RazoKeyboardModule?.deletePassword(site) ?? false;
  }

  /**
   * Get all saved passwords
   */
  async listPasswords(): Promise<PasswordEntry[]> {
    return RazoKeyboardModule?.listPasswords() ?? [];
  }

  /**
   * Create passkey
   */
  async createPasskey(site: string): Promise<string> {
    return RazoKeyboardModule?.createPasskey(site) ?? '';
  }

  /**
   * Authenticate with passkey
   */
  async authenticateWithPasskey(site: string): Promise<boolean> {
    return RazoKeyboardModule?.authenticateWithPasskey(site) ?? false;
  }

  // ==================== Snippets ====================

  /**
   * Get snippet expansion
   */
  async expandSnippet(trigger: string): Promise<string | null> {
    return RazoKeyboardModule?.expandSnippet(trigger) ?? null;
  }

  /**
   * Add custom snippet
   */
  async addSnippet(trigger: string, expansion: string, category?: string): Promise<void> {
    return RazoKeyboardModule?.addSnippet(trigger, expansion, category);
  }

  /**
   * Get all snippets
   */
  async getSnippets(): Promise<Array<{ trigger: string; expansion: string }>> {
    return RazoKeyboardModule?.getSnippets() ?? [];
  }

  // ==================== Search ====================

  /**
   * Search across apps
   */
  async search(query: string): Promise<Array<{ app: string; title: string; url: string }>> {
    return RazoKeyboardModule?.search(query) ?? [];
  }

  /**
   * Launch app
   */
  async launchApp(appId: string): Promise<boolean> {
    return RazoKeyboardModule?.launchApp(appId) ?? false;
  }

  // ==================== Auth ====================

  /**
   * Authenticate with biometric
   */
  async authenticateWithBiometric(): Promise<boolean> {
    return RazoKeyboardModule?.authenticateWithBiometric() ?? false;
  }

  /**
   * Authenticate with CorpID
   */
  async authenticateWithCorpID(token: string): Promise<boolean> {
    return RazoKeyboardModule?.authenticateWithCorpID(token) ?? false;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return RazoKeyboardModule?.isAuthenticated() ?? false;
  }

  // ==================== Sync ====================

  /**
   * Sync user data
   */
  async sync(): Promise<void> {
    return RazoKeyboardModule?.sync();
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return RazoKeyboardModule?.getSyncStatus() ?? {
      lastSync: 0,
      pendingChanges: 0,
      status: 'synced',
    };
  }

  // ==================== Keyboard State ====================

  /**
   * Get current keyboard state
   */
  getState(): KeyboardState {
    return RazoKeyboardModule?.getState() ?? KeyboardState.DEFAULT;
  }

  /**
   * Set keyboard state
   */
  async setState(state: KeyboardState): Promise<void> {
    return RazoKeyboardModule?.setState(state);
  }

  // ==================== Event Listeners ====================

  /**
   * Listen to voice transcript updates
   */
  onTranscript(callback: (text: string) => void): () => void {
    const subscription = this.eventEmitter.addListener('onTranscript', callback);
    return () => subscription.remove();
  }

  /**
   * Listen to prediction updates
   */
  onPredictions(callback: (predictions: Prediction[]) => void): () => void {
    const subscription = this.eventEmitter.addListener('onPredictions', callback);
    return () => subscription.remove();
  }

  /**
   * Listen to suggestion updates
   */
  onSuggestions(callback: (suggestions: Suggestion[]) => void): () => void {
    const subscription = this.eventEmitter.addListener('onSuggestions', callback);
    return () => subscription.remove();
  }

  /**
   * Listen to Genie response
   */
  onGenieResponse(callback: (response: GenieResponse) => void): () => void {
    const subscription = this.eventEmitter.addListener('onGenieResponse', callback);
    return () => subscription.remove();
  }

  /**
   * Listen to sync status changes
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    const subscription = this.eventEmitter.addListener('onSyncStatusChange', callback);
    return () => subscription.remove();
  }

  /**
   * Listen to wake word detection
   */
  onWakeWord(callback: (word: string) => void): () => void {
    const subscription = this.eventEmitter.addListener('onWakeWord', callback);
    return () => subscription.remove();
  }
}

// Export singleton
export default RazoKeyboard.getInstance();
export { RazoKeyboard };
