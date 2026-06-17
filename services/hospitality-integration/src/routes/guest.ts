import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { GuestProfile, StayHistory, DiningHistory, Preferences } from '../models/HospitalityProfile';

const router = Router();
const customerOpsBridge = new CustomerOpsBridge();

// In-memory guest storage
const guestStore: Map<string, GuestProfile> = new Map();

// Get all guests
router.get('/', async (req: Request, res: Response) => {
  const { search, loyaltyTier, vipStatus, limit } = req.query;

  let guests = Array.from(guestStore.values());

  // Apply filters
  if (search) {
    const searchLower = (search as string).toLowerCase();
    guests = guests.filter(g =>
      g.firstName.toLowerCase().includes(searchLower) ||
      g.lastName.toLowerCase().includes(searchLower) ||
      g.email.toLowerCase().includes(searchLower)
    );
  }

  if (loyaltyTier) {
    guests = guests.filter(g => g.loyaltyTier === loyaltyTier);
  }

  if (vipStatus !== undefined) {
    guests = guests.filter(g => g.vipStatus === vipStatus);
  }

  // Apply limit
  if (limit) {
    guests = guests.slice(0, parseInt(limit as string));
  }

  res.json({
    success: true,
    count: guests.length,
    guests
  });
});

// Get guest by ID
router.get('/:guestId', async (req: Request, res: Response) => {
  const { guestId } = req.params;

  const guest = guestStore.get(guestId) || await customerOpsBridge.getGuestById(guestId);

  if (guest) {
    res.json({
      success: true,
      guest
    });
  } else {
    res.status(404).json({ error: 'Guest not found' });
  }
});

// Get or create guest profile
router.post('/find-or-create', async (req: Request, res: Response) => {
  const { email, firstName, lastName, phone } = req.body;

  // Check if guest exists
  let guest = Array.from(guestStore.values()).find(g => g.email === email);

  if (guest) {
    return res.json({
      success: true,
      guest,
      action: 'found'
    });
  }

  // Create new guest
  const newGuest: GuestProfile = {
    id: `GUEST-${uuidv4().substring(0, 8).toUpperCase()}`,
    customerTwinId: `CT-${uuidv4()}`,
    firstName,
    lastName,
    email,
    phone,
    preferences: {
      roomTypes: [],
      dietaryRestrictions: [],
      preferredCuisines: [],
      amenities: []
    },
    stayHistory: [],
    diningHistory: [],
    totalStays: 0,
    totalSpent: 0,
    loyaltyTier: 'bronze',
    vipStatus: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  guestStore.set(newGuest.id, newGuest);

  // Sync to Customer Twin
  await customerOpsBridge.syncToCustomerTwin(newGuest);

  res.status(201).json({
    success: true,
    guest: newGuest,
    action: 'created'
  });
});

// Create guest profile
router.post('/', async (req: Request, res: Response) => {
  const guestData: Partial<GuestProfile> = req.body;

  const guest: GuestProfile = {
    id: `GUEST-${uuidv4().substring(0, 8).toUpperCase()}`,
    customerTwinId: `CT-${uuidv4()}`,
    firstName: guestData.firstName || '',
    lastName: guestData.lastName || '',
    email: guestData.email || '',
    phone: guestData.phone,
    dateOfBirth: guestData.dateOfBirth,
    nationality: guestData.nationality,
    preferences: guestData.preferences || {
      roomTypes: [],
      dietaryRestrictions: [],
      preferredCuisines: [],
      amenities: []
    },
    stayHistory: guestData.stayHistory || [],
    diningHistory: guestData.diningHistory || [],
    totalStays: guestData.totalStays || 0,
    totalSpent: guestData.totalSpent || 0,
    loyaltyTier: guestData.loyaltyTier || 'bronze',
    vipStatus: guestData.vipStatus || false,
    specialNotes: guestData.specialNotes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  guestStore.set(guest.id, guest);

  // Sync to Customer Twin
  await customerOpsBridge.syncToCustomerTwin(guest);

  res.status(201).json({
    success: true,
    guest
  });
});

// Update guest profile
router.put('/:guestId', async (req: Request, res: Response) => {
  const { guestId } = req.params;
  const updates = req.body;

  let guest = guestStore.get(guestId);

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  guest = {
    ...guest,
    ...updates,
    id: guestId,
    updatedAt: new Date().toISOString()
  };

  guestStore.set(guestId, guest);

  // Sync to Customer Twin
  await customerOpsBridge.syncToCustomerTwin(guest);

  res.json({
    success: true,
    guest
  });
});

// Update guest preferences
router.patch('/:guestId/preferences', async (req: Request, res: Response) => {
  const { guestId } = req.params;
  const preferences = req.body;

  let guest = guestStore.get(guestId);

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  guest = {
    ...guest,
    preferences: {
      ...guest.preferences,
      ...preferences
    },
    updatedAt: new Date().toISOString()
  };

  guestStore.set(guestId, guest);

  res.json({
    success: true,
    guest
  });
});

// Add stay to guest history
router.post('/:guestId/stays', async (req: Request, res: Response) => {
  const { guestId } = req.params;
  const stay: StayHistory = req.body;

  let guest = guestStore.get(guestId);

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const newStay: StayHistory = {
    id: `STAY-${uuidv4().substring(0, 8)}`,
    ...stay,
    id: stay.id || newStay.id
  };

  guest = {
    ...guest,
    stayHistory: [newStay, ...guest.stayHistory],
    totalStays: guest.totalStays + 1,
    totalSpent: guest.totalSpent + (stay.totalAmount || 0),
    loyaltyTier: calculateLoyaltyTier(guest.totalStays + 1, guest.totalSpent + (stay.totalAmount || 0)),
    updatedAt: new Date().toISOString()
  };

  guestStore.set(guestId, guest);

  // Sync to Customer Twin
  await customerOpsBridge.syncToCustomerTwin(guest);

  res.json({
    success: true,
    guest
  });
});

// Add dining to guest history
router.post('/:guestId/dining', async (req: Request, res: Response) => {
  const { guestId } = req.params;
  const dining: DiningHistory = req.body;

  let guest = guestStore.get(guestId);

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const newDining: DiningHistory = {
    id: `DINE-${uuidv4().substring(0, 8)}`,
    ...dining
  };

  guest = {
    ...guest,
    diningHistory: [newDining, ...guest.diningHistory],
    totalSpent: guest.totalSpent + (dining.totalAmount || 0),
    updatedAt: new Date().toISOString()
  };

  guestStore.set(guestId, guest);

  res.json({
    success: true,
    guest
  });
});

// Get guest preferences
router.get('/:guestId/preferences', async (req: Request, res: Response) => {
  const { guestId } = req.params;

  const guest = guestStore.get(guestId);

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  res.json({
    success: true,
    preferences: guest.preferences
  });
});

// Get guest stay history
router.get('/:guestId/stays', async (req: Request, res: Response) => {
  const { guestId } = req.params;
  const { limit } = req.query;

  const guest = guestStore.get(guestId);

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const stays = limit ? guest.stayHistory.slice(0, parseInt(limit as string)) : guest.stayHistory;

  res.json({
    success: true,
    stays
  });
});

// Get guest dining history
router.get('/:guestId/dining', async (req: Request, res: Response) => {
  const { guestId } = req.params;
  const { limit } = req.query;

  const guest = guestStore.get(guestId);

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const dining = limit ? guest.diningHistory.slice(0, parseInt(limit as string)) : guest.diningHistory;

  res.json({
    success: true,
    dining
  });
});

// Mark guest as VIP
router.post('/:guestId/vip', async (req: Request, res: Response) => {
  const { guestId } = req.params;
  const { vipStatus, notes } = req.body;

  let guest = guestStore.get(guestId);

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  guest = {
    ...guest,
    vipStatus: vipStatus !== undefined ? vipStatus : true,
    specialNotes: notes ? `${guest.specialNotes || ''}\n${notes}` : guest.specialNotes,
    updatedAt: new Date().toISOString()
  };

  guestStore.set(guestId, guest);

  // Sync to Customer Twin
  await customerOpsBridge.syncToCustomerTwin(guest);

  res.json({
    success: true,
    guest
  });
});

// Search guests
router.get('/search/query', async (req: Request, res: Response) => {
  const { q, limit } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const query = (q as string).toLowerCase();
  let guests = Array.from(guestStore.values()).filter(g =>
    g.firstName.toLowerCase().includes(query) ||
    g.lastName.toLowerCase().includes(query) ||
    g.email.toLowerCase().includes(query) ||
    g.phone?.toLowerCase().includes(query)
  );

  if (limit) {
    guests = guests.slice(0, parseInt(limit as string));
  }

  res.json({
    success: true,
    count: guests.length,
    guests
  });
});

// Get VIP guests
router.get('/filter/vip', async (req: Request, res: Response) => {
  const vipGuests = Array.from(guestStore.values()).filter(g => g.vipStatus);

  res.json({
    success: true,
    count: vipGuests.length,
    guests: vipGuests
  });
});

// Get guests by loyalty tier
router.get('/filter/loyalty/:tier', async (req: Request, res: Response) => {
  const { tier } = req.params;
  const validTiers = ['bronze', 'silver', 'gold', 'platinum'];

  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Invalid loyalty tier' });
  }

  const guests = Array.from(guestStore.values()).filter(g => g.loyaltyTier === tier);

  res.json({
    success: true,
    count: guests.length,
    tier,
    guests
  });
});

// Get guest spending summary
router.get('/:guestId/spending', async (req: Request, res: Response) => {
  const { guestId } = req.params;

  const guest = guestStore.get(guestId);

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const totalStaysSpent = guest.stayHistory.reduce((sum, stay) => sum + stay.totalAmount, 0);
  const totalDiningSpent = guest.diningHistory.reduce((sum, dining) => sum + dining.totalAmount, 0);
  const averageStayAmount = guest.stayHistory.length > 0
    ? totalStaysSpent / guest.stayHistory.length
    : 0;
  const averageDiningAmount = guest.diningHistory.length > 0
    ? totalDiningSpent / guest.diningHistory.length
    : 0;

  res.json({
    success: true,
    guestId,
    summary: {
      totalSpent: guest.totalSpent,
      totalStaysSpent,
      totalDiningSpent,
      averageStayAmount,
      averageDiningAmount,
      totalStays: guest.totalStays,
      totalDiningVisits: guest.diningHistory.length
    }
  });
});

// Helper function to calculate loyalty tier
function calculateLoyaltyTier(totalStays: number, totalSpent: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  const score = totalStays * 100 + totalSpent;

  if (score >= 5000) return 'platinum';
  if (score >= 2500) return 'gold';
  if (score >= 1000) return 'silver';
  return 'bronze';
}

export default router;
