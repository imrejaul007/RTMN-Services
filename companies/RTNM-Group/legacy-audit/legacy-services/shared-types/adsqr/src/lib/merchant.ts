/**
 * Merchant Integration Client for Ads QR
 *
 * Provides integration with Rez Merchant Service for:
 * - Campaign management
 * - Brand information
 * - Store locations for ads
 * - Campaign QR tracking
 * - Ad analytics
 *
 * Uses the @rez/merchant-sdk package for API access.
 */

import axios, { AxiosInstance } from 'axios';

const MERCHANT_API_BASE = process.env.NEXT_PUBLIC_MERCHANT_API_URL || 'https://api.rez.money/api/merchant';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MerchantCampaign {
  id: string;
  name: string;
  title?: string;
  description?: string;
  type: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  isActive?: boolean;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  budgetCap?: number;
  rewardValue?: number;
  rewardType?: string;
  targetSegment?: Record<string, unknown>;
  targetAudience?: Record<string, unknown>;
  priority?: number;
  cooldownDays?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignQRData {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  qrPayload: {
    type: string;
    campaignId: string;
    merchantId: string;
    action: string;
  };
  qrString: string;
  landingUrl: string;
  deepLink: string;
}

export interface MerchantStore {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string[];
  category: string;
  subcategories?: string[];
  location: {
    address: string;
    city: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number];
    landmark?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
  };
  operationalInfo?: {
    hours?: Record<string, { open: string; close: string }>;
    dineIn?: boolean;
    delivery?: boolean;
    takeaway?: boolean;
  };
  storeType?: 'restaurant' | 'cafe' | 'bakery' | 'salon' | 'spa' | 'retail' | 'other';
  acceptsOnlineOrders?: boolean;
  acceptsScanPay?: boolean;
  deliveryEnabled?: boolean;
  ratings?: { average: number; count: number };
  tags?: string[];
  features?: string[];
}

export interface StoreLocation {
  store: MerchantStore;
  distance?: number;
  isNearest?: boolean;
}

// ─── API Client ────────────────────────────────────────────────────────────────

/**
 * Creates an axios client for merchant API calls
 */
function createMerchantClient(): AxiosInstance {
  return axios.create({
    baseURL: MERCHANT_API_BASE,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

const client = createMerchantClient();

// ─── Campaign Operations ────────────────────────────────────────────────────────

/**
 * Get campaign by ID (public endpoint for QR codes)
 */
export async function getCampaignById(campaignId: string): Promise<MerchantCampaign> {
  const { data } = await client.get<{ success: boolean; data: MerchantCampaign }>(
    `/qr/public/campaign/${campaignId}`
  );
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch campaign');
  }
  return data.data;
}

/**
 * Get all campaigns for authenticated merchant
 */
export async function getMerchantCampaigns(options?: {
  storeId?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: MerchantCampaign[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const params = new URLSearchParams();
  if (options?.storeId) params.append('storeId', options.storeId);
  if (options?.status) params.append('status', options.status);
  if (options?.type) params.append('type', options.type);
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());

  const { data } = await client.get<{
    success: boolean;
    data: {
      items: MerchantCampaign[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>(`/qr/merchant/campaigns?${params.toString()}`);

  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch campaigns');
  }
  return data.data;
}

/**
 * Create a new campaign
 */
export async function createCampaign(input: {
  name: string;
  title?: string;
  description?: string;
  type?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  isActive?: boolean;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  budgetCap?: number;
  rewardValue?: number;
  rewardType?: string;
  targetSegment?: Record<string, unknown>;
  targetAudience?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  actions?: Array<Record<string, unknown>>;
  triggers?: Array<Record<string, unknown>>;
  priority?: number;
  cooldownDays?: number;
  metadata?: Record<string, unknown>;
}): Promise<MerchantCampaign> {
  const { data } = await client.post<{ success: boolean; data: MerchantCampaign }>(
    '/qr/merchant/campaigns',
    input
  );
  if (!data.success) {
    throw new Error(data.message || 'Failed to create campaign');
  }
  return data.data;
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  campaignId: string,
  input: Partial<{
    name: string;
    title?: string;
    description?: string;
    type?: string;
    status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
    isActive?: boolean;
    budget?: number;
    rewardValue?: number;
    priority?: number;
    metadata?: Record<string, unknown>;
  }>
): Promise<MerchantCampaign> {
  const { data } = await client.put<{ success: boolean; data: MerchantCampaign }>(
    `/qr/merchant/campaigns/${campaignId}`,
    input
  );
  if (!data.success) {
    throw new Error(data.message || 'Failed to update campaign');
  }
  return data.data;
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  const { data } = await client.delete<{ success: boolean }>(
    `/qr/merchant/campaigns/${campaignId}`
  );
  if (!data.success) {
    throw new Error(data.message || 'Failed to delete campaign');
  }
}

/**
 * Get QR data for a campaign
 */
export async function getCampaignQRData(campaignId: string): Promise<CampaignQRData> {
  const { data } = await client.get<{ success: boolean; data: CampaignQRData }>(
    `/qr/merchant/campaigns/${campaignId}/qr`
  );
  if (!data.success) {
    throw new Error(data.message || 'Failed to get campaign QR data');
  }
  return data.data;
}

/**
 * Activate a campaign
 */
export async function activateCampaign(campaignId: string): Promise<MerchantCampaign> {
  return updateCampaign(campaignId, { status: 'active', isActive: true });
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(campaignId: string): Promise<MerchantCampaign> {
  return updateCampaign(campaignId, { status: 'paused' });
}

// ─── Store Operations ──────────────────────────────────────────────────────────

/**
 * Get store by slug (for ad targeting)
 */
export async function getStoreBySlug(slug: string): Promise<MerchantStore> {
  const { data } = await client.get<{ success: boolean; data: MerchantStore }>(
    `/qr/public/store/${encodeURIComponent(slug)}`
  );
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch store');
  }
  return data.data;
}

/**
 * Get store by ID
 */
export async function getStoreById(storeId: string): Promise<MerchantStore> {
  const { data } = await client.get<{ success: boolean; data: MerchantStore }>(
    `/qr/public/store/id/${storeId}`
  );
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch store');
  }
  return data.data;
}

/**
 * Get stores for authenticated merchant
 */
export async function getMerchantStores(): Promise<MerchantStore[]> {
  const { data } = await client.get<{ success: boolean; data: MerchantStore[] }>(
    '/qr/merchant/stores'
  );
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch stores');
  }
  return data.data;
}

/**
 * Find nearby stores for ad targeting
 */
export async function findNearbyStores(
  latitude: number,
  longitude: number,
  radiusKm = 5
): Promise<StoreLocation[]> {
  const stores = await getMerchantStores();

  // Filter stores with coordinates and calculate distance
  const storesWithLocation = stores.filter(
    (s) => s.location?.coordinates
  ) as Array<MerchantStore & { location: { coordinates: [number, number] } }>;

  return storesWithLocation
    .map((store) => {
      const [storeLat, storeLng] = store.location.coordinates;
      const distance = calculateDistance(
        latitude,
        longitude,
        storeLat,
        storeLng
      );
      return {
        store,
        distance,
        isNearest: false,
      };
    })
    .filter((s) => s.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .map((s, index) => ({
      ...s,
      isNearest: index === 0,
    }));
}

// ─── Analytics Operations ─────────────────────────────────────────────────────

/**
 * Track ad QR analytics event
 */
export async function trackAdAnalytics(
  event: 'qr_scan' | 'campaign_viewed' | 'offer_viewed',
  options?: {
    storeId?: string;
    campaignId?: string;
    metadata?: Record<string, unknown>;
    customerId?: string;
    sessionId?: string;
  }
): Promise<void> {
  try {
    await client.post('/qr/public/analytics/track', {
      storeId: options?.storeId,
      event,
      metadata: {
        ...options?.metadata,
        campaignId: options?.campaignId,
      },
      customerId: options?.customerId,
      sessionId: options?.sessionId,
      source: 'ads_qr',
    });
  } catch {
    // Non-blocking
    console.warn('[AdsMerchant] Analytics tracking failed:', event);
  }
}

/**
 * Track ad QR scan event
 */
export function trackAdScan(
  campaignId: string,
  options?: { storeId?: string; customerId?: string }
): void {
  trackAdAnalytics('qr_scan', {
    campaignId,
    storeId: options?.storeId,
    customerId: options?.customerId,
  });
}

/**
 * Track campaign view event
 */
export function trackCampaignView(
  campaignId: string,
  options?: { storeId?: string; customerId?: string }
): void {
  trackAdAnalytics('campaign_viewed', {
    campaignId,
    storeId: options?.storeId,
    customerId: options?.customerId,
  });
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ─── Brand Operations ─────────────────────────────────────────────────────────

export interface BrandProfile {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  campaigns: MerchantCampaign[];
  stores: MerchantStore[];
}

/**
 * Get brand profile for ads
 */
export async function getBrandProfile(merchantId: string): Promise<BrandProfile> {
  // For now, aggregate from multiple endpoints
  const [campaignsResult, stores] = await Promise.all([
    getMerchantCampaigns().catch(() => ({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })),
    getMerchantStores().catch(() => []),
  ]);

  // Get brand info from first store (assuming single brand per merchant)
  const primaryStore = stores[0];

  return {
    id: merchantId,
    name: primaryStore?.name || 'Brand',
    logo: primaryStore?.logo,
    description: primaryStore?.description,
    website: primaryStore?.contact?.website,
    socialLinks: {
      instagram: primaryStore?.contact?.whatsapp, // Note: might need separate field
      facebook: undefined,
      twitter: undefined,
    },
    campaigns: campaignsResult.items,
    stores,
  };
}
