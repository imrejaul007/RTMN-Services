/**
 * Sales Development Representative (SDR)
 * Port: 4801
 *
 * Role: Cold outreach, lead qualification, meeting scheduling
 * Persona: Persistent, data-driven, relationship-focused
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4801;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// KPI Metrics
const kpiMetrics = {
  leadsContacted: 0,
  qualifiedMeetings: 0,
  avgResponseRate: 0,
  emailsSent: 0,
  callsMade: 0,
  qualificationRate: 0
};

// Types
interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  industry: string;
  companySize: string;
  website?: string;
  linkedin?: string;
  source: string;
  score: number;
  stage: 'new' | 'contacted' | 'qualified' | 'unqualified';
  lastContact?: Date;
  nextAction?: string;
}

interface QualificationCriteria {
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
  fit: boolean;
}

// BANT qualification scoring
function scoreLead(lead: Partial<Lead>, criteria: Partial<QualificationCriteria>): number {
  let score = 0;

  // Company size scoring (BANT - Fit)
  const sizeScores: Record<string, number> = {
    '1-10': 20,
    '11-50': 40,
    '51-200': 70,
    '201-500': 85,
    '501-1000': 90,
    '1000+': 100
  };
  score += sizeScores[lead.companySize || ''] || 0;

  // Industry fit
  const highValueIndustries = ['SaaS', 'FinTech', 'Healthcare', 'E-commerce', 'Manufacturing'];
  if (highValueIndustries.includes(lead.industry || '')) {
    score += 50;
  }

  // BANT criteria bonus
  if (criteria.budget) score += 75;
  if (criteria.authority) score += 50;
  if (criteria.need) score += 100;
  if (criteria.timeline) score += 60;
  if (criteria.fit) score += 40;

  return Math.min(score, 100);
}

// Generate personalized cold email
function generateColdEmail(lead: Lead, senderName: string): string {
  const companyTaglines: Record<string, string> = {
    'SaaS': 'streamline operations and boost productivity',
    'FinTech': 'enhance security and compliance',
    'Healthcare': 'improve patient outcomes and reduce costs',
    'E-commerce': 'increase conversions and customer loyalty',
    'Retail': 'optimize inventory and omnichannel experience',
    'Manufacturing': 'reduce downtime and improve efficiency'
  };

  const painPoint = companyTaglines[lead.industry] || 'digital transformation';

  return `Hi ${lead.name.split(' ')[0]},

I noticed ${lead.company} is in the ${lead.industry} space, and I wanted to reach out because we help companies like yours ${painPoint}.

Most teams at ${lead.company}'s stage struggle with:
• Siloed data across departments
• Manual processes that slow growth
• Lack of visibility into key metrics

I'd love to show you how we've helped similar ${lead.industry} companies solve these challenges. Would you be open to a quick 15-minute call this week?

Best,
${senderName}`;
}

// Generate cold call script
function generateCallScript(lead: Lead): string {
  return `Opening: "Hi [Name], this is [Your Name] from Hojai AI. I'm reaching out because I noticed ${lead.company} is growing rapidly in the ${lead.industry} space, and I wanted to share how we've helped similar companies."

Value Prop: "We help B2B companies automate their sales and marketing workflows, typically saving 15-20 hours per week per team member."

Discovery Questions:
1. "What's your biggest challenge with ${lead.industry === 'SaaS' ? 'customer acquisition' : 'operational efficiency'} right now?"
2. "How is ${lead.company} currently handling [relevant process]?"
3. "What would an ideal solution look like for your team?"
4. "When are you looking to make a decision on this?"

Close: "Based on what you've shared, I think a quick demo would be valuable. Are you free [specific time] or [alternative time]?"`;
}

// Lead scoring endpoint
app.post('/api/leads/score', (req: Request, res: Response) => {
  const { lead, criteria } = req.body as { lead: Partial<Lead>, criteria: Partial<QualificationCriteria> };

  const score = scoreLead(lead, criteria);
  const qualified = score >= 60;

  kpiMetrics.leadsContacted++;
  if (qualified) kpiMetrics.qualificationRate = (kpiMetrics.qualificationRate * 0.9 + 1);

  res.json({
    leadId: lead.id,
    score,
    qualified,
    stage: qualified ? 'qualified' : 'unqualified',
    breakdown: {
      companySize: { weight: 25, score: lead.companySize ? score / 4 : 0 },
      industryFit: { weight: 15, score: lead.industry ? score / 6.67 : 0 },
      budget: { weight: 20, score: criteria.budget ? 20 : 0 },
      authority: { weight: 15, score: criteria.authority ? 15 : 0 },
      need: { weight: 15, score: criteria.need ? 15 : 0 },
      timeline: { weight: 10, score: criteria.timeline ? 10 : 0 }
    },
    recommendations: qualified ? [
      'Schedule discovery call within 24 hours',
      'Prepare case study for their industry',
      'Research their recent news/milestones'
    ] : [
      'Nurture with educational content',
      'Re-engage in 3 months',
      'Add to mailing list for updates'
    ]
  });
});

// Cold outreach generation
app.post('/api/outreach/email', (req: Request, res: Response) => {
  const { lead, senderName, template } = req.body as {
    lead: Lead,
    senderName: string,
    template?: 'standard' | 'personalized' | 'follow-up'
  };

  kpiMetrics.emailsSent++;

  const email = {
    subject: template === 'follow-up'
      ? `Following up on ${lead.company}`
      : `Quick question about ${lead.company}`,
    body: generateColdEmail(lead, senderName),
    preview: `Hi ${lead.name.split(' ')[0]}, I noticed ${lead.company}...`,
    cta: 'Schedule 15-min call',
    followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  };

  res.json({
    email,
    leadId: lead.id,
    status: 'draft',
    metrics: {
      estimatedOpenRate: lead.score > 70 ? 45 : 30,
      estimatedResponseRate: lead.score > 70 ? 15 : 8
    }
  });
});

// Cold call preparation
app.post('/api/outreach/call', (req: Request, res: Response) => {
  const { lead, callerName } = req.body as { lead: Lead, callerName: string };

  kpiMetrics.callsMade++;

  res.json({
    callScript: generateCallScript(lead),
    leadId: lead.id,
    callerName,
    talkingPoints: [
      `${lead.company} in ${lead.industry}`,
      `Company size: ${lead.companySize}`,
      `Pain point areas: workflow automation, data integration`,
      `Best call time: ${getBestCallTime(lead)}`
    ],
    objectionHandlers: {
      'no_time': "I completely understand. How about just 10 minutes? I have a specific idea that could help.",
      'not_interested': "I appreciate that. What would make this relevant for you?",
      'send_email': "Absolutely. I'll send a quick summary. What's the best email for you?"
    },
    nextSteps: [
      'Leave voicemail if no answer',
      'Send follow-up email same day',
      'Try call again in 2 days',
      'Add to nurture sequence'
    ]
  });
});

// Best time to contact
function getBestCallTime(lead: Lead): string {
  const industryCallPatterns: Record<string, string> = {
    'SaaS': 'Tuesday-Thursday, 10AM-12PM',
    'FinTech': 'Monday-Wednesday, 9AM-11AM',
    'Healthcare': 'Tuesday-Thursday, 2PM-4PM',
    'E-commerce': 'Monday, Wednesday, Friday, 9AM-10AM',
    'Manufacturing': 'Tuesday-Thursday, 8AM-10AM',
    'Retail': 'Friday, 11AM-1PM'
  };
  return industryCallPatterns[lead.industry] || 'Tuesday-Thursday, 10AM-12PM';
}

// Meeting scheduler
app.post('/api/meetings/schedule', (req: Request, res: Response) => {
  const { lead, meetingType, proposedTimes } = req.body as {
    lead: Lead,
    meetingType: 'discovery' | 'demo' | 'proposal' | 'negotiation',
    proposedTimes: string[]
  };

  const meetingDurations: Record<string, string> = {
    discovery: '30 minutes',
    demo: '45 minutes',
    proposal: '60 minutes',
    negotiation: '30 minutes'
  };

  kpiMetrics.qualifiedMeetings++;

  res.json({
    meetingId: `mtg-${Date.now()}`,
    leadId: lead.id,
    leadName: lead.name,
    leadEmail: lead.email,
    meetingType,
    duration: meetingDurations[meetingType],
    proposedSlots: proposedTimes.map(time => ({
      datetime: time,
      available: true,
      calendarLink: `https://cal.com/hojai/demo?date=${time}`
    })),
    confirmationEmail: {
      subject: `Meeting Confirmed: ${meetingType.charAt(0).toUpperCase() + meetingType.slice(1)} Call`,
      body: `Great speaking with you, ${lead.name}. Looking forward to our ${meetingType} call.`,
      calendarInvite: true
    }
  });
});

// Bulk lead import
app.post('/api/leads/import', (req: Request, res: Response) => {
  const { leads, source, scoringCriteria } = req.body as {
    leads: Partial<Lead>[],
    source: string,
    scoringCriteria: Partial<QualificationCriteria>
  };

  const scoredLeads = leads.map(lead => {
    const score = scoreLead(lead, scoringCriteria);
    return {
      ...lead,
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      score,
      qualified: score >= 60,
      stage: score >= 60 ? 'qualified' : 'new',
      source,
      createdAt: new Date().toISOString()
    };
  });

  const qualified = scoredLeads.filter(l => l.qualified);
  const unqualified = scoredLeads.filter(l => !l.qualified);

  res.json({
    totalImported: scoredLeads.length,
    qualified: qualified.length,
    unqualified: unqualified.length,
    qualifiedLeads: qualified,
    priorityQueue: qualified.sort((a, b) => b.score - a.score).slice(0, 10),
    recommendations: {
      immediate: qualified.slice(0, 5).map(l => l.id),
      thisWeek: qualified.slice(0, 20).map(l => l.id),
      nurtureSequence: unqualified.map(l => l.id)
    }
  });
});

// Outreach sequence
app.post('/api/outreach/sequence', (req: Request, res: Response) => {
  const { lead, sequenceType } = req.body as {
    lead: Lead,
    sequenceType: 'hot' | 'warm' | 'cold'
  };

  const sequences: Record<string, any[]> = {
    hot: [
      { day: 0, action: 'email', subject: 'Quick intro', delay: 'immediate' },
      { day: 2, action: 'call', subject: 'Follow-up call' },
      { day: 3, action: 'linkedin', subject: 'LinkedIn connection' },
      { day: 5, action: 'email', subject: 'Case study', delay: '48h' },
      { day: 7, action: 'call', subject: 'Final follow-up' }
    ],
    warm: [
      { day: 0, action: 'email', subject: 'Intro email', delay: 'immediate' },
      { day: 4, action: 'email', subject: 'Value prop', delay: '96h' },
      { day: 10, action: 'linkedin', subject: 'Engage on content' },
      { day: 14, action: 'email', subject: 'Break-up email' }
    ],
    cold: [
      { day: 0, action: 'email', subject: 'Cold email #1' },
      { day: 3, action: 'email', subject: 'Cold email #2' },
      { day: 7, action: 'linkedin', subject: 'Connection request' },
      { day: 14, action: 'email', subject: 'Final attempt' },
      { day: 21, action: 'nurture', subject: 'Move to nurture' }
    ]
  };

  res.json({
    leadId: lead.id,
    sequenceType,
    steps: sequences[sequenceType],
    totalDays: Math.max(...sequences[sequenceType].map(s => s.day)) + 1,
    expectedResponseRate: sequenceType === 'hot' ? 35 : sequenceType === 'warm' ? 20 : 8
  });
});

// SDR Dashboard / KPIs
app.get('/api/kpis', (req: Request, res: Response) => {
  res.json({
    metrics: {
      leadsContacted: kpiMetrics.leadsContacted,
      qualifiedMeetings: kpiMetrics.qualifiedMeetings,
      avgResponseRate: kpiMetrics.avgResponseRate.toFixed(2) + '%',
      emailsSent: kpiMetrics.emailsSent,
      callsMade: kpiMetrics.callsMade,
      qualificationRate: kpiMetrics.qualificationRate.toFixed(2) + '%',
      meetingToCloseRate: '28%', // Industry benchmark
      avgDealSize: '₹2,50,000',
      costPerLead: '₹150'
    },
    targets: {
      leadsPerDay: 50,
      qualifiedPerDay: 15,
      meetingsPerWeek: 10,
      responseRateTarget: '20%'
    },
    performance: {
      efficiency: kpiMetrics.callsMade > 0
        ? ((kpiMetrics.emailsSent + kpiMetrics.callsMade) / kpiMetrics.leadsContacted).toFixed(2)
        : '0',
      effectiveness: kpiMetrics.qualifiedMeetings > 0
        ? (kpiMetrics.qualifiedMeetings / kpiMetrics.leadsContacted * 100).toFixed(2) + '%'
        : '0%'
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'sales-development-rep',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Sales Development Rep running on port ${PORT}`);
  console.log('Role: Cold outreach, lead qualification, meeting scheduling');
});

export default app;
