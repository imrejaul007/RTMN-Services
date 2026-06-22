/**
 * Escalation Manager
 * Port: 4821
 *
 * Role: Handle complex issues, executive escalations, crisis management
 * Persona: Decisive leader, calm under pressure, problem solver, communicator
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4821;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Escalation {
  id: string;
  ticketId: string;
  originalTeam: string;
  escalatedBy: string;
  escalatedTo: string;
  reason: string;
  level: 'tier2' | 'tier3' | 'management' | 'executive' | 'crisis';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  timeline: { action: string; by: string; at: Date }[];
  resolution?: { solution: string; rootCause: string; prevention: string };
  impact: { customers: number; revenue: number; duration: string };
  createdAt: Date;
  updatedAt: Date;
}

interface CrisisEvent {
  id: string;
  type: 'outage' | 'security' | 'data-breach' | 'compliance' | 'pr-crisis';
  severity: 'critical' | 'major' | 'minor';
  status: 'active' | 'mitigating' | 'resolved';
  affectedServices: string[];
  affectedCustomers: number;
  startTime: Date;
  estimatedResolution?: Date;
  resolutionTime?: Date;
  communicationPlan: { audience: string; message: string; channel: string; sentAt?: Date }[];
  actions: { action: string; owner: string; status: string; completedAt?: Date }[];
}

interface ExecutiveContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  escalationLevels: { level: string; trigger: string; responseTime: string }[];
}

// Escalation levels
const escalationLevels = [
  { level: 'tier2', name: 'Senior Support Agent', responseTime: '2 hours', autoEscalate: true },
  { level: 'tier3', name: 'Technical Engineer', responseTime: '1 hour', autoEscalate: true },
  { level: 'management', name: 'Team Manager', responseTime: '30 min', autoEscalate: false },
  { level: 'executive', name: 'Director/VP', responseTime: '15 min', autoEscalate: false },
  { level: 'crisis', name: 'C-Suite / Crisis Team', responseTime: 'Immediate', autoEscalate: false }
];

// Executive contacts
const executiveContacts: ExecutiveContact[] = [
  { id: 'exec-1', name: 'Priya Sharma', role: 'VP of Customer Success', email: 'priya@hojai.com', phone: '+91-9876543210', escalationLevels: [{ level: 'management', trigger: 'Enterprise customer + high impact', responseTime: '30 min' }] },
  { id: 'exec-2', name: 'Raj Kumar', role: 'CTO', email: 'raj@hojai.com', phone: '+91-9876543211', escalationLevels: [{ level: 'executive', trigger: 'Technical crisis', responseTime: '15 min' }] },
  { id: 'exec-3', name: 'Amit Patel', role: 'CEO', email: 'amit@hojai.com', phone: '+91-9876543212', escalationLevels: [{ level: 'crisis', trigger: 'PR crisis or major outage', responseTime: 'Immediate' }] }
];

// Determine escalation level
function determineEscalationLevel(ticket: {
  customerTier: string;
  impact: string;
  sentiment: string;
  age: number;
  previousEscalations: number;
  topic: string;
}): { level: string; reason: string; urgency: 'immediate' | 'urgent' | 'standard' } {
  // Crisis-level triggers
  const crisisTriggers = ['data breach', 'security', 'compliance', 'legal', 'regulation'];
  if (crisisTriggers.some(t => ticket.topic.toLowerCase().includes(t))) {
    return { level: 'crisis', reason: 'Potential crisis-level issue detected', urgency: 'immediate' };
  }

  // Executive triggers
  if (ticket.customerTier === 'enterprise' && (ticket.impact === 'high' || ticket.sentiment === 'negative')) {
    return { level: 'executive', reason: 'Enterprise customer with high impact', urgency: 'urgent' };
  }

  // Management triggers
  if (ticket.age > 48 || ticket.previousEscalations >= 2) {
    return { level: 'management', reason: 'Extended resolution time or multiple escalations', urgency: 'urgent' };
  }

  // Technical tier escalation
  if (ticket.impact === 'medium' || ticket.sentiment === 'negative') {
    return { level: 'tier3', reason: 'Technical complexity requires engineer review', urgency: 'standard' };
  }

  return { level: 'tier2', reason: 'Standard escalation for expert review', urgency: 'standard' };
}

// Process escalation
function processEscalation(ticketId: string, reason: string, currentLevel: string): Escalation {
  const escalation: Escalation = {
    id: `esc-${Date.now()}`,
    ticketId,
    originalTeam: 'support-tier1',
    escalatedBy: 'system',
    escalatedTo: escalationLevels.find(l => l.level === currentLevel)?.name || 'Senior Agent',
    reason,
    level: currentLevel as Escalation['level'],
    status: 'investigating',
    priority: currentLevel === 'crisis' || currentLevel === 'executive' ? 'urgent' : 'high',
    timeline: [
      { action: 'Ticket escalated', by: 'system', at: new Date() }
    ],
    impact: { customers: 0, revenue: 0, duration: '' },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return escalation;
}

// Crisis management workflow
function initiateCrisisMode(event: Partial<CrisisEvent>): CrisisEvent {
  const crisis: CrisisEvent = {
    id: `crisis-${Date.now()}`,
    type: event.type || 'outage',
    severity: event.severity || 'major',
    status: 'active',
    affectedServices: event.affectedServices || [],
    affectedCustomers: event.affectedCustomers || 0,
    startTime: new Date(),
    communicationPlan: [
      { audience: 'Internal Team', message: 'Crisis detected. Follow incident response protocol.', channel: 'slack', sentAt: new Date() },
      { audience: 'Affected Customers', message: 'We are aware of the issue and working on it.', channel: 'email' },
      { audience: 'All Customers', message: 'Service disruption notice.', channel: 'status_page' },
      { audience: 'Executive Team', message: 'Crisis escalation - immediate attention required.', channel: 'sms' }
    ],
    actions: [
      { action: 'Assess impact and severity', owner: 'Incident Commander', status: 'in_progress' },
      { action: 'Notify affected customers', owner: 'Support Lead', status: 'pending' },
      { action: 'Begin technical investigation', owner: 'Engineering Lead', status: 'pending' },
      { action: 'Prepare public communication', owner: 'PR Team', status: 'pending' }
    ]
  };

  return crisis;
}

// Create escalation
app.post('/api/escalations', (req: Request, res: Response) => {
  const { ticketId, reason, customerTier, impact, sentiment, age, previousEscalations, topic } = req.body;

  const escalationInfo = determineEscalationLevel({
    customerTier: customerTier || 'starter',
    impact: impact || 'low',
    sentiment: sentiment || 'neutral',
    age: age || 0,
    previousEscalations: previousEscalations || 0,
    topic: topic || ''
  });

  const escalation = processEscalation(ticketId, reason || escalationInfo.reason, escalationInfo.level);

  res.json({
    escalation,
    nextActions: {
      level: escalationInfo.level,
      urgency: escalationInfo.urgency,
      responseTime: escalationLevels.find(l => l.level === escalationInfo.level)?.responseTime,
      notifyContacts: executiveContacts.filter(e => e.escalationLevels.some(el => el.level === escalationInfo.level))
    },
    recommendedActions: [
      'Acknowledge escalation immediately',
      'Review ticket history',
      'Assess customer impact',
      'Determine root cause',
      'Document investigation steps'
    ]
  });
});

// Get escalation details
app.get('/api/escalations/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const escalation: Escalation = {
    id,
    ticketId: 'T-1234',
    originalTeam: 'Support Tier 1',
    escalatedBy: 'system',
    escalatedTo: 'Senior Technical Agent',
    reason: 'Technical complexity requires engineer review',
    level: 'tier3',
    status: 'investigating',
    priority: 'high',
    timeline: [
      { action: 'Ticket escalated', by: 'system', at: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { action: 'Assigned to engineer', by: 'manager', at: new Date(Date.now() - 1.5 * 60 * 60 * 1000) },
      { action: 'Investigation started', by: 'engineer', at: new Date(Date.now() - 1 * 60 * 60 * 1000) }
    ],
    resolution: {
      solution: 'Identified API timeout issue - implementing rate limiting',
      rootCause: 'Unexpected traffic spike caused resource exhaustion',
      prevention: 'Adding auto-scaling and rate limiting rules'
    },
    impact: { customers: 15, revenue: 5000, duration: '2 hours' },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date()
  };

  res.json({
    escalation,
    linkedTickets: ['T-1235', 'T-1236'],
    relatedKnowledgeBase: ['KB-456', 'KB-789'],
    customerHistory: {
      accountAge: '2 years',
      previousTickets: 12,
      sentimentTrend: 'neutral'
    }
  });
});

// List active escalations
app.get('/api/escalations', (req: Request, res: Response) => {
  const escalations: Partial<Escalation>[] = [
    { id: 'esc-1', ticketId: 'T-1234', level: 'tier3', status: 'investigating', priority: 'high', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: 'esc-2', ticketId: 'T-1235', level: 'management', status: 'open', priority: 'urgent', createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { id: 'esc-3', ticketId: 'T-1236', level: 'executive', status: 'investigating', priority: 'urgent', createdAt: new Date(Date.now() - 30 * 60 * 1000) }
  ];

  res.json({
    escalations,
    summary: {
      total: escalations.length,
      byLevel: {
        tier2: 0,
        tier3: 1,
        management: 1,
        executive: 1,
        crisis: 0
      },
      byStatus: {
        open: 1,
        investigating: 2,
        resolved: 0,
        closed: 0
      },
      avgResolutionTime: '4.5 hours',
      slaCompliance: 85
    }
  });
});

// Update escalation status
app.patch('/api/escalations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, action, resolution } = req.body;

  const escalation: Partial<Escalation> = {
    id,
    status,
    updatedAt: new Date(),
    timeline: [
      { action: action || `Status updated to ${status}`, by: 'agent', at: new Date() }
    ]
  };

  if (resolution) {
    escalation.resolution = resolution;
  }

  res.json({
    escalation,
    notifications: status === 'resolved' ? ['Customer notified', 'Post-mortem scheduled', 'CSAT survey sent'] : []
  });
});

// Initiate crisis mode
app.post('/api/crisis', (req: Request, res: Response) => {
  const event = req.body;

  const crisis = initiateCrisisMode(event);

  res.json({
    crisis,
    crisisTeam: executiveContacts,
    responseProtocol: {
      step1: 'Confirm severity and activate crisis team',
      step2: 'Establish incident commander',
      step3: 'Begin customer communication',
      step4: 'Investigate root cause',
      step5: 'Implement mitigation',
      step6: 'Resolve and communicate resolution',
      step7: 'Post-mortem and prevention'
    }
  });
});

// Get crisis events
app.get('/api/crisis', (req: Request, res: Response) => {
  const crises: Partial<CrisisEvent>[] = [
    {
      id: 'crisis-1',
      type: 'outage',
      severity: 'major',
      status: 'mitigating',
      affectedServices: ['API', 'Dashboard'],
      affectedCustomers: 150,
      startTime: new Date(Date.now() - 30 * 60 * 1000)
    }
  ];

  res.json({
    activeCrises: crises.filter(c => c.status === 'active' || c.status === 'mitigating'),
    recentCrises: crises,
    metrics: {
      mttd: '12 min',
      mttr: '45 min',
      customerImpact: 250,
      revenueImpact: 15000
    }
  });
});

// Executive notification
app.post('/api/notify/executive', (req: Request, res: Response) => {
  const { escalationId, severity, message, notifyAll } = req.body;

  const contacts = notifyAll
    ? executiveContacts
    : executiveContacts.filter(e => e.escalationLevels.some(el => el.level === severity));

  const notifications = contacts.map(contact => ({
    contact: contact.name,
    channel: contact.phone.includes('+91') ? 'SMS' : 'Email',
    sent: true,
    acknowledged: false
  }));

  res.json({
    notifications,
    message,
    escalationId,
    status: 'sent'
  });
});

// Post-mortem template
app.get('/api/postmortem/:escalationId', (req: Request, res: Response) => {
  const { escalationId } = req.params;

  res.json({
    template: {
      title: 'Incident Post-Mortem',
      sections: [
        { name: 'Summary', prompt: 'Brief description of the incident' },
        { name: 'Impact', prompt: 'Customers affected, duration, revenue impact' },
        { name: 'Timeline', prompt: 'Key events and actions taken' },
        { name: 'Root Cause', prompt: 'Technical root cause analysis' },
        { name: 'Contributing Factors', prompt: 'What made this possible' },
        { name: 'Resolution', prompt: 'How the issue was fixed' },
        { name: 'Action Items', prompt: 'Preventive measures with owners' },
        { name: 'Lessons Learned', prompt: 'What could we do better' }
      ],
      severity: 'Major',
      status: 'Draft',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
  });
});

// Escalation analytics
app.get('/api/analytics', (req: Request, res: Response) => {
  res.json({
    overview: {
      totalEscalations: 45,
      avgResolutionTime: '4.5 hours',
      escalationRate: 8.5,
      topEscalationReasons: [
        { reason: 'Technical complexity', count: 18 },
        { reason: 'Enterprise customer', count: 12 },
        { reason: 'Extended resolution', count: 8 },
        { reason: 'Sentiment negative', count: 5 },
        { reason: 'Multi-escalation', count: 2 }
      ]
    },
    trends: {
      escalationVolume: [35, 38, 42, 40, 45],
      resolutionTime: [5.2, 4.8, 4.6, 4.7, 4.5],
      slaCompliance: [78, 82, 85, 84, 85]
    },
    byTeam: {
      technical: { escalations: 20, avgResolution: '6 hours', resolved: 18 },
      management: { escalations: 12, avgResolution: '3 hours', resolved: 11 },
      executive: { escalations: 8, avgResolution: '2 hours', resolved: 8 },
      crisis: { escalations: 5, avgResolution: '1 hour', resolved: 5 }
    },
    recommendations: [
      'Create more technical KB articles to reduce escalations',
      'Implement proactive monitoring for enterprise customers',
      'Add weekend coverage for critical issues'
    ]
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'escalation-manager',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Escalation Manager running on port ${PORT}`);
  console.log('Role: Handle complex issues, executive escalations, crisis management');
});

export default app;
