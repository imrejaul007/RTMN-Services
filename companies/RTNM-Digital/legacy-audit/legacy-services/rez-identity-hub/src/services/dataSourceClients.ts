/**
 * Data Source API Clients
 *
 * Stub implementations for real API integration with all 25 data sources
 * In production, each client would make actual API calls to its respective service
 */

import axios, { AxiosInstance } from 'axios';
import { DATA_SOURCES } from '../models/knowledgeGraph.js';

// ==================== BASE CLIENT ====================

class DataSourceClient {
  protected client: AxiosInstance;
  protected sourceName: string;
  protected port: number;

  constructor(sourceName: string) {
    const config = DATA_SOURCES[sourceName];
    if (!config) throw new Error(`Unknown data source: ${sourceName}`);

    this.sourceName = sourceName;
    this.port = config.port;
    const apiKey = config.auth.key || '';

    this.client = axios.create({
      baseURL: `http://localhost:${this.port}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'REZ-Identity-Hub/2.0',
        'X-API-Key': apiKey
      }
    });
  }

  async fetchUserData(userId: string): Promise<Record<string, any> | null> {
    try {
      const response = await this.client.get(`/api/${userId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async fetchByPhone(phone: string): Promise<Record<string, any> | null> {
    try {
      const response = await this.client.get(`/api/phone/${encodeURIComponent(phone)}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async fetchByEmail(email: string): Promise<Record<string, any> | null> {
    try {
      const response = await this.client.get(`/api/email/${encodeURIComponent(email)}`);
      return response.data;
    } catch {
      return null;
    }
  }
}

// ==================== CLIENT IMPLEMENTATIONS ====================

class REZConsumerClient extends DataSourceClient {
  constructor() { super('rezConsumer'); }
}

class REZMerchantClient extends DataSourceClient {
  constructor() { super('rezMerchant'); }
}

class RabtulAuthClient extends DataSourceClient {
  constructor() { super('rabtulAuth'); }
}

class RabtulPaymentClient extends DataSourceClient {
  constructor() { super('rabtulPayment'); }
}

class RabtulWalletClient extends DataSourceClient {
  constructor() { super('rabtulWallet'); }
}

class CorpPerksClient extends DataSourceClient {
  constructor() { super('corpperks'); }
}

class NexhaClient extends DataSourceClient {
  constructor() { super('nexha'); }
}

class KHAIRMOVEClient extends DataSourceClient {
  constructor() { super('kHAIRMOVE'); }
}

class RisaCareClient extends DataSourceClient {
  constructor() { super('risaCare'); }
}

class StayOwnClient extends DataSourceClient {
  constructor() { super('stayOwn'); }
}

class RisnaEstateClient extends DataSourceClient {
  constructor() { super('risnaEstate'); }
}

class REZWorkspaceClient extends DataSourceClient {
  constructor() { super('rezWorkspace'); }
}

class ZEventsClient extends DataSourceClient {
  constructor() { super('zEvents'); }
}

class RIDZAClient extends DataSourceClient {
  constructor() { super('ridza'); }
}

class LawGensClient extends DataSourceClient {
  constructor() { super('lawGens'); }
}

class SADAClient extends DataSourceClient {
  constructor() { super('sada'); }
}

class SalarOSClient extends DataSourceClient {
  constructor() { super('salarOS'); }
}

class ShabAIClient extends DataSourceClient {
  constructor() { super('shabAI'); }
}

class GenieClient extends DataSourceClient {
  constructor() { super('genie'); }
}

class AssetMindClient extends DataSourceClient {
  constructor() { super('assetMind'); }
}

class REZSalesMindClient extends DataSourceClient {
  constructor() { super('rezSalesMind'); }
}

class HOJAIClient extends DataSourceClient {
  constructor() { super('hojaiMemory'); }
}

class REZIntelligenceClient extends DataSourceClient {
  constructor() { super('rezIntelligence'); }
}

class REETTrustClient extends DataSourceClient {
  constructor() { super('reeTrust'); }
}

class REEGrowthClient extends DataSourceClient {
  constructor() { super('reeGrowth'); }
}

class REZCRMClient extends DataSourceClient {
  constructor() { super('rezCRM'); }

  async fetchByEmail(email: string): Promise<Record<string, any> | null> {
    try {
      // REZ CRM Hub endpoint
      const response = await this.client.get(`/api/contacts?email=${encodeURIComponent(email)}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async getDealByContact(contactId: string): Promise<Record<string, any> | null> {
    try {
      const response = await this.client.get(`/api/contacts/${contactId}/deals`);
      return response.data;
    } catch {
      return null;
    }
  }

  async getConversationHistory(contactId: string): Promise<Record<string, any> | null> {
    try {
      const response = await this.client.get(`/api/contacts/${contactId}/conversations`);
      return response.data;
    } catch {
      return null;
    }
  }
}

// ==================== CLIENT FACTORY ====================

export const dataSourceClients: Record<string, DataSourceClient> = {
  rezConsumer: new REZConsumerClient(),
  rezMerchant: new REZMerchantClient(),
  rabtulAuth: new RabtulAuthClient(),
  rabtulPayment: new RabtulPaymentClient(),
  rabtulWallet: new RabtulWalletClient(),
  corpperks: new CorpPerksClient(),
  nexha: new NexhaClient(),
  kHAIRMOVE: new KHAIRMOVEClient(),
  risaCare: new RisaCareClient(),
  stayOwn: new StayOwnClient(),
  risnaEstate: new RisnaEstateClient(),
  rezWorkspace: new REZWorkspaceClient(),
  zEvents: new ZEventsClient(),
  ridza: new RIDZAClient(),
  lawGens: new LawGensClient(),
  sada: new SADAClient(),
  salarOS: new SalarOSClient(),
  shabAI: new ShabAIClient(),
  genie: new GenieClient(),
  assetMind: new AssetMindClient(),
  rezSalesMind: new REZSalesMindClient(),
  hojaiMemory: new HOJAIClient(),
  rezIntelligence: new REZIntelligenceClient(),
  reeTrust: new REETTrustClient(),
  reeGrowth: new REEGrowthClient(),
  rezCRM: new REZCRMClient()
};

// ==================== AGGREGATOR SERVICE ====================

export class DataAggregatorService {
  /**
   * Get data from a specific source
   */
  async getDataFromSource(sourceName: string, phone?: string, email?: string): Promise<any> {
    const client = dataSourceClients[sourceName];
    if (!client) return null;

    if (phone) return client.fetchByPhone(phone);
    if (email) return client.fetchByEmail(email);
    return null;
  }

  /**
   * Check health of all data sources
   */
  async checkSourceHealth(): Promise<Record<string, { status: string; latency: number }>> {
    const results: Record<string, { status: string; latency: number }> = {};

    for (const [name, client] of Object.entries(dataSourceClients)) {
      const start = Date.now();
      try {
        await client.fetchUserData('health-check');
        results[name] = { status: 'ok', latency: Date.now() - start };
      } catch {
        results[name] = { status: 'error', latency: Date.now() - start };
      }
    }

    return results;
  }
}

export const dataAggregatorService = new DataAggregatorService();