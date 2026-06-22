/**
 * REZ Salon Bridge
 *
 * Connects GlamAI to REZ Salon ecosystem services:
 * - REZ Salon CRM (port 4012)
 * - REZ Salon Booking (port 4201)
 * - REZ Salon POS (port 4902)
 * - REZ Salon Inventory (port 4906)
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../../utils/logger.js';

// Service URLs
const SALON_CRM_URL = process.env.SALON_CRM_URL || 'http://localhost:4012';
const SALON_BOOKING_URL = process.env.SALON_BOOKING_URL || 'http://localhost:4201';
const SALON_POS_URL = process.env.SALON_POS_URL || 'http://localhost:4902';
const SALON_INVENTORY_URL = process.env.SALON_INVENTORY_URL || 'http://localhost:4906';

export class SalonBridge {
  private crm: AxiosInstance;
  private booking: AxiosInstance;
  private pos: AxiosInstance;
  private inventory: AxiosInstance;

  constructor() {
    this.crm = axios.create({ baseURL: SALON_CRM_URL, timeout: 10000 });
    this.booking = axios.create({ baseURL: SALON_BOOKING_URL, timeout: 10000 });
    this.pos = axios.create({ baseURL: SALON_POS_URL, timeout: 10000 });
    this.inventory = axios.create({ baseURL: SALON_INVENTORY_URL, timeout: 10000 });
  }

  // ==================== CRM Bridge ====================

  /**
   * Get customer from CRM
   */
  async getCustomer(customerId: string): Promise<any> {
    try {
      const response = await this.crm.get(`/api/customers/${customerId}`);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`CRM customer lookup failed for ${customerId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get customer by phone
   */
  async getCustomerByPhone(phone: string): Promise<any> {
    try {
      const response = await this.crm.get('/api/customers', { params: { phone } });
      return response.data.data?.[0] || null;
    } catch (error: any) {
      logger.warn(`CRM phone lookup failed for ${phone}: ${error.message}`);
      return null;
    }
  }

  /**
   * Update customer in CRM
   */
  async updateCustomer(customerId: string, data: any): Promise<boolean> {
    try {
      await this.crm.put(`/api/customers/${customerId}`, data);
      return true;
    } catch (error: any) {
      logger.warn(`CRM update failed for ${customerId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get customer visit history from CRM
   */
  async getCustomerVisits(customerId: string): Promise<any[]> {
    try {
      const response = await this.crm.get(`/api/customers/${customerId}/visits`);
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`CRM visits lookup failed for ${customerId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Add interaction to CRM
   */
  async addInteraction(customerId: string, interaction: {
    type: string;
    source: string;
    metadata?: any;
  }): Promise<boolean> {
    try {
      await this.crm.post(`/api/customers/${customerId}/interactions`, interaction);
      return true;
    } catch (error: any) {
      logger.warn(`CRM interaction failed for ${customerId}: ${error.message}`);
      return false;
    }
  }

  // ==================== Booking Bridge ====================

  /**
   * Get appointments for a stylist today
   */
  async getStylistAppointments(stylistId: string, date?: string): Promise<any[]> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const response = await this.booking.get('/api/bookings', {
        params: { stylistId, date: targetDate }
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Booking lookup failed for stylist ${stylistId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get customer appointments
   */
  async getCustomerAppointments(customerId: string): Promise<any[]> {
    try {
      const response = await this.booking.get(`/api/bookings/customer/${customerId}`);
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Booking lookup failed for customer ${customerId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Create appointment
   */
  async createAppointment(appointment: {
    customerId: string;
    stylistId: string;
    serviceIds: string[];
    date: string;
    startTime: string;
    notes?: string;
  }): Promise<any> {
    try {
      const response = await this.booking.post('/api/bookings', appointment);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Booking creation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(appointmentId: string, status: string): Promise<boolean> {
    try {
      await this.booking.put(`/api/bookings/${appointmentId}`, { status });
      return true;
    } catch (error: any) {
      logger.warn(`Booking update failed for ${appointmentId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get available slots
   */
  async getAvailableSlots(salonId: string, date: string, stylistId?: string): Promise<string[]> {
    try {
      const params: any = { salonId, date };
      if (stylistId) params.stylistId = stylistId;

      const response = await this.booking.get('/api/availability/slots', { params });
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Availability lookup failed: ${error.message}`);
      return [];
    }
  }

  // ==================== POS Bridge ====================

  /**
   * Get order for customer
   */
  async getCustomerOrders(customerId: string): Promise<any[]> {
    try {
      const response = await this.pos.get('/api/orders', {
        params: { customerId }
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`POS orders lookup failed for ${customerId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Create order
   */
  async createOrder(order: {
    customerId: string;
    items: Array<{ serviceId: string; price: number }>;
    paymentMethod: string;
  }): Promise<any> {
    try {
      const response = await this.pos.post('/api/pos/orders', order);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`POS order creation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Process payment
   */
  async processPayment(orderId: string, paymentData: {
    method: string;
    amount: number;
  }): Promise<boolean> {
    try {
      await this.pos.post(`/api/pos/orders/${orderId}/payment`, paymentData);
      return true;
    } catch (error: any) {
      logger.warn(`POS payment failed for ${orderId}: ${error.message}`);
      return false;
    }
  }

  // ==================== Inventory Bridge ====================

  /**
   * Get inventory alerts
   */
  async getInventoryAlerts(salonId: string): Promise<any[]> {
    try {
      const response = await this.inventory.get('/api/alerts/low-stock', {
        params: { salonId }
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Inventory alerts lookup failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string): Promise<any> {
    try {
      const response = await this.inventory.get(`/api/products/${productId}`);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Product lookup failed for ${productId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Deduct stock
   */
  async deductStock(productId: string, quantity: number): Promise<boolean> {
    try {
      await this.inventory.post('/api/stock/deduct', { productId, quantity });
      return true;
    } catch (error: any) {
      logger.warn(`Stock deduction failed for ${productId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get reorder recommendations
   */
  async getReorderRecommendations(salonId: string): Promise<any[]> {
    try {
      const response = await this.inventory.get('/api/reorder', {
        params: { salonId }
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Reorder recommendations lookup failed: ${error.message}`);
      return [];
    }
  }

  // ==================== Unified Operations ====================

  /**
   * Get full customer context from all services
   */
  async getFullCustomerContext(customerId: string): Promise<{
    crm: any;
    appointments: any[];
    orders: any[];
  }> {
    const [crm, appointments, orders] = await Promise.all([
      this.getCustomer(customerId),
      this.getCustomerAppointments(customerId),
      this.getCustomerOrders(customerId)
    ]);

    return { crm, appointments, orders };
  }

  /**
   * Sync beauty memory to CRM
   */
  async syncBeautyProfileToCRM(customerId: string, beautyProfile: any): Promise<boolean> {
    try {
      const crmData: any = {};

      if (beautyProfile.hairType) crmData.hairType = beautyProfile.hairType;
      if (beautyProfile.skinType) crmData.skinType = beautyProfile.skinType;
      if (beautyProfile.allergies) crmData.allergies = beautyProfile.allergies;

      if (Object.keys(crmData).length > 0) {
        await this.updateCustomer(customerId, crmData);
      }

      return true;
    } catch (error: any) {
      logger.warn(`CRM sync failed for ${customerId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<{
    crm: boolean;
    booking: boolean;
    pos: boolean;
    inventory: boolean;
  }> {
    const check = async (client: AxiosInstance, name: string): Promise<boolean> => {
      try {
        await client.get('/health', { timeout: 3000 });
        return true;
      } catch {
        logger.warn(`${name} health check failed`);
        return false;
      }
    };

    const [crm, booking, pos, inventory] = await Promise.all([
      check(this.crm, 'CRM'),
      check(this.booking, 'Booking'),
      check(this.pos, 'POS'),
      check(this.inventory, 'Inventory')
    ]);

    return { crm, booking, pos, inventory };
  }
}

export const salonBridge = new SalonBridge();
