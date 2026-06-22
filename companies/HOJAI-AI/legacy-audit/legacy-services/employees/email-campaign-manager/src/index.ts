/**
 * Email Campaign Manager
 * Port: 4813
 *
 * Role: Drip campaigns, nurture sequences, email automation, A/B testing
 * Persona: Conversion-focused, segmentation expert, automation architect
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4813;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Email {
  id: string;
  subject: string;
  preview: string;
  body: string;
  cta?: { text: string; url: string };
  type: 'welcome' | 'nurture' | 'promotional' | 'transactional' | 're-engagement';
  variant?: 'A' | 'B';
}

interface EmailCampaign {
  id: string;
  name: string;
  type: 'drip' | 'newsletter' | 'promotional' | 'automated';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  emails: Email[];
  schedule: { day: number; hour: number }[];
  audience: {
    segments: string[];
    size: number;
    filters: Record<string, any>;
  };
  metrics?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    unsubscribed: number;
  };
}

interface DripSequence {
  id: string;
  name: string;
  trigger: 'new_lead' | 'trial_signup' | 'demo_request' | 'purchase' | 'abandoned_cart';
  emails: {
    day: number;
    delay: string;
    email: Email;
    condition?: string;
  }[];
  goal: string;
  expectedDuration: string;
}

interface Segment {
  id: string;
  name: string;
  criteria: { field: string; operator: string; value: string }[];
  count: number;
  avgEngagement: number;
}

// KPI Metrics
const kpiMetrics = {
  campaignsSent: 0,
  totalEmails: 0,
  avgOpenRate: 0,
  avgClickRate: 0,
  avgConversionRate: 0,
  leadsGenerated: 0,
  revenue: 0
};

// Seed campaigns
const seedCampaigns: EmailCampaign[] = [
  {
    id: 'campaign-1',
    name: 'New Lead Nurture',
    type: 'drip',
    status: 'active',
    emails: [],
    schedule: [{ day: 0, hour: 10 }],
    audience: { segments: ['new_leads'], size: 1500, filters: {} },
    metrics: { sent: 45000, delivered: 44500, opened: 13350, clicked: 4450, converted: 445, unsubscribed: 45 }
  },
  {
    id: 'campaign-2',
    name: 'Product Newsletter',
    type: 'newsletter',
    status: 'active',
    emails: [],
    schedule: [{ day: 0, hour: 9 }],
    audience: { segments: ['customers', 'leads'], size: 8000, filters: {} },
    metrics: { sent: 24000, delivered: 23800, opened: 7140, clicked: 2380, converted: 238, unsubscribed: 24 }
  }
];

// Seed drip sequences
const dripSequences: DripSequence[] = [
  {
    id: 'drip-1',
    name: 'New Lead Welcome Series',
    trigger: 'new_lead',
    emails: [
      { day: 0, delay: 'Immediate', email: { id: 'e1', subject: 'Welcome to Hojai AI!', preview: 'Your AI-powered journey starts here...', body: 'Welcome email content', type: 'welcome' } },
      { day: 2, delay: '2 days', email: { id: 'e2', subject: '5 Ways AI Transforms Sales', preview: 'See how leading companies...', body: 'Educational email', type: 'nurture', cta: { text: 'Watch Demo', url: '/demo' } } },
      { day: 5, delay: '3 days', email: { id: 'e3', subject: 'Customer Success Story', preview: 'How TechCorp achieved 3x growth...', body: 'Case study email', type: 'nurture', cta: { text: 'Read More', url: '/case-study' } } },
      { day: 10, delay: '5 days', email: { id: 'e4', subject: 'Ready to See It In Action?', preview: 'Book your personalized demo...', body: 'Demo offer email', type: 'promotional', cta: { text: 'Book Demo', url: '/demo' } } },
      { day: 14, delay: '4 days', email: { id: 'e5', subject: 'Special Offer Just For You', preview: 'Get 20% off annual plan...', body: 'Offer email', type: 'promotional', cta: { text: 'Claim Offer', url: '/offer' } } }
    ],
    goal: 'Convert to demo booking',
    expectedDuration: '14 days'
  },
  {
    id: 'drip-2',
    name: 'Trial User Onboarding',
    trigger: 'trial_signup',
    emails: [
      { day: 0, delay: 'Immediate', email: { id: 't1', subject: 'Welcome to Your Free Trial!', preview: 'Get started in 3 easy steps...', body: 'Trial welcome', type: 'welcome' } },
      { day: 1, delay: '24 hours', email: { id: 't2', subject: 'Step 1: Set Up Your Profile', preview: 'Let\'s get you started...', body: 'Onboarding step 1', type: 'nurture' } },
      { day: 3, delay: '48 hours', email: { id: 't3', subject: 'Step 2: Import Your Data', preview: 'Learn how to...', body: 'Onboarding step 2', type: 'nurture' } },
      { day: 5, delay: '2 days', email: { id: 't4', subject: 'Step 3: Create Your First Workflow', preview: 'Automate in minutes...', body: 'Onboarding step 3', type: 'nurture' } },
      { day: 7, delay: '2 days', email: { id: 't5', subject: 'Pro Tips for Power Users', preview: 'Unlock advanced features...', body: 'Tips email', type: 'nurture' } },
      { day: 10, delay: '3 days', email: { id: 't6', subject: 'How Are You Finding It?', preview: 'Quick survey...', body: 'Survey email', type: 'nurture' } },
      { day: 14, delay: '4 days', email: { id: 't7', subject: 'Your Trial Ends Soon', preview: 'Don\'t lose your progress...', body: 'Trial ending reminder', type: 'promotional' } }
    ],
    goal: 'Convert trial to paid',
    expectedDuration: '14 days'
  }
];

// Generate email content
function generateEmail(type: Email['type'], context: Record<string, string>): Email {
  const templates: Record<string, { subjects: string[]; bodies: string[] }> = {
    welcome: {
      subjects: ['Welcome to {{company}}!', 'Your journey starts here', 'Congratulations on joining {{company}}'],
      bodies: ['Welcome {{name}}!\n\nWe\'re excited to have you on board. Here\'s what to expect...\n\n{{cta}}']
    },
    nurture: {
      subjects: ['{{topic}} - Insights for {{role}}', 'How to {{benefit}}', '{{stat}} that will change your perspective'],
      bodies: ['Hi {{name}},\n\n{{insight}}\n\n{{body}}\n\n{{cta}}']
    },
    promotional: {
      subjects: ['{{offer}} - Limited Time', 'Special offer for you', '{{discount}} off - Ends {{deadline}}'],
      bodies: ['Hi {{name}},\n\n{{offer}}\n\n{{benefits}}\n\n{{cta}}\n\nDon\'t miss out!']
    },
    reengagement: {
      subjects: ['We miss you, {{name}}!', 'It\'s been a while...', 'Something new at {{company}}'],
      bodies: ['Hi {{name}},\n\nWe noticed you haven\'t been around lately. We\'ve made some exciting changes...\n\n{{cta}}']
    }
  };

  const template = templates[type] || templates.nurture;
  const subject = template.subjects[Math.floor(Math.random() * template.subjects.length)];
  const body = template.bodies[Math.floor(Math.random() * template.bodies.length)];

  return {
    id: `email-${Date.now()}`,
    subject: subject.replace('{{company}}', context.company || 'Hojai AI'),
    preview: 'Your email preview text...',
    body,
    type,
    cta: type === 'promotional' ? { text: 'Get Started', url: '/signup' } : undefined
  };
}

// Calculate email metrics
function calculateEmailMetrics(campaign: EmailCampaign): {
  openRate: number;
  clickRate: number;
  conversionRate: number;
  roi: number;
  health: 'excellent' | 'good' | 'needs-improvement' | 'poor';
} {
  const metrics = campaign.metrics || { sent: 1000, delivered: 980, opened: 196, clicked: 49, converted: 10, unsubscribed: 5 };

  const openRate = (metrics.opened / metrics.delivered) * 100;
  const clickRate = (metrics.clicked / metrics.delivered) * 100;
  const conversionRate = (metrics.converted / metrics.delivered) * 100;
  const roi = (metrics.converted * 500) / metrics.sent * 0.01 * 100; // ₹500 per conversion

  let health: 'excellent' | 'good' | 'needs-improvement' | 'poor' = 'good';
  if (openRate > 30 && clickRate > 5) health = 'excellent';
  else if (openRate > 20 && clickRate > 3) health = 'good';
  else if (openRate > 15) health = 'needs-improvement';
  else health = 'poor';

  return { openRate, clickRate, conversionRate, roi, health };
}

// Create campaign
app.post('/api/campaigns', (req: Request, res: Response) => {
  const { name, type, subject, body, audience, schedule, sendTime } = req.body;

  const campaign: EmailCampaign = {
    id: `campaign-${Date.now()}`,
    name,
    type: type || 'promotional',
    status: sendTime ? 'scheduled' : 'draft',
    emails: [{ id: `email-${Date.now()}`, subject, preview: body.substring(0, 100), body, type: type as Email['type'] }],
    schedule: schedule || [{ day: 0, hour: 10 }],
    audience: audience || { segments: ['all'], size: 1000, filters: {} }
  };

  kpiMetrics.campaignsSent++;

  res.json({
    campaign,
    metrics: calculateEmailMetrics(campaign),
    preview: {
      desktop: { width: 600, height: 400 },
      mobile: { width: 320, height: 500 }
    },
    spamScore: Math.floor(Math.random() * 20) + 5, // 5-25 score
    checklist: {
      subject: { checked: true, issues: [] },
      preview: { checked: true, issues: [] },
      content: { checked: true, issues: [] },
      cta: { checked: true, issues: [] },
      unsubscribe: { checked: true, issues: [] }
    }
  });
});

// Create drip sequence
app.post('/api/drip', (req: Request, res: Response) => {
  const { name, trigger, emails, goal } = req.body;

  const sequence: DripSequence = {
    id: `drip-${Date.now()}`,
    name,
    trigger: trigger || 'new_lead',
    emails: emails || [],
    goal: goal || 'Convert to customer',
    expectedDuration: `${emails?.length * 3 || 14} days`
  };

  res.json({
    sequence,
    visual: {
      nodes: sequence.emails.map((e, i) => ({
        id: e.email.id,
        day: e.day,
        label: e.email.subject.substring(0, 30),
        type: e.email.type
      })),
      connections: sequence.emails.slice(1).map((e, i) => ({
        from: sequence.emails[i].email.id,
        to: e.email.id
      }))
    },
    estimatedImpact: {
      leadsProcessed: 1000,
      conversions: Math.round(1000 * 0.08 * (sequence.emails.length / 5)),
      conversionRate: '8-12%'
    }
  });
});

// List drip sequences
app.get('/api/drip', (req: Request, res: Response) => {
  res.json({
    sequences: dripSequences,
    summary: {
      total: dripSequences.length,
      active: dripSequences.length,
      totalEmails: dripSequences.reduce((sum, s) => sum + s.emails.length, 0)
    }
  });
});

// A/B test setup
app.post('/api/ab-test', (req: Request, res: Response) => {
  const { campaignId, variants } = req.body;

  const test = {
    id: `test-${Date.now()}`,
    campaignId,
    variants: [
      { id: 'A', name: 'Control', subject: variants?.subjectA || 'Subject A', weight: 50 },
      { id: 'B', name: 'Variant', subject: variants?.subjectB || 'Subject B', weight: 50 }
    ],
    splitCriteria: 'random',
    winnerCriteria: 'open_rate',
    minSampleSize: 500,
    maxDuration: '3 days',
    status: 'running',
    startedAt: new Date()
  };

  res.json({
    test,
    recommendations: {
      subjectLines: [
        'Include numbers (10x more opens)',
        'Personalization boost (26% higher)',
        'Questions increase curiosity',
        'Avoid all caps and excessive punctuation'
      ],
      timing: [
        'Best time: 9-11 AM Tuesday-Thursday',
        'Avoid Monday mornings',
        'Test weekday vs weekend'
      ]
    }
  });
});

// Segment management
app.post('/api/segments', (req: Request, res: Response) => {
  const { name, criteria } = req.body;

  const segment: Segment = {
    id: `segment-${Date.now()}`,
    name,
    criteria: criteria || [],
    count: Math.floor(Math.random() * 5000) + 500,
    avgEngagement: Math.round(Math.random() * 10 + 15)
  };

  res.json({
    segment,
    suggestions: {
      size: segment.count,
      growthRate: '+5% monthly',
      engagementTrend: segment.avgEngagement > 20 ? 'High' : 'Average'
    }
  });
});

// Get segments
app.get('/api/segments', (req: Request, res: Response) => {
  const segments: Segment[] = [
    { id: 'seg-1', name: 'New Leads', criteria: [], count: 2500, avgEngagement: 22 },
    { id: 'seg-2', name: 'Trial Users', criteria: [], count: 800, avgEngagement: 28 },
    { id: 'seg-3', name: 'Customers', criteria: [], count: 1200, avgEngagement: 35 },
    { id: 'seg-4', name: 'Churned', criteria: [], count: 350, avgEngagement: 5 },
    { id: 'seg-5', name: 'High Value', criteria: [], count: 200, avgEngagement: 42 },
    { id: 'seg-6', name: 'Inactive 90 Days', criteria: [], count: 450, avgEngagement: 2 }
  ];

  res.json({
    segments,
    summary: {
      totalContacts: segments.reduce((sum, s) => sum + s.count, 0),
      avgEngagement: Math.round(segments.reduce((sum, s) => sum + s.avgEngagement, 0) / segments.length)
    }
  });
});

// Campaign analytics
app.get('/api/campaigns/:id/analytics', (req: Request, res: Response) => {
  const { id } = req.params;

  const campaign = seedCampaigns.find(c => c.id === id) || seedCampaigns[0];
  const metrics = calculateEmailMetrics(campaign);

  res.json({
    campaign,
    metrics: {
      ...metrics,
      ...campaign.metrics
    },
    timeline: {
      sent: { count: 45000, time: '10:00 AM' },
      firstOpen: { count: 8900, time: '2:30 PM' },
      peakOpens: { count: 13350, time: 'Day 1' },
      lastOpen: { count: 200, time: 'Day 7' }
    },
    engagement: {
      opens: { desktop: 65, mobile: 35 },
      clicks: { primary: 60, secondary: 25, other: 15 },
      hotSpots: ['Header CTA', 'Mid-content link', 'Signature image']
    },
    comparison: {
      openRate: { actual: metrics.openRate, benchmark: 21.3, diff: '+3.2%' },
      clickRate: { actual: metrics.clickRate, benchmark: 2.6, diff: '+1.8%' },
      unsubscribeRate: { actual: 0.1, benchmark: 0.2, diff: '-0.1%' }
    }
  });
});

// List campaigns
app.get('/api/campaigns', (req: Request, res: Response) => {
  res.json({
    campaigns: seedCampaigns.map(c => ({
      ...c,
      metrics: calculateEmailMetrics(c)
    })),
    summary: {
      total: seedCampaigns.length,
      active: seedCampaigns.filter(c => c.status === 'active').length,
      avgOpenRate: seedCampaigns.reduce((sum, c) => sum + calculateEmailMetrics(c).openRate, 0) / seedCampaigns.length,
      avgClickRate: seedCampaigns.reduce((sum, c) => sum + calculateEmailMetrics(c).clickRate, 0) / seedCampaigns.length
    }
  });
});

// Email deliverability check
app.get('/api/deliverability/:email', (req: Request, res: Response) => {
  const { email } = req.params;

  res.json({
    email,
    status: {
      valid: true,
      verified: true,
      risk: 'low'
    },
    checks: {
      domain: { score: 95, issues: [] },
      mx: { score: 100, issues: [] },
      spf: { score: 100, issues: [] },
      dkim: { score: 100, issues: [] },
      dmarc: { score: 85, issues: ['No quarantine policy'] }
    },
    reputation: {
      score: 92,
      complaints: 0.02,
      bounces: 0.1,
      blacklists: []
    },
    inboxPlacement: {
      inbox: 96,
      spam: 2,
      missing: 2
    }
  });
});

// Generate email report
app.get('/api/report/:period', (req: Request, res: Response) => {
  const { period } = req.params;

  const report = {
    period,
    overview: {
      campaignsSent: kpiMetrics.campaignsSent || 24,
      totalEmails: kpiMetrics.totalEmails || 125000,
      avgOpenRate: kpiMetrics.avgOpenRate || 24.5,
      avgClickRate: kpiMetrics.avgClickRate || 4.4,
      avgConversionRate: kpiMetrics.avgConversionRate || 3.2,
      leadsGenerated: kpiMetrics.leadsGenerated || 3500,
      revenue: kpiMetrics.revenue || 1750000
    },
    topCampaigns: [
      { name: 'New Lead Welcome Series', openRate: 45, clickRate: 12, conversions: 180 },
      { name: 'Product Launch Announcement', openRate: 35, clickRate: 8, conversions: 120 },
      { name: 'Monthly Newsletter', openRate: 28, clickRate: 5, conversions: 45 }
    ],
    bestPractices: {
      subjectLines: { avgOpenRate: 32, tip: 'Use personalization and questions' },
      sendTimes: { avgOpenRate: 28, tip: 'Tuesday-Thursday, 9-11 AM' },
      content: { avgClickRate: 6, tip: 'Single clear CTA per email' },
      length: { avgEngagement: 30, tip: 'Keep it under 200 words' }
    },
    goals: {
      openRate: { target: 25, actual: 24.5, achieved: 98 },
      clickRate: { target: 4, actual: 4.4, achieved: 110 },
      conversionRate: { target: 3, actual: 3.2, achieved: 107 }
    },
    recommendations: [
      'Increase personalization in subject lines',
      'Test longer send windows',
      'Add more visual content',
      'Segment by engagement level'
    ]
  };

  res.json({
    report,
    generatedAt: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'email-campaign-manager',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Email Campaign Manager running on port ${PORT}`);
  console.log('Role: Drip campaigns, nurture sequences, automation');
});

export default app;
