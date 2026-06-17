import { Router, Request, Response } from 'express';
import axios from 'axios';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { BookingSync } from '../services/bookingSync';
import { HotelBooking, PropertyInfo } from '../models/HospitalityProfile';

const router = Router();
const customerOpsBridge = new CustomerOpsBridge();
const bookingSync = new BookingSync();

const HOTEL_OS_URL = process.env.HOTEL_OS_URL || 'http://localhost:5025';
const STAYOWN_URL = process.env.STAYOWN_HOSPITALITY_URL || 'http://localhost:6000';

// Get all properties from Hotel OS
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/properties`);
    res.json({
      success: true,
      source: 'hotel-os',
      properties: response.data
    });
  } catch (error: any) {
    console.error('Hotel OS error:', error.message);
    res.json({
      success: true,
      source: 'local',
      properties: getMockProperties()
    });
  }
});

// Get property by ID
router.get('/properties/:propertyId', async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/properties/${propertyId}`);
    res.json({
      success: true,
      source: 'hotel-os',
      property: response.data
    });
  } catch (error: any) {
    console.error('Hotel OS error:', error.message);
    const mockProperty = getMockProperties().find(p => p.id === propertyId);
    if (mockProperty) {
      res.json({
        success: true,
        source: 'local',
        property: mockProperty
      });
    } else {
      res.status(404).json({ error: 'Property not found' });
    }
  }
});

// Get rooms for property
router.get('/properties/:propertyId/rooms', async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const { status } = req.query;
  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/properties/${propertyId}/rooms`, {
      params: { status }
    });
    res.json({
      success: true,
      source: 'hotel-os',
      rooms: response.data
    });
  } catch (error: any) {
    console.error('Hotel OS error:', error.message);
    res.json({
      success: true,
      source: 'local',
      rooms: getMockRooms(propertyId)
    });
  }
});

// Get all bookings
router.get('/bookings', async (req: Request, res: Response) => {
  const { status, propertyId, guestId } = req.query;
  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/bookings`, {
      params: { status, propertyId, guestId }
    });
    res.json({
      success: true,
      source: 'hotel-os',
      bookings: response.data
    });
  } catch (error: any) {
    console.error('Hotel OS error:', error.message);
    res.json({
      success: true,
      source: 'local',
      bookings: getMockBookings()
    });
  }
});

// Get booking by ID
router.get('/bookings/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/bookings/${bookingId}`);
    res.json({
      success: true,
      source: 'hotel-os',
      booking: response.data
    });
  } catch (error: any) {
    console.error('Hotel OS error:', error.message);
    const mockBooking = getMockBookings().find(b => b.id === bookingId);
    if (mockBooking) {
      res.json({
        success: true,
        source: 'local',
        booking: mockBooking
      });
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  }
});

// Create new booking
router.post('/bookings', async (req: Request, res: Response) => {
  const booking: HotelBooking = req.body;

  try {
    // Try to create in Hotel OS
    const response = await axios.post(`${HOTEL_OS_URL}/api/bookings`, booking);
    const createdBooking = response.data;

    // Sync to Asset Twin
    await bookingSync.syncBookingToAssetTwin(createdBooking);

    res.json({
      success: true,
      source: 'hotel-os',
      booking: createdBooking
    });
  } catch (error: any) {
    console.error('Hotel OS create error:', error.message);
    // Create locally with mock data
    const localBooking: HotelBooking = {
      ...booking,
      id: `BK-${Date.now()}`,
      assetTwinId: `AT-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await bookingSync.syncBookingToAssetTwin(localBooking);

    res.json({
      success: true,
      source: 'local',
      booking: localBooking
    });
  }
});

// Update booking
router.put('/bookings/:bookingId', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const updates = req.body;

  try {
    const response = await axios.put(`${HOTEL_OS_URL}/api/bookings/${bookingId}`, updates);
    res.json({
      success: true,
      source: 'hotel-os',
      booking: response.data
    });
  } catch (error: any) {
    console.error('Hotel OS update error:', error.message);
    res.json({
      success: true,
      source: 'local',
      booking: { id: bookingId, ...updates, updatedAt: new Date().toISOString() }
    });
  }
});

// Check-in guest
router.post('/bookings/:bookingId/check-in', async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  try {
    const response = await axios.post(`${HOTEL_OS_URL}/api/bookings/${bookingId}/check-in`);
    res.json({
      success: true,
      source: 'hotel-os',
      booking: response.data
    });
  } catch (error: any) {
    console.error('Check-in error:', error.message);
    res.json({
      success: true,
      source: 'local',
      booking: { id: bookingId, status: 'checked-in', checkedInAt: new Date().toISOString() }
    });
  }
});

// Check-out guest
router.post('/bookings/:bookingId/check-out', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { charges, paymentStatus } = req.body;

  try {
    const response = await axios.post(`${HOTEL_OS_URL}/api/bookings/${bookingId}/check-out`, {
      charges,
      paymentStatus
    });
    res.json({
      success: true,
      source: 'hotel-os',
      booking: response.data
    });
  } catch (error: any) {
    console.error('Check-out error:', error.message);
    res.json({
      success: true,
      source: 'local',
      booking: {
        id: bookingId,
        status: 'checked-out',
        checkedOutAt: new Date().toISOString(),
        pendingAmount: charges?.total || 0,
        paymentStatus: paymentStatus || 'pending'
      }
    });
  }
});

// Cancel booking
router.post('/bookings/:bookingId/cancel', async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  try {
    const response = await axios.post(`${HOTEL_OS_URL}/api/bookings/${bookingId}/cancel`, { reason });
    res.json({
      success: true,
      source: 'hotel-os',
      booking: response.data
    });
  } catch (error: any) {
    console.error('Cancel error:', error.message);
    res.json({
      success: true,
      source: 'local',
      booking: { id: bookingId, status: 'cancelled', cancellationReason: reason }
    });
  }
});

// Get room availability
router.get('/availability', async (req: Request, res: Response) => {
  const { propertyId, checkIn, checkOut, roomType, guests } = req.query;

  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/availability`, {
      params: { propertyId, checkIn, checkOut, roomType, guests }
    });
    res.json({
      success: true,
      source: 'hotel-os',
      availability: response.data
    });
  } catch (error: any) {
    console.error('Availability check error:', error.message);
    res.json({
      success: true,
      source: 'local',
      availability: {
        available: true,
        rooms: [
          { type: 'standard', available: 5, price: 150 },
          { type: 'deluxe', available: 3, price: 250 },
          { type: 'suite', available: 1, price: 450 }
        ]
      }
    });
  }
});

// Get StayOwn integration status
router.get('/stayown/status', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${STAYOWN_URL}/api/status`);
    res.json({
      success: true,
      source: 'stayown',
      status: response.data
    });
  } catch (error: any) {
    console.error('StayOwn status error:', error.message);
    res.json({
      success: true,
      source: 'local',
      status: {
        connected: false,
        message: 'StayOwn service unavailable'
      }
    });
  }
});

// Sync StayOwn properties
router.post('/stayown/sync', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${STAYOWN_URL}/api/sync/properties`);
    res.json({
      success: true,
      message: 'StayOwn properties synced',
      synced: response.data
    });
  } catch (error: any) {
    console.error('StayOwn sync error:', error.message);
    res.status(500).json({ error: 'Failed to sync with StayOwn' });
  }
});

// Get occupancy stats
router.get('/stats/occupancy', async (req: Request, res: Response) => {
  const { propertyId, startDate, endDate } = req.query;

  try {
    const response = await axios.get(`${HOTEL_OS_URL}/api/stats/occupancy`, {
      params: { propertyId, startDate, endDate }
    });
    res.json({
      success: true,
      source: 'hotel-os',
      stats: response.data
    });
  } catch (error: any) {
    console.error('Occupancy stats error:', error.message);
    res.json({
      success: true,
      source: 'local',
      stats: {
        occupancyRate: 78.5,
        averageDailyRate: 185,
        revPAR: 145.2,
        totalRooms: 100,
        occupiedRooms: 78,
        availableRooms: 22
      }
    });
  }
});

// Mock data functions
function getMockProperties(): PropertyInfo[] {
  return [
    {
      id: 'HTL-001',
      name: 'Grand Plaza Hotel',
      type: 'hotel',
      brand: 'RTMN Hospitality',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001'
      },
      contact: {
        phone: '+1-555-0100',
        email: 'info@grandplaza.com'
      },
      amenities: ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Room Service', 'Concierge'],
      rating: 4.5,
      totalRooms: 150,
      availableRooms: 45,
      operatingSince: '2010-01-15'
    },
    {
      id: 'HTL-002',
      name: 'Mountain View Inn',
      type: 'inn',
      brand: 'RTMN Hospitality',
      address: {
        street: '456 Highland Avenue',
        city: 'Aspen',
        state: 'CO',
        country: 'USA',
        postalCode: '81611'
      },
      contact: {
        phone: '+1-555-0200',
        email: 'info@mountainview.com'
      },
      amenities: ['WiFi', 'Fireplace', 'Ski Storage', 'Restaurant', 'Hot Tub'],
      rating: 4.7,
      totalRooms: 35,
      availableRooms: 12,
      operatingSince: '2005-06-20'
    }
  ];
}

function getMockRooms(propertyId: string) {
  return [
    { id: `${propertyId}-101`, type: 'standard', floor: 1, status: 'available', price: 150 },
    { id: `${propertyId}-102`, type: 'standard', floor: 1, status: 'occupied', price: 150 },
    { id: `${propertyId}-201`, type: 'deluxe', floor: 2, status: 'available', price: 250 },
    { id: `${propertyId}-301`, type: 'suite', floor: 3, status: 'maintenance', price: 450 }
  ];
}

function getMockBookings(): HotelBooking[] {
  return [
    {
      id: 'BK-001',
      guestId: 'GUEST-001',
      guestName: 'John Smith',
      guestEmail: 'john.smith@email.com',
      propertyId: 'HTL-001',
      propertyName: 'Grand Plaza Hotel',
      roomId: 'HTL-001-201',
      roomType: 'deluxe',
      roomNumber: '201',
      checkIn: '2026-06-16',
      checkOut: '2026-06-19',
      nights: 3,
      adults: 2,
      children: 1,
      totalAmount: 825,
      paidAmount: 825,
      pendingAmount: 0,
      status: 'confirmed',
      source: 'direct',
      specialRequests: ['Extra pillows', 'Early check-in at 10 AM'],
      addOns: [],
      createdAt: '2026-06-10T10:00:00Z',
      updatedAt: '2026-06-10T10:00:00Z'
    },
    {
      id: 'BK-002',
      guestId: 'GUEST-002',
      guestName: 'Jane Doe',
      guestEmail: 'jane.doe@email.com',
      propertyId: 'HTL-001',
      propertyName: 'Grand Plaza Hotel',
      roomId: 'HTL-001-301',
      roomType: 'suite',
      roomNumber: '301',
      checkIn: '2026-06-17',
      checkOut: '2026-06-20',
      nights: 3,
      adults: 2,
      totalAmount: 1350,
      paidAmount: 500,
      pendingAmount: 850,
      status: 'pending',
      source: 'booking.com',
      specialRequests: [],
      addOns: [
        { id: 'ADD-001', name: 'Airport Transfer', quantity: 1, price: 50, totalPrice: 50 }
      ],
      createdAt: '2026-06-12T14:30:00Z',
      updatedAt: '2026-06-12T14:30:00Z'
    }
  ];
}

export default router;
