/**
 * Analytics types for Merchant SDK
 */

export type QRSource = 'room_qr' | 'menu_qr' | 'rez_now' | 'ads_qr' | 'unknown';

export type AnalyticsEventType =
  | 'qr_scan'
  | 'view_menu'
  | 'add_to_cart'
  | 'place_order'
  | 'book_appointment'
  | 'service_request_submitted'
  | 'campaign_viewed'
  | 'offer_viewed';

export interface AnalyticsEvent {
  storeId?: string;
  event: AnalyticsEventType;
  metadata?: Record<string, unknown>;
  customerId?: string;
  sessionId?: string;
  source: QRSource;
  timestamp?: string;
}

export interface AnalyticsTrackResponse {
  success: boolean;
  message: string;
}

export interface StoreAnalytics {
  storeId: string;
  storeName: string;
  qrScans: number;
  ordersFromQR: number;
  conversionRate: string;
  lastUpdated?: string;
}

export interface QRAnalytics {
  totalScans: number;
  scansByDay: Array<{
    date: string;
    count: number;
  }>;
  scansBySource: Record<QRSource, number>;
  topStores: Array<{
    storeId: string;
    storeName: string;
    scans: number;
  }>;
}

export interface QRAnalyticsResponse {
  success: boolean;
  data: QRAnalytics;
}

export interface StoreAnalyticsResponse {
  success: boolean;
  data: StoreAnalytics;
}

export interface QRLinksResponse {
  success: boolean;
  data: Array<{
    storeId: string;
    storeName: string;
    storeSlug: string;
    links: {
      checkin: string;
      menu: string;
      pay: string;
      review: string;
    };
    deepLinks: {
      checkin: string;
      menu: string;
      pay: string;
    };
  }>;
}
