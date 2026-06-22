/**
 * Room QR Module - Hotel room service, checkout, and feedback
 */

import { QRClient } from './client';
import type {
  RoomQR,
  ServiceRequest,
  RequestResponse,
  Bill,
  PaymentRequest,
  Receipt,
  Feedback,
  FeedbackResponse,
} from '../types';

export class RoomModule {
  private client: QRClient;

  constructor(client: QRClient) {
    this.client = client;
  }

  /**
   * Validate a scanned room QR code
   */
  async validateQR(qrData: string): Promise<RoomQR> {
    return this.client.post('/qr/room/validate', { qrData });
  }

  /**
   * Get room details by room ID
   */
  async getRoom(roomId: string): Promise<RoomQR> {
    return this.client.get(`/rooms/${roomId}`);
  }

  /**
   * Submit a service request (room service, housekeeping, etc.)
   */
  async submitRequest(request: ServiceRequest): Promise<RequestResponse> {
    return this.client.post('/qr/room/requests', request);
  }

  /**
   * Get pending requests for a room
   */
  async getRequests(roomId: string): Promise<ServiceRequest[]> {
    return this.client.get(`/rooms/${roomId}/requests`);
  }

  /**
   * Get request status
   */
  async getRequestStatus(requestId: string): Promise<RequestResponse> {
    return this.client.get(`/rooms/requests/${requestId}`);
  }

  /**
   * Cancel a service request
   */
  async cancelRequest(requestId: string): Promise<RequestResponse> {
    return this.client.delete(`/rooms/requests/${requestId}`);
  }

  /**
   * Get current bill for room
   */
  async getBill(roomId: string): Promise<Bill> {
    return this.client.get(`/rooms/${roomId}/bill`);
  }

  /**
   * Get bill history
   */
  async getBillHistory(roomId: string): Promise<Bill[]> {
    return this.client.get(`/rooms/${roomId}/bill/history`);
  }

  /**
   * Checkout and pay bill
   */
  async checkout(billId: string, payment: PaymentRequest): Promise<Receipt> {
    return this.client.post(`/rooms/bills/${billId}/checkout`, payment);
  }

  /**
   * Request express checkout
   */
  async requestExpressCheckout(roomId: string): Promise<{ confirmationCode: string }> {
    return this.client.post(`/rooms/${roomId}/express-checkout`);
  }

  /**
   * Submit feedback for stay or service
   */
  async submitFeedback(feedback: Feedback): Promise<FeedbackResponse> {
    return this.client.post('/qr/room/feedback', feedback);
  }

  /**
   * Get feedback status
   */
  async getFeedbackStatus(feedbackId: string): Promise<FeedbackResponse> {
    return this.client.get(`/rooms/feedback/${feedbackId}`);
  }

  /**
   * Get hotel amenities
   */
  async getAmenities(hotelId: string): Promise<{ id: string; name: string; description: string; icon: string }[]> {
    return this.client.get(`/hotels/${hotelId}/amenities`);
  }

  /**
   * Get concierge services
   */
  async getConciergeServices(hotelId: string): Promise<{ id: string; name: string; price: number; description: string }[]> {
    return this.client.get(`/hotels/${hotelId}/concierge`);
  }

  /**
   * Book spa appointment
   */
  async bookSpa(hotelId: string, data: { serviceId: string; date: string; time: string; guestId: string }): Promise<{ bookingId: string; confirmationCode: string }> {
    return this.client.post(`/hotels/${hotelId}/spa/book`, data);
  }

  /**
   * Get spa availability
   */
  async getSpaAvailability(hotelId: string, date: string): Promise<{ time: string; available: boolean }[]> {
    return this.client.get(`/hotels/${hotelId}/spa/availability?date=${date}`);
  }

  /**
   * Request wake-up call
   */
  async requestWakeUpCall(roomId: string, time: string): Promise<void> {
    return this.client.post(`/rooms/${roomId}/wake-up`, { time });
  }

  /**
   * Get minibar items
   */
  async getMinibarItems(hotelId: string): Promise<{ id: string; name: string; price: number; image: string }[]> {
    return this.client.get(`/hotels/${hotelId}/minibar`);
  }

  /**
   * Add minibar item to room charges
   */
  async addMinibarItem(roomId: string, itemId: string, quantity: number): Promise<void> {
    return this.client.post(`/rooms/${roomId}/minibar`, { itemId, quantity });
  }
}
