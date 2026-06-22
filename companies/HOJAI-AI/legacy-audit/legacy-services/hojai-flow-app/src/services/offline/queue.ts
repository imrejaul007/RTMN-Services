/**
 * Offline Queue - Queue actions when offline
 *
 * Features:
 * - Queue actions when offline
 * - Sync when back online
 * - Persist to AsyncStorage
 * - Retry failed actions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { flowApi } from '../api/client';

const QUEUE_KEY = 'hojai_offline_queue';
const MAX_RETRIES = 3;

interface QueuedAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  data: object;
  retries: number;
  createdAt: number;
}

class OfflineQueue {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private isOnline = true;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.init();
  }

  /**
   * Initialize queue
   */
  private async init() {
    // Load queue from storage
    await this.loadQueue();

    // Listen for network changes
    this.unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Process queue when coming back online
      if (wasOffline && this.isOnline) {
        this.processQueue();
      }
    });
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (e) {
      console.error('[Queue] Load failed:', e);
      this.queue = [];
    }
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error('[Queue] Save failed:', e);
    }
  }

  /**
   * Add action to queue
   */
  async add(action: Omit<QueuedAction, 'id' | 'retries' | 'createdAt'>): Promise<string> {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queuedAction: QueuedAction = {
      ...action,
      id,
      retries: 0,
      createdAt: Date.now(),
    };

    this.queue.push(queuedAction);
    await this.saveQueue();

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Process queue
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.isProcessing = true;
    console.log(`[Queue] Processing ${this.queue.length} items`);

    const processedIds: string[] = [];
    const failedActions: QueuedAction[] = [];

    for (const action of this.queue) {
      try {
        await this.executeAction(action);
        processedIds.push(action.id);
        console.log(`[Queue] Executed: ${action.id}`);
      } catch (e) {
        console.error(`[Queue] Failed: ${action.id}`, e);

        action.retries++;

        if (action.retries < MAX_RETRIES) {
          failedActions.push(action);
        } else {
          console.error(`[Queue] Max retries reached for: ${action.id}`);
        }
      }
    }

    // Remove processed actions
    this.queue = failedActions;
    await this.saveQueue();

    this.isProcessing = false;
    console.log(`[Queue] Done. Remaining: ${this.queue.length}`);
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: QueuedAction) {
    switch (action.method) {
      case 'POST':
        await flowApi.post(action.endpoint, action.data);
        break;
      case 'PATCH':
        await flowApi.patch(action.endpoint, action.data);
        break;
      case 'DELETE':
        await flowApi.delete(action.endpoint);
        break;
    }
  }

  /**
   * Remove action from queue
   */
  async remove(id: string) {
    this.queue = this.queue.filter((a) => a.id !== id);
    await this.saveQueue();
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      items: this.queue,
    };
  }

  /**
   * Clear queue
   */
  async clear() {
    this.queue = [];
    await this.saveQueue();
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export const offlineQueue = new OfflineQueue();
export default offlineQueue;
