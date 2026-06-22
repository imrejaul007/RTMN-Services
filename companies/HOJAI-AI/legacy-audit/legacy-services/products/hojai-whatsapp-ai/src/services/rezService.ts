import axios from 'axios';

/**
 * REZ Ecosystem Service
 *
 * Connects WhatsApp AI to RABTUL services:
 * - Auth (4002)
 * - Wallet (4004)
 * - Notifications (4011)
 * - Payments (4001)
 * - Loyalty (RABTUL)
 */

export class REZService {
  private authUrl: string;
  private walletUrl: string;
  private notifyUrl: string;
  private paymentUrl: string;
  private internalToken: string;

  constructor() {
    this.authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
    this.walletUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:4004';
    this.notifyUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4011';
    this.paymentUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4001';
    this.internalToken = process.env.INTERNAL_SERVICE_TOKEN || 'rez-internal-token';
  }

  private getHeaders() {
    return {
      'X-Internal-Token': this.internalToken,
      'Content-Type': 'application/json'
    };
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    phone?: string;
  }> {
    try {
      const response = await axios.post(
        `${this.authUrl}/api/auth/verify`,
        { token },
        { headers: this.getHeaders() }
      );
      return {
        valid: true,
        userId: response.data.userId,
        phone: response.data.phone
      };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `${this.authUrl}/api/users/${userId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  // ============================================================================
  // WALLET
  // ============================================================================

  /**
   * Get wallet balance
   */
  async getWalletBalance(userId: string): Promise<number> {
    try {
      const response = await axios.get(
        `${this.walletUrl}/api/wallet/balance/${userId}`,
        { headers: this.getHeaders() }
      );
      return response.data.balance || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Add cashback to wallet
   */
  async addCashback(params: {
    userId: string;
    amount: number;
    source: string;
    merchantId: string;
  }): Promise<boolean> {
    try {
      await axios.post(
        `${this.walletUrl}/api/wallet/cashback`,
        params,
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      console.error('[REZ] Failed to add cashback:', error);
      return false;
    }
  }

  /**
   * Deduct from wallet
   */
  async deductWallet(params: {
    userId: string;
    amount: number;
    source: string;
    merchantId: string;
  }): Promise<boolean> {
    try {
      await axios.post(
        `${this.walletUrl}/api/wallet/deduct`,
        params,
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      console.error('[REZ] Failed to deduct wallet:', error);
      return false;
    }
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  /**
   * Send notification
   */
  async sendNotification(params: {
    userId?: string;
    phone?: string;
    channel: 'whatsapp' | 'sms' | 'push' | 'email';
    template: string;
    variables?: Record<string, string>;
  }): Promise<boolean> {
    try {
      await axios.post(
        `${this.notifyUrl}/api/notifications/send`,
        params,
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      console.error('[REZ] Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(params: {
    phone: string;
    message: string;
    merchantId?: string;
  }): Promise<boolean> {
    try {
      await axios.post(
        `${this.notifyUrl}/api/channels/whatsapp/send`,
        params,
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      console.error('[REZ] Failed to send WhatsApp:', error);
      return false;
    }
  }

  // ============================================================================
  // LOYALTY
  // ============================================================================

  /**
   * Get loyalty points
   */
  async getLoyaltyPoints(userId: string): Promise<{
    points: number;
    tier: string;
  }> {
    try {
      const response = await axios.get(
        `${this.walletUrl}/api/loyalty/${userId}/points`,
        { headers: this.getHeaders() }
      );
      return {
        points: response.data.points || 0,
        tier: response.data.tier || 'bronze'
      };
    } catch (error) {
      return { points: 0, tier: 'bronze' };
    }
  }

  /**
   * Add loyalty points
   */
  async addLoyaltyPoints(params: {
    userId: string;
    points: number;
    source: string;
    merchantId: string;
  }): Promise<boolean> {
    try {
      await axios.post(
        `${this.walletUrl}/api/loyalty/points/add`,
        params,
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // CROSS-APP IDENTITY
  // ============================================================================

  /**
   * Link user to merchant
   */
  async linkUserToMerchant(params: {
    userId: string;
    merchantId: string;
    phone: string;
  }): Promise<boolean> {
    try {
      await axios.post(
        `${this.authUrl}/api/links/merchant`,
        params,
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's merchant interactions
   */
  async getUserMerchants(userId: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.authUrl}/api/links/user/${userId}/merchants`,
        { headers: this.getHeaders() }
      );
      return response.data.merchants || [];
    } catch (error) {
      return [];
    }
  }

  // ============================================================================
  // ENRICHMENT
  // ============================================================================

  /**
   * Get user context for AI personalization
   */
  async getUserContext(userId: string): Promise<{
    profile: any;
    wallet: { points: number; balance: number; tier: string };
    loyalty: { points: number; tier: string };
    merchants: string[];
    preferences?: any;
  }> {
    const [profile, wallet, loyalty, merchants] = await Promise.all([
      this.getUserProfile(userId),
      this.getWalletBalance(userId).then(balance => ({ balance })),
      this.getLoyaltyPoints(userId),
      this.getUserMerchants(userId)
    ]);

    return {
      profile: profile || {},
      wallet: { points: wallet, balance: wallet },
      loyalty,
      merchants
    };
  }
}

export const rezService = new REZService();
