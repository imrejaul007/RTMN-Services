import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { PropertyProfile } from '../models/PropertyProfile';

// In-memory storage for bookings (replace with database in production)
interface SiteVisitBooking {
  id: string;
  bookingId: string;
  propertyId: string;
  propertyTitle: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredDate: string;
  preferredTime: string;
  alternateDate?: string;
  alternateTime?: string;
  numberOfVisitors: number;
  purpose: 'viewing' | 'valuation' | 'legal_review' | 'negotiation';
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  assignedAgent?: string;
  visitCompletedAt?: string;
  feedback?: {
    rating: number;
    comments?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const bookingsStore: Map<string, SiteVisitBooking> = new Map();

// Reference to properties store (imported from properties routes)
let propertiesStoreRef: Map<string, PropertyProfile> | null = null;

export function setPropertiesStore(store: Map<string, PropertyProfile>) {
  propertiesStoreRef = store;
}

/**
 * Bookings routes for RisnaEstate Integration
 * Handles site visit bookings
 */
export default function bookingsRoutes(customerOpsBridge: CustomerOpsBridge) {
  const router = Router();

  /**
   * GET /api/bookings
   * List all bookings with optional filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const status = req.query.status as SiteVisitBooking['status'];
      const propertyId = req.query.propertyId as string;
      const customerId = req.query.customerId as string;
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      let bookings = Array.from(bookingsStore.values());

      // Apply filters
      if (status) {
        bookings = bookings.filter(b => b.status === status);
      }
      if (propertyId) {
        bookings = bookings.filter(b => b.propertyId === propertyId);
      }
      if (customerId) {
        bookings = bookings.filter(b => b.customerId === customerId);
      }
      if (fromDate) {
        bookings = bookings.filter(b => new Date(b.preferredDate) >= new Date(fromDate));
      }
      if (toDate) {
        bookings = bookings.filter(b => new Date(b.preferredDate) <= new Date(toDate));
      }

      // Sort by preferred date (newest first)
      bookings.sort((a, b) =>
        new Date(b.preferredDate).getTime() - new Date(a.preferredDate).getTime()
      );

      // Pagination
      const total = bookings.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedBookings = bookings.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginatedBookings,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/bookings/stats
   * Get booking statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const bookings = Array.from(bookingsStore.values());

      const stats = {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        rescheduled: bookings.filter(b => b.status === 'rescheduled').length,
        byPurpose: {} as Record<string, number>,
        upcoming: bookings.filter(b =>
          (b.status === 'pending' || b.status === 'confirmed') &&
          new Date(b.preferredDate) >= new Date()
        ).length,
        averageRating: 0
      };

      // Group by purpose
      bookings.forEach(b => {
        stats.byPurpose[b.purpose] = (stats.byPurpose[b.purpose] || 0) + 1;
      });

      // Calculate average rating
      const ratedBookings = bookings.filter(b => b.feedback?.rating);
      if (ratedBookings.length > 0) {
        stats.averageRating = ratedBookings.reduce((sum, b) =>
          sum + (b.feedback?.rating || 0), 0) / ratedBookings.length;
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch booking statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/bookings/:id
   * Get single booking by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const booking = bookingsStore.get(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/bookings
   * Create new site visit booking
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const {
        propertyId,
        customerName,
        customerEmail,
        customerPhone,
        preferredDate,
        preferredTime,
        alternateDate,
        alternateTime,
        numberOfVisitors,
        purpose,
        notes,
        customerId
      } = req.body;

      // Validate required fields
      if (!propertyId || !customerName || !customerEmail || !preferredDate || !preferredTime) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['propertyId', 'customerName', 'customerEmail', 'preferredDate', 'preferredTime']
        });
      }

      // Check if property exists
      if (propertiesStoreRef) {
        const property = propertiesStoreRef.get(propertyId);
        if (!property) {
          return res.status(404).json({
            success: false,
            error: 'Property not found'
          });
        }

        // Update property analytics
        property.analytics.siteVisitRequests += 1;
        propertiesStoreRef.set(propertyId, property);
      }

      const bookingId = `SV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const now = new Date().toISOString();

      const booking: SiteVisitBooking = {
        id: uuidv4(),
        bookingId,
        propertyId,
        propertyTitle: propertiesStoreRef?.get(propertyId)?.title || 'Unknown Property',
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        preferredDate,
        preferredTime,
        alternateDate,
        alternateTime,
        numberOfVisitors: numberOfVisitors || 1,
        purpose: purpose || 'viewing',
        notes,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };

      bookingsStore.set(booking.id, booking);

      // Sync to Customer Twin
      await customerOpsBridge.syncBookingToCustomer(booking);

      // Create/update customer profile
      await customerOpsBridge.createOrUpdateCustomer({
        id: customerId || uuidv4(),
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        type: 'buyer',
        interests: [propertyId]
      });

      res.status(201).json({
        success: true,
        data: booking,
        message: 'Site visit booking created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/bookings/:id
   * Update booking
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const existingBooking = bookingsStore.get(req.params.id);

      if (!existingBooking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      const updatedBooking: SiteVisitBooking = {
        ...existingBooking,
        ...req.body,
        id: existingBooking.id,
        bookingId: existingBooking.bookingId,
        propertyId: existingBooking.propertyId,
        createdAt: existingBooking.createdAt,
        updatedAt: new Date().toISOString()
      };

      bookingsStore.set(updatedBooking.id, updatedBooking);

      // Sync update to Customer Twin
      await customerOpsBridge.syncBookingToCustomer(updatedBooking);

      res.json({
        success: true,
        data: updatedBooking,
        message: 'Booking updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/bookings/:id/confirm
   * Confirm a booking
   */
  router.put('/:id/confirm', async (req: Request, res: Response) => {
    try {
      const booking = bookingsStore.get(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      if (booking.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Only pending bookings can be confirmed'
        });
      }

      booking.status = 'confirmed';
      booking.assignedAgent = req.body.agentId || booking.assignedAgent;
      booking.updatedAt = new Date().toISOString();

      bookingsStore.set(booking.id, booking);

      // Notify customer via Customer Twin
      await customerOpsBridge.notifyCustomer(booking.customerId, {
        type: 'booking_confirmed',
        message: `Your site visit for ${booking.propertyTitle} on ${booking.preferredDate} has been confirmed.`
      });

      res.json({
        success: true,
        data: booking,
        message: 'Booking confirmed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to confirm booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/bookings/:id/complete
   * Mark booking as completed
   */
  router.put('/:id/complete', async (req: Request, res: Response) => {
    try {
      const booking = bookingsStore.get(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      if (booking.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          error: 'Only confirmed bookings can be marked as completed'
        });
      }

      booking.status = 'completed';
      booking.visitCompletedAt = new Date().toISOString();
      booking.feedback = req.body.feedback;
      booking.updatedAt = new Date().toISOString();

      bookingsStore.set(booking.id, booking);

      res.json({
        success: true,
        data: booking,
        message: 'Booking completed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to complete booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/bookings/:id/cancel
   * Cancel a booking
   */
  router.put('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const booking = bookingsStore.get(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      if (booking.status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Completed bookings cannot be cancelled'
        });
      }

      booking.status = 'cancelled';
      booking.updatedAt = new Date().toISOString();

      bookingsStore.set(booking.id, booking);

      // Notify customer via Customer Twin
      await customerOpsBridge.notifyCustomer(booking.customerId, {
        type: 'booking_cancelled',
        message: `Your site visit for ${booking.propertyTitle} has been cancelled.`
      });

      res.json({
        success: true,
        data: booking,
        message: 'Booking cancelled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to cancel booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/bookings/:id/reschedule
   * Reschedule a booking
   */
  router.put('/:id/reschedule', async (req: Request, res: Response) => {
    try {
      const booking = bookingsStore.get(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      if (booking.status !== 'pending' && booking.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          error: 'Booking cannot be rescheduled'
        });
      }

      const { newDate, newTime } = req.body;

      if (!newDate || !newTime) {
        return res.status(400).json({
          success: false,
          error: 'New date and time are required'
        });
      }

      // Store previous booking info
      booking.alternateDate = booking.preferredDate;
      booking.alternateTime = booking.preferredTime;
      booking.preferredDate = newDate;
      booking.preferredTime = newTime;
      booking.status = 'rescheduled';
      booking.updatedAt = new Date().toISOString();

      bookingsStore.set(booking.id, booking);

      // Notify customer via Customer Twin
      await customerOpsBridge.notifyCustomer(booking.customerId, {
        type: 'booking_rescheduled',
        message: `Your site visit for ${booking.propertyTitle} has been rescheduled to ${newDate} at ${newTime}.`
      });

      res.json({
        success: true,
        data: booking,
        message: 'Booking rescheduled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to reschedule booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/bookings/:id/feedback
   * Submit feedback for completed booking
   */
  router.post('/:id/feedback', async (req: Request, res: Response) => {
    try {
      const booking = bookingsStore.get(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      if (booking.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Feedback can only be submitted for completed visits'
        });
      }

      const { rating, comments } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5'
        });
      }

      booking.feedback = {
        rating,
        comments
      };
      booking.updatedAt = new Date().toISOString();

      bookingsStore.set(booking.id, booking);

      // Sync feedback to Customer Twin
      await customerOpsBridge.syncFeedbackToCustomer(booking);

      res.json({
        success: true,
        data: booking,
        message: 'Feedback submitted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

// Export the store for use in other routes
export { bookingsStore };
