/**
 * HOJAI Franchise Portal Service
 * Multi-location management, royalties, compliance
 * Reuses: NeXha FranchiseOS pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Franchisee {
  id: string;
  franchiseeId: string;
  name: string;
  phone: string;
  email: string;
  location: { city: string; address: string };
  brand: string;
  startDate: string;
  status: 'active' | 'suspended' | 'terminated';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  performance: { sales: number; target: number; achievement: number };
}

interface Location {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  name: string;
  address: string;
  city: string;
  type: 'owned' | 'franchised';
  status: 'operational' | 'setup' | 'closed';
  staffCount: number;
  monthlySales: number;
  openDate?: string;
}

interface RoyaltyPayment {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  period: string; // YYYY-MM
  revenue: number;
  royaltyRate: number;
  royaltyAmount: number;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  paidAt?: string;
  paidAmount?: number;
}

interface ComplianceCheck {
  id: string;
  franchiseeId: string;
  locationId: string;
  type: string;
  status: 'passed' | 'failed' | 'pending';
  score: number;
  findings: string[];
  inspector?: string;
  date: string;
}

interface KPIReport {
  franchiseeId: string;
  period: string;
  revenue: number;
  target: number;
  orders: number;
  customersServed: number;
  avgOrderValue: number;
  staffUtilization: number;
  customerSatisfaction: number;
}

const franchisees = new Map<string, Franchisee>();
const locations = new Map<string, Location>();
const royaltyPayments = new Map<string, RoyaltyPayment>();
const complianceChecks = new Map<string, ComplianceCheck>();

// Franchisee CRUD
router.post('/franchisees', async (req, res) => {
  try {
    const franchisee: Franchisee = {
      ...req.body,
      id: uuidv4(),
      status: 'active',
      performance: { sales: 0, target: req.body.target || 0, achievement: 0 },
    };
    franchisees.set(franchisee.id, franchisee);
    res.status(201).json({ success: true, franchisee });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create franchisee' });
  }
});

router.get('/franchisees', async (req, res) => {
  try {
    const { status, tier, city } = req.query;
    let result = Array.from(franchisees.values());

    if (status) result = result.filter(f => f.status === status);
    if (tier) result = result.filter(f => f.tier === tier);

    res.json({ franchisees: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchisees' });
  }
});

router.get('/franchisees/:id', async (req, res) => {
  try {
    const franchisee = franchisees.get(req.params.id);
    if (!franchisee) return res.status(404).json({ error: 'Franchisee not found' });

    const franchiseeLocations = Array.from(locations.values()).filter(l => l.franchiseeId === req.params.id);

    res.json({ franchisee, locations: franchiseeLocations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchisee' });
  }
});

// Locations
router.post('/locations', async (req, res) => {
  try {
    const franchisee = franchisees.get(req.body.franchiseeId);
    if (!franchisee) return res.status(404).json({ error: 'Franchisee not found' });

    const location: Location = {
      ...req.body,
      id: uuidv4(),
      franchiseeName: franchisee.name,
      status: 'setup',
    };
    locations.set(location.id, location);
    res.status(201).json({ success: true, location });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create location' });
  }
});

router.get('/locations', async (req, res) => {
  try {
    const { franchiseeId, city, status } = req.query;
    let result = Array.from(locations.values());

    if (franchiseeId) result = result.filter(l => l.franchiseeId === franchiseeId);
    if (city) result = result.filter(l => l.city === city);
    if (status) result = result.filter(l => l.status === status);

    res.json({ locations: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Royalty Management
router.post('/royalties', async (req, res) => {
  try {
    const { franchiseeId, period, revenue, royaltyRate } = req.body;

    const franchisee = franchisees.get(franchiseeId);
    if (!franchisee) return res.status(404).json({ error: 'Franchisee not found' });

    const royaltyAmount = Math.round(revenue * (royaltyRate || 0.05));

    const payment: RoyaltyPayment = {
      id: uuidv4(),
      franchiseeId,
      franchiseeName: franchisee.name,
      period,
      revenue,
      royaltyRate: royaltyRate || 0.05,
      royaltyAmount,
      status: 'pending',
      dueDate: new Date(new Date(period + '-01').getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    royaltyPayments.set(payment.id, payment);
    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create royalty' });
  }
});

router.get('/royalties', async (req, res) => {
  try {
    const { franchiseeId, status, period } = req.query;
    let result = Array.from(royaltyPayments.values());

    if (franchiseeId) result = result.filter(r => r.franchiseeId === franchiseeId);
    if (status) result = result.filter(r => r.status === status);
    if (period) result = result.filter(r => r.period === period);

    res.json({ royalties: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch royalties' });
  }
});

router.patch('/royalties/:id/pay', async (req, res) => {
  try {
    const payment = royaltyPayments.get(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'paid';
    payment.paidAt = new Date().toISOString();
    payment.paidAmount = req.body.amount || payment.royaltyAmount;
    royaltyPayments.set(payment.id, payment);

    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Compliance
router.post('/compliance', async (req, res) => {
  try {
    const check: ComplianceCheck = {
      ...req.body,
      id: uuidv4(),
      date: new Date().toISOString(),
    };
    complianceChecks.set(check.id, check);
    res.status(201).json({ success: true, check });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create compliance check' });
  }
});

router.get('/compliance', async (req, res) => {
  try {
    const { franchiseeId, status } = req.query;
    let result = Array.from(complianceChecks.values());

    if (franchiseeId) result = result.filter(c => c.franchiseeId === franchiseeId);
    if (status) result = result.filter(c => c.status === status);

    res.json({ checks: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch compliance' });
  }
});

// KPI Reports
router.get('/kpis/:franchiseeId', async (req, res) => {
  try {
    const { period } = req.query;
    const franchisee = franchisees.get(req.params.franchiseeId);

    if (!franchisee) return res.status(404).json({ error: 'Franchisee not found' });

    const franchiseeLocations = Array.from(locations.values()).filter(l => l.franchiseeId === req.params.franchiseeId);
    const totalSales = franchiseeLocations.reduce((sum, l) => sum + l.monthlySales, 0);

    const kpi: KPIReport = {
      franchiseeId: req.params.franchiseeId,
      period: period as string || new Date().toISOString().slice(0, 7),
      revenue: totalSales,
      target: franchisee.performance.target,
      orders: Math.round(totalSales / 500), // Estimated
      customersServed: Math.round(totalSales / 300), // Estimated
      avgOrderValue: 500,
      staffUtilization: 75,
      customerSatisfaction: 4.2,
    };

    res.json({ kpi });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get KPIs' });
  }
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const totalFranchisees = franchisees.size;
    const activeFranchisees = Array.from(franchisees.values()).filter(f => f.status === 'active').length;
    const totalLocations = locations.size;
    const operationalLocations = Array.from(locations.values()).filter(l => l.status === 'operational').length;

    const pendingRoyalties = Array.from(royaltyPayments.values()).filter(r => r.status === 'pending');
    const overdueRoyalties = Array.from(royaltyPayments.values()).filter(r => r.status === 'overdue');

    const totalRevenue = Array.from(royaltyPayments.values()).filter(r => r.status === 'paid').reduce((sum, r) => sum + r.royaltyAmount, 0);

    res.json({
      franchisees: { total: totalFranchisees, active: activeFranchisees },
      locations: { total: totalLocations, operational: operationalLocations },
      royalties: {
        pending: pendingRoyalties.length,
        overdue: overdueRoyalties.length,
        collected: totalRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

export { router, franchisees, locations, royaltyPayments, complianceChecks };
