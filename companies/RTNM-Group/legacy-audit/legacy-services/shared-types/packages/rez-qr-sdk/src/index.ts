/**
 * REZ QR SDK - Unified SDK for all REZ QR systems
 *
 * Supports:
 * - Room QR (Hotel room service, checkout, feedback)
 * - Menu QR (Restaurant menu, ordering, split bill)
 * - Rez Now (Linktree-style store profiles)
 * - Ads QR (Campaigns, rewards, attribution)
 * - AI Services (Recommendations, chat, intent detection)
 * - Auth (OTP login, session management)
 * - Wallet (Balance, payments, transactions)
 */

import { QRClient } from './modules/client';
import { RoomModule } from './modules/room';
import { MenuModule } from './modules/menu';
import { StoreModule } from './modules/store';
import { CampaignModule } from './modules/campaign';
import { AIModule } from './modules/ai';
import { AuthModule } from './modules/auth';
import { WalletModule } from './modules/wallet';
import { environments, getEnvironment, type Environment, type ServiceUrls } from './config/environments';
import type { QRConfig } from './types';

// Re-export types
export * from './types';

// Re-export environment config
export { environments, getEnvironment };
export type { Environment, ServiceUrls };

/**
 * Main QR SDK class
 */
export class QRSDK {
  private client: QRClient;
  private _room: RoomModule | null = null;
  private _menu: MenuModule | null = null;
  private _store: StoreModule | null = null;
  private _campaign: CampaignModule | null = null;
  private _ai: AIModule | null = null;
  private _auth: AuthModule | null = null;
  private _wallet: WalletModule | null = null;

  constructor(config: QRConfig = {}) {
    // Resolve URLs based on environment or override
    const urls = resolveUrls(config);

    // Create base client
    this.client = new QRClient({
      baseUrl: urls.apiUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
      debug: config.debug,
    });
  }

  /**
   * Room QR module - Hotel room service, checkout, feedback
   */
  get room(): RoomModule {
    if (!this._room) {
      this._room = new RoomModule(this.client);
    }
    return this._room;
  }

  /**
   * Menu QR module - Restaurant menu, ordering, split bill
   */
  get menu(): MenuModule {
    if (!this._menu) {
      this._menu = new MenuModule(this.client);
    }
    return this._menu;
  }

  /**
   * Store QR module (Rez Now) - Linktree-style profiles
   */
  get store(): StoreModule {
    if (!this._store) {
      this._store = new StoreModule(this.client);
    }
    return this._store;
  }

  /**
   * Campaign QR module (Ads) - Campaigns, rewards, attribution
   */
  get campaign(): CampaignModule {
    if (!this._campaign) {
      this._campaign = new CampaignModule(this.client);
    }
    return this._campaign;
  }

  /**
   * AI module - Recommendations, chat, intent detection
   */
  get ai(): AIModule {
    if (!this._ai) {
      const env = getEnvironmentFromConfig(this._getConfig());
      const intentUrl = this._getConfig().intentUrl || environments[env]?.services.intentUrl;
      this._ai = new AIModule(this.client, intentUrl);
    }
    return this._ai;
  }

  /**
   * Auth module - OTP login, session management
   */
  get auth(): AuthModule {
    if (!this._auth) {
      this._auth = new AuthModule(this.client);
    }
    return this._auth;
  }

  /**
   * Wallet module - Balance, payments, transactions
   */
  get wallet(): WalletModule {
    if (!this._wallet) {
      this._wallet = new WalletModule(this.client);
    }
    return this._wallet;
  }

  /**
   * Create a client with custom base URL
   */
  createClient(baseUrl: string): QRClient {
    return new QRClient({ baseUrl, apiKey: this._getConfig().apiKey });
  }

  /**
   * Get configuration (internal)
   */
  private _getConfig(): QRConfig {
    return { apiKey: this._clientHeaders() } as QRConfig;
  }

  /**
   * Get client headers (for API key propagation)
   */
  private _clientHeaders(): string | undefined {
    return undefined; // Client handles headers internally
  }
}

/**
 * Resolve URLs from config or environment
 */
function resolveUrls(config: QRConfig): ServiceUrls {
  const env = getEnvironmentFromConfig(config);
  const defaultUrls = environments[env]?.services;

  return {
    apiUrl: config.baseUrl || defaultUrls.apiUrl,
    walletUrl: config.walletUrl || defaultUrls.walletUrl,
    paymentUrl: config.paymentUrl || defaultUrls.paymentUrl,
    authUrl: config.authUrl || defaultUrls.authUrl,
    merchantUrl: config.merchantUrl || defaultUrls.merchantUrl,
    intentUrl: config.intentUrl || defaultUrls.intentUrl,
    chatUrl: config.chatUrl || defaultUrls.chatUrl,
    knowledgeBaseUrl: config.knowledgeBaseUrl || defaultUrls.knowledgeBaseUrl,
  };
}

/**
 * Get environment from config
 */
function getEnvironmentFromConfig(config: QRConfig): 'development' | 'staging' | 'production' {
  return config.environment || 'production';
}

// Named exports for tree-shaking
export const createQRSDK = (config?: QRConfig) => new QRSDK(config);

// Default export
export default QRSDK;
