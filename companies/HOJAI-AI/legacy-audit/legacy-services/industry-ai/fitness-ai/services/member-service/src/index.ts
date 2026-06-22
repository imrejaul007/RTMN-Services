/**
 * HOJAI Gym Member Service
 * Member management for Gym & Fitness OS
 * Reuses: RABTUL Auth, REZ Notification, REZ CRM
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory store (replace with DB in production)
const members = new Map<string, Member>();

interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  membershipPlan: string;
  membershipStatus: 'active' | 'expired' | 'paused' | 'cancelled';
  joinDate: string;
  expiryDate: string;
  goals: string[];
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  metrics?: {
    weight?: number;
    height?: number;
    targetWeight?: number;
  };
  attendanceCount: number;
  lastVisit?: string;
  autoRenew: boolean;
  source: 'walkin' | 'referral' | 'campaign' | 'app';
  referralCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Create member
router.post('/members', async (req, res) => {
  try {
    const { name, phone, email, membershipPlan, goals, fitnessLevel } = req.body;

    if (!name || !phone || !membershipPlan) {
      return res.status(400).json({ error: 'Name, phone, and membership plan are required' });
    }

    const member: Member = {
      id: uuidv4(),
      name,
      phone,
      email,
      membershipPlan,
      membershipStatus: 'active',
      joinDate: new Date().toISOString(),
      expiryDate: calculateExpiry(membershipPlan),
      goals: goals || [],
      fitnessLevel: fitnessLevel || 'beginner',
      attendanceCount: 0,
      autoRenew: false,
      source: 'walkin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    members.set(member.id, member);

    // Send welcome notification
    await sendNotification(phone, `Welcome to the gym, ${name}! Your membership is active. Download our app for class bookings.`);

    res.status(201).json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create member' });
  }
});

// Get all members
router.get('/members', async (req, res) => {
  try {
    const { status, plan, search } = req.query;
    let result = Array.from(members.values());

    if (status) {
      result = result.filter(m => m.membershipStatus === status);
    }
    if (plan) {
      result = result.filter(m => m.membershipPlan === plan);
    }
    if (search) {
      const term = (search as string).toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.phone.includes(term)
      );
    }

    res.json({ members: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Get member by ID
router.get('/members/:id', async (req, res) => {
  try {
    const member = members.get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// Update member
router.put('/members/:id', async (req, res) => {
  try {
    const member = members.get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const updated = {
      ...member,
      ...req.body,
      id: member.id,
      updatedAt: new Date().toISOString(),
    };

    members.set(member.id, updated);
    res.json({ success: true, member: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Check-in member
router.post('/members/:id/checkin', async (req, res) => {
  try {
    const member = members.get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.membershipStatus !== 'active') {
      return res.status(400).json({ error: 'Membership not active' });
    }

    member.attendanceCount += 1;
    member.lastVisit = new Date().toISOString();
    member.updatedAt = new Date().toISOString();

    members.set(member.id, member);

    res.json({
      success: true,
      message: 'Check-in successful',
      attendanceCount: member.attendanceCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check-in' });
  }
});

// Renew membership
router.post('/members/:id/renew', async (req, res) => {
  try {
    const member = members.get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { plan } = req.body;
    const newPlan = plan || member.membershipPlan;

    member.membershipPlan = newPlan;
    member.membershipStatus = 'active';
    member.expiryDate = calculateExpiry(newPlan);
    member.updatedAt = new Date().toISOString();

    members.set(member.id, member);

    await sendNotification(member.phone, `Membership renewed! Valid until ${member.expiryDate.split('T')[0]}`);

    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to renew membership' });
  }
});

// Pause membership
router.post('/members/:id/pause', async (req, res) => {
  try {
    const member = members.get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    member.membershipStatus = 'paused';
    member.updatedAt = new Date().toISOString();
    members.set(member.id, member);

    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause membership' });
  }
});

// Get member analytics
router.get('/members/:id/analytics', async (req, res) => {
  try {
    const member = members.get(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const daysSinceJoin = Math.floor(
      (Date.now() - new Date(member.joinDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const attendanceRate = daysSinceJoin > 0
      ? ((member.attendanceCount / daysSinceJoin) * 100).toFixed(1)
      : 0;

    const daysUntilExpiry = Math.floor(
      (new Date(member.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      memberId: member.id,
      daysSinceJoin,
      attendanceCount: member.attendanceCount,
      attendanceRate: `${attendanceRate}%`,
      daysUntilExpiry,
      membershipStatus: member.membershipStatus,
      renewalLikely: daysUntilExpiry <= 7,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Helper functions
function calculateExpiry(plan: string): string {
  const now = new Date();
  const months = plan.includes('quarterly') ? 3 : plan.includes('halfyearly') ? 6 : 12;
  now.setMonth(now.getMonth() + months);
  return now.toISOString();
}

async function sendNotification(phone: string, message: string): Promise<void> {
  // Reuse: REZ Notification Service
  console.log(`[Notification] To: ${phone}, Message: ${message}`);
}

// Voice check-in endpoint
router.post('/voice/checkin', async (req, res) => {
  try {
    const { phone } = req.body;

    // Find member by phone
    const member = Array.from(members.values()).find(m => m.phone === phone);
    if (!member) {
      return res.json({ success: false, message: 'Member not found. Please contact reception.' });
    }

    if (member.membershipStatus !== 'active') {
      return res.json({
        success: false,
        message: `Your membership is ${member.membershipStatus}. Please visit reception.`
      });
    }

    member.attendanceCount += 1;
    member.lastVisit = new Date().toISOString();
    member.updatedAt = new Date().toISOString();
    members.set(member.id, member);

    res.json({
      success: true,
      message: `Welcome, ${member.name}! You have checked in. Attendance: ${member.attendanceCount}.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Voice check-in failed' });
  }
});

export { router, members };
export type { Member };
