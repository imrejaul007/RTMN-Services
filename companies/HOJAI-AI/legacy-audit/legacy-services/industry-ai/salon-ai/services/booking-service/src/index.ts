/**
 * HOJAI Salon & Spa Booking Service
 * Appointment booking, customer management, service tracking
 * Reuses: REZ Booking Engine pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  preferences: string[];
  allergies: string[];
  notes?: string;
  visits: number;
  lastVisit?: string;
  totalSpent: number;
  preferredStaff?: string;
  memberSince: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number; // minutes
  price: number;
  description: string;
  staff: string[]; // staff IDs who can perform
  products: string[]; // products used
  aftercareInstructions?: string[];
}

interface Staff {
  id: string;
  name: string;
  phone: string;
  role: string;
  services: string[]; // service IDs
  schedule: WeeklySchedule;
  breaks: { start: string; end: string }[];
  rating: number;
  totalServices: number;
}

interface WeeklySchedule {
  [day: string]: { start: string; end: string }[];
}

interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  duration: number;
  price: number;
  products: string[];
  notes?: string;
  checkInTime?: string;
  checkOutTime?: string;
  createdAt: string;
}

interface Package {
  id: string;
  name: string;
  services: { serviceId: string; serviceName: string }[];
  price: number;
  originalPrice: number;
  validityDays: number;
  visits: number;
}

// In-memory stores
const customers = new Map<string, Customer>();
const services = new Map<string, Service>();
const staff = new Map<string, Staff>();
const appointments = new Map<string, Appointment>();
const packages = new Map<string, Package>();

// Initialize with default services
function initDefaultServices(): void {
  const defaultServices: Omit<Service, 'id'>[] = [
    { name: 'Haircut', category: 'Hair', duration: 30, price: 299, description: 'Basic haircut and styling', staff: [], products: [] },
    { name: 'Hair Coloring', category: 'Hair', duration: 90, price: 1999, description: 'Full hair coloring', staff: [], products: ['Hair color'] },
    { name: 'Hair Treatment', category: 'Hair', duration: 60, price: 999, description: 'Keratin/hair spa treatment', staff: [], products: ['Treatment products'] },
    { name: 'Facial', category: 'Skin', duration: 45, price: 599, description: 'Basic facial', staff: [], products: ['Facial kit'] },
    { name: 'Clean-up', category: 'Skin', duration: 30, price: 399, description: 'Face clean-up', staff: [], products: ['Clean-up kit'] },
    { name: 'Full Body Massage', category: 'Spa', duration: 60, price: 1499, description: 'Full body relaxation massage', staff: [], products: ['Massage oil'] },
    { name: 'Head Massage', category: 'Spa', duration: 30, price: 499, description: 'Head and shoulder massage', staff: [], products: ['Massage oil'] },
    { name: 'Manicure', category: 'Nails', duration: 30, price: 299, description: 'Nail shaping and polish', staff: [], products: ['Nail polish', 'Cuticle oil'] },
    { name: 'Pedicure', category: 'Nails', duration: 45, price: 399, description: 'Foot care and polish', staff: [], products: ['Pedicure kit'] },
    { name: 'Bridal Makeup', category: 'Makeup', duration: 120, price: 4999, description: 'Full bridal makeup', staff: [], products: ['Makeup kit'], aftercareInstructions: ['Avoid touching face', 'Use setting spray'] },
  ];

  defaultServices.forEach(s => {
    const service: Service = { ...s, id: uuidv4(), staff: [], products: [] };
    services.set(service.id, service);
  });
}

initDefaultServices();

// Customer CRUD
router.post('/customers', async (req, res) => {
  try {
    const { name, phone, email, preferences, allergies, notes } = req.body;

    const customer: Customer = {
      id: uuidv4(),
      name,
      phone,
      email,
      preferences: preferences || [],
      allergies: allergies || [],
      notes,
      visits: 0,
      totalSpent: 0,
      memberSince: new Date().toISOString(),
    };

    customers.set(customer.id, customer);

    // Send welcome message
    await sendNotification(phone, `Welcome to ${salonName}, ${name}! Book your first appointment.`);

    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const { search, phone } = req.query;
    let result = Array.from(customers.values());

    if (phone) {
      const customer = result.find(c => c.phone === phone);
      return res.json({ customer: customer || null });
    }

    if (search) {
      const term = (search as string).toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term)
      );
    }

    res.json({ customers: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customer = customers.get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get appointment history
    const history = Array.from(appointments.values())
      .filter(a => a.customerId === req.params.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ customer, history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Service CRUD
router.post('/services', async (req, res) => {
  try {
    const service: Service = { ...req.body, id: uuidv4() };
    services.set(service.id, service);
    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const { category } = req.query;
    let result = Array.from(services.values());

    if (category) {
      result = result.filter(s => s.category === category);
    }

    res.json({ services: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.get('/services/:id', async (req, res) => {
  try {
    const service = services.get(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json({ service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Staff CRUD
router.post('/staff', async (req, res) => {
  try {
    const staffMember: Staff = { ...req.body, id: uuidv4(), rating: 0, totalServices: 0 };
    staff.set(staffMember.id, staffMember);
    res.status(201).json({ success: true, staff: staffMember });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

router.get('/staff', async (req, res) => {
  try {
    const { serviceId } = req.query;
    let result = Array.from(staff.values());

    if (serviceId) {
      result = result.filter(s => s.services.includes(serviceId as string));
    }

    res.json({ staff: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Appointment CRUD
router.post('/appointments', async (req, res) => {
  try {
    const { customerId, staffId, serviceId, date, startTime, notes } = req.body;

    // Get customer, staff, and service
    const customer = customers.get(customerId);
    const staffMember = staff.get(staffId);
    const service = services.get(serviceId);

    if (!customer || !staffMember || !service) {
      return res.status(400).json({ error: 'Invalid customer, staff, or service' });
    }

    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(start.getTime() + service.duration * 60 * 1000);

    // Check availability
    const conflicts = Array.from(appointments.values())
      .filter(a => a.staffId === staffId && a.date === date)
      .filter(a => {
        const aStart = new Date(`${a.date}T${a.startTime}`).getTime();
        const aEnd = new Date(`${a.date}T${a.endTime}`).getTime();
        return start.getTime() < aEnd && end.getTime() > aStart;
      });

    if (conflicts.length > 0) {
      return res.status(400).json({ error: 'Time slot not available' });
    }

    const appointment: Appointment = {
      id: uuidv4(),
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      staffId,
      staffName: staffMember.name,
      serviceId,
      serviceName: service.name,
      date,
      startTime,
      endTime: `${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`,
      status: 'confirmed',
      duration: service.duration,
      price: service.price,
      products: service.products,
      notes,
      createdAt: new Date().toISOString(),
    };

    appointments.set(appointment.id, appointment);

    // Send confirmation
    await sendNotification(
      customer.phone,
      `Appointment confirmed: ${service.name} with ${staffMember.name} on ${date} at ${startTime}`
    );

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const { date, staffId, customerId, status } = req.query;
    let result = Array.from(appointments.values());

    if (date) result = result.filter(a => a.date === date);
    if (staffId) result = result.filter(a => a.staffId === staffId);
    if (customerId) result = result.filter(a => a.customerId === customerId);
    if (status) result = result.filter(a => a.status === status);

    result.sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.startTime}`).getTime();
      const timeB = new Date(`${b.date}T${b.startTime}`).getTime();
      return timeA - timeB;
    });

    res.json({ appointments: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get available slots
router.get('/slots', async (req, res) => {
  try {
    const { date, staffId, serviceId } = req.query;

    if (!date || !staffId || !serviceId) {
      return res.status(400).json({ error: 'Date, staffId, and serviceId required' });
    }

    const service = services.get(serviceId as string);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get staff schedule
    const dayName = new Date(date as string).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const staffMember = staff.get(staffId as string);
    const schedule = staffMember?.schedule[dayName];

    if (!schedule || schedule.length === 0) {
      return res.json({ slots: [], message: 'Staff not available on this day' });
    }

    // Get booked appointments
    const booked = Array.from(appointments.values())
      .filter(a => a.staffId === staffId && a.date === date && a.status !== 'cancelled')
      .map(a => ({ start: a.startTime, end: a.endTime }));

    // Generate available slots
    const slots: string[] = [];
    for (const period of schedule) {
      const [startHour, startMin] = period.start.split(':').map(Number);
      const [endHour, endMin] = period.end.split(':').map(Number);

      let current = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;

      while (current + service.duration <= endTotal) {
        const slotTime = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;

        // Check if slot conflicts with booked appointments
        const slotEnd = current + service.duration;
        const hasConflict = booked.some(b => {
          const [bStartH, bStartM] = b.start.split(':').map(Number);
          const [bEndH, bEndM] = b.end.split(':').map(Number);
          const bStart = bStartH * 60 + bStartM;
          const bEnd = bEndH * 60 + bEndM;
          return current < bEnd && slotEnd > bStart;
        });

        if (!hasConflict) {
          slots.push(slotTime);
        }

        current += 30; // 30-minute intervals
      }
    }

    res.json({ slots });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get slots' });
  }
});

// Check-in appointment
router.post('/appointments/:id/checkin', async (req, res) => {
  try {
    const appointment = appointments.get(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    appointment.status = 'in-progress';
    appointment.checkInTime = new Date().toISOString();
    appointments.set(appointment.id, appointment);

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check-in' });
  }
});

// Complete appointment
router.post('/appointments/:id/complete', async (req, res) => {
  try {
    const appointment = appointments.get(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    appointment.status = 'completed';
    appointment.checkOutTime = new Date().toISOString();
    appointments.set(appointment.id, appointment);

    // Update customer stats
    const customer = customers.get(appointment.customerId);
    if (customer) {
      customer.visits += 1;
      customer.lastVisit = appointment.date;
      customer.totalSpent += appointment.price;
      customers.set(customer.id, customer);
    }

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete' });
  }
});

// Cancel appointment
router.delete('/appointments/:id', async (req, res) => {
  try {
    const appointment = appointments.get(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    appointment.status = 'cancelled';
    appointments.set(appointment.id, appointment);

    // Send cancellation notification
    await sendNotification(
      appointment.customerPhone,
      `Appointment cancelled: ${appointment.serviceName} on ${appointment.date}`
    );

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

// Get daily schedule
router.get('/schedule/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date as string || new Date().toISOString().split('T')[0];

    const dayAppointments = Array.from(appointments.values())
      .filter(a => a.date === targetDate && a.status !== 'cancelled')
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.startTime}`).getTime();
        const timeB = new Date(`${b.date}T${b.startTime}`).getTime();
        return timeA - timeB;
      });

    // Group by staff
    const byStaff: { [key: string]: Appointment[] } = {};
    dayAppointments.forEach(a => {
      if (!byStaff[a.staffId]) byStaff[a.staffId] = [];
      byStaff[a.staffId].push(a);
    });

    res.json({
      date: targetDate,
      total: dayAppointments.length,
      appointments: dayAppointments,
      byStaff,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

// Package management
router.post('/packages', async (req, res) => {
  try {
    const pkg: Package = { ...req.body, id: uuidv4() };
    packages.set(pkg.id, pkg);
    res.status(201).json({ success: true, package: pkg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create package' });
  }
});

router.get('/packages', async (req, res) => {
  try {
    res.json({ packages: Array.from(packages.values()) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Helper
const salonName = 'Our Salon';
async function sendNotification(phone: string, message: string): Promise<void> {
  console.log(`[Notification] To: ${phone}, Message: ${message}`);
}

export { router, customers, services, staff, appointments, packages };
export type { Customer, Service, Staff, Appointment, Package };
