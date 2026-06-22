/**
 * Rez Merchant SDK
 *
 * Unified SDK for accessing Rez Merchant Service APIs across all QR systems:
 * - Room QR: Hotel/room info, room service, service requests
 * - Menu QR: Store/menu info, product catalog, categories
 * - Rez Now: Store profile, services, appointments, analytics
 * - Ads QR: Brand info, campaigns, store locations
 *
 * @example
 * ```typescript
 * import { MerchantSDK } from '@rez/merchant-sdk';
 *
 * const sdk = new MerchantSDK({ baseUrl: 'https://api.rez.money' });
 *
 * // Get store by slug
 * const store = await sdk.store.getBySlug('my-restaurant');
 *
 * // Get menu for store
 * const menu = await sdk.menu.get(store.id);
 *
 * // Track analytics
 * await sdk.analytics.track(store.id, { event: 'qr_scan' });
 * ```
 */

import { MerchantSDK } from './sdk';

export { MerchantSDK };
export { StoreClient } from './store';
export { MenuClient } from './menu';
export { HotelClient } from './hotel';
export { CampaignClient } from './campaign';
export { AnalyticsClient } from './analytics';

// Re-export types
export type {
  Store,
  StoreLocation,
  StoreContact,
  StoreOperationalInfo,
  StoreSocialLinks,
  StoreQRData,
} from './types/store';

export type {
  Menu,
  MenuCategory,
  MenuProduct,
  MenuStoreInfo,
} from './types/menu';

export type {
  HotelRoom,
  HotelInfo,
  RoomService,
  RoomQuickAction,
} from './types/hotel';

export type {
  Campaign,
  CampaignQRData,
} from './types/campaign';

export type {
  QRAnalytics,
  AnalyticsEvent,
  StoreAnalytics,
} from './types/analytics';

// Export types from the main SDK
export type {
  MerchantSDKConfig,
  MerchantSDKOptions,
} from './sdk';

export default MerchantSDK;
