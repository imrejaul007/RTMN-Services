import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { BookingSync } from '../services/bookingSync';
import { HotelBooking, BookingAddOn } from '../models/HospitalityProfile';

const router = Router();
const bookingSync = new BookingSync();

const HOTEL_OS_URL = process.env.HOTEL_OS_URL || 'http://localhost:5025';

// Get all bookings across hotels
router.get('/', async (req: Request, res: Response) => {
  const { status, startDate, endDate, propertyId } = req.query;

  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/bookings`, {
      params: { status, startDate, endDate, propertyId }
    });
    res.json({
      success: true,
      source: 'hotel-os',
      bookings: response.data
    });
  } catch (error: any) {
    console.error('Bookings fetch error:', error.message);
    const syncedBookings = await bookingSync.getAllSyncedBookings();
    res.json({
      success: true,
      source: 'local',
      bookings: syncedBookings
    });
  }
});

// Get booking by ID
router.get('/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/bookings/${bookingId}`);
    res.json({
      success: true,
      booking: response.data
    });
  } catch (error: any) {
    console.error('Booking fetch error:', error.message);
    const booking = await bookingSync.getBookingById(bookingId);
    if (booking) {
      res.json({ success: true, booking });
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  }
});

// Create booking
router.post('/', async (req: Request, res: Response) => {
  const bookingData: Partial<HotelBooking> = req.body;

  const booking: HotelBooking = {
    id: `BK-${uuidv4().substring(0, 8).toUpperCase()}`,
    assetTwinId: `AT-${uuidv4()}`,
    guestId: bookingData.guestId || '',
    guestName: bookingData.guestName || '',
    guestEmail: bookingData.guestEmail || '',
    propertyId: bookingData.propertyId || '',
    propertyName: bookingData.propertyName || '',
    roomId: bookingData.roomId || '',
    roomType: bookingData.roomType || 'standard',
    roomNumber: bookingData.roomNumber,
    checkIn: bookingData.checkIn || '',
    checkOut: bookingData.checkOut || '',
    nights: bookingData.nights || 1,
    adults: bookingData.adults || 1,
    children: bookingData.children,
    totalAmount: bookingData.totalAmount || 0,
    paidAmount: bookingData.paidAmount || 0,
    pendingAmount: bookingData.pendingAmount || 0,
    status: 'pending',
    source: bookingData.source || 'direct',
    specialRequests: bookingData.specialRequests || [],
    addOns: bookingData.addOns || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const response = await axios.post(`${HOTEL_OS_URL}/api/bookings`, booking);
    const createdBooking = response.data;

    // Sync to Asset Twin
    await bookingSync.syncBookingToAssetTwin(createdBooking);

    res.json({
      success: true,
      booking: createdBooking
    });
  } catch (error: any) {
    console.error('Create booking error:', error.message);

    // Store locally
    await bookingSync.storeBooking(booking);
    await bookingSync.syncBookingToAssetTwin(booking);

    res.json({
      success: true,
      source: 'local',
      booking
    });
  }
});

// Update booking
router.put('/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const updates = req.body;

  try {
    const response = await axios.put(`${HOTEL_OS_URL}/api/bookings/${bookingId}`, updates);
    const updatedBooking = response.data;

    // Sync updates to Asset Twin
    await bookingSync.syncBookingToAssetTwin(updatedBooking);

    res.json({
      success: true,
      booking: updatedBooking
    });
  } catch (error: any) {
    console.error('Update booking error:', error.message);
    const updatedBooking = {
      ...updates,
      id: bookingId,
      updatedAt: new Date().toISOString()
    };

    await bookingSync.updateBooking(bookingId, updates);
    await bookingSync.syncBookingToAssetTwin(updatedBooking as HotelBooking);

    res.json({
      success: true,
      source: 'local',
      booking: updatedBooking
    });
  }
});

// Check-in
router.post('/:bookingId/check-in', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { roomAssigned, keyCard } = req.body;

  try {
    const response = await axios.post(`${HOTEL_OS_URL}/api/bookings/${bookingId}/check-in`, {
      roomAssigned,
      keyCard
    });

    const checkedInBooking = {
      ...response.data,
      status: 'checked-in',
      checkedInAt: new Date().toISOString()
    };

    await bookingSync.syncBookingToAssetTwin(checkedInBooking);

    res.json({
      success: true,
      booking: checkedInBooking
    });
  } catch (error: any) {
    console.error('Check-in error:', error.message);
    const booking = {
      id: bookingId,
      status: 'checked-in',
      roomId: roomAssigned,
      checkedInAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await bookingSync.updateBooking(bookingId, booking);
    await bookingSync.syncBookingToAssetTwin(booking as HotelBooking);

    res.json({
      success: true,
      source: 'local',
      booking
    });
  }
});

// Check-out
router.post('/:bookingId/check-out', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { additionalCharges, paymentMethod, paymentReference } = req.body;

  const additionalChargesTotal = additionalCharges?.reduce(
    (sum: number, charge: any) => sum + charge.amount,
    0
  ) || 0;

  try {
    const response = await axios.post(`${HOTEL_OS_URL}/api/bookings/${bookingId}/check-out`, {
      additionalCharges,
      paymentMethod,
      paymentReference
    });

    const checkedOutBooking = {
      ...response.data,
      status: 'checked-out',
      checkedOutAt: new Date().toISOString()
    };

    await bookingSync.syncBookingToAssetTwin(checkedOutBooking);

    res.json({
      success: true,
      booking: checkedOutBooking
    });
  } catch (error: any) {
    console.error('Check-out error:', error.message);

    const existingBooking = await bookingSync.getBookingById(bookingId);
    const pendingAmount = (existingBooking?.pendingAmount || 0) + additionalChargesTotal;

    const booking = {
      id: bookingId,
      status: 'checked-out',
      pendingAmount,
      additionalCharges,
      checkedOutAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await bookingSync.updateBooking(bookingId, booking);
    await bookingSync.syncBookingToAssetTwin(booking as HotelBooking);

    res.json({
      success: true,
      source: 'local',
      booking,
      additionalChargesTotal
    });
  }
});

// Cancel booking
router.post('/:bookingId/cancel', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { reason, refundAmount } = req.body;

  try {
    const response = await axios.post(`${HOTEL_OS_URL}/api/bookings/${bookingId}/cancel`, {
      reason,
      refundAmount
    });

    const cancelledBooking = {
      ...response.data,
      status: 'cancelled',
      cancellationReason: reason,
      refundedAmount: refundAmount,
      cancelledAt: new Date().toISOString()
    };

    await bookingSync.syncBookingToAssetTwin(cancelledBooking);

    res.json({
      success: true,
      booking: cancelledBooking
    });
  } catch (error: any) {
    console.error('Cancel booking error:', error.message);
    const booking = {
      id: bookingId,
      status: 'cancelled',
      cancellationReason: reason,
      refundedAmount: refundAmount,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await bookingSync.updateBooking(bookingId, booking);
    await bookingSync.syncBookingToAssetTwin(booking as HotelBooking);

    res.json({
      success: true,
      source: 'local',
      booking
    });
  }
});

// Add add-on to booking
router.post('/:bookingId/addons', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { name, quantity, price } = req.body;

  const addOn: BookingAddOn = {
    id: `ADD-${uuidv4().substring(0, 8)}`,
    name,
    quantity,
    price,
    totalPrice: price * quantity
  };

  try {
    const response = await axios.post(`${HOTEL_OS_URL}/api/bookings/${bookingId}/addons`, addOn);

    const updatedBooking = {
      ...response.data,
      updatedAt: new Date().toISOString()
    };

    await bookingSync.syncBookingToAssetTwin(updatedBooking);

    res.json({
      success: true,
      booking: updatedBooking
    });
  } catch (error: any) {
    console.error('Add add-on error:', error.message);
    const existingBooking = await bookingSync.getBookingById(bookingId);
    const updatedBooking = {
      ...existingBooking,
      addOns: [...(existingBooking?.addOns || []), addOn],
      totalAmount: (existingBooking?.totalAmount || 0) + addOn.totalPrice,
      updatedAt: new Date().toISOString()
    };

    await bookingSync.updateBooking(bookingId, updatedBooking);
    await bookingSync.syncBookingToAssetTwin(updatedBooking);

    res.json({
      success: true,
      source: 'local',
      booking: updatedBooking
    });
  }
});

// Get guest bookings
router.get('/guest/:guestId', async (req: Request, res: Response) => {
  const { guestId } = req.params;
  const { status } = req.query;

  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/bookings`, {
      params: { guestId, status }
    });
    res.json({
      success: true,
      bookings: response.data
    });
  } catch (error: any) {
    console.error('Guest bookings error:', error.message);
    const bookings = await bookingSync.getBookingsByGuest(guestId);
    res.json({
      success: true,
      source: 'local',
      bookings
    });
  }
});

// Get booking timeline
router.get('/:bookingId/timeline', async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  const booking = await bookingSync.getBookingById(bookingId);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const timeline = [
    { event: 'Booking Created', timestamp: booking.createdAt, status: 'completed' },
    { event: 'Booking Confirmed', timestamp: booking.updatedAt, status: 'completed' }
  ];

  if (booking.status === 'checked-in' || booking.status === 'checked-out') {
    timeline.push({ event: 'Check-in', timestamp: (booking as any).checkedInAt, status: 'completed' });
  }

  if (booking.status === 'checked-out') {
    timeline.push({ event: 'Check-out', timestamp: (booking as any).checkedOutAt, status: 'completed' });
  }

  res.json({
    success: true,
    bookingId,
    timeline
  });
});

// Sync all bookings to Asset Twin
router.post('/sync/all', async (req: Request, res: Response) => {
  try {
    const result = await bookingSync.syncAllBookings();
    res.json({
      success: true,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors
    });
  } catch (error: any) {
    console.error('Sync all error:', error.message);
    res.status(500).json({ error: 'Failed to sync bookings' });
  }
});

// Get booking stats
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const stats = await bookingSync.getBookingStats();
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('Stats error:', error.message);
    res.status(500).json({ error: 'Failed to get booking stats' });
  }
});

export default router;
