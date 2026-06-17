import axios from 'axios';
import { HotelBooking } from '../models/HospitalityProfile';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  checkedIn: number;
  checkedOut: number;
  cancelled: number;
  totalRevenue: number;
  occupancyRate: number;
  averageStayValue: number;
}

export class BookingSync {
  private assetTwinUrl: string;
  private hotelOsUrl: string;
  private stayOwnUrl: string;

  // In-memory storage for offline mode
  private bookingStore: Map<string, HotelBooking> = new Map();
  private syncedAssets: Map<string, string> = new Map();

  constructor() {
    this.assetTwinUrl = process.env.ASSET_TWIN_URL || 'http://localhost:3015';
    this.hotelOsUrl = process.env.HOTEL_OS_URL || 'http://localhost:5025';
    this.stayOwnUrl = process.env.STAYOWN_HOSPITALITY_URL || 'http://localhost:6000';
  }

  // Sync a single booking to Asset Twin
  async syncBookingToAssetTwin(booking: HotelBooking): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      // Map booking to asset data
      const assetData = {
        externalId: booking.id,
        assetTwinId: booking.assetTwinId || this.syncedAssets.get(booking.id),
        type: 'room',
        category: 'accommodation',
        property: {
          id: booking.propertyId,
          name: booking.propertyName
        },
        asset: {
          id: booking.roomId,
          type: booking.roomType,
          number: booking.roomNumber
        },
        guest: {
          id: booking.guestId,
          name: booking.guestName,
          email: booking.guestEmail
        },
        stay: {
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.nights
        },
        financials: {
          totalAmount: booking.totalAmount,
          paidAmount: booking.paidAmount,
          pendingAmount: booking.pendingAmount
        },
        status: this.mapBookingStatus(booking.status),
        addOns: booking.addOns.map(addon => ({
          name: addon.name,
          quantity: addon.quantity,
          price: addon.totalPrice
        })),
        source: 'hospitality-integration',
        lastSyncedAt: new Date().toISOString()
      };

      // Try to sync to Asset Twin
      const response = await axios.post(`${this.assetTwinUrl}/api/assets`, assetData, {
        timeout: 5000
      });

      if (response.data?.id) {
        this.syncedAssets.set(booking.id, response.data.id);
        booking.assetTwinId = response.data.id;
      }

      result.success = true;
      result.synced = 1;

      // Publish sync event
      await this.publishSyncEvent('booking.synced', {
        bookingId: booking.id,
        assetTwinId: response.data?.id,
        status: booking.status
      });

    } catch (error: any) {
      console.error(`[BookingSync] Failed to sync booking ${booking.id}:`, error.message);
      result.failed = 1;
      result.errors.push(`${booking.id}: ${error.message}`);

      // Store locally for later sync
      this.bookingStore.set(booking.id, booking);
    }

    return result;
  }

  // Store booking locally
  async storeBooking(booking: HotelBooking): Promise<void> {
    this.bookingStore.set(booking.id, booking);
  }

  // Get booking by ID
  async getBookingById(bookingId: string): Promise<HotelBooking | null> {
    // Check local store first
    if (this.bookingStore.has(bookingId)) {
      return this.bookingStore.get(bookingId)!;
    }

    // Try Hotel OS
    try {
      const response = await axios.get(`${this.hotelOsUrl}/api/bookings/${bookingId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  // Update booking
  async updateBooking(bookingId: string, updates: Partial<HotelBooking>): Promise<void> {
    const existing = this.bookingStore.get(bookingId);
    if (existing) {
      this.bookingStore.set(bookingId, {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Get all synced bookings
  async getAllSyncedBookings(): Promise<HotelBooking[]> {
    return Array.from(this.bookingStore.values());
  }

  // Get bookings by guest
  async getBookingsByGuest(guestId: string): Promise<HotelBooking[]> {
    const bookings = Array.from(this.bookingStore.values());
    return bookings.filter(b => b.guestId === guestId);
  }

  // Sync all bookings to Asset Twin
  async syncAllBookings(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    const bookings = Array.from(this.bookingStore.values());

    for (const booking of bookings) {
      const syncResult = await this.syncBookingToAssetTwin(booking);
      result.synced += syncResult.synced;
      result.failed += syncResult.failed;
      result.errors.push(...syncResult.errors);
    }

    result.success = result.failed === 0;

    return result;
  }

  // Sync from Hotel OS
  async syncFromHotelOs(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      const response = await axios.get(`${this.hotelOsUrl}/api/bookings`, {
        timeout: 10000
      });

      const bookings: HotelBooking[] = response.data || [];

      for (const booking of bookings) {
        this.bookingStore.set(booking.id, booking);
        const syncResult = await this.syncBookingToAssetTwin(booking);
        result.synced += syncResult.synced;
        result.failed += syncResult.failed;
        result.errors.push(...syncResult.errors);
      }

    } catch (error: any) {
      console.error('[BookingSync] Failed to fetch from Hotel OS:', error.message);
      result.success = false;
      result.errors.push(`Hotel OS fetch: ${error.message}`);
    }

    return result;
  }

  // Sync from StayOwn
  async syncFromStayOwn(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      const response = await axios.get(`${this.stayOwnUrl}/api/bookings`, {
        timeout: 10000
      });

      const bookings: HotelBooking[] = response.data || [];

      for (const booking of bookings) {
        // Map StayOwn booking to our format
        const mappedBooking: HotelBooking = {
          id: `STAYOWN-${booking.id}`,
          assetTwinId: booking.assetTwinId,
          guestId: booking.guestId,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          propertyId: booking.propertyId,
          propertyName: booking.propertyName,
          roomId: booking.roomId,
          roomType: booking.roomType,
          roomNumber: booking.roomNumber,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.nights,
          adults: booking.adults,
          children: booking.children,
          totalAmount: booking.totalAmount,
          paidAmount: booking.paidAmount,
          pendingAmount: booking.pendingAmount,
          status: booking.status,
          source: 'stayown',
          specialRequests: booking.specialRequests,
          addOns: booking.addOns,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt
        };

        this.bookingStore.set(mappedBooking.id, mappedBooking);
        const syncResult = await this.syncBookingToAssetTwin(mappedBooking);
        result.synced += syncResult.synced;
        result.failed += syncResult.failed;
        result.errors.push(...syncResult.errors);
      }

    } catch (error: any) {
      console.error('[BookingSync] Failed to sync from StayOwn:', error.message);
      result.success = false;
      result.errors.push(`StayOwn sync: ${error.message}`);
    }

    return result;
  }

  // Get booking statistics
  async getBookingStats(): Promise<BookingStats> {
    const bookings = Array.from(this.bookingStore.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: BookingStats = {
      total: bookings.length,
      pending: 0,
      confirmed: 0,
      checkedIn: 0,
      checkedOut: 0,
      cancelled: 0,
      totalRevenue: 0,
      occupancyRate: 0,
      averageStayValue: 0
    };

    let activeRooms = 0;
    const totalRooms = 100; // This should come from property data

    for (const booking of bookings) {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);

      switch (booking.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'confirmed':
          stats.confirmed++;
          break;
        case 'checked-in':
          stats.checkedIn++;
          activeRooms++;
          stats.totalRevenue += booking.totalAmount;
          break;
        case 'checked-out':
          stats.checkedOut++;
          stats.totalRevenue += booking.totalAmount;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }
    }

    stats.occupancyRate = (activeRooms / totalRooms) * 100;
    const completedBookings = stats.checkedOut + stats.checkedIn;
    stats.averageStayValue = completedBookings > 0
      ? stats.totalRevenue / completedBookings
      : 0;

    return stats;
  }

  // Get pending syncs
  async getPendingSyncs(): Promise<HotelBooking[]> {
    const unsynced: HotelBooking[] = [];

    for (const [bookingId, assetTwinId] of this.syncedAssets) {
      if (!assetTwinId) {
        const booking = this.bookingStore.get(bookingId);
        if (booking) {
          unsynced.push(booking);
        }
      }
    }

    // Also include bookings not in synced map
    for (const [id, booking] of this.bookingStore) {
      if (!this.syncedAssets.has(id)) {
        unsynced.push(booking);
      }
    }

    return unsynced;
  }

  // Retry failed syncs
  async retryFailedSyncs(): Promise<SyncResult> {
    const pending = await this.getPendingSyncs();

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    for (const booking of pending) {
      const syncResult = await this.syncBookingToAssetTwin(booking);
      result.synced += syncResult.synced;
      result.failed += syncResult.failed;
      result.errors.push(...syncResult.errors);
    }

    result.success = result.failed === 0;
    return result;
  }

  // Publish sync event to Event Bus
  private async publishSyncEvent(eventType: string, payload: any): Promise<void> {
    try {
      const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';
      await axios.post(`${eventBusUrl}/api/events`, {
        type: eventType,
        source: 'booking-sync',
        payload,
        timestamp: new Date().toISOString()
      }, { timeout: 3000 });
    } catch (error) {
      // Event Bus may not be available
    }
  }

  // Map booking status to asset status
  private mapBookingStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'reserved',
      'confirmed': 'reserved',
      'checked-in': 'occupied',
      'checked-out': 'available',
      'cancelled': 'available'
    };
    return statusMap[status] || 'unknown';
  }

  // Clear local storage
  clear(): void {
    this.bookingStore.clear();
    this.syncedAssets.clear();
  }
}
