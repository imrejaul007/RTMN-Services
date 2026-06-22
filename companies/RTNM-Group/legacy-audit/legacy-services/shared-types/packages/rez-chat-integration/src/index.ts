// ── ReZ Chat Integration ──────────────────────────────────────────────────────────
// Connects Chat AI to all ReZ ecosystem services

import { logger } from './socket/logger';
import { HotelOTAConnector } from './connectors/hotel.connector';
import { MerchantConnector } from './connectors/merchant.connector';
import { OrderConnector } from './connectors/order.connector';
import { WalletConnector } from './connectors/wallet.connector';
import { LoyaltyConnector } from './connectors/loyalty.connector';
import { NotificationConnector } from './connectors/notification.connector';
import { getIntegratedTools } from './tools/integrated-tools';
import { DynamicKnowledgeProvider } from './knowledge/dynamic-provider';
import {
  HotelActionHandler,
  MerchantActionHandler,
  SupportActionHandler,
  createActionHandlers,
  executeAction,
  type ActionContext,
  type ActionResult,
  type ActionRequest,
  type ActionType,
} from './socket/actionHandlers';
import {
  PLATFORM_CONFIGS,
  buildPlatformContext,
  getQuickActionResponse,
  ROOM_SERVICE_MENU,
  ROOM_SERVICE_INTENTS,
  type ReZPlatform,
  type PlatformConfig,
  type RoomServiceItem,
} from './platform/platforms';

// ── Main Integration Class ──────────────────────────────────────────────────────

export class RezChatIntegration {
  private hotelConnector: HotelOTAConnector;
  private merchantConnector: MerchantConnector;
  private orderConnector: OrderConnector;
  private walletConnector: WalletConnector;
  private loyaltyConnector: LoyaltyConnector;
  private notificationConnector: NotificationConnector;
  private knowledgeProvider: DynamicKnowledgeProvider;

  constructor(config?: IntegrationConfig) {
    this.hotelConnector = new HotelOTAConnector(config?.hotelOTA);
    this.merchantConnector = new MerchantConnector(config?.merchant);
    this.orderConnector = new OrderConnector(config?.order);
    this.walletConnector = new WalletConnector(config?.wallet);
    this.loyaltyConnector = new LoyaltyConnector(config?.loyalty);
    this.notificationConnector = new NotificationConnector(config?.notification);
    this.knowledgeProvider = new DynamicKnowledgeProvider(this);
  }

  // ── Hotel Operations ─────────────────────────────────────────────────────────

  async searchHotels(params: {
    city: string;
    checkIn: string;
    checkOut: string;
    guests?: number;
    rooms?: number;
    minPrice?: number;
    maxPrice?: number;
  }) {
    return this.hotelConnector.search(params);
  }

  async getHotelDetails(hotelId: string) {
    return this.hotelConnector.getHotel(hotelId);
  }

  async checkRoomAvailability(params: {
    hotelId: string;
    roomTypeId?: string;
    checkIn: string;
    checkOut: string;
    rooms?: number;
  }) {
    return this.hotelConnector.checkAvailability(params);
  }

  async holdBooking(params: {
    userId: string;
    hotelId: string;
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    rooms?: number;
    guests: number;
    guestName: string;
    guestPhone: string;
    userTier: string;
    specialRequests?: string;
  }) {
    return this.hotelConnector.holdBooking(params);
  }

  async confirmBooking(params: {
    holdId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    return this.hotelConnector.confirmBooking(params);
  }

  async cancelBooking(params: {
    bookingId: string;
    reason?: string;
    userId: string;
  }) {
    return this.hotelConnector.cancelBooking(params);
  }

  async getBookingStatus(bookingId: string) {
    return this.hotelConnector.getBooking(bookingId);
  }

  // ── Merchant Operations ──────────────────────────────────────────────────────

  async searchMerchants(params: {
    query: string;
    category?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    limit?: number;
  }) {
    return this.merchantConnector.search(params);
  }

  async getMerchantMenu(merchantId: string, category?: string) {
    return this.merchantConnector.getMenu(merchantId, category);
  }

  async searchProducts(params: {
    merchantId: string;
    query: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }) {
    return this.merchantConnector.searchProducts(params);
  }

  async getProductDetails(productId: string) {
    return this.merchantConnector.getProduct(productId);
  }

  async checkTableAvailability(params: {
    merchantId: string;
    date: string;
    time: string;
    partySize: number;
  }) {
    return this.merchantConnector.checkTableAvailability(params);
  }

  async getMerchantInfo(merchantId: string) {
    return this.merchantConnector.getMerchant(merchantId);
  }

  // ── Order Operations ─────────────────────────────────────────────────────────

  async addToCart(params: {
    userId: string;
    merchantId: string;
    items: Array<{ productId: string; quantity: number; notes?: string }>;
    specialInstructions?: string;
  }) {
    return this.orderConnector.addToCart(params);
  }

  async placeOrder(params: {
    userId: string;
    cartId: string;
    deliveryAddress?: string;
    deliveryTime?: string;
    paymentMethod: 'card' | 'upi' | 'wallet' | 'cod';
  }) {
    return this.orderConnector.placeOrder(params);
  }

  async getOrderStatus(orderId: string) {
    return this.orderConnector.getOrderStatus(orderId);
  }

  async cancelOrder(params: { orderId: string; reason?: string; userId: string }) {
    return this.orderConnector.cancelOrder(params);
  }

  async getOrderHistory(userId: string, limit?: number) {
    return this.orderConnector.getOrderHistory(userId, limit);
  }

  async reorder(params: { userId: string; orderId: string; deliveryAddress?: string }) {
    return this.orderConnector.reorder(params);
  }

  // ── Wallet Operations ────────────────────────────────────────────────────────

  async getWalletBalance(userId: string) {
    return this.walletConnector.getBalance(userId);
  }

  async calculateCheckout(params: {
    orderValuePaise: number;
    useCoins?: boolean;
    useRewards?: boolean;
    userId: string;
    merchantId?: string;
  }) {
    return this.walletConnector.calculateCheckout(params);
  }

  // ── Loyalty Operations ───────────────────────────────────────────────────────

  async getLoyaltyProfile(userId: string) {
    return this.loyaltyConnector.getProfile(userId);
  }

  async getExpiringRewards(userId: string, daysAhead?: number) {
    return this.loyaltyConnector.getExpiringRewards(userId, daysAhead);
  }

  async getTierBenefits(tier: string) {
    return this.loyaltyConnector.getTierBenefits(tier);
  }

  // ── Knowledge Operations ─────────────────────────────────────────────────────

  async getHotelKnowledge(hotelId: string) {
    return this.knowledgeProvider.getHotelKnowledge(hotelId);
  }

  async getMerchantKnowledge(merchantId: string) {
    return this.knowledgeProvider.getMerchantKnowledge(merchantId);
  }

  async getPersonalizedKnowledge(userId: string) {
    return this.knowledgeProvider.getPersonalizedKnowledge(userId);
  }

  // ── Notification Operations ──────────────────────────────────────────────────

  async sendChatNotification(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    return this.notificationConnector.send(params);
  }

  // ── Tool Registry ────────────────────────────────────────────────────────────

  getTools() {
    return getIntegratedTools(this);
  }
}

// ── Configuration ───────────────────────────────────────────────────────────────

export interface IntegrationConfig {
  hotelOTA?: {
    baseUrl: string;
    apiKey?: string;
  };
  merchant?: {
    baseUrl: string;
    apiKey?: string;
  };
  order?: {
    baseUrl: string;
    apiKey?: string;
  };
  wallet?: {
    baseUrl: string;
    apiKey?: string;
  };
  loyalty?: {
    baseUrl: string;
    apiKey?: string;
  };
  notification?: {
    baseUrl: string;
    apiKey?: string;
  };
}

// ── Factory Function ────────────────────────────────────────────────────────────

let integrationInstance: RezChatIntegration | null = null;

export function createRezChatIntegration(config?: IntegrationConfig): RezChatIntegration {
  if (!integrationInstance) {
    integrationInstance = new RezChatIntegration(config);
  }
  return integrationInstance;
}

export function getRezChatIntegration(): RezChatIntegration | null {
  return integrationInstance;
}

// ── Exports ─────────────────────────────────────────────────────────────────────

export {
  logger,
  HotelOTAConnector,
  MerchantConnector,
  OrderConnector,
  WalletConnector,
  LoyaltyConnector,
  NotificationConnector,
  DynamicKnowledgeProvider,
  getIntegratedTools,
  HotelActionHandler,
  MerchantActionHandler,
  SupportActionHandler,
  createActionHandlers,
  executeAction,
  PLATFORM_CONFIGS,
  buildPlatformContext,
  getQuickActionResponse,
  ROOM_SERVICE_MENU,
  ROOM_SERVICE_INTENTS,
} from './';

export type {
  IntegrationConfig,
  ActionContext,
  ActionResult,
  ActionRequest,
  ActionType,
  ReZPlatform,
  PlatformConfig,
  RoomServiceItem,
} from './';
