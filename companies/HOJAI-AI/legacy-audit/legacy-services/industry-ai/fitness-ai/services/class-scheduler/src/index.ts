/**
 * HOJAI Gym Class Scheduler Service
 * Class scheduling for Gym & Fitness OS
 * Reuses: REZ Booking Engine pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory stores
const classes = new Map<string, GymClass>();
const bookings = new Map<string, ClassBooking>();
const trainers = new Map<string, Trainer>();

interface GymClass {
  id: string;
  name: string;
  type: 'yoga' | 'hiit' | 'zumba' | 'pilates' | 'strength' | 'cardio' | 'crossfit' | 'spinning' | 'dance' | 'meditation';
  trainerId: string;
  duration: number; // minutes
  capacity: number;
  currentBookings: number;
  startTime: string; // ISO datetime
  endTime: string;
  room: string;
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
}

interface Trainer {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialties: string[];
  certifications: string[];
  availability: WeeklySchedule;
  rating: number;
  totalClasses: number;
  bio?: string;
}

interface WeeklySchedule {
  [day: string]: { start: string; end: string }[];
}

interface ClassBooking {
  id: string;
  classId: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  bookedAt: string;
  status: 'confirmed' | 'cancelled' | 'attended' | 'no-show';
  checkInTime?: string;
}

// Class CRUD
router.post('/classes', async (req, res) => {
  try {
    const { name, type, trainerId, duration, capacity, startTime, room, difficulty, equipment, description } = req.body;

    if (!name || !type || !trainerId || !startTime) {
      return res.status(400).json({ error: 'Name, type, trainer, and start time are required' });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + (duration || 60) * 60 * 1000);

    const gymClass: GymClass = {
      id: uuidv4(),
      name,
      type,
      trainerId,
      duration: duration || 60,
      capacity: capacity || 20,
      currentBookings: 0,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      room,
      equipment: equipment || [],
      difficulty: difficulty || 'beginner',
      description,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    classes.set(gymClass.id, gymClass);

    res.status(201).json({ success: true, class: gymClass });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Get all classes
router.get('/classes', async (req, res) => {
  try {
    const { date, type, trainerId, day } = req.query;
    let result = Array.from(classes.values());

    if (date) {
      const targetDate = new Date(date as string).toDateString();
      result = result.filter(c => new Date(c.startTime).toDateString() === targetDate);
    }
    if (type) {
      result = result.filter(c => c.type === type);
    }
    if (trainerId) {
      result = result.filter(c => c.trainerId === trainerId);
    }
    if (day) {
      result = result.filter(c => {
        const classDay = new Date(c.startTime).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        return classDay === (day as string).toLowerCase();
      });
    }

    // Sort by start time
    result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    res.json({ classes: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class by ID
router.get('/classes/:id', async (req, res) => {
  try {
    const gymClass = classes.get(req.params.id);
    if (!gymClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get bookings for this class
    const classBookings = Array.from(bookings.values())
      .filter(b => b.classId === req.params.id);

    res.json({
      class: gymClass,
      bookings: classBookings,
      availableSpots: gymClass.capacity - classBookings.filter(b => b.status === 'confirmed').length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Book a class
router.post('/classes/:id/book', async (req, res) => {
  try {
    const { memberId, memberName, memberPhone } = req.body;
    const gymClass = classes.get(req.params.id);

    if (!gymClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check capacity
    const confirmedBookings = Array.from(bookings.values())
      .filter(b => b.classId === req.params.id && b.status === 'confirmed').length;

    if (confirmedBookings >= gymClass.capacity) {
      return res.status(400).json({ error: 'Class is full' });
    }

    // Check if already booked
    const existing = Array.from(bookings.values())
      .find(b => b.classId === req.params.id && b.memberId === memberId && b.status === 'confirmed');

    if (existing) {
      return res.status(400).json({ error: 'Already booked for this class' });
    }

    const booking: ClassBooking = {
      id: uuidv4(),
      classId: req.params.id,
      memberId,
      memberName,
      memberPhone,
      bookedAt: new Date().toISOString(),
      status: 'confirmed',
    };

    bookings.set(booking.id, booking);

    // Send confirmation
    await sendNotification(memberPhone,
      `Booked: ${gymClass.name} on ${new Date(gymClass.startTime).toLocaleString()}. Trainer: ${gymClass.trainerId}`
    );

    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ error: 'Failed to book class' });
  }
});

// Cancel booking
router.delete('/classes/:classId/bookings/:bookingId', async (req, res) => {
  try {
    const booking = bookings.get(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = 'cancelled';
    bookings.set(booking.id, booking);

    res.json({ success: true, message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Check-in to class
router.post('/classes/:id/checkin', async (req, res) => {
  try {
    const { memberId, bookingId } = req.body;
    const booking = bookings.get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = 'attended';
    booking.checkInTime = new Date().toISOString();
    bookings.set(booking.id, booking);

    res.json({ success: true, message: 'Check-in successful' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check-in' });
  }
});

// Trainer CRUD
router.post('/trainers', async (req, res) => {
  try {
    const { name, phone, email, specialties, certifications, availability } = req.body;

    const trainer: Trainer = {
      id: uuidv4(),
      name,
      phone,
      email,
      specialties: specialties || [],
      certifications: certifications || [],
      availability: availability || {},
      rating: 0,
      totalClasses: 0,
    };

    trainers.set(trainer.id, trainer);
    res.status(201).json({ success: true, trainer });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create trainer' });
  }
});

router.get('/trainers', async (req, res) => {
  try {
    const { specialty } = req.query;
    let result = Array.from(trainers.values());

    if (specialty) {
      result = result.filter(t => t.specialties.includes(specialty as string));
    }

    res.json({ trainers: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
});

// Get weekly schedule
router.get('/schedule/weekly', async (req, res) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    const schedule: { [day: string]: GymClass[] } = {};

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayName = day.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      schedule[dayName] = Array.from(classes.values())
        .filter(c => new Date(c.startTime).toDateString() === day.toDateString())
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }

    res.json({ schedule });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

// Get member's bookings
router.get('/bookings/member/:memberId', async (req, res) => {
  try {
    const memberBookings = Array.from(bookings.values())
      .filter(b => b.memberId === req.params.memberId)
      .map(b => ({
        ...b,
        class: classes.get(b.classId),
      }));

    res.json({ bookings: memberBookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Helper
async function sendNotification(phone: string, message: string): Promise<void> {
  console.log(`[Notification] To: ${phone}, Message: ${message}`);
}

export { router, classes, bookings, trainers };
export type { GymClass, Trainer, ClassBooking };
