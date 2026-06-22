/**
 * Waitron → REZ Table QR Connector
 *
 * Connects Waitron's QR scan to REZ Table QR Service
 * Enables automatic table assignment and customer recognition
 *
 * Flow: Customer scans QR → Waitron → REZ Table QR Service → TableTwin Update
 *
 * @module waitron-qr-table-connector
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

export interface TableQRData {
  id: string;
  tableNumber: string;
  tableName?: string;
  restaurantId: string;
  restaurantSlug: string;
  capacity: number;
  menuUrl: string;
  qrCodeDataUrl?: string;
  createdAt: string;
}

export interface QRVerificationResult {
  valid: boolean;
  tableId?: string;
  restaurantId?: string;
  restaurantSlug?: string;
  tableNumber?: string;
  error?: string;
}

export interface QRVerificationResult {
  valid: boolean;
  tableId?: string;
  restaurantId?: string;
  restaurantSlug?: string;
  tableNumber?: string;
  error?: string;
}

export interface CustomerProfile {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  karma: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  visits: number;
  favorites: string[];
  lastVisit?: string;
  preferences?: {
    dietary?: string[];
    seating?: string;
    occasion?: string;
  };
  lifetimeValue?: number;
  churnRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface TableAssignment {
  table: TableQRData;
  customer: CustomerProfile;
  sessionId: string;
  partySize?: number;
  assignedAt: string;
  estimatedSeatingTime?: string;
}

export interface QRScanResult {
  success: boolean;
  table?: TableQRData;
  customer?: CustomerProfile;
  assignment?: TableAssignment;
  error?: string;
  source: 'waitron-qr-connector';
  timestamp: string;
}

export class QRTableConnector {
  private client: AxiosInstance;
  private restaurantClient: AxiosInstance;

  // Service URLs
  private qrServiceUrl: string;
  private restaurantServiceUrl: string;

  constructor(config?: {
    qrServiceUrl?: string;
    restaurantServiceUrl?: string;
    apiKey?: string;
    logger?: winston.Logger;
  }) {
    this.qrServiceUrl = config?.qrServiceUrl || process.env.REZ_TABLE_QR_URL || 'http://localhost:4025';
    this.restaurantServiceUrl = config?.restaurantServiceUrl || process.env.REZ_RESTAURANT_URL || 'http://localhost:4017';

    this.client = axios.create({
      baseURL: this.qrServiceUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.restaurantClient = axios.create({
      baseURL: this.restaurantServiceUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (config?.logger) {
      logger = config.logger;
    }

    logger.info('QRTableConnector initialized', {
      qrServiceUrl: this.qrServiceUrl,
      restaurantServiceUrl: this.restaurantServiceUrl
    });
  }

  /**
   * Generate QR codes for all tables of a restaurant
   * Call this during restaurant setup or when adding new tables
   */
  async generateTableQRCodes(
    restaurantId: string,
    restaurantSlug: string,
    tables: Array<{
      tableNumber: string;
      tableName?: string;
      capacity?: number;
    }>
  ): Promise<TableQRData[]> {
    try {
      logger.info('Generating batch QR codes', { restaurantId, tableCount: tables.length });

      const response = await this.client.post(
        `/api/tables/${restaurantId}/generate-batch`,
        {
          restaurantSlug,
          tables: tables.map(t => ({
            tableNumber: t.tableNumber,
            tableName: t.tableName,
            capacity: t.capacity
          }))
        }
      );

      const qrcodes = response.data.data || [];

      logger.info('QR codes generated successfully', {
        restaurantId,
        generated: qrcodes.length
      });

      return qrcodes.map((qr: any) => ({
        id: qr.id,
        tableNumber: qr.tableNumber,
        tableName: qr.tableName,
        restaurantId,
        restaurantSlug,
        capacity: qr.capacity,
        menuUrl: qr.menuUrl,
        qrCodeDataUrl: qr.qrCodeDataUrl,
        createdAt: new Date().toISOString()
      }));
    } catch (error: any) {
      logger.error('Failed to generate QR codes', {
        error: error.message,
        restaurantId
      });
      throw new Error(`QR generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code for a single table
   */
  async generateTableQR(
    restaurantId: string,
    restaurantSlug: string,
    table: {
      tableNumber: string;
      tableName?: string;
      capacity?: number;
    }
  ): Promise<TableQRData> {
    try {
      logger.info('Generating single QR code', {
        restaurantId,
        tableNumber: table.tableNumber
      });

      const response = await this.client.post(
        `/api/tables/${restaurantId}/generate`,
        {
          restaurantSlug,
          tableNumber: table.tableNumber,
          tableName: table.tableName,
          capacity: table.capacity
        }
      );

      const qr = response.data.data;

      logger.info('QR code generated', {
        restaurantId,
        tableNumber: table.tableNumber,
        qrId: qr.id
      });

      return {
        id: qr.id,
        tableNumber: qr.tableNumber,
        tableName: qr.tableName,
        restaurantId,
        restaurantSlug,
        capacity: qr.capacity,
        menuUrl: qr.menuUrl,
        qrCodeDataUrl: qr.qrCodeDataUrl,
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to generate QR code', {
        error: error.message,
        restaurantId,
        tableNumber: table.tableNumber
      });
      throw new Error(`QR generation failed: ${error.message}`);
    }
  }

  /**
   * Verify a scanned QR code
   */
  async verifyQR(qrData: string): Promise<QRVerificationResult> {
    try {
      logger.debug('Verifying QR code', { qrDataLength: qrData.length });

      const response = await this.client.post('/api/verify', { qrData });

      if (!response.data.success) {
        return {
          valid: false,
          error: response.data.error || 'Invalid QR code'
        };
      }

      const result = response.data.data;

      logger.info('QR verified', {
        valid: true,
        restaurantId: result.restaurantId,
        tableNumber: result.tableNumber
      });

      return {
        valid: true,
        tableId: result.tableId,
        restaurantId: result.restaurantId,
        restaurantSlug: result.restaurantSlug,
        tableNumber: result.tableNumber
      };
    } catch (error: any) {
      logger.error('QR verification failed', { error: error.message });
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Process QR scan and assign table to customer
   * This is the main entry point for the 9:15 AM flow in the story
   */
  async processScan(params: {
    qrData: string;
    customerId?: string;
    partySize?: number;
    preferences?: {
      seating?: string;
      occasion?: string;
      dietary?: string[];
    };
  }): Promise<QRScanResult> {
    try {
      const { qrData, customerId, partySize, preferences } = params;

      logger.info('Processing QR scan', {
        customerId,
        partySize,
        hasPreferences: !!preferences
      });

      // Step 1: Verify QR code
      const verification = await this.verifyQR(qrData);

      if (!verification.valid) {
        return {
          success: false,
          error: verification.error || 'Invalid QR code',
          source: 'waitron-qr-connector',
          timestamp: new Date().toISOString()
        };
      }

      // Step 2: Get table details
      const table = await this.getTable(
        verification.restaurantId!,
        verification.tableNumber!
      );

      if (!table) {
        return {
          success: false,
          error: 'Table not found',
          source: 'waitron-qr-connector',
          timestamp: new Date().toISOString()
        };
      }

      // Step 3: Get customer profile (if available)
      let customer: CustomerProfile | undefined;
      if (customerId) {
        customer = await this.getCustomerProfile(customerId, verification.restaurantId!);
      }

      // Step 4: Assign table (update TableTwin status)
      const assignment = await this.assignTable({
        tableId: table.id,
        restaurantId: verification.restaurantId!,
        tableNumber: verification.tableNumber!,
        customerId,
        partySize,
        preferences
      });

      logger.info('Table assigned successfully', {
        tableId: table.id,
        customerId,
        sessionId: assignment.sessionId
      });

      return {
        success: true,
        table,
        customer,
        assignment,
        source: 'waitron-qr-connector',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('QR scan processing failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        source: 'waitron-qr-connector',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get table details from QR service
   */
  async getTable(restaurantId: string, tableNumber: string): Promise<TableQRData | null> {
    try {
      const response = await this.client.get(
        `/api/tables/${restaurantId}/${tableNumber}`
      );

      if (!response.data.success) {
        return null;
      }

      const table = response.data.data;

      return {
        id: table.id,
        tableNumber: table.tableNumber,
        tableName: table.tableName,
        restaurantId,
        restaurantSlug: table.restaurantSlug,
        capacity: table.capacity,
        menuUrl: table.menuUrl,
        qrCodeDataUrl: table.qrCodeDataUrl,
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to get table', {
        error: error.message,
        restaurantId,
        tableNumber
      });
      return null;
    }
  }

  /**
   * Get all QR codes for a restaurant
   */
  async getRestaurantQRCodes(restaurantId: string): Promise<TableQRData[]> {
    try {
      const response = await this.client.get(`/api/tables/${restaurantId}`);

      if (!response.data.success) {
        return [];
      }

      return (response.data.data || []).map((qr: any) => ({
        id: qr.id,
        tableNumber: qr.tableNumber,
        tableName: qr.tableName,
        restaurantId,
        restaurantSlug: qr.restaurantSlug,
        capacity: qr.capacity,
        menuUrl: qr.menuUrl,
        createdAt: new Date().toISOString()
      }));
    } catch (error: any) {
      logger.error('Failed to get restaurant QR codes', {
        error: error.message,
        restaurantId
      });
      return [];
    }
  }

  /**
   * Get customer profile from restaurant service
   */
  async getCustomerProfile(customerId: string, restaurantId: string): Promise<CustomerProfile | undefined> {
    try {
      // Try to get from CRM/loyalty service
      const [loyaltyRes, profileRes] = await Promise.allSettled([
        this.restaurantClient.get(`/api/customers/${customerId}/loyalty`),
        this.restaurantClient.get(`/api/customers/${customerId}/profile`)
      ]);

      const loyalty = loyaltyRes.status === 'fulfilled' ? loyaltyRes.value.data : null;
      const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;

      if (!loyalty && !profile) {
        return undefined;
      }

      return {
        id: customerId,
        name: profile?.name,
        phone: profile?.phone,
        email: profile?.email,
        karma: loyalty?.points || loyalty?.karma || 0,
        tier: loyalty?.tier || 'BRONZE',
        visits: profile?.visits?.length || profile?.visitCount || 0,
        favorites: profile?.favorites || [],
        lastVisit: profile?.lastVisit,
        preferences: profile?.preferences,
        lifetimeValue: profile?.lifetimeValue,
        churnRisk: profile?.churnRisk
      };
    } catch (error: any) {
      logger.warn('Failed to get customer profile', {
        error: error.message,
        customerId
      });
      return undefined;
    }
  }

  /**
   * Assign table - Update TableTwin status to SEATED
   * This creates a session and marks the table as occupied
   */
  private async assignTable(params: {
    tableId: string;
    restaurantId: string;
    tableNumber: string;
    customerId?: string;
    partySize?: number;
    preferences?: {
      seating?: string;
      occasion?: string;
      dietary?: string[];
    };
  }): Promise<TableAssignment> {
    try {
      logger.info('Assigning table', {
        tableId: params.tableId,
        customerId: params.customerId,
        partySize: params.partySize
      });

      // Generate session ID
      const sessionId = `SESSION-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Update table status via restaurant service
      try {
        await this.restaurantClient.patch(
          `/api/tables/${params.tableNumber}`,
          {
            status: 'SEATED',
            sessionId,
            customerId: params.customerId,
            partySize: params.partySize,
            seatedAt: new Date().toISOString(),
            preferences: params.preferences
          }
        );
      } catch (e) {
        // Table service might not have this endpoint, continue
        logger.debug('Table status update skipped (endpoint not available)');
      }

      // Get table info
      const table = await this.getTable(params.restaurantId, params.tableNumber);

      // Get customer profile if available
      let customer: CustomerProfile | undefined;
      if (params.customerId) {
        customer = await this.getCustomerProfile(params.customerId, params.restaurantId);
      }

      // Calculate estimated seating time based on time of day
      const now = new Date();
      const hour = now.getHours();
      let estimatedSeatingTime: string;

      if (hour < 11) {
        // Breakfast
        estimatedSeatingTime = '45 minutes';
      } else if (hour < 15) {
        // Lunch
        estimatedSeatingTime = '60 minutes';
      } else if (hour < 18) {
        // Snacks
        estimatedSeatingTime = '30 minutes';
      } else {
        // Dinner
        estimatedSeatingTime = '90 minutes';
      }

      return {
        table: table!,
        customer: customer!,
        sessionId,
        partySize: params.partySize,
        assignedAt: new Date().toISOString(),
        estimatedSeatingTime
      };
    } catch (error: any) {
      logger.error('Table assignment failed', { error: error.message });
      throw new Error(`Table assignment failed: ${error.message}`);
    }
  }

  /**
   * Clear table - Mark table as available again
   */
  async clearTable(params: {
    restaurantId: string;
    tableNumber: string;
    sessionId: string;
    reason?: 'COMPLETED' | 'CANCELLED' | 'WALKED_IN';
  }): Promise<{ success: boolean; turnTimeMinutes?: number; error?: string }> {
    try {
      logger.info('Clearing table', {
        restaurantId: params.restaurantId,
        tableNumber: params.tableNumber,
        sessionId: params.sessionId
      });

      // Get seated time to calculate turn time
      let seatedAt: Date | undefined;
      try {
        const tableRes = await this.restaurantClient.get(
          `/api/tables/${params.tableNumber}`
        );
        seatedAt = tableRes.data?.seatedAt ? new Date(tableRes.data.seatedAt) : undefined;
      } catch (e) {
        // Ignore
      }

      // Update table status
      try {
        await this.restaurantClient.patch(
          `/api/tables/${params.tableNumber}`,
          {
            status: 'AVAILABLE',
            sessionId: null,
            customerId: null,
            seatedAt: null,
            clearedAt: new Date().toISOString()
          }
        );
      } catch (e) {
        logger.debug('Table status update skipped');
      }

      // Calculate turn time
      const turnTimeMinutes = seatedAt
        ? Math.round((Date.now() - seatedAt.getTime()) / 60000)
        : undefined;

      logger.info('Table cleared', {
        tableNumber: params.tableNumber,
        turnTimeMinutes
      });

      return {
        success: true,
        turnTimeMinutes
      };
    } catch (error: any) {
      logger.error('Table clear failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get QR code image as base64
   */
  async getQRImage(qrId: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/api/qr/${qrId}/image`);

      if (!response.data.success) {
        return null;
      }

      return response.data.data.imageDataUrl;
    } catch (error: any) {
      logger.error('Failed to get QR image', { error: error.message });
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; qrService: boolean; tableService: boolean }> {
    const [qrHealth, tableHealth] = await Promise.all([
      this.client.get('/health').then(() => true).catch(() => false),
      this.restaurantClient.get('/health').then(() => true).catch(() => false)
    ]);

    return {
      healthy: qrHealth && tableHealth,
      qrService: qrHealth,
      tableService: tableHealth
    };
  }
}

// Export singleton instance
export const qrTableConnector = new QRTableConnector();

export default QRTableConnector;