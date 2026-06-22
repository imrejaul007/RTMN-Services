/**
 * HOJAI Society Management Service
 * Apartment/society management - visitors, maintenance, complaints
 * Reuses: BuzzLocal pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Resident {
  id: string;
  name: string;
  phone: string;
  email?: string;
  flatNo: string;
  wing: string;
  relation: 'owner' | 'tenant';
  memberSince: string;
  status: 'active' | 'inactive';
}

interface Visitor {
  id: string;
  name: string;
  phone?: string;
  flatNo: string;
  purpose: 'family' | 'friend' | 'delivery' | 'service' | 'official';
  hostName: string;
  hostPhone: string;
  checkIn: string;
  checkOut?: string;
  status: 'inside' | 'left';
  passCode?: string;
}

interface Complaint {
  id: string;
  flatNo: string;
  wing: string;
  category: 'maintenance' | 'noise' | 'parking' | 'security' | 'cleanliness' | 'other';
  description: string;
  status: 'registered' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  rating?: number;
}

interface MaintenanceRequest {
  id: string;
  flatNo: string;
  category: 'plumbing' | 'electrical' | 'carpentry' | 'pest' | 'ac' | 'other';
  description: string;
  preferredDate?: string;
  status: 'requested' | 'scheduled' | 'completed' | 'cancelled';
  cost?: number;
  vendor?: string;
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  rsvpCount: number;
  createdAt: string;
}

const residents = new Map<string, Resident>();
const visitors = new Map<string, Visitor>();
const complaints = new Map<string, Complaint>();
const maintenanceRequests = new Map<string, MaintenanceRequest>();
const events = new Map<string, Event>();

// Resident management
router.post('/residents', async (req, res) => {
  try {
    const resident: Resident = { ...req.body, id: uuidv4(), memberSince: new Date().toISOString(), status: 'active' };
    residents.set(resident.id, resident);
    res.status(201).json({ success: true, resident });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add resident' });
  }
});

router.get('/residents', async (req, res) => {
  try {
    const { wing, flatNo } = req.query;
    let result = Array.from(residents.values());

    if (wing) result = result.filter(r => r.wing === wing);
    if (flatNo) result = result.filter(r => r.flatNo.includes(flatNo as string));

    res.json({ residents: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch residents' });
  }
});

// Visitor management
router.post('/visitors/entry', async (req, res) => {
  try {
    const { name, phone, flatNo, purpose, hostName, hostPhone } = req.body;
    const passCode = Math.floor(1000 + Math.random() * 9000).toString();

    const visitor: Visitor = {
      id: uuidv4(),
      name,
      phone,
      flatNo,
      purpose,
      hostName,
      hostPhone,
      checkIn: new Date().toISOString(),
      status: 'inside',
      passCode,
    };

    visitors.set(visitor.id, visitor);

    // Send notification to host
    console.log(`[SMS] To: ${hostPhone}, Message: ${name} is at your flat. Pass: ${passCode}`);

    res.status(201).json({ success: true, visitor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register visitor' });
  }
});

router.post('/visitors/:id/exit', async (req, res) => {
  try {
    const visitor = visitors.get(req.params.id);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

    visitor.checkOut = new Date().toISOString();
    visitor.status = 'left';
    visitors.set(visitor.id, visitor);

    res.json({ success: true, visitor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to checkout visitor' });
  }
});

router.get('/visitors', async (req, res) => {
  try {
    const { date, status, flatNo } = req.query;
    let result = Array.from(visitors.values());

    if (date) result = result.filter(v => v.checkIn.startsWith(date as string));
    if (status) result = result.filter(v => v.status === status);
    if (flatNo) result = result.filter(v => v.flatNo === flatNo);

    res.json({ visitors: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch visitors' });
  }
});

// Complaints
router.post('/complaints', async (req, res) => {
  try {
    const complaint: Complaint = {
      ...req.body,
      id: uuidv4(),
      status: 'registered',
      createdAt: new Date().toISOString(),
    };
    complaints.set(complaint.id, complaint);
    res.status(201).json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register complaint' });
  }
});

router.get('/complaints', async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    let result = Array.from(complaints.values());

    if (status) result = result.filter(c => c.status === status);
    if (priority) result = result.filter(c => c.priority === priority);
    if (category) result = result.filter(c => c.category === category);

    res.json({ complaints: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

router.patch('/complaints/:id', async (req, res) => {
  try {
    const complaint = complaints.get(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const updated = { ...complaint, ...req.body };
    if (req.body.status === 'resolved') updated.resolvedAt = new Date().toISOString();
    complaints.set(complaint.id, updated);

    res.json({ success: true, complaint: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// Maintenance requests
router.post('/maintenance', async (req, res) => {
  try {
    const request: MaintenanceRequest = { ...req.body, id: uuidv4(), status: 'requested', createdAt: new Date().toISOString() };
    maintenanceRequests.set(request.id, request);
    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create request' });
  }
});

router.get('/maintenance', async (req, res) => {
  try {
    const { status, category } = req.query;
    let result = Array.from(maintenanceRequests.values());

    if (status) result = result.filter(r => r.status === status);
    if (category) result = result.filter(r => r.category === category);

    res.json({ requests: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Events
router.post('/events', async (req, res) => {
  try {
    const event: Event = { ...req.body, id: uuidv4(), rsvpCount: 0, createdAt: new Date().toISOString() };
    events.set(event.id, event);
    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.get('/events/upcoming', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = Array.from(events.values()).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    res.json({ events: upcoming });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const openComplaints = Array.from(complaints.values()).filter(c => c.status !== 'resolved' && c.status !== 'closed').length;
    const visitorsToday = Array.from(visitors.values()).filter(v => v.checkIn.startsWith(today)).length;
    const maintenancePending = Array.from(maintenanceRequests.values()).filter(r => r.status === 'requested' || r.status === 'scheduled').length;

    res.json({
      residents: residents.size,
      openComplaints,
      visitorsToday,
      maintenancePending,
      eventsThisMonth: Array.from(events.values()).filter(e => e.date.startsWith(today.substring(0, 7))).length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

export { router, residents, visitors, complaints, maintenanceRequests, events };
