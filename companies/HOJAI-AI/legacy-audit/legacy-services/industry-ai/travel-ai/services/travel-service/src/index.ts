/**
 * HOJAI Travel OS Service
 * Trip planning, itinerary builder, booking management
 * Reuses: Airzy pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Trip {
  id: string;
  name: string;
  userId: string;
  userName: string;
  destinations: { city: string; country: string; arrival: string; departure: string }[];
  travelers: number;
  budget: { min: number; max: number };
  preferences: string[];
  status: 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
  itinerary: ItineraryItem[];
  totalCost: number;
  createdAt: string;
}

interface ItineraryItem {
  id: string;
  day: number;
  time: string;
  type: 'flight' | 'hotel' | 'activity' | 'transport' | 'meal' | 'other';
  title: string;
  description: string;
  location?: string;
  cost: number;
  bookingRef?: string;
  status: 'planned' | 'confirmed' | 'completed' | 'cancelled';
}

interface FlightBooking {
  id: string;
  tripId: string;
  airline: string;
  flightNo: string;
  from: { city: string; airport: string; time: string };
  to: { city: string; airport: string; time: string };
  passengers: { name: string; seat?: string }[];
  class: 'economy' | 'business' | 'first';
  price: number;
  status: 'confirmed' | 'cancelled';
  pnr?: string;
}

interface HotelBooking {
  id: string;
  tripId: string;
  hotelName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  roomType: string;
  price: number;
  status: 'confirmed' | 'cancelled';
  bookingRef?: string;
  amenities: string[];
}

interface Activity {
  id: string;
  tripId: string;
  name: string;
  city: string;
  date: string;
  duration: string;
  participants: number;
  price: number;
  provider: string;
  status: 'booked' | 'completed' | 'cancelled';
  bookingRef?: string;
}

const trips = new Map<string, Trip>();
const flightBookings = new Map<string, FlightBooking>();
const hotelBookings = new Map<string, HotelBooking>();
const activities = new Map<string, Activity>();

// Trip CRUD
router.post('/trips', async (req, res) => {
  try {
    const trip: Trip = {
      ...req.body,
      id: uuidv4(),
      status: 'planning',
      itinerary: [],
      totalCost: 0,
      createdAt: new Date().toISOString(),
    };
    trips.set(trip.id, trip);
    res.status(201).json({ success: true, trip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

router.get('/trips', async (req, res) => {
  try {
    const { userId, status } = req.query;
    let result = Array.from(trips.values());

    if (userId) result = result.filter(t => t.userId === userId);
    if (status) result = result.filter(t => t.status === status);

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ trips: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

router.get('/trips/:id', async (req, res) => {
  try {
    const trip = trips.get(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const flights = Array.from(flightBookings.values()).filter(f => f.tripId === req.params.id);
    const hotels = Array.from(hotelBookings.values()).filter(h => h.tripId === req.params.id);
    const tripActivities = Array.from(activities.values()).filter(a => a.tripId === req.params.id);

    res.json({ trip, flights, hotels, activities: tripActivities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

router.patch('/trips/:id', async (req, res) => {
  try {
    const trip = trips.get(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    Object.assign(trip, req.body);
    trips.set(trip.id, trip);

    res.json({ success: true, trip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

// Add itinerary item
router.post('/trips/:id/itinerary', async (req, res) => {
  try {
    const trip = trips.get(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const item: ItineraryItem = { ...req.body, id: uuidv4(), status: 'planned' };
    trip.itinerary.push(item);
    trip.totalCost += item.cost;
    trips.set(trip.id, trip);

    res.status(201).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add itinerary item' });
  }
});

// Flight bookings
router.post('/flights', async (req, res) => {
  try {
    const flight: FlightBooking = {
      ...req.body,
      id: uuidv4(),
      status: 'confirmed',
      pnr: generatePNR(),
    };
    flightBookings.set(flight.id, flight);

    // Update trip cost
    const trip = trips.get(flight.tripId);
    if (trip) {
      trip.totalCost += flight.price;
      trips.set(trip.id, trip);
    }

    res.status(201).json({ success: true, flight });
  } catch (error) {
    res.status(500).json({ error: 'Failed to book flight' });
  }
});

router.get('/flights', async (req, res) => {
  try {
    const { tripId, status } = req.query;
    let result = Array.from(flightBookings.values());

    if (tripId) result = result.filter(f => f.tripId === tripId);
    if (status) result = result.filter(f => f.status === status);

    res.json({ flights: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

// Hotel bookings
router.post('/hotels', async (req, res) => {
  try {
    const hotel: HotelBooking = {
      ...req.body,
      id: uuidv4(),
      status: 'confirmed',
      bookingRef: `HTL-${Date.now()}`,
    };
    hotelBookings.set(hotel.id, hotel);

    // Update trip cost
    const trip = trips.get(hotel.tripId);
    if (trip) {
      trip.totalCost += hotel.price;
      trips.set(trip.id, trip);
    }

    res.status(201).json({ success: true, hotel });
  } catch (error) {
    res.status(500).json({ error: 'Failed to book hotel' });
  }
});

router.get('/hotels', async (req, res) => {
  try {
    const { tripId, city } = req.query;
    let result = Array.from(hotelBookings.values());

    if (tripId) result = result.filter(h => h.tripId === tripId);
    if (city) result = result.filter(h => h.city.toLowerCase().includes((city as string).toLowerCase()));

    res.json({ hotels: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

// Activities
router.post('/activities', async (req, res) => {
  try {
    const activity: Activity = {
      ...req.body,
      id: uuidv4(),
      status: 'booked',
      bookingRef: `ACT-${Date.now()}`,
    };
    activities.set(activity.id, activity);

    const trip = trips.get(activity.tripId);
    if (trip) {
      trip.totalCost += activity.price;
      trips.set(trip.id, trip);
    }

    res.status(201).json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to book activity' });
  }
});

router.get('/activities', async (req, res) => {
  try {
    const { tripId, city } = req.query;
    let result = Array.from(activities.values());

    if (tripId) result = result.filter(a => a.tripId === tripId);
    if (city) result = result.filter(a => a.city.toLowerCase().includes((city as string).toLowerCase()));

    res.json({ activities: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Search destinations (simulated)
router.get('/destinations/search', async (req, res) => {
  try {
    const { query } = req.query;
    const popularDestinations = [
      { city: 'Goa', country: 'India', type: 'beach', avgCost: 15000 },
      { city: 'Jaipur', country: 'India', type: 'heritage', avgCost: 12000 },
      { city: 'Kerala', country: 'India', type: 'nature', avgCost: 20000 },
      { city: 'Manali', country: 'India', type: 'mountains', avgCost: 18000 },
      { city: 'Dubai', country: 'UAE', type: 'city', avgCost: 50000 },
      { city: 'Singapore', country: 'Singapore', type: 'city', avgCost: 60000 },
      { city: 'Bali', country: 'Indonesia', type: 'beach', avgCost: 45000 },
      { city: 'Maldives', country: 'Maldives', type: 'beach', avgCost: 80000 },
    ];

    const results = query
      ? popularDestinations.filter(d =>
          d.city.toLowerCase().includes((query as string).toLowerCase()) ||
          d.country.toLowerCase().includes((query as string).toLowerCase())
        )
      : popularDestinations;

    res.json({ destinations: results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search destinations' });
  }
});

// Generate itinerary suggestion
router.post('/suggest/itinerary', async (req, res) => {
  try {
    const { destination, days, budget, interests } = req.body;

    const suggestions: ItineraryItem[] = [];

    for (let day = 1; day <= days; day++) {
      suggestions.push({
        id: uuidv4(),
        day,
        time: '09:00',
        type: 'activity',
        title: `Explore ${destination}`,
        description: `Visit local attractions and landmarks`,
        cost: Math.round(budget / days / 2),
        status: 'planned',
      });

      suggestions.push({
        id: uuidv4(),
        day,
        time: '13:00',
        type: 'meal',
        title: 'Local Cuisine Experience',
        description: `Try ${destination} local food`,
        cost: 500,
        status: 'planned',
      });
    }

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const planning = Array.from(trips.values()).filter(t => t.status === 'planning').length;
    const confirmed = Array.from(trips.values()).filter(t => t.status === 'confirmed').length;
    const ongoing = Array.from(trips.values()).filter(t => t.status === 'ongoing').length;

    const totalRevenue = Array.from(trips.values()).reduce((sum, t) => sum + t.totalCost, 0);
    const avgTripCost = trips.size > 0 ? Math.round(totalRevenue / trips.size) : 0;

    res.json({
      trips: { planning, confirmed, ongoing, completed: Array.from(trips.values()).filter(t => t.status === 'completed').length },
      bookings: {
        flights: flightBookings.size,
        hotels: hotelBookings.size,
        activities: activities.size,
      },
      revenue: { total: totalRevenue, avgTripCost },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

function generatePNR(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
}

export { router, trips, flightBookings, hotelBookings, activities };
