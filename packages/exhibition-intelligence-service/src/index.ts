/**
 * Exhibition Intelligence Service
 * Port 5049
 *
 * AI Copilots for Organizers, Exhibitors, and Visitors
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5049;
const SERVICE_NAME = 'exhibition-intelligence-service';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })],
});

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================
// DATA MODELS
// ============================================

interface OrganizerBriefing {
  exhibition_id: string;
  date: string;
  summary: {
    total_visitors: number;
    current_inside: number;
    exhibitors_active: number;
    leads_captured: number;
    hot_leads: number;
    sessions_today: number;
    peak_hours: string[];
  };
  insights: Insight[];
  alerts: Alert[];
  recommendations: Recommendation[];
  top_performers: TopPerformer[];
  predicted_metrics: PredictedMetrics;
  generated_at: string;
}

interface Insight {
  id: string;
  type: 'opportunity' | 'warning' | 'recommendation' | 'trend';
  title: string;
  description: string;
  metric_value?: number;
  confidence: number;
  actionable: boolean;
  category: string;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action_required: boolean;
  suggested_action?: string;
}

interface Recommendation {
  id: string;
  category: 'engagement' | 'revenue' | 'operations' | 'marketing';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  roi_estimate?: string;
  actionable_steps: string[];
}

interface TopPerformer {
  type: 'exhibitor' | 'booth' | 'session';
  id: string;
  name: string;
  metric: string;
  value: number;
}

interface PredictedMetrics {
  expected_visitors: number;
  peak_hours: string[];
  lead_generation: number;
  revenue: number;
  confidence: number;
}

interface ExhibitorInsights {
  exhibitor_id: string;
  company_name: string;
  lead_intelligence: {
    total: number;
    hot: number;
    warm: number;
    cold: number;
    qualified: number;
    converted: number;
    avg_response_time_hours: number;
    follow_up_rate: number;
  };
  top_leads: Lead[];
  recommendations: Recommendation[];
  predicted_conversion: {
    rate: number;
    estimated_value: number;
  };
  competitor_comparison?: {
    rank: number;
    total_exhibitors: number;
    percentile: number;
  };
  generated_at: string;
}

interface Lead {
  id: string;
  name: string;
  company: string;
  title: string;
  interests: string[];
  intent_level: 'hot' | 'warm' | 'cold';
  captured_at: string;
  follow_up_status: string;
  estimated_value?: number;
}

interface VisitorRecommendations {
  visitor_id: string;
  exhibition_id: string;
  personal_itinerary: ItineraryItem[];
  suggested_booths: BoothRecommendation[];
  suggested_sessions: SessionRecommendation[];
  suggested_connections: ConnectionSuggestion[];
  matched_interests: string[];
  generated_at: string;
}

interface ItineraryItem {
  time: string;
  title: string;
  type: 'booth' | 'session' | 'meeting' | 'networking';
  location: string;
  duration_minutes: number;
  relevance_score: number;
}

interface BoothRecommendation {
  booth_id: string;
  exhibitor_name: string;
  zone: string;
  reason: string;
  relevance_score: number;
  expected_dwell_time: number;
}

interface SessionRecommendation {
  session_id: string;
  title: string;
  speaker: string;
  reason: string;
  relevance_score: number;
  time: string;
}

interface ConnectionSuggestion {
  profile_id: string;
  name: string;
  company: string;
  title: string;
  common_interests: string[];
  relevance_score: number;
}

interface AIConversation {
  id: string;
  user_id: string;
  role: 'organizer' | 'exhibitor' | 'visitor';
  exhibition_id: string;
  messages: AIMessage[];
  created_at: string;
  updated_at: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Stores
const briefings = new Map<string, OrganizerBriefing>();
const conversations = new Map<string, AIConversation>();

// ============================================
// HEALTH
// ============================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: { briefings_generated: briefings.size, conversations: conversations.size },
  });
});

app.get('/health/live', (_req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', (_req, res) => res.json({ status: 'ready' }));

// ============================================
// ORGANIZER AI COPILOT
// ============================================

// Daily briefing
app.get('/api/organizer/:exhibitionId/briefing', (req, res) => {
  const { exhibitionId } = req.params;

  // Check cache
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `${exhibitionId}:${today}`;
  if (briefings.has(cacheKey)) {
    return res.json({ success: true, data: briefings.get(cacheKey) });
  }

  // Generate briefing
  const briefing: OrganizerBriefing = {
    exhibition_id: exhibitionId,
    date: today,
    summary: {
      total_visitors: Math.floor(Math.random() * 5000 + 1000),
      current_inside: Math.floor(Math.random() * 500 + 100),
      exhibitors_active: Math.floor(Math.random() * 30 + 10),
      leads_captured: Math.floor(Math.random() * 500 + 100),
      hot_leads: Math.floor(Math.random() * 50 + 10),
      sessions_today: Math.floor(Math.random() * 10 + 5),
      peak_hours: ['10:00-12:00', '14:00-16:00'],
    },
    insights: [
      {
        id: uuidv4(),
        type: 'trend',
        title: 'Rising Interest in AI Products',
        description: '47% of visitors are showing interest in AI/tech products. Consider highlighting these booths.',
        confidence: 85,
        actionable: true,
        category: 'engagement',
      },
      {
        id: uuidv4(),
        type: 'opportunity',
        title: 'Networking Peak Hour',
        description: 'Peak networking activity occurs between 11AM-1PM. Consider scheduling more B2B sessions.',
        confidence: 78,
        actionable: true,
        category: 'operations',
      },
      {
        id: uuidv4(),
        type: 'warning',
        title: 'Food Court Congestion',
        description: 'Food court is at 85% capacity during lunch hours. Consider expanding seating.',
        confidence: 92,
        actionable: true,
        category: 'operations',
      },
    ],
    alerts: [
      {
        id: uuidv4(),
        severity: 'warning',
        title: 'Hot Lead Follow-up Needed',
        description: '23 hot leads have not been followed up within 2 hours.',
        action_required: true,
        suggested_action: 'Send push notification to exhibitors to follow up now.',
      },
      {
        id: uuidv4(),
        severity: 'info',
        title: 'Session Attendance Alert',
        description: 'Keynote session is at 95% capacity. Consider live streaming.',
        action_required: false,
      },
    ],
    recommendations: [
      {
        id: uuidv4(),
        category: 'engagement',
        title: 'Launch Passport Challenge',
        description: 'Exhibitions with gamification see 45% higher engagement.',
        impact: 'high',
        effort: 'low',
        actionable_steps: ['Create 5 booth visit missions', 'Add coin rewards', 'Enable leaderboard'],
      },
      {
        id: uuidv4(),
        category: 'revenue',
        title: 'Premium Booth Upsell',
        description: '3 exhibitors have shown interest in premium positioning.',
        impact: 'medium',
        effort: 'low',
        actionable_steps: ['Send special offer to interested exhibitors', 'Offer early renewal discount'],
      },
      {
        id: uuidv4(),
        category: 'operations',
        title: 'Staff Optimization',
        description: 'Add 2 more staff at entry during peak hours.',
        impact: 'high',
        effort: 'low',
        actionable_steps: ['Review staffing schedule', 'Add temporary staff for 10AM-12PM'],
      },
    ],
    top_performers: [
      { type: 'exhibitor', id: 'EXP-001', name: 'TechCorp India', metric: 'leads', value: 87 },
      { type: 'exhibitor', id: 'EXP-002', name: 'Innovate Labs', metric: 'leads', value: 72 },
      { type: 'booth', id: 'BOOTH-A12', name: 'Samsung Display', metric: 'visitors', value: 342 },
      { type: 'session', id: 'SES-001', name: 'Future of AI Panel', metric: 'attendance', value: 156 },
    ],
    predicted_metrics: {
      expected_visitors: Math.floor(Math.random() * 2000 + 5000),
      peak_hours: ['11:00-12:00', '15:00-16:00'],
      lead_generation: Math.floor(Math.random() * 200 + 500),
      revenue: Math.floor(Math.random() * 500000 + 1000000),
      confidence: 85,
    },
    generated_at: new Date().toISOString(),
  };

  briefings.set(cacheKey, briefing);
  logger.info('Briefing generated', { exhibition_id: exhibitionId });

  res.json({ success: true, data: briefing });
});

// Revenue forecast
app.get('/api/organizer/:exhibitionId/forecast', (req, res) => {
  const { exhibitionId } = req.params;

  const forecast = {
    exhibition_id: exhibitionId,
    period: 'day',
    predictions: {
      visitors: { expected: 5200, range: [4500, 6000], confidence: 88 },
      leads: { expected: 450, range: [350, 550], confidence: 82 },
      revenue: { expected: 1250000, range: [1000000, 1500000], confidence: 75 },
    },
    factors: [
      'Weather forecast: Partly cloudy - positive',
      'Weekday vs weekend: Weekday - moderate traffic',
      'Marketing campaigns active: 3 campaigns',
      'Social media mentions: 1,240 (trending)',
    ],
    recommendations: [
      'Expected peak at 11AM - ensure adequate staff',
      'Rain probability 20% - prepare indoor activities',
      'Monday effect - consider extended hours',
    ],
    generated_at: new Date().toISOString(),
  };

  res.json({ success: true, data: forecast });
});

// Booth pricing recommendations
app.get('/api/organizer/:exhibitionId/booth-pricing', (req, res) => {
  const { exhibitionId } = req.params;

  const pricing = {
    exhibition_id: exhibitionId,
    zones: [
      { zone: 'Premium', price_per_sqft: 150, demand: 'high', recommended_adjustment: '+10%' },
      { zone: 'Standard', price_per_sqft: 100, demand: 'medium', recommended_adjustment: '0%' },
      { zone: 'Economy', price_per_sqft: 75, demand: 'low', recommended_adjustment: '-5%' },
      { zone: 'Startup Alley', price_per_sqft: 50, demand: 'high', recommended_adjustment: '+15%' },
    ],
    market_analysis: {
      competitors_avg: 120,
      your_avg: 95,
      position: 'competitive',
    },
    generated_at: new Date().toISOString(),
  };

  res.json({ success: true, data: pricing });
});

// ============================================
// EXHIBITOR AI COPILOT
// ============================================

// Exhibitor insights
app.get('/api/exhibitor/:exhibitorId/insights', (req, res) => {
  const { exhibitorId } = req.params;

  const insights: ExhibitorInsights = {
    exhibitor_id: exhibitorId,
    company_name: 'Exhibitor Corp',
    lead_intelligence: {
      total: Math.floor(Math.random() * 50 + 20),
      hot: Math.floor(Math.random() * 10 + 5),
      warm: Math.floor(Math.random() * 20 + 10),
      cold: Math.floor(Math.random() * 15 + 5),
      qualified: Math.floor(Math.random() * 10 + 3),
      converted: Math.floor(Math.random() * 5 + 1),
      avg_response_time_hours: Math.floor(Math.random() * 24 + 4),
      follow_up_rate: Math.floor(Math.random() * 30 + 60),
    },
    top_leads: [
      { id: 'L001', name: 'Rajesh Kumar', company: 'Infosys', title: 'CTO', interests: ['AI', 'Cloud'], intent_level: 'hot', captured_at: new Date().toISOString(), follow_up_status: 'new', estimated_value: 500000 },
      { id: 'L002', name: 'Priya Sharma', company: 'TCS', title: 'VP Engineering', interests: ['ML', 'Data'], intent_level: 'hot', captured_at: new Date().toISOString(), follow_up_status: 'contacted', estimated_value: 750000 },
      { id: 'L003', name: 'Amit Patel', company: 'Wipro', title: 'Director', interests: ['Automation'], intent_level: 'warm', captured_at: new Date().toISOString(), follow_up_status: 'new' },
    ],
    recommendations: [
      {
        id: uuidv4(),
        category: 'engagement',
        title: 'Follow Up Priority',
        description: '8 hot leads not yet contacted. Time-sensitive follow-up recommended.',
        impact: 'high',
        effort: 'low',
        actionable_steps: ['Review hot lead list', 'Schedule follow-up calls', 'Send personalized messages'],
      },
      {
        id: uuidv4(),
        category: 'engagement',
        title: 'Booth Optimization',
        description: 'Based on visitor interests, highlight your AI demo. 67% interested in live demos.',
        impact: 'high',
        effort: 'medium',
        actionable_steps: ['Set up live AI demo station', 'Add interactive element', 'Train team on demo script'],
      },
      {
        id: uuidv4(),
        category: 'marketing',
        title: 'Peak Hour Strategy',
        description: 'Your booth sees 3x more traffic at 11AM-1PM. Schedule important demos then.',
        impact: 'medium',
        effort: 'low',
        actionable_steps: ['Block 11AM-1PM for premium demos', 'Increase staff during peak'],
      },
    ],
    predicted_conversion: {
      rate: Math.floor(Math.random() * 15 + 10),
      estimated_value: Math.floor(Math.random() * 500000 + 200000),
    },
    competitor_comparison: {
      rank: Math.floor(Math.random() * 10 + 1),
      total_exhibitors: 45,
      percentile: 78,
    },
    generated_at: new Date().toISOString(),
  };

  res.json({ success: true, data: insights });
});

// Lead scoring
app.post('/api/exhibitor/:exhibitorId/lead-scoring', (req, res) => {
  const { exhibitorId } = req.params;
  const { leads } = req.body;

  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'leads array required' } });
  }

  const scoredLeads = leads.map(lead => {
    let score = 50; // Base score

    // Boost for positive signals
    if (lead.intent_level === 'hot') score += 30;
    else if (lead.intent_level === 'warm') score += 15;

    if (lead.company_size === 'large') score += 15;
    if (lead.title?.toLowerCase().includes('director') || lead.title?.toLowerCase().includes('vp')) score += 10;
    if (lead.interests?.includes('purchase')) score += 20;
    if (lead.engagement_score > 80) score += 15;

    // Reduce for negative signals
    if (lead.follow_up_status === 'lost') score -= 30;
    if (lead.days_since_contact > 7) score -= 10;

    return {
      ...lead,
      score: Math.min(100, Math.max(0, score)),
      priority: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
    };
  }).sort((a, b) => b.score - a.score);

  res.json({ success: true, data: { leads: scoredLeads, total: scoredLeads.length } });
});

// ============================================
// VISITOR AI COPILOT
// ============================================

// Personalized recommendations
app.get('/api/visitor/:visitorId/:exhibitionId/recommendations', (req, res) => {
  const { visitorId, exhibitionId } = req.params;

  const recommendations: VisitorRecommendations = {
    visitor_id: visitorId,
    exhibition_id: exhibitionId,
    personal_itinerary: [
      { time: '10:00', title: 'Visit TechCorp AI Booth', type: 'booth', location: 'Zone A, A-12', duration_minutes: 20, relevance_score: 95 },
      { time: '10:30', title: 'Product Demo: Cloud Platform', type: 'booth', location: 'Zone A, A-15', duration_minutes: 30, relevance_score: 88 },
      { time: '11:00', title: 'Keynote: Future of Enterprise AI', type: 'session', location: 'Main Hall', duration_minutes: 60, relevance_score: 92 },
      { time: '12:00', title: 'Lunch & Networking', type: 'networking', location: 'Food Court', duration_minutes: 45, relevance_score: 70 },
      { time: '13:00', title: 'Meeting with Infosys Team', type: 'meeting', location: 'Meeting Room 2', duration_minutes: 30, relevance_score: 98 },
    ],
    suggested_booths: [
      { booth_id: 'B001', exhibitor_name: 'TechCorp India', zone: 'AI Zone', reason: 'Matches your interest in AI/ML', relevance_score: 95, expected_dwell_time: 20 },
      { booth_id: 'B002', exhibitor_name: 'CloudFirst', zone: 'Cloud Zone', reason: 'Popular among IT leaders', relevance_score: 88, expected_dwell_time: 15 },
      { booth_id: 'B003', exhibitor_name: 'DataWorks', zone: 'Data Zone', reason: 'Complements your visit to TechCorp', relevance_score: 85, expected_dwell_time: 18 },
    ],
    suggested_sessions: [
      { session_id: 'S001', title: 'AI in Healthcare Panel', speaker: 'Dr. Smith', reason: 'Trending in your network', relevance_score: 90, time: '14:00' },
      { session_id: 'S002', title: 'Startup Pitch Competition', speaker: 'Various', reason: 'High-value networking opportunity', relevance_score: 82, time: '15:30' },
    ],
    suggested_connections: [
      { profile_id: 'P001', name: 'Vikram Singh', company: 'Reliance Jio', title: 'Head of Technology', common_interests: ['5G', 'IoT'], relevance_score: 88 },
      { profile_id: 'P002', name: 'Neha Kapoor', company: 'Flipkart', title: 'Senior Manager', common_interests: ['E-commerce', 'AI'], relevance_score: 82 },
    ],
    matched_interests: ['AI', 'Cloud Computing', 'Enterprise Software'],
    generated_at: new Date().toISOString(),
  };

  res.json({ success: true, data: recommendations });
});

// ============================================
// AI CONVERSATION (Chat with Genie)
// ============================================

app.post('/api/chat', (req, res) => {
  const { user_id, role, exhibition_id, message } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'user_id and message are required' } });
  }

  // Get or create conversation
  const convKey = `${user_id}:${exhibitionId || 'general'}`;
  let conversation = conversations.get(convKey);

  if (!conversation) {
    conversation = {
      id: `CONV-${uuidv4().substring(0, 8)}`,
      user_id,
      role: role || 'visitor',
      exhibition_id: exhibition_id || '',
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Add user message
  conversation.messages.push({
    id: uuidv4(),
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Generate AI response (mock)
  const responses = [
    `Based on your interests, I recommend visiting the AI Zone. 67% of exhibitors there match your profile.`,
    `You've visited 8 booths today. Top recommendation: CloudFirst booth - matches your interest in cloud infrastructure.`,
    `3 hot leads from your exhibitors haven't been followed up. I can help you prioritize them.`,
    `Your session attendance today was 85%. Tomorrow's keynote on "Future of Work" aligns well with your interests.`,
    `Current footfall is 3,200 visitors. Peak expected at 2PM. Great time to schedule follow-up meetings.`,
  ];

  const aiResponse = {
    id: uuidv4(),
    role: 'assistant',
    content: responses[Math.floor(Math.random() * responses.length)],
    timestamp: new Date().toISOString(),
  };

  conversation.messages.push(aiResponse);
  conversation.updated_at = new Date().toISOString();
  conversations.set(convKey, conversation);

  res.json({ success: true, data: { response: aiResponse, conversation_id: conversation.id } });
});

app.get('/api/chat/:conversationId', (req, res) => {
  const conversation = conversations.get(req.params.conversationId);
  if (!conversation) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
  res.json({ success: true, data: conversation });
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  logger.info(`🤖 Exhibition Intelligence Service started on port ${PORT}`);
});

export default app;