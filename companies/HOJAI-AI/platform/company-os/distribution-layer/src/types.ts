/**
 * Distribution Layer Types
 *
 * Connects CompanyOS to:
 * - Consumer Apps (DO, REZ, Nuqta, BuzzLocal, etc.)
 * - Super Apps
 * - Agentic Commerce Networks
 * - B2B Platforms
 * - Global Nexus Federation
 */

// ============================================
// Distribution Channels
// ============================================

export type ChannelType =
  | 'consumer_app'          // DO, REZ, Nuqta
  | 'super_app'             // Multi-tenant super apps
  | 'agentic_commerce'      // AI-to-AI commerce (Nexha)
  | 'b2b_platform'          // B2B marketplaces
  | 'global_nexus'          // Cross-border federation
  | 'social_commerce'       // Social media
  | 'marketplace'           // Multi-vendor
  | 'direct';               // Direct-to-consumer

export interface DistributionChannel {
  id: string;
  name: string;
  type: ChannelType;
  baseUrl: string;
  apiKey?: string;
  isActive: boolean;
  capabilities: string[];
  industries: string[];      // Which industries this supports
}

// ============================================
// Sync Items
// ============================================

export interface ProductSync {
  channelId: string;
  companyId: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  inStock: boolean;
  syncedAt: string;
  status: 'pending' | 'synced' | 'failed';
  channelProductId?: string;
  errorMessage?: string;
}

export interface OrderSync {
  channelId: string;
  companyId: string;
  channelOrderId: string;
  externalOrderId: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  currency: string;
  status: 'received' | 'processing' | 'completed' | 'cancelled';
  receivedAt: string;
}

// ============================================
// Channel Registry
// ============================================

export interface ChannelConfig {
  channel: DistributionChannel;
  syncSettings: {
    autoSyncProducts: boolean;
    autoSyncInventory: boolean;
    autoSyncOrders: boolean;
    syncInterval: number;        // minutes
  };
  mapping: {
    productCategoryMap: Record<string, string>;
    orderStatusMap: Record<string, string>;
  };
}