// ============================================================================
// HOJAI VOICE PLATFORM - Telecom Factory
// ============================================================================

import {
  TelecomProvider,
  OutboundCallRequest,
  InboundCallEvent,
  WebhookPayload,
  CallStatus,
} from '../types';
import { TwilioAdapter, getTwilioAdapter } from './twilio.adapter';
import { ExotelAdapter, getExotelAdapter } from './exotel.adapter';
import { KnowlarityAdapter, getKnowlarityAdapter } from './knowlarity.adapter';

/**
 * Telecom Factory - Manages telecom provider adapters
 */
export class TelecomFactory {
  private adapters: Map<TelecomProvider, TwilioAdapter | ExotelAdapter | KnowlarityAdapter>;
  private defaultProvider: TelecomProvider;

  constructor() {
    this.adapters = new Map();
    this.defaultProvider = 'twilio';
  }

  /**
   * Initialize adapters
   */
  initialize(): void {
    this.adapters.set('twilio', getTwilioAdapter());
    this.adapters.set('exotel', getExotelAdapter());
    this.adapters.set('knowlarity', getKnowlarityAdapter());
  }

  /**
   * Get adapter by provider
   */
  getAdapter(provider?: TelecomProvider): TwilioAdapter | ExotelAdapter | KnowlarityAdapter {
    const adapter = this.adapters.get(provider || this.defaultProvider);
    if (!adapter) {
      throw new Error(`Unknown telecom provider: ${provider}`);
    }
    return adapter;
  }

  /**
   * Set default provider
   */
  setDefaultProvider(provider: TelecomProvider): void {
    this.defaultProvider = provider;
  }

  /**
   * Make outbound call
   */
  async makeCall(request: OutboundCallRequest, provider?: TelecomProvider): Promise<{
    callId: string;
    status: string;
    provider: TelecomProvider;
  }> {
    const adapter = this.getAdapter(provider);
    const result = await adapter.makeCall(request);
    return {
      ...result,
      provider: provider || this.defaultProvider,
    };
  }

  /**
   * Get call status
   */
  async getCallStatus(
    callId: string,
    provider?: TelecomProvider
  ): Promise<{
    callId: string;
    status: CallStatus;
    duration?: number;
    recordingUrl?: string;
  }> {
    const adapter = this.getAdapter(provider);
    return adapter.getCallStatus(callId);
  }

  /**
   * End call
   */
  async endCall(callId: string, provider?: TelecomProvider): Promise<boolean> {
    const adapter = this.getAdapter(provider);
    return adapter.endCall(callId);
  }

  /**
   * Transfer call
   */
  async transferCall(callId: string, toNumber: string, provider?: TelecomProvider): Promise<boolean> {
    const adapter = this.getAdapter(provider);
    return adapter.transferCall(callId, toNumber);
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: WebhookPayload, provider?: TelecomProvider): InboundCallEvent {
    const adapter = this.getAdapter(provider);
    return adapter.parseWebhook(payload);
  }

  /**
   * Parse status webhook
   */
  parseStatusWebhook(
    payload: WebhookPayload,
    provider?: TelecomProvider
  ): {
    callId: string;
    status: CallStatus;
    duration?: number;
    recordingUrl?: string;
  } {
    const adapter = this.getAdapter(provider);
    return adapter.parseStatusWebhook(payload);
  }

  /**
   * Generate voice XML
   */
  generateXML(
    options: {
      voice?: string;
      language?: string;
    },
    provider?: TelecomProvider
  ): string {
    const adapter = this.getAdapter(provider);
    if ('generateTwiML' in adapter) {
      return (adapter as TwilioAdapter).generateTwiML(options);
    }
    if ('generateXML' in adapter) {
      return (adapter as ExotelAdapter | KnowlarityAdapter).generateXML(options);
    }
    return '';
  }

  /**
   * Generate audio XML
   */
  generateAudioXML(audioUrl: string, provider?: TelecomProvider): string {
    const adapter = this.getAdapter(provider);
    if ('generateAudioTwiML' in adapter) {
      return (adapter as TwilioAdapter).generateAudioTwiML(audioUrl);
    }
    if ('generateAudioXML' in adapter) {
      return (adapter as ExotelAdapter | KnowlarityAdapter).generateAudioXML(audioUrl);
    }
    return '';
  }

  /**
   * Generate gather XML
   */
  generateGatherXML(
    prompt: string,
    actionUrl: string,
    options?: {
      voice?: string;
      language?: string;
      timeout?: number;
      maxDigits?: number;
    },
    provider?: TelecomProvider
  ): string {
    const adapter = this.getAdapter(provider);
    if ('generateGatherTwiML' in adapter) {
      return (adapter as TwilioAdapter).generateGatherTwiML(prompt, actionUrl, options);
    }
    if ('generateGatherXML' in adapter) {
      return (adapter as ExotelAdapter | KnowlarityAdapter).generateGatherXML(prompt, actionUrl, options);
    }
    return '';
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): Array<{
    provider: TelecomProvider;
    name: string;
    supported: boolean;
  }> {
    const providers: Array<{
      provider: TelecomProvider;
      name: string;
      supported: boolean;
    }> = [];

    for (const [provider, adapter] of this.adapters.entries()) {
      providers.push(adapter.getProviderInfo());
    }

    return providers;
  }

  /**
   * Health check all providers
   */
  async healthCheck(): Promise<Record<TelecomProvider, boolean>> {
    const results: Partial<Record<TelecomProvider, boolean>> = {};

    for (const [provider, adapter] of this.adapters.entries()) {
      try {
        results[provider] = await adapter.healthCheck();
      } catch {
        results[provider] = false;
      }
    }

    return results as Record<TelecomProvider, boolean>;
  }
}

// Singleton instance
let telecomFactoryInstance: TelecomFactory | null = null;

export function getTelecomFactory(): TelecomFactory {
  if (!telecomFactoryInstance) {
    telecomFactoryInstance = new TelecomFactory();
    telecomFactoryInstance.initialize();
  }
  return telecomFactoryInstance;
}

export { TwilioAdapter, getTwilioAdapter } from './twilio.adapter';
export { ExotelAdapter, getExotelAdapter } from './exotel.adapter';
export { KnowlarityAdapter, getKnowlarityAdapter } from './knowlarity.adapter';
