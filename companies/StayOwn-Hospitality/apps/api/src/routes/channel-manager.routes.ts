import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateHotelStaff, authenticateAdmin } from '../middleware/auth';
import { channelManagerService, InventoryUpdate } from '../services/channel-manager.service';
import { Errors } from '../utils/errors';

const router = Router();

// ============================================
// Hotel Staff Endpoints
// ============================================

/**
 * GET /api/channel-manager/channels
 * List all supported OTA channels
 */
router.get('/channels', asyncHandler(async (_req: Request, res: Response) => {
  const channels = channelManagerService.getSupportedChannels();
  res.json({ channels });
}));

/**
 * GET /api/channel-manager/configured
 * List configured channels for the hotel
 */
router.get('/configured', authenticateHotelStaff, asyncHandler(async (req: Request, res: Response) => {
  const hotelId = req.hotelStaff!.hotelId;
  const channels = channelManagerService.getChannels(hotelId);
  res.json({ channels });
}));

/**
 * POST /api/channel-manager/connect
 * Connect a new OTA channel
 */
router.post('/connect', authenticateHotelStaff, asyncHandler(async (req: Request, res: Response) => {
  const hotelId = req.hotelStaff!.hotelId;
  const { channelId, channelName, apiKey, apiSecret, propertyId } = req.body;

  if (!channelId || !propertyId) {
    throw Errors.validation('channelId and propertyId are required');
  }

  const result = await channelManagerService.connectChannel(hotelId, {
    channelId,
    channelName: channelName || channelId,
    apiKey,
    apiSecret,
    propertyId,
  });

  res.json({ success: result.success, channelId: result.channelId });
}));

/**
 * POST /api/channel-manager/disconnect
 * Disconnect an OTA channel
 */
router.post('/disconnect', authenticateHotelStaff, asyncHandler(async (req: Request, res: Response) => {
  const hotelId = req.hotelStaff!.hotelId;
  const { channelId } = req.body;

  if (!channelId) {
    throw Errors.validation('channelId is required');
  }

  await channelManagerService.disconnectChannel(hotelId, channelId);

  res.json({ success: true, channelId });
}));

/**
 * POST /api/channel-manager/push-inventory
 * Push inventory to a specific channel or all channels
 */
router.post('/push-inventory', authenticateHotelStaff, asyncHandler(async (req: Request, res: Response) => {
  const hotelId = req.hotelStaff!.hotelId;
  const { channelId, updates } = req.body;

  if (channelId) {
    // Push to specific channel
    if (!updates || !Array.isArray(updates)) {
      throw Errors.validation('updates array is required');
    }
    await channelManagerService.pushInventoryToChannel(hotelId, channelId, updates);
    res.json({ success: true, channelId, updates: updates.length });
  } else {
    // Push to all active channels
    if (!updates || !Array.isArray(updates)) {
      throw Errors.validation('updates array is required');
    }
    const result = await channelManagerService.pushInventory(hotelId, updates);
    res.json({ success: true, ...result });
  }
}));

/**
 * POST /api/channel-manager/pull-bookings
 * Pull bookings from a specific channel
 */
router.post('/pull-bookings', authenticateHotelStaff, asyncHandler(async (req: Request, res: Response) => {
  const hotelId = req.hotelStaff!.hotelId;
  const { channelId, since } = req.body;

  if (!channelId) {
    throw Errors.validation('channelId is required');
  }

  const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const bookings = await channelManagerService.pullBookings(hotelId, channelId, sinceDate);

  res.json({ channelId, bookings, count: bookings.length });
}));

/**
 * POST /api/channel-manager/sync
 * Full sync: push inventory + pull bookings from all channels
 */
router.post('/sync', authenticateHotelStaff, asyncHandler(async (req: Request, res: Response) => {
  const hotelId = req.hotelStaff!.hotelId;
  const result = await channelManagerService.syncAll(hotelId);
  res.json({ success: true, ...result });
}));

/**
 * GET /api/channel-manager/logs
 * Get sync logs for the hotel
 */
router.get('/logs', authenticateHotelStaff, asyncHandler(async (req: Request, res: Response) => {
  const hotelId = req.hotelStaff!.hotelId;
  const limit = parseInt(req.query.limit as string) || 50;
  const logs = channelManagerService.getSyncLogs(hotelId, limit);
  res.json({ logs });
}));

/**
 * DELETE /api/channel-manager/logs
 * Clear sync logs for the hotel
 */
router.delete('/logs', authenticateHotelStaff, asyncHandler(async (req: Request, res: Response) => {
  const hotelId = req.hotelStaff!.hotelId;
  channelManagerService.clearSyncLogs(hotelId);
  res.json({ success: true });
}));

// ============================================
// Admin Endpoints
// ============================================

/**
 * GET /api/channel-manager/admin/stats
 * Get overall channel manager statistics
 */
router.get('/admin/stats', authenticateAdmin, asyncHandler(async (_req: Request, res: Response) => {
  // This would aggregate stats across all hotels in production
  res.json({
    supportedChannels: channelManagerService.getSupportedChannels().map((c) => c.channelId),
    message: 'Admin stats would be implemented with database integration',
  });
}));

// ============================================
// Webhook Endpoints (Inbound from OTAs)
// ============================================

/**
 * POST /api/channel-manager/webhook/inventory
 * Receive inventory updates from channel managers
 * Used by channels like SiteMinder, Staah, RateGain
 */
router.post('/webhook/inventory', asyncHandler(async (req: Request, res: Response) => {
  // Verify webhook secret
  const secret = process.env.CHANNEL_MANAGER_WEBHOOK_SECRET;
  const provided = req.headers['x-webhook-secret'] as string;

  if (!secret || !provided) {
    throw Errors.forbidden('Webhook secret not configured');
  }

  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);

  if (secretBuf.length !== providedBuf.length || !timingSafeEqual(secretBuf, providedBuf)) {
    throw Errors.forbidden('Invalid webhook secret');
  }

  const { hotel_id, provider, updates } = req.body;

  if (!hotel_id || !provider || !updates) {
    throw Errors.validation('hotel_id, provider, and updates are required');
  }

  // Process the inventory updates
  const inventoryUpdates: InventoryUpdate[] = updates.map((u: any) => ({
    roomTypeId: u.room_type_id,
    date: u.date,
    available: u.available_rooms,
    rate: u.rate,
    currency: u.currency,
    restrictions: u.restrictions,
  }));

  const result = await channelManagerService.pushInventory(hotel_id, inventoryUpdates);

  res.json({
    success: true,
    processed: updates.length,
    ...result,
  });
}));

/**
 * POST /api/channel-manager/webhook/booking
 * Receive booking notifications from channel managers
 */
router.post('/webhook/booking', asyncHandler(async (req: Request, res: Response) => {
  const secret = process.env.CHANNEL_MANAGER_WEBHOOK_SECRET;
  const provided = req.headers['x-webhook-secret'] as string;

  if (!secret || !provided) {
    throw Errors.forbidden('Webhook secret not configured');
  }

  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);

  if (secretBuf.length !== providedBuf.length || !timingSafeEqual(secretBuf, providedBuf)) {
    throw Errors.forbidden('Invalid webhook secret');
  }

  const { hotel_id, provider, booking } = req.body;

  if (!hotel_id || !booking) {
    throw Errors.validation('hotel_id and booking are required');
  }

  // Log the booking (actual processing would happen in production)
  console.log(`[Webhook] Booking received from ${provider} for hotel ${hotel_id}:`, {
    bookingId: booking.id,
    guestName: booking.guest_name,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    status: booking.status,
  });

  res.json({ success: true, bookingId: booking.id });
}));

/**
 * POST /api/channel-manager/webhook/cancellation
 * Receive cancellation notifications from channel managers
 */
router.post('/webhook/cancellation', asyncHandler(async (req: Request, res: Response) => {
  const secret = process.env.CHANNEL_MANAGER_WEBHOOK_SECRET;
  const provided = req.headers['x-webhook-secret'] as string;

  if (!secret || !provided) {
    throw Errors.forbidden('Webhook secret not configured');
  }

  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);

  if (secretBuf.length !== providedBuf.length || !timingSafeEqual(secretBuf, providedBuf)) {
    throw Errors.forbidden('Invalid webhook secret');
  }

  const { hotel_id, booking_id, reason } = req.body;

  if (!hotel_id || !booking_id) {
    throw Errors.validation('hotel_id and booking_id are required');
  }

  console.log(`[Webhook] Cancellation received for hotel ${hotel_id}:`, {
    bookingId: booking_id,
    reason: reason || 'No reason provided',
  });

  res.json({ success: true, bookingId: booking_id });
}));

export default router;
