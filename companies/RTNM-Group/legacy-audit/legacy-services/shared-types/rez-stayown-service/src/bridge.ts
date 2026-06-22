// Hotel OTA Bridge Service
// Connects Hotel OTA to REZ Order and Payment services

import axios from 'axios';

const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || 'https://rez-order-service.onrender.com';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'https://rez-payment-service.onrender.com';

export class HotelBridge {

  // Sync hotel booking to REZ Order
  async syncBookingToOrder(booking: HotelBooking) {
    try {
      const order = await axios.post(`${ORDER_SERVICE}/api/orders/create`, {
        type: 'hotel_booking',
        source: 'hotel_ota',
        bookingId: booking.id,
        amount: booking.totalAmount,
        userId: booking.userId,
        items: [{
          type: 'hotel_room',
          name: `${booking.hotelName} - Room ${booking.roomNumber}`,
          quantity: booking.nights,
          price: booking.pricePerNight
        }]
      });
      return order.data;
    } catch (err) {
      console.error('[HotelBridge] Failed to sync booking to order:', err);
      throw err;
    }
  }

  // Sync payment to REZ Payment
  async syncPayment(payment: HotelPayment) {
    try {
      const result = await axios.post(`${PAYMENT_SERVICE}/api/payments/create`, {
        type: 'hotel',
        source: 'hotel_ota',
        amount: payment.amount,
        bookingId: payment.bookingId,
        userId: payment.userId
      });
      return result.data;
    } catch (err) {
      console.error('[HotelBridge] Failed to sync payment:', err);
      throw err;
    }
  }
}

export const hotelBridge = new HotelBridge();

// Type definitions
export interface HotelBooking {
  id: string;
  hotelName: string;
  roomNumber: string;
  userId: string;
  totalAmount: number;
  nights: number;
  pricePerNight: number;
}

export interface HotelPayment {
  amount: number;
  bookingId: string;
  userId: string;
}
