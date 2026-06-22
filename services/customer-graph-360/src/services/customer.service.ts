import axios from 'axios';
import { Customer360Model } from '../models/index.js';
import { config } from '../config/index.js';
import type {
  Customer360,
  Order,
  Touchpoint,
  DataSource,
  SyncResponse,
  EnrichResponse,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// Data source interfaces
interface DataSourceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RabtulUserData {
  userId: string;
  email?: string;
  phone?: string;
  orders: Array<{
    orderId: string;
    amount: number;
    category: string;
    date: string;
    paymentMethod: string;
  }>;
}

interface BuzzLocalUserData {
  userId: string;
  discoveryCount: number;
  favoriteCategories: string[];
  location: { city: string; state: string; country: string };
}

interface AirzyUserData {
  userId: string;
  flightsBooked: number;
  hotelsBooked: number;
  travelSpend: number;
}

interface ReZNowUserData {
  userId: string;
  orders: Array<{
    orderId: string;
    amount: number;
    items: string[];
    date: string;
  }>;
  preferences: {
    cuisine: string[];
    priceRange: { min: number; max: number };
  };
}

interface ReZMenuQrUserData {
  userId: string;
  orders: Array<{
    orderId: string;
    restaurantId: string;
    amount: number;
    date: string;
  }>;
}

interface RisaCareUserData {
  userId: string;
  appointments: number;
  healthScore: number;
}

/**
 * Customer Service - Business logic for Customer Graph 360
 */
export class CustomerService {
  /**
   * Get or create customer 360 profile
   */
  async getOrCreateCustomer(userId: string): Promise<Customer360> {
    let customer = await Customer360Model.findByUserId(userId);

    if (!customer) {
      customer = await Customer360Model.create({
        userId,
        identity: {
          userId,
          alternateIds: [],
          linkedAccounts: [],
        },
        profile: {
          demographics: {
            location: { city: 'Unknown', state: 'Unknown', country: 'India' },
          },
        },
        transactions: {
          totalOrders: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          favoriteCategories: [],
          lifetimeValue: 0,
          paymentMethods: [],
        },
        interactions: {
          appsUsed: [],
          engagementScore: 0,
          touchpoints: [],
        },
        preferences: {
          channels: ['push'],
          language: 'en',
          notificationSettings: {},
          priceRange: { min: 0, max: 100000 },
          brands: [],
        },
        segments: {
          current: [],
          historical: [],
        },
        predictions: {
          churnRisk: 0,
          lifetimeValue: 0,
          productRecommendations: [],
        },
      });
    }

    return customer.toObject();
  }

  /**
   * Get customer 360 view
   */
  async getCustomer360(userId: string): Promise<Customer360 | null> {
    const customer = await Customer360Model.findByUserId(userId);
    return customer ? customer.toObject() : null;
  }

  /**
   * Get customer interactions
   */
  async getInteractions(userId: string): Promise<Touchpoint[]> {
    const customer = await Customer360Model.findByUserId(userId);
    return customer?.interactions.touchpoints || [];
  }

  /**
   * Get customer purchases
   */
  async getPurchases(userId: string): Promise<{ orders: Order[]; total: number; totalSpent: number }> {
    const customer = await Customer360Model.findByUserId(userId);

    if (!customer) {
      return { orders: [], total: 0, totalSpent: 0 };
    }

    // Fetch from RABTUL for detailed order history
    try {
      const response = await axios.get<DataSourceResponse<RabtulUserData>>(
        `${config.services.rabtul}/api/user/${userId}/orders`,
        { timeout: 5000 }
      );

      if (response.data.success && response.data.data) {
        const orders: Order[] = response.data.data.orders.map((order) => ({
          orderId: order.orderId,
          app: 'RABTUL',
          amount: order.amount,
          category: order.category,
          date: new Date(order.date),
          paymentMethod: order.paymentMethod,
        }));

        return {
          orders,
          total: orders.length,
          totalSpent: orders.reduce((sum, o) => sum + o.amount, 0),
        };
      }
    } catch (error) {
      logger.warn(`Failed to fetch orders from RABTUL for user ${userId}:`, error);
    }

    // Fallback to local data
    return {
      orders: [],
      total: customer.transactions.totalOrders,
      totalSpent: customer.transactions.totalSpent,
    };
  }

  /**
   * Sync customer data from all sources
   */
  async syncFromSources(userId: string): Promise<SyncResponse> {
    const sources: DataSource[] = ['RABTUL', 'BUZZLOCAL', 'AIRZY', 'REZ_MENU_QR', 'REZ_NOW', 'RISACARE'];
    const syncedSources: string[] = [];
    let recordsProcessed = 0;

    const customer = await this.getOrCreateCustomer(userId);

    // Sync from RABTUL (orders, payments)
    try {
      const rabtulData = await this.syncFromRabtul(userId);
      if (rabtulData) {
        syncedSources.push('RABTUL');
        recordsProcessed += rabtulData.records;
      }
    } catch (error) {
      logger.error('Failed to sync from RABTUL:', error);
    }

    // Sync from BuzzLocal
    try {
      const buzzlocalData = await this.syncFromBuzzLocal(userId);
      if (buzzlocalData) {
        syncedSources.push('BUZZLOCAL');
        recordsProcessed += buzzlocalData.records;
      }
    } catch (error) {
      logger.error('Failed to sync from BuzzLocal:', error);
    }

    // Sync from Airzy
    try {
      const airzyData = await this.syncFromAirzy(userId);
      if (airzyData) {
        syncedSources.push('AIRZY');
        recordsProcessed += airzyData.records;
      }
    } catch (error) {
      logger.error('Failed to sync from Airzy:', error);
    }

    // Sync from REZ Now
    try {
      const rezNowData = await this.syncFromReZNow(userId);
      if (rezNowData) {
        syncedSources.push('REZ_NOW');
        recordsProcessed += rezNowData.records;
      }
    } catch (error) {
      logger.error('Failed to sync from REZ Now:', error);
    }

    // Sync from REZ Menu QR
    try {
      const menuQrData = await this.syncFromReZMenuQr(userId);
      if (menuQrData) {
        syncedSources.push('REZ_MENU_QR');
        recordsProcessed += menuQrData.records;
      }
    } catch (error) {
      logger.error('Failed to sync from REZ Menu QR:', error);
    }

    // Update last synced timestamp
    await Customer360Model.findOneAndUpdate(
      { userId },
      { lastSynced: new Date(), dataSources: syncedSources }
    );

    // Recalculate engagement score
    const updatedCustomer = await Customer360Model.findByUserId(userId);
    if (updatedCustomer) {
      const score = updatedCustomer.calculateEngagementScore();
      updatedCustomer.interactions.engagementScore = score;
      await updatedCustomer.save();
    }

    return {
      success: true,
      syncedAt: new Date(),
      sources: syncedSources,
      recordsProcessed,
    };
  }

  /**
   * Sync from RABTUL service
   */
  private async syncFromRabtul(userId: string): Promise<{ records: number } | null> {
    const response = await axios.get<DataSourceResponse<RabtulUserData>>(
      `${config.services.rabtul}/api/user/${userId}`,
      { timeout: 5000 }
    );

    if (!response.data.success || !response.data.data) {
      return null;
    }

    const data = response.data.data;
    let records = 0;

    // Update identity
    const updateData: Record<string, unknown> = {};

    if (data.email) {
      updateData['identity.email'] = data.email;
      records++;
    }
    if (data.phone) {
      updateData['identity.phone'] = data.phone;
      records++;
    }

    // Update transactions
    if (data.orders && data.orders.length > 0) {
      const totalOrders = data.orders.length;
      const totalSpent = data.orders.reduce((sum, o) => sum + o.amount, 0);
      const avgOrderValue = totalSpent / totalOrders;

      updateData['transactions.totalOrders'] = totalOrders;
      updateData['transactions.totalSpent'] = totalSpent;
      updateData['transactions.avgOrderValue'] = avgOrderValue;
      updateData['transactions.lastPurchase'] = new Date(data.orders[0].date);

      // Extract unique categories
      const categories = [...new Set(data.orders.map((o) => o.category))];
      updateData['transactions.favoriteCategories'] = categories;

      // Extract unique payment methods
      const paymentMethods = [...new Set(data.orders.map((o) => o.paymentMethod))];
      updateData['transactions.paymentMethods'] = paymentMethods;

      records += data.orders.length;
    }

    if (Object.keys(updateData).length > 0) {
      await Customer360Model.findOneAndUpdate({ userId }, updateData);
    }

    return { records };
  }

  /**
   * Sync from BuzzLocal service
   */
  private async syncFromBuzzLocal(userId: string): Promise<{ records: number } | null> {
    const response = await axios.get<DataSourceResponse<BuzzLocalUserData>>(
      `${config.services.buzzlocal}/api/user/${userId}/profile`,
      { timeout: 5000 }
    );

    if (!response.data.success || !response.data.data) {
      return null;
    }

    const data = response.data.data;
    const records = 1;

    // Update profile demographics
    await Customer360Model.findOneAndUpdate(
      { userId },
      {
        'profile.demographics.location': data.location,
        $addToSet: { 'interactions.appsUsed': 'buzzlocal' },
      }
    );

    // Add touchpoint
    const customer = await Customer360Model.findByUserId(userId);
    if (customer) {
      customer.addTouchpoint('buzzlocal');
      await customer.save();
    }

    return { records };
  }

  /**
   * Sync from Airzy service
   */
  private async syncFromAirzy(userId: string): Promise<{ records: number } | null> {
    const response = await axios.get<DataSourceResponse<AirzyUserData>>(
      `${config.services.airzy}/api/user/${userId}/travel`,
      { timeout: 5000 }
    );

    if (!response.data.success || !response.data.data) {
      return null;
    }

    const data = response.data.data;
    const records = 1;

    // Update transactions with travel data
    await Customer360Model.findOneAndUpdate(
      { userId },
      {
        $addToSet: { 'interactions.appsUsed': 'airzy' },
        $inc: { 'transactions.totalOrders': data.flightsBooked + data.hotelsBooked },
        $set: { 'interactions.lastActive': new Date() },
      }
    );

    // Add touchpoint
    const customer = await Customer360Model.findByUserId(userId);
    if (customer) {
      customer.addTouchpoint('airzy');
      await customer.save();
    }

    return { records };
  }

  /**
   * Sync from REZ Now service
   */
  private async syncFromReZNow(userId: string): Promise<{ records: number } | null> {
    const response = await axios.get<DataSourceResponse<ReZNowUserData>>(
      `${config.services.rezNow}/api/user/${userId}/orders`,
      { timeout: 5000 }
    );

    if (!response.data.success || !response.data.data) {
      return null;
    }

    const data = response.data.data;
    let records = data.orders.length;

    // Add touchpoint and update interactions
    const customer = await Customer360Model.findByUserId(userId);
    if (customer) {
      customer.addTouchpoint('rez-now');

      // Update preferences with cuisine
      if (data.preferences?.cuisine) {
        customer.preferences.brands = [
          ...new Set([...customer.preferences.brands, ...data.preferences.cuisine]),
        ];
      }

      // Update price range
      if (data.preferences?.priceRange) {
        customer.preferences.priceRange = data.preferences.priceRange;
      }

      await customer.save();
    }

    return { records };
  }

  /**
   * Sync from REZ Menu QR service
   */
  private async syncFromReZMenuQr(userId: string): Promise<{ records: number } | null> {
    const response = await axios.get<DataSourceResponse<ReZMenuQrUserData>>(
      `${config.services.rezMenuQr}/api/user/${userId}/orders`,
      { timeout: 5000 }
    );

    if (!response.data.success || !response.data.data) {
      return null;
    }

    const data = response.data.data;
    let records = data.orders.length;

    // Add touchpoint
    const customer = await Customer360Model.findByUserId(userId);
    if (customer) {
      customer.addTouchpoint('rez-menu-qr');
      await customer.save();
    }

    return { records };
  }

  /**
   * Get customer preferences
   */
  async getPreferences(userId: string): Promise<Customer360['preferences'] | null> {
    const customer = await Customer360Model.findByUserId(userId);
    return customer?.preferences || null;
  }

  /**
   * Get customer segments
   */
  async getSegments(userId: string): Promise<Customer360['segments'] | null> {
    const customer = await Customer360Model.findByUserId(userId);
    return customer?.segments || null;
  }

  /**
   * Enrich customer data with predictions
   */
  async enrichCustomerData(userId: string): Promise<EnrichResponse> {
    const customer = await Customer360Model.findByUserId(userId);

    if (!customer) {
      return {
        success: false,
        enrichedFields: [],
        confidence: 0,
      };
    }

    const enrichedFields: string[] = [];
    let confidence = 0;

    // Calculate churn risk based on recency
    const now = new Date();
    const lastActive = customer.interactions.lastActive;
    if (lastActive) {
      const daysSinceActive = Math.floor(
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Churn risk: 0 (active) to 1 (churned)
      const churnRisk = Math.min(1, daysSinceActive / 90); // 90 days = max churn risk
      customer.predictions.churnRisk = churnRisk;
      enrichedFields.push('predictions.churnRisk');
      confidence += 0.25;
    }

    // Predict next purchase date based on average order frequency
    if (customer.transactions.lastPurchase && customer.transactions.totalOrders > 1) {
      const avgDaysBetweenOrders = 30; // Default assumption
      const nextPurchaseDate = new Date(customer.transactions.lastPurchase);
      nextPurchaseDate.setDate(nextPurchaseDate.getDate() + avgDaysBetweenOrders);
      customer.predictions.nextPurchaseDate = nextPurchaseDate;
      enrichedFields.push('predictions.nextPurchaseDate');
      confidence += 0.25;
    }

    // Calculate lifetime value prediction
    const avgOrderValue = customer.transactions.avgOrderValue || 0;
    const ordersPerMonth = customer.transactions.totalOrders / 12 || 0;
    const predictedLTV = avgOrderValue * ordersPerMonth * 24; // 24 months projection
    customer.predictions.lifetimeValue = predictedLTV;
    enrichedFields.push('predictions.lifetimeValue');
    confidence += 0.25;

    // Product recommendations based on favorite categories
    if (customer.transactions.favoriteCategories.length > 0) {
      customer.predictions.productRecommendations = customer.transactions.favoriteCategories;
      enrichedFields.push('predictions.productRecommendations');
      confidence += 0.25;
    }

    // Update segments based on engagement
    if (customer.interactions.engagementScore >= 80) {
      customer.updateSegments('high-engagement', true);
      enrichedFields.push('segments.current');
    } else if (customer.interactions.engagementScore >= 50) {
      customer.updateSegments('medium-engagement', true);
      enrichedFields.push('segments.current');
    }

    await customer.save();

    return {
      success: true,
      enrichedFields,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Add linked account to customer
   */
  async addLinkedAccount(
    userId: string,
    provider: string,
    externalUserId: string
  ): Promise<Customer360 | null> {
    const customer = await Customer360Model.findByUserId(userId);

    if (!customer) {
      return null;
    }

    customer.identity.linkedAccounts.push({ provider, userId: externalUserId });
    customer.identity.alternateIds.push(externalUserId);
    await customer.save();

    return customer.toObject();
  }

  /**
   * Update customer preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<Customer360['preferences']>
  ): Promise<Customer360 | null> {
    const customer = await Customer360Model.findByUserId(userId);

    if (!customer) {
      return null;
    }

    // Merge preferences
    if (preferences.channels) {
      customer.preferences.channels = preferences.channels;
    }
    if (preferences.language) {
      customer.preferences.language = preferences.language;
    }
    if (preferences.notificationSettings) {
      customer.preferences.notificationSettings = {
        ...customer.preferences.notificationSettings,
        ...preferences.notificationSettings,
      };
    }
    if (preferences.priceRange) {
      customer.preferences.priceRange = preferences.priceRange;
    }
    if (preferences.brands) {
      customer.preferences.brands = preferences.brands;
    }

    await customer.save();
    return customer.toObject();
  }
}

// Export singleton instance
export const customerService = new CustomerService();
export default customerService;