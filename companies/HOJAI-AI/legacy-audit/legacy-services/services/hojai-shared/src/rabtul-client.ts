/**
 * RABTUL Service Client
 * Connects to RABTUL Core Services (Auth, Payment, Wallet, Notification)
 */

const RABTUL_AUTH_URL = process.env.RABTUL_AUTH_URL || 'http://localhost:4002';
const RABTUL_PAYMENT_URL = process.env.RABTUL_PAYMENT_URL || 'http://localhost:4001';
const RABTUL_WALLET_URL = process.env.RABTUL_WALLET_URL || 'http://localhost:4004';
const RABTUL_NOTIFICATION_URL = process.env.RABTUL_NOTIFICATION_URL || 'http://localhost:4005';

export interface AuthVerifyResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  expiresAt?: string;
  error?: string;
}

export interface PaymentRequest {
  userId: string;
  amount: number;
  action: string;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  amount?: number;
  status?: string;
  error?: string;
}

export interface BalanceResponse {
  userId: string;
  amount: number;
  currency: string;
  frozen?: number;
  available?: number;
}

export interface NotificationRequest {
  userId: string;
  type: 'payment' | 'alert' | 'reminder' | 'system';
  title?: string;
  message: string;
  channels?: ('push' | 'email' | 'sms')[];
  metadata?: Record<string, any>;
}

export interface NotificationResponse {
  success: boolean;
  notificationId?: string;
  delivered?: string[];
  error?: string;
}

export class RABTULClient {
  private authUrl: string;
  private paymentUrl: string;
  private walletUrl: string;
  private notificationUrl: string;

  constructor() {
    this.authUrl = RABTUL_AUTH_URL;
    this.paymentUrl = RABTUL_PAYMENT_URL;
    this.walletUrl = RABTUL_WALLET_URL;
    this.notificationUrl = RABTUL_NOTIFICATION_URL;
  }

  /**
   * Verify authentication token
   */
  async verifyToken(token: string): Promise<AuthVerifyResponse> {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      return response.json();
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Authentication service unavailable'
      };
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ token?: string; userId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return response.json();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Login failed' };
    }
  }

  /**
   * Register new user
   */
  async register(email: string, password: string, name: string): Promise<{ userId?: string; token?: string; error?: string }> {
    try {
      const response = await fetch(`${this.authUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      return response.json();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Registration failed' };
    }
  }

  /**
   * Process payment
   */
  async processPayment(data: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.paymentUrl}/api/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          currency: data.currency || 'INR'
        })
      });
      return response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment service unavailable'
      };
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<BalanceResponse> {
    try {
      const response = await fetch(`${this.walletUrl}/api/wallet/balance/${userId}`);
      return response.json();
    } catch (error) {
      return {
        userId,
        amount: 0,
        currency: 'INR',
        error: error instanceof Error ? error.message : 'Wallet service unavailable'
      };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(userId: string, limit = 20): Promise<{ transactions: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.walletUrl}/api/wallet/transactions/${userId}?limit=${limit}`);
      return response.json();
    } catch (error) {
      return {
        transactions: [],
        error: error instanceof Error ? error.message : 'Wallet service unavailable'
      };
    }
  }

  /**
   * Send notification
   */
  async sendNotification(data: NotificationRequest): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${this.notificationUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          channels: data.channels || ['push']
        })
      });
      return response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Notification service unavailable'
      };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(userIds: string[], notification: Omit<NotificationRequest, 'userId'>): Promise<{ sent: number; failed: number }> {
    try {
      const response = await fetch(`${this.notificationUrl}/api/notifications/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, notification })
      });
      return response.json();
    } catch (error) {
      return { sent: 0, failed: userIds.length };
    }
  }

  /**
   * Health check for all RABTUL services
   */
  async healthCheck(): Promise<{
    auth: boolean;
    payment: boolean;
    wallet: boolean;
    notification: boolean;
    overall: boolean;
  }> {
    const checks = await Promise.all([
      fetch(`${this.authUrl}/health`).then(r => r.ok).catch(() => false),
      fetch(`${this.paymentUrl}/health`).then(r => r.ok).catch(() => false),
      fetch(`${this.walletUrl}/health`).then(r => r.ok).catch(() => false),
      fetch(`${this.notificationUrl}/health`).then(r => r.ok).catch(() => false),
    ]);

    return {
      auth: checks[0],
      payment: checks[1],
      wallet: checks[2],
      notification: checks[3],
      overall: checks.every(c => c)
    };
  }
}

export const rabtul = new RABTULClient();
export default rabtul;
