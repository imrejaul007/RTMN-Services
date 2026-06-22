/**
 * HOJAI Hotel AI - REZ-Merchant Connector
 */

export interface HotelConnectorConfig {
  useREZServices: boolean;
  rezApiKey?: string;
  rezBaseUrl?: string;
}

export interface Room {
  id: string;
  type: string;
  price: number;
  available: boolean;
}

export interface Booking {
  id: string;
  guestName: string;
  guestPhone: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
}

export class HotelConnector {
  private config: HotelConnectorConfig;

  constructor(config: HotelConnectorConfig) {
    this.config = config;
  }

  /**
   * Get available rooms
   */
  async getAvailableRooms(hotelId: string, checkIn: string, checkOut: string): Promise<Room[]> {
    if (this.config.useREZServices) {
      const response = await fetch(
        `${this.config.rezBaseUrl}/hotels/${hotelId}/rooms?checkIn=${checkIn}&checkOut=${checkOut}`,
        { headers: { 'Authorization': `Bearer ${this.config.rezApiKey}` } }
      );
      return response.json();
    }
    return this.getLocalRooms(checkIn, checkOut);
  }

  /**
   * Create booking
   */
  async createBooking(hotelId: string, data: {
    guestName: string;
    guestPhone: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
  }): Promise<Booking> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/hotels/${hotelId}/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    }
    return this.createLocalBooking(hotelId, data);
  }

  /**
   * Check-in guest
   */
  async checkIn(bookingId: string): Promise<Booking> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/bookings/${bookingId}/checkin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.config.rezApiKey}` },
      });
      return response.json();
    }
    return this.localCheckIn(bookingId);
  }

  /**
   * Check-out guest
   */
  async checkOut(bookingId: string): Promise<{ total: number }> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/bookings/${bookingId}/checkout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.config.rezApiKey}` },
      });
      return response.json();
    }
    return { total: 0 };
  }

  // Local mock data
  private mockRooms: Room[] = [
    { id: 'room-101', type: 'standard', price: 2999, available: true },
    { id: 'room-102', type: 'standard', price: 2999, available: true },
    { id: 'room-201', type: 'deluxe', price: 4999, available: true },
    { id: 'room-301', type: 'suite', price: 8999, available: false },
  ];

  private mockBookings: Booking[] = [
    { id: 'bk-001', roomId: 'room-101', guestName: 'Rajesh Kumar', phone: '9876543210', checkIn: '2026-06-01', checkOut: '2026-06-03', status: 'checked-in' },
    { id: 'bk-002', roomId: 'room-201', guestName: 'Priya Sharma', phone: '9876543211', checkIn: '2026-06-02', checkOut: '2026-06-05', status: 'confirmed' },
  ];

  // Local methods
  private getLocalRooms(checkIn: string, checkOut: string): Room[] {
    return this.mockRooms.filter(r => r.available);
  }

  private createLocalBooking(hotelId: string, data: { guestName: string; guestPhone: string; roomId: string; checkIn: string; checkOut: string }): Booking {
    const booking: Booking = {
      id: `local-book-${Date.now()}`,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      roomId: data.roomId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      status: 'confirmed',
    };
    this.mockBookings.push(booking);
    return booking;
  }

  private localCheckIn(bookingId: string): Booking {
    const booking = this.mockBookings.find(b => b.id === bookingId);
    if (booking) {
      booking.status = 'checked-in';
    }
    return booking || { id: bookingId, guestName: '', guestPhone: '', roomId: '', checkIn: '', checkOut: '', status: 'checked-in' };
  }
}
