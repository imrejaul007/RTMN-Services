/**
 * Distribution Channels Registry
 *
 * Pre-configured channels for common consumer apps and networks.
 */

import { DistributionChannel, ChannelConfig } from './types';

// ============================================
// Default Channel Configurations
// ============================================

export const DEFAULT_CHANNELS: DistributionChannel[] = [
  // ============================================
  // CONSUMER APPS
  // ============================================
  {
    id: 'do',
    name: 'DO (Digital Operator)',
    type: 'consumer_app',
    baseUrl: process.env.DO_API_URL || 'http://localhost:3001',
    capabilities: ['products', 'orders', 'chat', 'delivery'],
    industries: ['restaurant', 'beauty', 'retail', 'grocery'],
    isActive: true,
  },
  {
    id: 'rez',
    name: 'REZ (Consumer Rewards)',
    type: 'consumer_app',
    baseUrl: process.env.REZ_API_URL || 'http://localhost:4001',
    capabilities: ['loyalty', 'rewards', 'discovery', 'payments'],
    industries: ['*'],
    isActive: true,
  },
  {
    id: 'nuqta',
    name: 'Nuqta (Loyalty Network)',
    type: 'consumer_app',
    baseUrl: process.env.NUQTA_API_URL || 'http://localhost:4002',
    capabilities: ['loyalty', 'coupons', 'discovery'],
    industries: ['restaurant', 'retail', 'beauty'],
    isActive: true,
  },
  {
    id: 'buzzlocal',
    name: 'BuzzLocal (Local Discovery)',
    type: 'consumer_app',
    baseUrl: process.env.BUZZLOCAL_API_URL || 'http://localhost:4003',
    capabilities: ['discovery', 'reviews', 'local_search'],
    industries: ['restaurant', 'beauty', 'fitness', 'retail'],
    isActive: true,
  },
  {
    id: 'stayown',
    name: 'StayOwn (Hospitality)',
    type: 'consumer_app',
    baseUrl: process.env.STAYOWN_API_URL || 'http://localhost:4004',
    capabilities: ['booking', 'hospitality', 'experiences'],
    industries: ['hotel', 'travel'],
    isActive: true,
  },

  // ============================================
  // SUPER APPS
  // ============================================
  {
    id: 'airzy',
    name: 'Airzy (Super App)',
    type: 'super_app',
    baseUrl: process.env.AIRZY_API_URL || 'http://localhost:4010',
    capabilities: ['multi_tenant', 'messaging', 'payments'],
    industries: ['*'],
    isActive: true,
  },

  // ============================================
  // B2B PLATFORMS
  // ============================================
  {
    id: 'indiamart',
    name: 'IndiaMART (B2B)',
    type: 'b2b_platform',
    baseUrl: process.env.INDIAMART_API_URL || 'http://localhost:4020',
    capabilities: ['wholesale', 'rfq', 'supplier_discovery'],
    industries: ['manufacturing', 'retail', 'construction'],
    isActive: true,
  },
  {
    id: 'tradeindia',
    name: 'TradeIndia (B2B)',
    type: 'b2b_platform',
    baseUrl: process.env.TRADEINDIA_API_URL || 'http://localhost:4021',
    capabilities: ['wholesale', 'export', 'import'],
    industries: ['manufacturing', 'retail'],
    isActive: true,
  },

  // ============================================
  // AGENTIC COMMERCE
  // ============================================
  {
    id: 'nexha',
    name: 'Nexha (Agent-to-Agent)',
    type: 'agentic_commerce',
    baseUrl: process.env.NEXHA_API_URL || 'http://localhost:4270',
    capabilities: ['agent_discovery', 'negotiation', 'contracts', 'settlement'],
    industries: ['*'],
    isActive: true,
  },

  // ============================================
  // GLOBAL NEXUS
  // ============================================
  {
    id: 'global_nexus',
    name: 'Global Nexus Federation',
    type: 'global_nexus',
    baseUrl: process.env.GLOBAL_NEXUS_API_URL || 'http://localhost:5000',
    capabilities: ['cross_border', 'settlement', 'compliance', 'multi_currency'],
    industries: ['*'],
    isActive: true,
  },
];

// ============================================
// Channel Registry Service
// ============================================

class ChannelRegistry {
  private channels = new Map<string, DistributionChannel>();
  private configs = new Map<string, ChannelConfig>();

  constructor() {
    DEFAULT_CHANNELS.forEach(c => this.channels.set(c.id, c));
  }

  get(id: string): DistributionChannel | null {
    return this.channels.get(id) || null;
  }

  list(filter?: { type?: string; industry?: string }): DistributionChannel[] {
    let list = Array.from(this.channels.values());

    if (filter?.type) {
      list = list.filter(c => c.type === filter.type);
    }

    if (filter?.industry) {
      list = list.filter(c => c.industries.includes('*') || c.industries.includes(filter.industry!));
    }

    return list;
  }

  register(channel: DistributionChannel): void {
    this.channels.set(channel.id, channel);
  }

  setConfig(channelId: string, config: ChannelConfig): void {
    this.configs.set(channelId, config);
  }

  getConfig(channelId: string): ChannelConfig | null {
    return this.configs.get(channelId) || null;
  }

  /**
   * Get channels for an industry
   */
  getChannelsForIndustry(industry: string): DistributionChannel[] {
    return this.list({ industry });
  }

  /**
   * Get channels by type
   */
  getChannelsByType(type: string): DistributionChannel[] {
    return this.list({ type: type as any });
  }
}

export const channelRegistry = new ChannelRegistry();