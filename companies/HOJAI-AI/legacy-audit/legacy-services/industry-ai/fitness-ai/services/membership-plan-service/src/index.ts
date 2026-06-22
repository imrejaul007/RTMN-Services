/**
 * HOJAI Gym Membership Plan Service
 * Define and manage gym membership plans
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface MembershipPlan {
  id: string;
  name: string;
  type: 'monthly' | 'quarterly' | 'halfyearly' | 'yearly';
  price: number;
  currency: string;
  features: string[];
  classAccess: 'none' | 'limited' | 'unlimited';
  classLimit?: number;
  personalTraining: boolean;
  guestPasses: number;
  lockers: 'none' | 'daily' | 'premium';
  spaAccess: boolean;
  cafeDiscount: number;
  merchandiseDiscount: number;
  priorityBooking: boolean;
  freezeAllowed: boolean;
  maxFreezeDays: number;
  transferAllowed: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const plans = new Map<string, MembershipPlan>();

// Initialize default plans
function initDefaultPlans(): void {
  const defaultPlans: Omit<MembershipPlan, 'id' | 'createdAt'>[] = [
    {
      name: 'Basic',
      type: 'monthly',
      price: 999,
      currency: 'INR',
      features: ['Gym access', 'Basic equipment'],
      classAccess: 'none',
      personalTraining: false,
      guestPasses: 0,
      lockers: 'daily',
      spaAccess: false,
      cafeDiscount: 0,
      merchandiseDiscount: 0,
      priorityBooking: false,
      freezeAllowed: false,
      maxFreezeDays: 0,
      transferAllowed: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Premium',
      type: 'monthly',
      price: 1999,
      currency: 'INR',
      features: ['Gym access', 'All equipment', '4 group classes/week', 'Guest passes (2/month)'],
      classAccess: 'limited',
      classLimit: 16,
      personalTraining: false,
      guestPasses: 2,
      lockers: 'premium',
      spaAccess: false,
      cafeDiscount: 10,
      merchandiseDiscount: 5,
      priorityBooking: false,
      freezeAllowed: true,
      maxFreezeDays: 7,
      transferAllowed: false,
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Elite',
      type: 'monthly',
      price: 3999,
      currency: 'INR',
      features: ['Unlimited gym', 'All classes', 'Personal training (2/month)', 'Unlimited guest passes'],
      classAccess: 'unlimited',
      personalTraining: true,
      guestPasses: -1,
      lockers: 'premium',
      spaAccess: true,
      cafeDiscount: 20,
      merchandiseDiscount: 15,
      priorityBooking: true,
      freezeAllowed: true,
      maxFreezeDays: 14,
      transferAllowed: true,
      isActive: true,
      sortOrder: 3,
    },
  ];

  defaultPlans.forEach(plan => {
    const fullPlan: MembershipPlan = {
      ...plan,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    plans.set(fullPlan.id, fullPlan);
  });
}

initDefaultPlans();

// Get all plans
router.get('/plans', async (req, res) => {
  try {
    const { active, type } = req.query;
    let result = Array.from(plans.values());

    if (active !== undefined) {
      result = result.filter(p => p.isActive === (active === 'true'));
    }
    if (type) {
      result = result.filter(p => p.type === type);
    }

    result.sort((a, b) => a.sortOrder - b.sortOrder);

    res.json({ plans: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get plan by ID
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = plans.get(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.json({ plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// Create plan
router.post('/plans', async (req, res) => {
  try {
    const plan: MembershipPlan = {
      ...req.body,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    plans.set(plan.id, plan);
    res.status(201).json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Update plan
router.put('/plans/:id', async (req, res) => {
  try {
    const plan = plans.get(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const updated = { ...plan, ...req.body, id: plan.id };
    plans.set(plan.id, updated);

    res.json({ success: true, plan: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Toggle plan active status
router.patch('/plans/:id/toggle', async (req, res) => {
  try {
    const plan = plans.get(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    plan.isActive = !plan.isActive;
    plans.set(plan.id, plan);

    res.json({ success: true, isActive: plan.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle plan' });
  }
});

// Calculate renewal price
router.get('/plans/:id/renewal', async (req, res) => {
  try {
    const plan = plans.get(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Renewal discount
    const renewalDiscount = plan.type === 'yearly' ? 15 : plan.type === 'halfyearly' ? 10 : 5;
    const renewalPrice = Math.round(plan.price * (1 - renewalDiscount / 100));

    res.json({
      originalPrice: plan.price,
      renewalPrice,
      discount: `${renewalDiscount}%`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate renewal' });
  }
});

export { router, plans };
export type { MembershipPlan };
