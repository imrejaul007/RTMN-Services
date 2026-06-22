/**
 * Territory Planner
 * Port: 4804
 *
 * Role: Geographic coverage optimization, territory assignment, route planning
 * Persona: Strategic, data-driven, balanced portfolio manager
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4804;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Territory {
  id: string;
  name: string;
  regions: string[];
  cities: string[];
  accounts: number;
  potentialRevenue: number;
  currentCoverage: number;
  assignedTo: string[];
  priority: 'high' | 'medium' | 'low';
  metrics: {
    quota: number;
    ytd: number;
    attainment: number;
    growth: number;
  };
}

interface SalesRep {
  id: string;
  name: string;
  territories: string[];
  capacity: number;
  currentLoad: number;
  performance: {
    winRate: number;
    avgDealSize: number;
    quotaAttainment: number;
  };
  commutePreference: 'remote' | 'hybrid' | 'onsite';
}

interface Account {
  id: string;
  name: string;
  city: string;
  territory: string;
  industry: string;
  revenue: number;
  potential: number;
  assignedTo?: string;
  lastContact?: Date;
  priority: 'a' | 'b' | 'c' | 'd';
}

interface RouteOptimization {
  territoryId: string;
  repId: string;
  optimizedRoute: {
    day: string;
    stops: {
      account: string;
      location: string;
      visitType: 'in-person' | 'call' | 'virtual';
      duration: number;
      sequence: number;
    }[];
    totalVisits: number;
    travelTime: number;
    efficiency: number;
  }[];
}

// Calculate territory potential
function calculateTerritoryPotential(territory: Partial<Territory>): {
  totalPotential: number;
  coverage: number;
  gaps: string[];
  recommendations: string[];
} {
  const potential = territory.potentialRevenue || 10000000;
  const currentCoverage = territory.currentCoverage || 40;

  const gaps: string[] = [];
  const recommendations: string[] = [];

  if (currentCoverage < 50) {
    gaps.push('Low market penetration');
    recommendations.push('Increase prospecting activities');
    recommendations.push('Partner with local channels');
  }

  if (currentCoverage < 30) {
    gaps.push('Under-invested territory');
    recommendations.push('Consider adding dedicated rep');
    recommendations.push('Run localized campaigns');
  }

  const uncovered = 100 - currentCoverage;
  const opportunityCost = (potential * uncovered / 100);

  return {
    totalPotential: potential,
    coverage: currentCoverage,
    gaps,
    recommendations: [
      ...recommendations,
      `Addressable opportunity: ₹${(opportunityCost / 100000).toFixed(1)}L`,
      currentCoverage > 70 ? 'Territory mature - focus on retention' : 'Territory growing - invest in acquisition'
    ]
  };
}

// Optimize territory assignment
function optimizeTerritoryAssignment(reps: SalesRep[], territories: Territory[]): {
  assignments: { repId: string; territoryId: string; score: number; reason: string }[];
  imbalances: { type: string; details: string }[];
  recommendations: string[];
} {
  const assignments: { repId: string; territoryId: string; score: number; reason: string }[] = [];
  const imbalances: { type: string; details: string }[] = [];

  // Calculate workload balance
  const totalQuota = territories.reduce((sum, t) => sum + t.metrics.quota, 0);
  const avgQuotaPerRep = totalQuota / reps.length;

  reps.forEach(rep => {
    const currentQuota = territories
      .filter(t => rep.territories.includes(t.id))
      .reduce((sum, t) => sum + t.metrics.quota, 0);

    const balanceRatio = currentQuota / avgQuotaPerRep;

    if (balanceRatio < 0.7) {
      imbalances.push({
        type: 'under-loaded',
        details: `${rep.name} at ${(balanceRatio * 100).toFixed(0)}% of average quota`
      });
    } else if (balanceRatio > 1.3) {
      imbalances.push({
        type: 'over-loaded',
        details: `${rep.name} at ${(balanceRatio * 100).toFixed(0)}% of average quota`
      });
    }
  });

  // Score each rep-territory combination
  territories.forEach(territory => {
    let bestRep = reps[0];
    let bestScore = 0;

    reps.forEach(rep => {
      let score = 50; // Base score

      // Performance match
      if (territory.priority === 'high' && rep.performance.winRate > 30) {
        score += 30;
      } else if (territory.priority === 'low' && rep.performance.winRate <= 20) {
        score += 20;
      }

      // Capacity
      if (rep.currentLoad < rep.capacity * 0.8) {
        score += 20;
      }

      // Geography preference
      if (rep.commutePreference === 'remote' || rep.commutePreference === 'hybrid') {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestRep = rep;
      }
    });

    assignments.push({
      repId: bestRep.id,
      territoryId: territory.id,
      score: bestScore,
      reason: bestScore > 70 ? 'Optimal match' : bestScore > 50 ? 'Good fit' : 'Available capacity'
    });
  });

  return {
    assignments,
    imbalances,
    recommendations: imbalances.length > 0
      ? ['Rebalance territories to equalize quota']
      : ['Territory assignment optimized']
  };
}

// Generate travel route
function optimizeRoute(stops: Account[], maxPerDay: number = 6): RouteOptimization {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const route: RouteOptimization['optimizedRoute'] = [];

  // Sort by priority
  const sortedStops = [...stops].sort((a, b) => {
    const priorityOrder = { a: 0, b: 1, c: 2, d: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  let stopIndex = 0;
  days.forEach(day => {
    if (stopIndex >= sortedStops.length) return;

    const dayStops = sortedStops.slice(stopIndex, stopIndex + maxPerDay);
    stopIndex += maxPerDay;

    const visitTypes: ('in-person' | 'call' | 'virtual')[] = ['in-person', 'call', 'virtual'];

    route.push({
      day,
      stops: dayStops.map((account, idx) => ({
        account: account.name,
        location: account.city,
        visitType: visitTypes[idx % 3],
        duration: visitTypes[idx % 3] === 'in-person' ? 60 : 30,
        sequence: idx + 1
      })),
      totalVisits: dayStops.length,
      travelTime: dayStops.length * 30,
      efficiency: dayStops.filter((_, i) => visitTypes[i % 3] !== 'in-person').length / dayStops.length
    });
  });

  return {
    territoryId: 'territory-1',
    repId: 'rep-1',
    optimizedRoute: route
  };
}

// Create territory
app.post('/api/territories/create', (req: Request, res: Response) => {
  const { name, regions, cities, priority, quota } = req.body;

  const territory: Territory = {
    id: `territory-${Date.now()}`,
    name,
    regions: regions || [],
    cities: cities || [],
    accounts: 0,
    potentialRevenue: 10000000,
    currentCoverage: 35,
    assignedTo: [],
    priority: priority || 'medium',
    metrics: {
      quota: quota || 5000000,
      ytd: 0,
      attainment: 0,
      growth: 0
    }
  };

  const potential = calculateTerritoryPotential(territory);

  res.json({
    territory,
    potential,
    nextSteps: [
      'Assign sales reps',
      'Identify key accounts',
      'Plan coverage strategy',
      'Set up reporting'
    ]
  });
});

// Get territory analysis
app.post('/api/territories/analyze', (req: Request, res: Response) => {
  const { territoryId } = req.body;

  const territory: Territory = {
    id: territoryId,
    name: 'North Region',
    regions: ['North Delhi', 'West UP', 'Punjab'],
    cities: ['Delhi', 'Gurgaon', 'Noida', 'Ludhiana'],
    accounts: 150,
    potentialRevenue: 25000000,
    currentCoverage: 45,
    assignedTo: ['rep-1', 'rep-2'],
    priority: 'high',
    metrics: {
      quota: 15000000,
      ytd: 8500000,
      attainment: 56.7,
      growth: 12
    }
  };

  const potential = calculateTerritoryPotential(territory);

  res.json({
    territory,
    analysis: {
      ...potential,
      accountBreakdown: {
        a: 25,
        b: 45,
        c: 50,
        d: 30
      },
      industryMix: {
        'IT Services': 35,
        'Manufacturing': 25,
        'Financial Services': 20,
        'Retail': 15,
        'Other': 5
      },
      seasonality: {
        'Q1': 'Moderate',
        'Q2': 'High',
        'Q3': 'Peak',
        'Q4': 'Very High'
      }
    },
    recommendations: [
      'Focus on IT Services segment (35% of territory)',
      'Increase Q4 prospecting to capitalize on peak season',
      'Develop channel partners in Punjab region',
      'Priority: Convert 10 C accounts to B accounts'
    ]
  });
});

// List territories
app.get('/api/territories', (req: Request, res: Response) => {
  const territories: Territory[] = [
    {
      id: 'territory-1',
      name: 'North Region',
      regions: ['North Delhi', 'West UP', 'Punjab'],
      cities: ['Delhi', 'Gurgaon', 'Noida', 'Ludhiana'],
      accounts: 150,
      potentialRevenue: 25000000,
      currentCoverage: 45,
      assignedTo: ['rep-1'],
      priority: 'high',
      metrics: { quota: 15000000, ytd: 8500000, attainment: 56.7, growth: 12 }
    },
    {
      id: 'territory-2',
      name: 'South Region',
      regions: ['Karnataka', 'Tamil Nadu', 'Telangana'],
      cities: ['Bangalore', 'Chennai', 'Hyderabad'],
      accounts: 180,
      potentialRevenue: 30000000,
      currentCoverage: 52,
      assignedTo: ['rep-2'],
      priority: 'high',
      metrics: { quota: 18000000, ytd: 10800000, attainment: 60, growth: 15 }
    },
    {
      id: 'territory-3',
      name: 'West Region',
      regions: ['Maharashtra', 'Gujarat'],
      cities: ['Mumbai', 'Pune', 'Ahmedabad'],
      accounts: 120,
      potentialRevenue: 20000000,
      currentCoverage: 38,
      assignedTo: ['rep-3'],
      priority: 'medium',
      metrics: { quota: 12000000, ytd: 5400000, attainment: 45, growth: 8 }
    },
    {
      id: 'territory-4',
      name: 'East Region',
      regions: ['West Bengal', 'Odisha', 'Bihar'],
      cities: ['Kolkata', 'Bhubaneswar', 'Patna'],
      accounts: 80,
      potentialRevenue: 10000000,
      currentCoverage: 25,
      assignedTo: ['rep-4'],
      priority: 'low',
      metrics: { quota: 6000000, ytd: 1800000, attainment: 30, growth: 5 }
    }
  ];

  res.json({
    territories,
    summary: {
      total: territories.length,
      totalPotential: territories.reduce((sum, t) => sum + t.potentialRevenue, 0),
      totalQuota: territories.reduce((sum, t) => sum + t.metrics.quota, 0),
      avgAttainment: territories.reduce((sum, t) => sum + t.metrics.attainment, 0) / territories.length
    }
  });
});

// Optimize territory assignment
app.post('/api/territories/optimize', (req: Request, res: Response) => {
  const { reps, territories } = req.body;

  const allReps: SalesRep[] = reps || [
    { id: 'rep-1', name: 'Amit Sharma', territories: ['territory-1'], capacity: 100, currentLoad: 80, performance: { winRate: 35, avgDealSize: 250000, quotaAttainment: 95 }, commutePreference: 'hybrid' },
    { id: 'rep-2', name: 'Priya Patel', territories: ['territory-2'], capacity: 100, currentLoad: 95, performance: { winRate: 40, avgDealSize: 300000, quotaAttainment: 110 }, commutePreference: 'hybrid' },
    { id: 'rep-3', name: 'Raj Kumar', territories: ['territory-3'], capacity: 100, currentLoad: 60, performance: { winRate: 28, avgDealSize: 200000, quotaAttainment: 75 }, commutePreference: 'remote' },
    { id: 'rep-4', name: 'Sunita Verma', territories: ['territory-4'], capacity: 100, currentLoad: 40, performance: { winRate: 25, avgDealSize: 180000, quotaAttainment: 65 }, commutePreference: 'remote' }
  ];

  const allTerritories: Territory[] = territories || [
    { id: 'territory-1', name: 'North Region', regions: [], cities: ['Delhi', 'Gurgaon'], accounts: 150, potentialRevenue: 25000000, currentCoverage: 45, assignedTo: ['rep-1'], priority: 'high', metrics: { quota: 15000000, ytd: 8500000, attainment: 56.7, growth: 12 } },
    { id: 'territory-2', name: 'South Region', regions: [], cities: ['Bangalore', 'Chennai'], accounts: 180, potentialRevenue: 30000000, currentCoverage: 52, assignedTo: ['rep-2'], priority: 'high', metrics: { quota: 18000000, ytd: 10800000, attainment: 60, growth: 15 } },
    { id: 'territory-3', name: 'West Region', regions: [], cities: ['Mumbai', 'Pune'], accounts: 120, potentialRevenue: 20000000, currentCoverage: 38, assignedTo: ['rep-3'], priority: 'medium', metrics: { quota: 12000000, ytd: 5400000, attainment: 45, growth: 8 } },
    { id: 'territory-4', name: 'East Region', regions: [], cities: ['Kolkata', 'Patna'], accounts: 80, potentialRevenue: 10000000, currentCoverage: 25, assignedTo: ['rep-4'], priority: 'low', metrics: { quota: 6000000, ytd: 1800000, attainment: 30, growth: 5 } }
  ];

  const optimization = optimizeTerritoryAssignment(allReps, allTerritories);

  res.json({
    optimization,
    currentState: {
      repDistribution: allReps.map(r => ({ name: r.name, territories: r.territories.length, load: r.currentLoad })),
      quotaBalance: (Math.max(...allReps.map(r => r.currentLoad)) - Math.min(...allReps.map(r => r.currentLoad))) < 20 ? 'Balanced' : 'Imbalanced'
    },
    projectedImpact: {
      additionalRevenue: 2500000,
      winRateImprovement: '+5%',
      quotaBalance: 'Improved'
    }
  });
});

// Generate route plan
app.post('/api/routes/generate', (req: Request, res: Response) => {
  const { repId, territoryId, accounts, maxPerDay } = req.body;

  const sampleAccounts: Account[] = accounts || [
    { id: 'acc-1', name: 'TechCorp Solutions', city: 'Delhi', territory: 'North', industry: 'IT', revenue: 5000000, potential: 8000000, priority: 'a' },
    { id: 'acc-2', name: 'Global Manufacturing', city: 'Gurgaon', territory: 'North', industry: 'Manufacturing', revenue: 20000000, potential: 25000000, priority: 'a' },
    { id: 'acc-3', name: 'FinServe Ltd', city: 'Delhi', territory: 'North', industry: 'Financial', revenue: 8000000, potential: 12000000, priority: 'b' },
    { id: 'acc-4', name: 'RetailMax', city: 'Noida', territory: 'North', industry: 'Retail', revenue: 3000000, potential: 5000000, priority: 'b' },
    { id: 'acc-5', name: 'MediCare Plus', city: 'Ludhiana', territory: 'North', industry: 'Healthcare', revenue: 4000000, potential: 6000000, priority: 'c' },
    { id: 'acc-6', name: 'EduTech India', city: 'Gurgaon', territory: 'North', industry: 'Education', revenue: 2000000, potential: 4000000, priority: 'c' }
  ];

  const route = optimizeRoute(sampleAccounts, maxPerDay || 6);

  res.json({
    route,
    summary: {
      totalDays: route.optimizedRoute.length,
      totalStops: route.optimizedRoute.reduce((sum, d) => sum + d.stops.length, 0),
      inPersonVisits: route.optimizedRoute.reduce((sum, d) => sum + d.stops.filter(s => s.visitType === 'in-person').length, 0),
      virtualCalls: route.optimizedRoute.reduce((sum, d) => sum + d.stops.filter(s => s.visitType === 'virtual').length, 0),
      phoneCalls: route.optimizedRoute.reduce((sum, d) => sum + d.stops.filter(s => s.visitType === 'call').length, 0),
      avgEfficiency: (route.optimizedRoute.reduce((sum, d) => sum + d.efficiency, 0) / route.optimizedRoute.length * 100).toFixed(0) + '%'
    },
    tips: [
      'Prioritize A accounts for in-person visits',
      'Group nearby accounts for efficient travel',
      'Use virtual meetings for follow-ups',
      'Reserve peak hours for key accounts'
    ]
  });
});

// Account assignment
app.post('/api/accounts/assign', (req: Request, res: Response) => {
  const { accountId, targetRepId, reason } = req.body;

  const account: Account = {
    id: accountId,
    name: 'Sample Account',
    city: 'Delhi',
    territory: 'North',
    industry: 'IT',
    revenue: 5000000,
    potential: 8000000,
    assignedTo: targetRepId,
    priority: 'b'
  };

  res.json({
    account,
    previousRep: 'rep-2',
    newRep: targetRepId,
    reason,
    transition: {
      handoverPeriod: '30 days',
      actions: [
        'Introduce new rep to account',
        'Review account history',
        'Schedule joint meeting',
        'Update CRM'
      ]
    }
  });
});

// Territory coverage heatmap
app.get('/api/territories/heatmap', (req: Request, res: Response) => {
  const heatmap = [
    { region: 'Metro Cities', coverage: 65, potential: 40000000, efficiency: 85 },
    { region: 'Tier 1 Cities', coverage: 48, potential: 25000000, efficiency: 72 },
    { region: 'Tier 2 Cities', coverage: 28, potential: 15000000, efficiency: 55 },
    { region: 'Tier 3 Cities', coverage: 12, potential: 8000000, efficiency: 35 }
  ];

  res.json({
    heatmap,
    insights: [
      'Metro cities over-covered - consider rebalancing',
      'Tier 2 cities significant opportunity gap',
      'Tier 3 cities need different go-to-market (channel)'
    ],
    recommendations: [
      'Increase investment in Tier 2 cities',
      'Develop partner network for Tier 3',
      'Optimize metro coverage with automation'
    ]
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'territory-planner',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Territory Planner running on port ${PORT}`);
  console.log('Role: Geographic coverage optimization, territory management');
});

export default app;
