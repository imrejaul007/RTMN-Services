/**
 * Event Publisher - Publishes events to RTMN Event Bus
 */

import axios from 'axios';

export class EventPublisher {
  constructor(eventBusUrl, logger) {
    this.eventBusUrl = eventBusUrl;
    this.logger = logger;
    this.connected = false;
  }

  async connect() {
    try {
      // Check if event bus is available
      const response = await axios.get(`${this.eventBusUrl}/health`, {
        timeout: 3000
      });

      if (response.status === 200) {
        this.connected = true;
        this.logger.info(`Event Publisher connected to ${this.eventBusUrl}`);
      }
    } catch (err) {
      this.logger.warn(`Event Bus not available at ${this.eventBusUrl}. Events will be queued.`);
      this.connected = false;
    }
  }

  async publish(eventType, data, options = {}) {
    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      source: options.source || 'hotel-ecosystem-gateway',
      correlationId: options.correlationId || this.generateCorrelationId(),
      metadata: options.metadata || {}
    };

    if (!this.connected) {
      this.logger.warn(`Event Bus offline. Queuing event: ${eventType}`);
      this.queueEvent(event);
      return { queued: true, event };
    }

    try {
      const response = await axios.post(`${this.eventBusUrl}/events`, event, {
        timeout: 5000
      });

      this.logger.info(`Event published: ${eventType}`, {
        correlationId: event.correlationId,
        status: response.status
      });

      return { published: true, eventId: response.data?.id };
    } catch (err) {
      this.logger.error(`Failed to publish event ${eventType}:`, err.message);
      this.queueEvent(event);
      return { queued: true, event, error: err.message };
    }
  }

  // Hotel-specific event shortcuts
  async publishBookingCreated(booking) {
    return this.publish('hotel.booking.created', {
      bookingId: booking.id,
      hotelId: booking.hotelId,
      guestId: booking.guestId,
      roomId: booking.roomId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalAmount: booking.totalAmount,
      source: booking.source
    });
  }

  async publishBookingCancelled(bookingId, reason, guestId) {
    return this.publish('hotel.booking.cancelled', {
      bookingId,
      reason,
      guestId,
      cancelledAt: new Date().toISOString()
    });
  }

  async publishCheckIn(bookingId, roomId, guestId) {
    return this.publish('hotel.guest.checked_in', {
      bookingId,
      roomId,
      guestId,
      checkedInAt: new Date().toISOString()
    });
  }

  async publishCheckOut(bookingId, roomId, totalCharges, guestId) {
    return this.publish('hotel.guest.checked_out', {
      bookingId,
      roomId,
      guestId,
      totalCharges,
      checkedOutAt: new Date().toISOString()
    });
  }

  async publishServiceRequested(request) {
    return this.publish('hotel.service.requested', {
      requestId: request.id,
      bookingId: request.bookingId,
      roomId: request.roomId,
      serviceType: request.serviceType,
      items: request.items
    });
  }

  async publishServiceCompleted(requestId, staffId) {
    return this.publish('hotel.service.completed', {
      requestId,
      staffId,
      completedAt: new Date().toISOString()
    });
  }

  async publishHousekeepingStatusChange(roomId, status, staffId) {
    return this.publish('hotel.housekeeping.status_changed', {
      roomId,
      status, // 'clean', 'dirty', 'inspected', 'out_of_order'
      staffId,
      changedAt: new Date().toISOString()
    });
  }

  async publishPaymentReceived(bookingId, amount, paymentMethod, guestId) {
    return this.publish('hotel.payment.received', {
      bookingId,
      amount,
      paymentMethod,
      guestId,
      receivedAt: new Date().toISOString()
    });
  }

  async publishLoyaltyTierChange(userId, oldTier, newTier, points) {
    return this.publish('hotel.loyalty.tier_changed', {
      userId,
      oldTier,
      newTier,
      totalPoints: points,
      changedAt: new Date().toISOString()
    });
  }

  queueEvent(event) {
    // In-memory queue (in production, use Redis or persistent queue)
    if (!this.eventQueue) {
      this.eventQueue = [];
    }
    this.eventQueue.push(event);

    // Keep only last 100 events
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift();
    }
  }

  async retryQueuedEvents() {
    if (!this.eventQueue || this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      await this.publish(event.type, event.data, {
        source: event.source,
        correlationId: event.correlationId
      });
    }
  }

  generateCorrelationId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
