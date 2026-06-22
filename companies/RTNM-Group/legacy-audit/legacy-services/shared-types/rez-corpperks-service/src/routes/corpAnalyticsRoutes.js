/**
 * CorpPerks Analytics Routes
 * Dashboard, Reports, Insights
 */

const express = require('express');
const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// ============ DASHBOARD ============

// GET /api/analytics/dashboard/:companyId
router.get('/dashboard/:companyId', (req, res) => {
  res.json({
    success: true,
    data: {
      overview: {
        totalEmployees: 250,
        activeEmployees: 235,
        totalBenefits: 1250000,
        utilizedBenefits: 875000,
        utilizationRate: 70,
      },
      quickStats: {
        hotelBookings: { count: 45, amount: 425000 },
        giftOrders: { count: 120, amount: 180000 },
        rewardRedemptions: { count: 89, amount: 145000 },
        karmaPoints: { distributed: 250000, redeemed: 180000 },
      },
      recentActivity: [
        { type: 'booking', message: 'Hotel booked for John Doe', time: '2 hours ago' },
        { type: 'reward', message: '500 coins awarded to Jane', time: '5 hours ago' },
        { type: 'enrollment', message: '3 new employees enrolled', time: '1 day ago' },
        { type: 'campaign', message: 'Diwali campaign launched', time: '2 days ago' },
      ],
      alerts: [
        { type: 'warning', message: 'Wellness budget 80% utilized', action: 'Review' },
        { type: 'info', message: '5 employees pending enrollment', action: 'Enroll' },
      ],
    },
  });
});

// ============ BENEFITS ANALYTICS ============

// GET /api/analytics/benefits/:companyId
router.get('/benefits/:companyId', (req, res) => {
  const { period } = req.query;

  res.json({
    success: true,
    data: {
      summary: {
        totalAllocated: 1250000,
        totalUtilized: 875000,
        utilizationRate: 70,
        avgPerEmployee: 5000,
      },
      byType: [
        { type: 'Meal', allocated: 300000, utilized: 250000, rate: 83, employees: 250 },
        { type: 'Travel', allocated: 500000, utilized: 350000, rate: 70, employees: 150 },
        { type: 'Wellness', allocated: 200000, utilized: 120000, rate: 60, employees: 200 },
        { type: 'Learning', allocated: 150000, utilized: 95000, rate: 63, employees: 120 },
        { type: 'Gift', allocated: 100000, utilized: 60000, rate: 60, employees: 250 },
      ],
      trends: [
        { month: 'Jan', allocated: 100000, utilized: 65000 },
        { month: 'Feb', allocated: 105000, utilized: 72000 },
        { month: 'Mar', allocated: 100000, utilized: 78000 },
        { month: 'Apr', allocated: 105000, utilized: 80000 },
      ],
      topUtilizers: [
        { employeeId: 'E001', name: 'John Doe', amount: 45000, type: 'Travel' },
        { employeeId: 'E002', name: 'Jane Smith', amount: 38000, type: 'Meal' },
        { employeeId: 'E003', name: 'Bob Wilson', amount: 32000, type: 'Learning' },
      ],
    },
  });
});

// ============ BOOKING ANALYTICS ============

// GET /api/analytics/bookings/:companyId
router.get('/bookings/:companyId', (req, res) => {
  res.json({
    success: true,
    data: {
      summary: {
        totalBookings: 45,
        totalAmount: 425000,
        avgBookingValue: 9444,
        cancellationRate: 5,
      },
      byStatus: [
        { status: 'Confirmed', count: 32, amount: 320000 },
        { status: 'Completed', count: 35, amount: 325000 },
        { status: 'Cancelled', count: 5, amount: 45000 },
      ],
      byProperty: [
        { property: 'The Grand Mumbai', bookings: 12, revenue: 120000 },
        { property: 'ITC Gardenia Bangalore', bookings: 8, revenue: 85000 },
        { property: 'Marriott Pune', bookings: 10, revenue: 95000 },
      ],
      monthlyTrend: [
        { month: 'Jan', bookings: 8, amount: 75000 },
        { month: 'Feb', bookings: 10, amount: 95000 },
        { month: 'Mar', bookings: 15, amount: 140000 },
        { month: 'Apr', bookings: 12, amount: 115000 },
      ],
    },
  });
});

// ============ REWARDS ANALYTICS ============

// GET /api/analytics/rewards/:companyId
router.get('/rewards/:companyId', (req, res) => {
  res.json({
    success: true,
    data: {
      summary: {
        totalCoinsDistributed: 2500000,
        totalCoinsRedeemed: 1800000,
        redemptionRate: 72,
        activeMembers: 235,
      },
      tierDistribution: [
        { tier: 'Bronze', count: 80, percentage: 34 },
        { tier: 'Silver', count: 95, percentage: 40 },
        { tier: 'Gold', count: 45, percentage: 19 },
        { tier: 'Platinum', count: 15, percentage: 7 },
      ],
      redemptionBreakdown: [
        { category: 'Gift Cards', count: 120, coins: 600000 },
        { category: 'Electronics', count: 25, coins: 350000 },
        { category: 'Experiences', count: 45, coins: 450000 },
        { category: 'Cash', count: 80, coins: 400000 },
      ],
      topEarners: [
        { employeeId: 'E001', name: 'John Doe', coins: 15000 },
        { employeeId: 'E002', name: 'Jane Smith', coins: 12500 },
        { employeeId: 'E003', name: 'Bob Wilson', coins: 11000 },
      ],
      monthlyTrend: [
        { month: 'Jan', distributed: 180000, redeemed: 120000 },
        { month: 'Feb', distributed: 200000, redeemed: 150000 },
        { month: 'Mar', distributed: 220000, redeemed: 180000 },
        { month: 'Apr', distributed: 250000, redeemed: 200000 },
      ],
    },
  });
});

// ============ CAMPAIGN ANALYTICS ============

// GET /api/analytics/campaigns/:companyId
router.get('/campaigns/:companyId', (req, res) => {
  res.json({
    success: true,
    data: {
      summary: {
        activeCampaigns: 3,
        totalBudget: 800000,
        totalSpent: 270000,
        avgParticipation: 68,
      },
      campaigns: [
        {
          id: 'C001',
          name: 'Diwali Gifting 2026',
          type: 'gift',
          status: 'active',
          budget: 500000,
          spent: 125000,
          participants: 250,
          participationRate: 100,
        },
        {
          id: 'C002',
          name: 'Plant 1000 Trees',
          type: 'karma',
          status: 'active',
          budget: 100000,
          spent: 45000,
          participants: 180,
          participationRate: 72,
          target: 1000,
          current: 420,
        },
        {
          id: 'C003',
          name: 'Q2 Performance Rewards',
          type: 'reward',
          status: 'active',
          budget: 200000,
          spent: 100000,
          participants: 45,
          participationRate: 90,
        },
      ],
      impactMetrics: {
        treesPlanted: 420,
        mealsDonated: 150,
        volunteerHours: 350,
        co2Offset: 2500,
      },
    },
  });
});

// ============ FINANCIAL ANALYTICS ============

// GET /api/analytics/financial/:companyId
router.get('/financial/:companyId', (req, res) => {
  res.json({
    success: true,
    data: {
      summary: {
        totalSpend: 1850000,
        gstSavings: 225000,
        negotiatedDiscounts: 150000,
        netCost: 1475000,
        roi: 25,
      },
      costBreakdown: [
        { category: 'Travel', amount: 800000, percentage: 43, savings: 100000 },
        { category: 'Hotels', amount: 425000, percentage: 23, savings: 65000 },
        { category: 'Meals', amount: 300000, percentage: 16, savings: 45000 },
        { category: 'Gifts', amount: 180000, percentage: 10, savings: 25000 },
        { category: 'Other', amount: 145000, percentage: 8, savings: 15000 },
      ],
      gstOptimization: {
        totalInputTax: 225000,
        claimable: 180000,
        nonClaimable: 45000,
        compliance: 98,
      },
      monthlyTrend: [
        { month: 'Jan', spend: 420000, savings: 52000 },
        { month: 'Feb', spend: 450000, savings: 55000 },
        { month: 'Mar', spend: 480000, savings: 60000 },
        { month: 'Apr', spend: 500000, savings: 68000 },
      ],
      departmentBreakdown: [
        { department: 'Engineering', spend: 650000 },
        { department: 'Sales', spend: 420000 },
        { department: 'Marketing', spend: 350000 },
        { department: 'Operations', spend: 280000 },
        { department: 'HR', spend: 150000 },
      ],
    },
  });
});

// ============ EMPLOYEE ANALYTICS ============

// GET /api/analytics/employees/:companyId
router.get('/employees/:companyId', (req, res) => {
  res.json({
    success: true,
    data: {
      summary: {
        total: 250,
        active: 235,
        enrolled: 230,
        pending: 5,
        suspended: 15,
      },
      byDepartment: [
        { department: 'Engineering', total: 80, enrolled: 78, avgBenefits: 15000 },
        { department: 'Sales', total: 50, enrolled: 48, avgBenefits: 18000 },
        { department: 'Marketing', total: 40, enrolled: 38, avgBenefits: 12000 },
        { department: 'Operations', total: 45, enrolled: 42, avgBenefits: 10000 },
        { department: 'HR', total: 25, enrolled: 24, avgBenefits: 11000 },
      ],
      byLevel: [
        { level: 'L1', count: 50, avgBenefits: 8000 },
        { level: 'L2', count: 75, avgBenefits: 12000 },
        { level: 'L3', count: 60, avgBenefits: 18000 },
        { level: 'L4', count: 40, avgBenefits: 25000 },
        { level: 'L5', count: 25, avgBenefits: 35000 },
      ],
      enrollmentRate: 92,
      avgBenefitsPerEmployee: 15600,
      topPerformers: [
        { employeeId: 'E001', name: 'John Doe', benefitsUsed: 45000, karmaScore: 950 },
        { employeeId: 'E002', name: 'Jane Smith', benefitsUsed: 42000, karmaScore: 920 },
        { employeeId: 'E003', name: 'Bob Wilson', benefitsUsed: 38000, karmaScore: 880 },
      ],
    },
  });
});

// ============ EXPORT REPORTS ============

// GET /api/analytics/export/:companyId
router.get('/export/:companyId', requireAuth, (req, res) => {
  const { type, format, period } = req.query;

  // Demo export
  res.json({
    success: true,
    data: {
      exportId: `EXP${Date.now()}`,
      type,
      format: format || 'xlsx',
      period,
      status: 'processing',
      downloadUrl: `https://api.rez.money/exports/${type}_${period}.xlsx`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });
});

module.exports = router;
