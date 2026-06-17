/**
 * CorpID Connector
 * Connects to CorpID Universal Identity Service
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export interface CorpIDUser {
  userId: string;
  email?: string;
  phone?: string;
  name?: {
    first?: string;
    last?: string;
    full?: string;
  };
  avatar?: string;
  verificationLevel: 'basic' | 'verified' | 'premium';
  verified: boolean;
  trustScore: number;
  linkedServices: string[];
  identitySources: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface CorpIDVerification {
  userId: string;
  level: 'basic' | 'verified' | 'premium';
  methods: Array<{
    type: 'email' | 'phone' | 'id' | 'biometric' | 'document';
    verified: boolean;
    verifiedAt?: Date;
  }>;
  kycStatus?: 'pending' | 'approved' | 'rejected';
}

export interface CorpIDLink {
  linkId: string;
  corpidUserId: string;
  serviceId: string;
  serviceUserId: string;
  linkedAt: Date;
  status: 'active' | 'suspended' | 'removed';
}

export interface IdentityAssertion {
  assertionId: string;
  userId: string;
  claims: Record<string, unknown>;
  issuer: string;
  validFrom: Date;
  validUntil: Date;
  verified: boolean;
}

class CorpIDConnector {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.CORPID_API_URL || 'http://localhost:4702';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ==================== User Methods ====================

  /**
   * Get CorpID user by ID
   */
  async getUser(userId: string, token?: string): Promise<CorpIDUser | null> {
    try {
      const response = await this.client.get(`/api/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`CorpID getUser failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Find user by email or phone
   */
  async findUserByIdentifier(identifier: string, type: 'email' | 'phone'): Promise<CorpIDUser | null> {
    try {
      const response = await this.client.get('/api/users/find', {
        params: { [type]: identifier },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`CorpID findUserByIdentifier failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Create CorpID user
   */
  async createUser(userData: Partial<CorpIDUser>, token?: string): Promise<CorpIDUser | null> {
    try {
      const response = await this.client.post('/api/users', userData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`CorpID createUser failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Update CorpID user
   */
  async updateUser(userId: string, userData: Partial<CorpIDUser>, token?: string): Promise<CorpIDUser | null> {
    try {
      const response = await this.client.patch(`/api/users/${userId}`, userData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`CorpID updateUser failed: ${error.message}`);
      return null;
    }
  }

  // ==================== Verification Methods ====================

  /**
   * Get user verification status
   */
  async getVerificationStatus(userId: string, token?: string): Promise<CorpIDVerification | null> {
    try {
      const response = await this.client.get(`/api/verification/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`CorpID getVerificationStatus failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify identity
   */
  async verifyIdentity(
    userId: string,
    method: 'email' | 'phone' | 'id' | 'biometric',
    verificationData: Record<string, unknown>,
    token?: string
  ): Promise<{ success: boolean; level?: string; message?: string }> {
    try {
      const response = await this.client.post(
        '/api/verification/verify',
        { userId, method, verificationData },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`CorpID verifyIdentity failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(
    identifier: string,
    type: 'email' | 'phone',
    channel: string = 'sms'
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const verifyUrl = process.env.CORPID_VERIFY_URL || this.baseUrl;
      const verifyClient = axios.create({
        baseURL: verifyUrl,
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await verifyClient.post('/verify/send', { identifier, type, channel });
      return response.data;
    } catch (error: any) {
      logger.warn(`CorpID sendVerificationCode failed: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Verify code
   */
  async verifyCode(
    identifier: string,
    code: string,
    type: 'email' | 'phone'
  ): Promise<{ success: boolean; verified: boolean }> {
    try {
      const verifyUrl = process.env.CORPID_VERIFY_URL || this.baseUrl;
      const verifyClient = axios.create({
        baseURL: verifyUrl,
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await verifyClient.post('/verify/check', { identifier, code, type });
      return response.data;
    } catch (error: any) {
      logger.warn(`CorpID verifyCode failed: ${error.message}`);
      return { success: false, verified: false };
    }
  }

  // ==================== Service Linking ====================

  /**
   * Link service account to CorpID
   */
  async linkService(
    userId: string,
    serviceId: string,
    serviceUserId: string,
    token?: string
  ): Promise<CorpIDLink | null> {
    try {
      const response = await this.client.post(
        '/api/links',
        { userId, serviceId, serviceUserId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`CorpID linkService failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Unlink service account
   */
  async unlinkService(userId: string, serviceId: string, token?: string): Promise<boolean> {
    try {
      await this.client.delete(`/api/links/${userId}/${serviceId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      return true;
    } catch (error: any) {
      logger.warn(`CorpID unlinkService failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get user's linked services
   */
  async getLinkedServices(userId: string, token?: string): Promise<CorpIDLink[]> {
    try {
      const response = await this.client.get(`/api/links/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      return response.data.links || [];
    } catch (error: any) {
      logger.warn(`CorpID getLinkedServices failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Find CorpID user by linked service
   */
  async findUserByServiceLink(
    serviceId: string,
    serviceUserId: string
  ): Promise<CorpIDUser | null> {
    try {
      const response = await this.client.get('/api/links/resolve', {
        params: { serviceId, serviceUserId },
      });
      return response.data.user;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`CorpID findUserByServiceLink failed: ${error.message}`);
      return null;
    }
  }

  // ==================== Identity Assertions ====================

  /**
   * Create identity assertion (for SSO)
   */
  async createAssertion(
    userId: string,
    claims: Record<string, unknown>,
    ttlMinutes: number = 60,
    token?: string
  ): Promise<IdentityAssertion | null> {
    try {
      const response = await this.client.post(
        '/api/assertions',
        { userId, claims, ttlMinutes },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`CorpID createAssertion failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate identity assertion
   */
  async validateAssertion(assertionId: string): Promise<IdentityAssertion | null> {
    try {
      const response = await this.client.get(`/api/assertions/${assertionId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`CorpID validateAssertion failed: ${error.message}`);
      return null;
    }
  }

  // ==================== Trust & Risk ====================

  /**
   * Get user trust score
   */
  async getTrustScore(userId: string, token?: string): Promise<number> {
    try {
      const response = await this.client.get(`/api/trust/${userId}/score`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      return response.data.score || 0;
    } catch (error: any) {
      logger.warn(`CorpID getTrustScore failed: ${error.message}`);
      return 0;
    }
  }

  /**
   * Update trust score
   */
  async updateTrustScore(
    userId: string,
    delta: number,
    reason: string,
    token?: string
  ): Promise<number> {
    try {
      const response = await this.client.post(
        `/api/trust/${userId}/update`,
        { delta, reason },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return response.data.newScore;
    } catch (error: any) {
      logger.warn(`CorpID updateTrustScore failed: ${error.message}`);
      return 0;
    }
  }

  // ==================== Status ====================

  /**
   * Get CorpID service status
   */
  async getServicesStatus(): Promise<Record<string, 'up' | 'down' | 'unknown'>> {
    const status: Record<string, 'up' | 'down' | 'unknown'> = {};
    const services = [
      { name: 'corpid-api', url: '/health' },
      { name: 'corpid-verify', url: '/health' },
    ];

    const bases = [
      process.env.CORPID_API_URL || 'http://localhost:4702',
      process.env.CORPID_VERIFY_URL || 'http://localhost:4702',
    ];

    for (let i = 0; i < services.length; i++) {
      try {
        const client = axios.create({ baseURL: bases[i], timeout: 5000 });
        await client.get(services[i].url);
        status[services[i].name] = 'up';
      } catch {
        status[services[i].name] = 'down';
      }
    }

    return status;
  }

  /**
   * Link CorpID user to ecosystem profile
   */
  async linkToEcosystem(
    corpidUserId: string,
    ecosystemProfileId: string,
    token?: string
  ): Promise<boolean> {
    try {
      await this.client.post(
        `/api/users/${corpidUserId}/link`,
        { ecosystemProfileId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`CorpID linkToEcosystem failed: ${error.message}`);
      return false;
    }
  }
}

// Singleton instance
export const corpidConnector = new CorpIDConnector();
export default corpidConnector;
