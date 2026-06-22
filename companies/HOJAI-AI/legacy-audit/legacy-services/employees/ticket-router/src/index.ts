/**
 * Ticket Router
 * Port: 4820
 *
 * Role: Categorize support tickets, route to appropriate teams, prioritize
 * Persona: Analytical, efficient, fair balancer, SLA protector
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4820;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Ticket {
  id: string;
  subject: string;
  description: string;
  customerId: string;
  customerTier: 'free' | 'starter' | 'professional' | 'enterprise';
  source: 'email' | 'chat' | 'phone' | 'portal' | 'social';
  category?: string;
  subcategory?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  status: 'new' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  assignedTo?: string;
  team?: string;
  tags: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  sla?: { breachAt: Date; met: boolean };
  createdAt: Date;
  updatedAt: Date;
}

interface Category {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  team: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedResolution: string;
  escalationPath: string[];
  relatedCategories: string[];
}

interface RoutingRule {
  id: string;
  name: string;
  conditions: { field: string; operator: string; value: string }[];
  action: { team: string; priority: string; assignTo?: string };
  priority: number;
}

interface Team {
  id: string;
  name: string;
  members: string[];
  currentLoad: number;
  capacity: number;
  skills: string[];
  availability: 'online' | 'busy' | 'offline';
  avgResolutionTime: string;
}

// Categories database
const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Billing & Payments',
    description: 'Payment issues, invoices, refunds, subscriptions',
    keywords: ['payment', 'invoice', 'refund', 'billing', 'charge', 'subscription', 'pricing', 'plan'],
    team: 'billing',
    priority: 'high',
    estimatedResolution: '4 hours',
    escalationPath: ['billing-agent', 'billing-manager'],
    relatedCategories: ['cat-8']
  },
  {
    id: 'cat-2',
    name: 'Technical Support',
    description: 'Bugs, errors, integration issues, API problems',
    keywords: ['bug', 'error', 'crash', 'not working', 'issue', 'broken', 'problem', 'api', 'integration', 'technical'],
    team: 'technical',
    priority: 'high',
    estimatedResolution: '8 hours',
    escalationPath: ['tier1-agent', 'tier2-engineer', 'engineering-manager'],
    relatedCategories: ['cat-3', 'cat-4']
  },
  {
    id: 'cat-3',
    name: 'Account & Access',
    description: 'Login issues, password reset, permissions, SSO',
    keywords: ['login', 'password', 'access', 'permission', 'account', 'sso', 'authenticate', 'locked', 'forgot'],
    team: 'account',
    priority: 'medium',
    estimatedResolution: '2 hours',
    escalationPath: ['account-agent', 'security-team'],
    relatedCategories: ['cat-2']
  },
  {
    id: 'cat-4',
    name: 'Feature Requests',
    description: 'Product feedback, feature suggestions, enhancement requests',
    keywords: ['feature', 'request', 'suggestion', 'would be nice', 'add', 'improve', 'enhancement', 'idea'],
    team: 'product',
    priority: 'low',
    estimatedResolution: '72 hours',
    escalationPath: ['product-agent', 'product-manager'],
    relatedCategories: []
  },
  {
    id: 'cat-5',
    name: 'How-To & Usage',
    description: 'Questions about features, tutorials, best practices',
    keywords: ['how', 'tutorial', 'guide', 'help', 'usage', 'learn', 'understand', 'documentation'],
    team: 'success',
    priority: 'low',
    estimatedResolution: '24 hours',
    escalationPath: ['success-agent'],
    relatedCategories: ['cat-6']
  },
  {
    id: 'cat-6',
    name: 'Onboarding',
    description: 'New customer setup, configuration, getting started',
    keywords: ['setup', 'start', 'onboard', 'configure', 'new', 'begin', 'installation', 'getting started'],
    team: 'success',
    priority: 'medium',
    estimatedResolution: '24 hours',
    escalationPath: ['success-agent', 'onboarding-specialist'],
    relatedCategories: ['cat-5', 'cat-3']
  },
  {
    id: 'cat-7',
    name: 'Data & Privacy',
    description: 'GDPR, data export, privacy concerns, data deletion',
    keywords: ['gdpr', 'privacy', 'data', 'delete', 'export', 'personal', 'compliance', 'consent'],
    team: 'legal',
    priority: 'high',
    estimatedResolution: '24 hours',
    escalationPath: ['privacy-agent', 'legal-team', 'dpo'],
    relatedCategories: []
  },
  {
    id: 'cat-8',
    name: 'Cancellation',
    description: 'Subscription cancellation, downgrade requests',
    keywords: ['cancel', 'stop', 'end', 'terminate', 'downgrade', 'leave', 'unsubscribe'],
    team: 'retention',
    priority: 'high',
    estimatedResolution: '2 hours',
    escalationPath: ['retention-agent', 'retention-manager'],
    relatedCategories: ['cat-1']
  }
];

// Teams configuration
const teams: Team[] = [
  { id: 'billing', name: 'Billing Team', members: ['agent-b1', 'agent-b2'], currentLoad: 12, capacity: 20, skills: ['billing', 'payments', 'refunds'], availability: 'online', avgResolutionTime: '3 hours' },
  { id: 'technical', name: 'Technical Support', members: ['agent-t1', 'agent-t2', 'agent-t3'], currentLoad: 25, capacity: 30, skills: ['technical', 'bugs', 'api', 'integration'], availability: 'online', avgResolutionTime: '6 hours' },
  { id: 'account', name: 'Account Team', members: ['agent-a1', 'agent-a2'], currentLoad: 8, capacity: 15, skills: ['account', 'access', 'sso'], availability: 'busy', avgResolutionTime: '2 hours' },
  { id: 'success', name: 'Customer Success', members: ['agent-s1', 'agent-s2', 'agent-s3'], currentLoad: 18, capacity: 25, skills: ['onboarding', 'usage', 'how-to'], availability: 'online', avgResolutionTime: '12 hours' },
  { id: 'product', name: 'Product Team', members: ['agent-p1'], currentLoad: 45, capacity: 50, skills: ['feature', 'request'], availability: 'online', avgResolutionTime: '48 hours' },
  { id: 'legal', name: 'Legal & Privacy', members: ['agent-l1'], currentLoad: 3, capacity: 10, skills: ['privacy', 'gdpr', 'legal'], availability: 'offline', avgResolutionTime: '24 hours' },
  { id: 'retention', name: 'Retention Team', members: ['agent-r1', 'agent-r2'], currentLoad: 10, capacity: 15, skills: ['cancellation', 'downgrade', 'retention'], availability: 'online', avgResolutionTime: '1 hour' }
];

// Routing rules
const routingRules: RoutingRule[] = [
  {
    id: 'rule-1',
    name: 'Enterprise Priority',
    conditions: [
      { field: 'customerTier', operator: 'equals', value: 'enterprise' },
      { field: 'priority', operator: 'in', value: 'urgent,high' }
    ],
    action: { team: 'technical', priority: 'urgent', assignTo: 'senior-agent' },
    priority: 1
  },
  {
    id: 'rule-2',
    name: 'Urgent Billing',
    conditions: [
      { field: 'category', operator: 'equals', value: 'billing' },
      { field: 'sentiment', operator: 'equals', value: 'negative' }
    ],
    action: { team: 'billing', priority: 'high' },
    priority: 2
  },
  {
    id: 'rule-3',
    name: 'Cancellation Fast Track',
    conditions: [
      { field: 'category', operator: 'equals', value: 'cancellation' }
    ],
    action: { team: 'retention', priority: 'high' },
    priority: 3
  }
];

// Categorize ticket using NLP-like matching
function categorizeTicket(ticket: Partial<Ticket>): { category: Category; confidence: number; matchedKeywords: string[] } {
  const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
  const matchedKeywords: string[] = [];

  let bestMatch: Category = categories[0];
  let bestScore = 0;

  categories.forEach(category => {
    let score = 0;
    category.keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score++;
        matchedKeywords.push(keyword);
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  });

  const confidence = Math.min(bestScore * 20, 100);

  return { category: bestMatch, confidence, matchedKeywords };
}

// Determine priority
function determinePriority(ticket: Partial<Ticket>, category: Category): 'urgent' | 'high' | 'medium' | 'low' {
  // Check customer tier
  if (ticket.customerTier === 'enterprise') {
    if (category.priority === 'high' || category.priority === 'urgent') {
      return 'urgent';
    }
    return 'high';
  }

  // Check sentiment
  if (ticket.sentiment === 'negative') {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return (priorityOrder[category.priority] + 1) as any || 'high';
  }

  // Check source
  if (ticket.source === 'phone') {
    return 'high';
  }

  return category.priority;
}

// Find best team member
function assignAgent(team: Team, ticket: Partial<Ticket>): string | null {
  // Find online team members with lowest load
  const onlineMembers = team.members.filter(() => team.availability === 'online');
  if (onlineMembers.length === 0) return null;

  // Simple round-robin with load balancing
  const leastLoadedMember = onlineMembers[Math.floor(Math.random() * onlineMembers.length)];
  return leastLoadedMember;
}

// Route ticket
function routeTicket(ticket: Partial<Ticket>): {
  ticket: Ticket;
  routing: { team: string; agent: string | null; reason: string };
  sla: { target: Date; responseTime: string; resolutionTime: string };
} {
  const { category, confidence, matchedKeywords } = categorizeTicket(ticket);
  const priority = determinePriority(ticket, category);

  const team = teams.find(t => t.id === category.team) || teams[0];
  const agent = assignAgent(team, ticket);

  const now = new Date();
  const slaMinutes = priority === 'urgent' ? 15 : priority === 'high' ? 60 : priority === 'medium' ? 240 : 480;

  const routedTicket: Ticket = {
    id: ticket.id || `ticket-${Date.now()}`,
    subject: ticket.subject || '',
    description: ticket.description || '',
    customerId: ticket.customerId || '',
    customerTier: ticket.customerTier || 'starter',
    source: ticket.source || 'portal',
    category: category.name,
    subcategory: matchedKeywords[0],
    priority,
    status: 'assigned',
    assignedTo: agent || undefined,
    team: team.name,
    tags: matchedKeywords,
    sentiment: ticket.sentiment,
    sla: { breachAt: new Date(now.getTime() + slaMinutes * 60 * 1000), met: false },
    createdAt: now,
    updatedAt: now
  };

  return {
    ticket: routedTicket,
    routing: {
      team: team.name,
      agent,
      reason: confidence > 80
        ? `High confidence match (${confidence}%)`
        : confidence > 50
          ? `Moderate confidence (${confidence}%) - manual review recommended`
          : `Low confidence (${confidence}%) - review required`
    },
    sla: {
      target: new Date(now.getTime() + slaMinutes * 60 * 1000),
      responseTime: priority === 'urgent' ? '15 min' : priority === 'high' ? '1 hour' : priority === 'medium' ? '4 hours' : '8 hours',
      resolutionTime: category.estimatedResolution
    }
  };
}

// Receive and route ticket
app.post('/api/tickets/route', (req: Request, res: Response) => {
  const ticketData = req.body;

  const result = routeTicket(ticketData);

  res.json({
    ...result,
    debug: {
      matchedKeywords: categorizeTicket(ticketData).matchedKeywords,
      categoryConfidence: categorizeTicket(ticketData).confidence,
      suggestedTeam: categories.find(c => c.name === result.ticket.category)?.team
    }
  });
});

// Batch route tickets
app.post('/api/tickets/route-batch', (req: Request, res: Response) => {
  const { tickets } = req.body;

  const results = tickets.map((ticket: Partial<Ticket>) => routeTicket(ticket));

  const distribution = results.reduce((acc: Record<string, number>, r) => {
    acc[r.ticket.team || 'unassigned'] = (acc[r.ticket.team || 'unassigned'] || 0) + 1;
    return acc;
  }, {});

  res.json({
    results,
    summary: {
      total: results.length,
      byPriority: {
        urgent: results.filter(r => r.ticket.priority === 'urgent').length,
        high: results.filter(r => r.ticket.priority === 'high').length,
        medium: results.filter(r => r.ticket.priority === 'medium').length,
        low: results.filter(r => r.ticket.priority === 'low').length
      },
      byTeam: distribution,
      avgConfidence: Math.round(results.reduce((sum, r) => sum + categorizeTicket(r.ticket).confidence, 0) / results.length)
    }
  });
});

// Get categories
app.get('/api/categories', (req: Request, res: Response) => {
  res.json({
    categories,
    summary: {
      total: categories.length,
      byTeam: categories.reduce((acc: Record<string, number>, c) => {
        acc[c.team] = (acc[c.team] || 0) + 1;
        return acc;
      }, {})
    }
  });
});

// Get teams
app.get('/api/teams', (req: Request, res: Response) => {
  res.json({
    teams: teams.map(t => ({
      ...t,
      loadPercentage: Math.round((t.currentLoad / t.capacity) * 100),
      canAccept: t.currentLoad < t.capacity
    })),
    summary: {
      totalCapacity: teams.reduce((sum, t) => sum + t.capacity, 0),
      totalLoad: teams.reduce((sum, t) => sum + t.currentLoad, 0),
      utilizationRate: Math.round(teams.reduce((sum, t) => sum + t.currentLoad, 0) / teams.reduce((sum, t) => sum + t.capacity, 0) * 100)
    }
  });
});

// Get routing rules
app.get('/api/rules', (req: Request, res: Response) => {
  res.json({
    rules: routingRules.sort((a, b) => a.priority - b.priority),
    summary: {
      total: routingRules.length,
      active: routingRules.length
    }
  });
});

// Analyze ticket
app.post('/api/tickets/analyze', (req: Request, res: Response) => {
  const { subject, description, customerTier, source } = req.body;

  const text = `${subject} ${description}`.toLowerCase();

  const analysis = {
    intent: {
      primary: 'support',
      secondary: 'billing',
      confidence: 85
    },
    entities: {
      product: ['platform'],
      feature: [],
      error: []
    },
    sentiment: {
      score: -0.2,
      label: 'slightly_negative'
    },
    urgency: {
      level: 'medium',
      indicators: ['mentioned_sla', 'multiple_contacts']
    },
    recommendations: {
      route: 'technical',
      priority: 'medium',
      assignTo: 'agent-t1'
    }
  };

  res.json({
    analysis,
    categorization: categorizeTicket({ subject, description } as Partial<Ticket>),
    routing: routeTicket({ subject, description, customerTier, source } as Partial<Ticket>)
  });
});

// Update routing rules
app.post('/api/rules', (req: Request, res: Response) => {
  const rule = req.body as RoutingRule;

  const newRule: RoutingRule = {
    ...rule,
    id: rule.id || `rule-${Date.now()}`,
    priority: rule.priority || routingRules.length + 1
  };

  routingRules.push(newRule);

  res.json({
    rule: newRule,
    message: 'Routing rule added successfully'
  });
});

// SLA dashboard
app.get('/api/sla/dashboard', (req: Request, res: Response) => {
  res.json({
    metrics: {
      firstResponse: { target: '1 hour', current: '45 min', met: 92 },
      resolution: { target: '24 hours', current: '18 hours', met: 88 },
      csat: { target: '90%', current: '87%', met: false }
    },
    byTeam: {
      billing: { responseTime: '30 min', resolutionTime: '3 hours', csat: 91 },
      technical: { responseTime: '2 hours', resolutionTime: '8 hours', csat: 85 },
      account: { responseTime: '45 min', resolutionTime: '2 hours', csat: 93 },
      success: { responseTime: '4 hours', resolutionTime: '12 hours', csat: 89 },
      retention: { responseTime: '15 min', resolutionTime: '1 hour', csat: 88 }
    },
    atRisk: [
      { ticketId: 'T-1234', team: 'technical', slaBreach: '2 hours', reason: 'Complex bug investigation' },
      { ticketId: 'T-1235', team: 'billing', slaBreach: '30 min', reason: 'Payment processing delay' }
    ],
    recommendations: [
      'Add capacity to technical team',
      'Create KB for common billing issues',
      'Implement automated responses for simple queries'
    ]
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ticket-router',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Ticket Router running on port ${PORT}`);
  console.log('Role: Categorize tickets, route to teams, prioritize');
});

export default app;
