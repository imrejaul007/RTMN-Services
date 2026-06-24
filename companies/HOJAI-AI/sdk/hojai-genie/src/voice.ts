/**
 * Genie Voice Client
 *
 * Wraps three services:
 *   - genie-wake-word-service       (port 4767) — "Hey Genie" / "हे जिनी"
 *   - genie-listening-modes         (port 4768) — Manual / Continuous / Passive / Smart
 *   - genie-device-integration      (port 4769) — Phones / Watches / Earbuds / Glasses / Cars
 *
 * Provides wake word detection, listening-mode switching, and device
 * registration for the multi-modal Genie experience.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type ListeningMode = 'manual' | 'continuous' | 'passive' | 'smart';

export type DeviceType = 'phone' | 'watch' | 'earbuds' | 'glasses' | 'car' | 'speaker' | 'desktop';

export interface Device {
  id: string;
  userId: string;
  type: DeviceType;
  name: string;
  /** Hardware identifier (MAC, UDID, etc.) — opaque to the SDK */
  hardwareId: string;
  active: boolean;
  registeredAt: string;
  lastSeenAt?: string;
  metadata?: Record<string, unknown>;
}

export interface WakeWordDetection {
  id: string;
  userId: string;
  deviceId: string;
  /** e.g. 'hey-genie' or 'हे जिनी' */
  phrase: string;
  confidence: number;
  detectedAt: string;
  audioSnippetUrl?: string;
}

export interface ListeningModeConfig {
  mode: ListeningMode;
  enabled: boolean;
  /** 'always', 'home', 'office', 'vehicle', or custom location */
  context?: string;
  /** Wake-word sensitivity 0-1 (smart mode only) */
  sensitivity?: number;
}

export class VoiceClient {
  constructor(private config: HojaiConfig) {}

  // -------- Wake word (genie-wake-word-service) --------

  /** List recent wake word detections. */
  async listDetections(input: { userId?: string; limit?: number } = {}): Promise<WakeWordDetection[]> {
    return request<WakeWordDetection[]>(this.config, 'GET', `/api/detections${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Get a single detection by id. */
  async getDetection(detectionId: string): Promise<WakeWordDetection> {
    return request<WakeWordDetection>(this.config, 'GET', `/api/detections/${encodeURIComponent(detectionId)}`);
  }

  /** Log a wake word detection (called by client devices). */
  async logDetection(input: Omit<WakeWordDetection, 'id' | 'detectedAt'>): Promise<WakeWordDetection> {
    return request<WakeWordDetection>(this.config, 'POST', '/api/detections', input);
  }

  // -------- Listening modes (genie-listening-modes) --------

  /** Get a user's current listening mode + config. */
  async getMode(userId: string): Promise<ListeningModeConfig> {
    return request<ListeningModeConfig>(this.config, 'GET', `/api/modes/${encodeURIComponent(userId)}`);
  }

  /** List all available listening modes (manual/continuous/passive/smart). */
  async listModes(): Promise<ListeningMode[]> {
    return request<ListeningMode[]>(this.config, 'GET', '/api/modes');
  }

  /** Set a user's listening mode + config. */
  async setMode(userId: string, config: ListeningModeConfig): Promise<ListeningModeConfig> {
    return request<ListeningModeConfig>(this.config, 'PUT', `/api/modes/${encodeURIComponent(userId)}`, config);
  }

  // -------- Device integration (genie-device-integration) --------

  /** Register a new device. */
  async registerDevice(input: Omit<Device, 'id' | 'active' | 'registeredAt'>): Promise<Device> {
    return request<Device>(this.config, 'POST', '/api/devices', input);
  }

  /** List a user's registered devices. */
  async listDevices(input: { userId?: string; type?: DeviceType; active?: boolean } = {}): Promise<Device[]> {
    return request<Device[]>(this.config, 'GET', `/api/devices${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Delete (unregister) a device. */
  async removeDevice(deviceId: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/devices/${encodeURIComponent(deviceId)}`);
  }
}
