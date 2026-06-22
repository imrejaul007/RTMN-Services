/**
 * Hotel/Room QR client for Merchant SDK
 */

import { AxiosInstance } from 'axios';
import {
  HotelRoom,
  HotelRoomResponse,
  ServiceRequest,
  ServiceRequestResponse,
} from './types/hotel';

interface MerchantSDKConfig {
  baseUrl: string;
  debug: boolean;
}

export class HotelClient {
  private client: AxiosInstance;
  private config: MerchantSDKConfig;

  constructor(client: AxiosInstance, config: MerchantSDKConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Get hotel room information by hotel ID and room ID (public QR endpoint)
   */
  async getRoom(hotelId: string, roomId: string): Promise<HotelRoom> {
    const response = await this.client.get<HotelRoomResponse>(
      `/qr/public/hotel/${hotelId}/room/${roomId}`
    );
    return response.data.data;
  }

  /**
   * Get hotel services (for room service, housekeeping, etc.)
   */
  async getHotelServices(storeId: string): Promise<HotelRoom['room']['availableServices']> {
    const response = await this.client.get<{
      success: boolean;
      data: {
        services: Array<{
          id: string;
          name: string;
          icon: string;
        }>;
      };
    }>(`/qr/public/services/${storeId}`);

    return response.data.data.services.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
    }));
  }

  /**
   * Submit a service request (room service, housekeeping, etc.)
   */
  async submitServiceRequest(request: ServiceRequest): Promise<ServiceRequestResponse['data']> {
    const response = await this.client.post<ServiceRequestResponse>(
      '/qr/public/service-request',
      request
    );
    return response.data.data;
  }

  /**
   * Submit room service order
   */
  async orderRoomService(
    hotelId: string,
    roomId: string,
    storeId: string,
    items: ServiceRequest['items'],
    customerInfo?: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
    }
  ): Promise<ServiceRequestResponse['data']> {
    return this.submitServiceRequest({
      type: 'room_service',
      storeId,
      roomId,
      hotelId,
      request: 'Room service order',
      items: items || [],
      ...customerInfo,
    });
  }

  /**
   * Request housekeeping
   */
  async requestHousekeeping(
    hotelId: string,
    roomId: string,
    storeId: string,
    options?: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      scheduledTime?: string;
    }
  ): Promise<ServiceRequestResponse['data']> {
    return this.submitServiceRequest({
      type: 'housekeeping',
      storeId,
      roomId,
      hotelId,
      request: 'Housekeeping request',
      priority: options?.priority,
      scheduledTime: options?.scheduledTime,
      ...(options?.customerId && { customerId: options.customerId }),
      ...(options?.customerName && { customerName: options.customerName }),
      ...(options?.customerPhone && { customerPhone: options.customerPhone }),
    });
  }

  /**
   * Report maintenance issue
   */
  async reportMaintenance(
    hotelId: string,
    roomId: string,
    storeId: string,
    issue: string,
    options?: {
      customerId?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }
  ): Promise<ServiceRequestResponse['data']> {
    return this.submitServiceRequest({
      type: 'maintenance',
      storeId,
      roomId,
      hotelId,
      request: issue,
      priority: options?.priority || 'normal',
      ...(options?.customerId && { customerId: options.customerId }),
    });
  }
}
