/**
 * HOJAI Board - AI C-Suite Advisory Board
 *
 * AI CEO, CFO, COO, CMO, CHRO for strategic decisions
 *
 * Port: 4870
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PORT || '4870', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-board';
const JWT_SECRET = process.env.JWT_SECRET || 'hojai-board-dev-secret-change-in-production';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

// ============================================
// MODELS
// ============================================

// Board Member
const BoardMemberSchema = new mongoose.Schema({
  memberId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  role: { type: String, enum: ['CEO', 'CFO', 'COO', 'CMO', 'CHRO', 'CUSTOM'], required: true },
  name: String,
  avatar: String,
  expertise: [String],
  decisions: { type: Number, default: 0 },
  accuracy: { type: Number, default: 95 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: Date
}, { timestamps: true });

// Meeting
const MeetingSchema = new mongoose.Schema({
  meetingId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  topic: String,
  question: String,
  context: mongoose.Schema.Types.Mixed,
  participants: [String],
  responses: [{
    memberId: String,
    role: String,
    name: String,
    position: String,
    confidence: Number,
    reasoning: String,
    data: mongoose.Schema.Types.Mixed,
    timestamp: Date
  }],
  consensus: String,
  recommendation: String,
  status: { type: String, enum: ['open', 'answered', 'archived'], default: 'open' },
  createdAt: Date,
  completedAt: Date
}, { timestamps: true });

// Decision
const DecisionSchema = new mongoose.Schema({
  decisionId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  meetingId: String,
  type: String,
  description: String,
  recommendation: String,
  rationale: String,
  impact: { type: String, enum: ['low', 'medium', 'high'] },
  timeline: String,
  metrics: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'implemented'], default: 'pending' },
  approvedBy: String,
  implementedAt: Date,
  results: mongoose.Schema.Types.Mixed,
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

const BoardMember = mongoose.model('BoardMember', BoardMemberSchema);
const Meeting = mongoose.model('Meeting', MeetingSchema);
const Decision = mongoose.model('Decision', DecisionSchema);

// ============================================
// BOARD RESPONSES (Mock AI Logic)
// ============================================

const BOARD_RESPONSES = {
  CEO: {
    expertise: ['strategy', 'vision', 'market expansion', 'funding', 'leadership'],
    defaultPosition: 'strategic_long_term',
    questions: ['market opportunity', 'competitive advantage', 'scalability', 'team capability']
  },
  CFO: {
    expertise: ['financial planning', 'budget', 'ROI', 'cash flow', 'investment'],
    defaultPosition: 'financial_safety',
    questions: ['cost', 'revenue impact', 'ROI timeline', 'risk adjusted']
  },
  COO: {
    expertise: ['operations', 'efficiency', 'process', 'scaling', 'quality'],
    defaultPosition: 'operational_readiness',
    questions: ['execution complexity', 'resource needs', 'timeline realistic', 'dependencies']
  },
  CMO: {
    expertise: ['marketing', 'brand', 'customer acquisition', 'engagement', 'growth'],
    defaultPosition: 'customer_centric',
    questions: ['market fit', 'customer segment', 'messaging', 'channel strategy']
  },
  CHRO: {
    expertise: ['talent', 'culture', 'leadership', 'organization', 'people'],
    defaultPosition: 'people_first',
    questions: ['team impact', 'culture fit', 'talent needed', 'leadership alignment']
  }
};

// ============================================
// AUTH
// ============================================

async function auth(req: Request, res: Response, next: Function) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  try {
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).tenantId = decoded.tenantId || decoded.tenant_id;
    next();
  } catch { res.status(401).json({ error: 'AUTH_INVALID' }); }
}

// ============================================
// HEALTH
// ============================================

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'hojai-board', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ============================================
// BOARD MEMBERS
// ============================================

// Get Board
app.get('/api/board', auth, async (req: Request, res: Response) => {
  try {
    const members = await BoardMember.find({ tenantId: (req as any).tenantId, status: 'active' });
    res.json({ success: true, data: members });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Add Board Member
app.post('/api/board/members', auth, async (req: Request, res: Response) => {
  try {
    const { role, name, expertise } = req.body;
    const memberId = `board_${uuid().slice(0, 8)}`;

    const member = new BoardMember({
      memberId,
      tenantId: (req as any).tenantId,
      role,
      name: name || `${role} AI`,
      expertise: expertise || BOARD_RESPONSES[role as keyof typeof BOARD_RESPONSES]?.expertise || []
    });

    await member.save();
    res.status(201).json({ success: true, data: member });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Remove Board Member
app.delete('/api/board/members/:id', auth, async (req: Request, res: Response) => {
  try {
    await BoardMember.findOneAndUpdate(
      { memberId: req.params.id, tenantId: (req as any).tenantId },
      { status: 'inactive' }
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// ASK THE BOARD
// ============================================

// Ask Question
app.post('/api/board/ask', auth, async (req: Request, res: Response) => {
  try {
    const { question, topic, context, participants } = req.body;
    const tenantId = (req as any).tenantId;

    // Get active board members
    const allMembers = await BoardMember.find({ tenantId, status: 'active' });
    const selectedMembers = participants?.length
      ? allMembers.filter(m => participants.includes(m.role))
      : allMembers;

    if (selectedMembers.length === 0) {
      return res.status(400).json({ error: 'NO_BOARD_MEMBERS' });
    }

    const meetingId = `mtg_${uuid().slice(0, 8)}`;

    // Generate AI responses
    const responses = selectedMembers.map(member => {
      const boardProfile = BOARD_RESPONSES[member.role as keyof typeof BOARD_RESPONSES];
      return generateResponse(member, question, topic, context, boardProfile);
    });

    // Determine consensus
    const consensus = generateConsensus(responses, question);

    const meeting = new Meeting({
      meetingId,
      tenantId,
      topic: topic || 'General',
      question,
      context,
      participants: selectedMembers.map(m => m.role),
      responses,
      consensus
    });

    await meeting.save();

    // Update member decision counts
    await BoardMember.updateMany(
      { memberId: { $in: selectedMembers.map(m => m.memberId) } },
      { $inc: { decisions: 1 } }
    );

    res.status(201).json({
      success: true,
      data: {
        meetingId,
        question,
        responses,
        consensus,
        recommendation: consensus.recommendation
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get Meeting
app.get('/api/board/meetings/:id', auth, async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findOne({
      meetingId: req.params.id,
      tenantId: (req as any).tenantId
    });

    if (!meeting) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: meeting });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// List Meetings
app.get('/api/board/meetings', auth, async (req: Request, res: Response) => {
  try {
    const { status, limit = 20 } = req.query;
    const filter: any = { tenantId: (req as any).tenantId };
    if (status) filter.status = status;

    const meetings = await Meeting.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    res.json({ success: true, data: meetings });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// DECISIONS
// ============================================

// Create Decision from Meeting
app.post('/api/decisions', auth, async (req: Request, res: Response) => {
  try {
    const { meetingId, type, description, recommendation, rationale, impact, timeline } = req.body;
    const tenantId = (req as any).tenantId;

    const decisionId = `dec_${uuid().slice(0, 8)}`;

    const decision = new Decision({
      decisionId,
      tenantId,
      meetingId,
      type: type || 'strategic',
      description,
      recommendation,
      rationale,
      impact: impact || 'medium',
      timeline: timeline || 'Q4 2026'
    });

    await decision.save();
    res.status(201).json({ success: true, data: decision });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Get Decisions
app.get('/api/decisions', auth, async (req: Request, res: Response) => {
  try {
    const { status, limit = 20 } = req.query;
    const filter: any = { tenantId: (req as any).tenantId };
    if (status) filter.status = status;

    const decisions = await Decision.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    res.json({ success: true, data: decisions });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Approve Decision
app.post('/api/decisions/:id/approve', auth, async (req: Request, res: Response) => {
  try {
    const decision = await Decision.findOneAndUpdate(
      { decisionId: req.params.id, tenantId: (req as any).tenantId },
      { status: 'approved', approvedBy: (req as any).userId },
      { new: true }
    );

    if (!decision) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: decision });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Implement Decision
app.post('/api/decisions/:id/implement', auth, async (req: Request, res: Response) => {
  try {
    const decision = await Decision.findOneAndUpdate(
      { decisionId: req.params.id, tenantId: (req as any).tenantId, status: 'approved' },
      { status: 'implemented', implementedAt: new Date() },
      { new: true }
    );

    if (!decision) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: decision });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// STRATEGIC QUESTIONS
// ============================================

// Should we expand to new market?
app.post('/api/board/strategic/market-expansion', auth, async (req: Request, res: Response) => {
  try {
    const { market, timeline, investment } = req.body;

    const response = await askStrategicQuestion(
      (req as any).tenantId,
      `Should we expand to ${market}?`,
      'market_expansion',
      { market, timeline, investment }
    );

    res.json({ success: true, data: response });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Should we hire?
app.post('/api/board/strategic/hiring', auth, async (req: Request, res: Response) => {
  try {
    const { role, department, salary, urgency } = req.body;

    const response = await askStrategicQuestion(
      (req as any).tenantId,
      `Should we hire ${role} for ${department}?`,
      'hiring',
      { role, department, salary, urgency }
    );

    res.json({ success: true, data: response });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Pricing decision
app.post('/api/board/strategic/pricing', auth, async (req: Request, res: Response) => {
  try {
    const { product, currentPrice, newPrice, reason } = req.body;

    const response = await askStrategicQuestion(
      (req as any).tenantId,
      `Should we change ${product} price from ${currentPrice} to ${newPrice}?`,
      'pricing',
      { product, currentPrice, newPrice, reason }
    );

    res.json({ success: true, data: response });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics', auth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    const [boardMembers, meetings, decisions] = await Promise.all([
      BoardMember.find({ tenantId, status: 'active' }),
      Meeting.find({ tenantId }),
      Decision.find({ tenantId })
    ]);

    const approvedDecisions = decisions.filter(d => d.status === 'approved' || d.status === 'implemented');

    res.json({
      success: true,
      data: {
        board: {
          total: boardMembers.length,
          byRole: boardMembers.reduce((acc: any, m) => {
            acc[m.role] = (acc[m.role] || 0) + 1;
            return acc;
          }, {})
        },
        meetings: {
          total: meetings.length,
          answered: meetings.filter(m => m.status === 'answered').length
        },
        decisions: {
          total: decisions.length,
          approved: approvedDecisions.length,
          implemented: decisions.filter(d => d.status === 'implemented').length
        }
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// HELPERS
// ============================================

function generateResponse(member: any, question: string, topic: string, context: any, profile: any) {
  const position = getPositionForQuestion(member.role, question, topic, profile);

  return {
    memberId: member.memberId,
    role: member.role,
    name: member.name,
    position,
    confidence: 75 + Math.random() * 20,
    reasoning: generateReasoning(member.role, question, position),
    data: {
      pros: generatePros(member.role, question),
      cons: generateCons(member.role, question),
      metrics: generateMetrics(member.role)
    },
    timestamp: new Date()
  };
}

function getPositionForQuestion(role: string, question: string, topic: string, profile: any): string {
  const q = question.toLowerCase();

  if (q.includes('expand') || q.includes('market') || q.includes('dubai')) {
    if (role === 'CEO') return 'strong_yes';
    if (role === 'CFO') return 'conditional_yes';
    if (role === 'COO') return 'needs_analysis';
  }

  if (q.includes('hire') || q.includes('hiring')) {
    if (role === 'CHRO') return 'qualified_yes';
    if (role === 'CFO') return 'budget_dependent';
    if (role === 'COO') return 'resource_needed';
  }

  if (q.includes('price') || q.includes('pricing')) {
    if (role === 'CFO') return 'revenue_impact_positive';
    if (role === 'CMO') return 'market_positioning';
    if (role === 'CEO') return 'competitive_advantage';
  }

  return profile.defaultPosition;
}

function generateReasoning(role: string, question: string, position: string): string {
  const reasonings: Record<string, string[]> = {
    CEO: [
      'Strategic alignment confirmed. Market opportunity is significant.',
      'Growth trajectory supports this decision.',
      'Long-term vision aligns with expansion goals.'
    ],
    CFO: [
      'Financial models show positive ROI within 18 months.',
      'Budget allocation is feasible.',
      'Risk-adjusted returns look favorable.'
    ],
    COO: [
      'Operations can support this initiative.',
      'Implementation timeline is realistic.',
      'Resource requirements are achievable.'
    ],
    CMO: [
      'Market timing is optimal.',
      'Customer demand validates this move.',
      'Brand positioning strengthens.'
    ],
    CHRO: [
      'Team can absorb this change.',
      'Culture supports growth.',
      'Talent strategy aligns.'
    ]
  };

  const options = reasonings[role] || ['Analysis complete.'];
  return options[Math.floor(Math.random() * options.length)];
}

function generatePros(role: string, question: string): string[] {
  const generic = [
    'Accelerates growth',
    'Strengthens market position',
    'Creates new revenue streams'
  ];
  return generic.slice(0, 2 + Math.floor(Math.random() * 2));
}

function generateCons(role: string, question: string): string[] {
  return [
    'Initial investment required',
    'Execution complexity'
  ];
}

function generateMetrics(role: string): any {
  return {
    impact: ['medium', 'high'][Math.floor(Math.random() * 2)],
    confidence: 80 + Math.floor(Math.random() * 15),
    risk: ['low', 'medium'][Math.floor(Math.random() * 2)]
  };
}

function generateConsensus(responses: any[], question: string): any {
  const positions = responses.map((r: any) => r.position);
  const yesVotes = positions.filter((p: string) => p.includes('yes') || p.includes('positive')).length;
  const total = responses.length;
  const yesRatio = yesVotes / total;

  let recommendation = 'PROCEED';
  let rationale = 'Board consensus supports this decision.';

  if (yesRatio < 0.4) {
    recommendation = 'RECONSIDER';
    rationale = 'Board recommends further analysis before proceeding.';
  } else if (yesRatio < 0.7) {
    recommendation = 'CONDITIONAL';
    rationale = 'Proceed with identified mitigations.';
  }

  return {
    votes: { yes: yesVotes, no: total - yesVotes, total },
    recommendation,
    rationale
  };
}

async function askStrategicQuestion(tenantId: string, question: string, type: string, context: any) {
  const members = await BoardMember.find({ tenantId, status: 'active' });

  const responses = members.map(member => {
    const profile = BOARD_RESPONSES[member.role as keyof typeof BOARD_RESPONSES];
    return generateResponse(member, question, type, context, profile);
  });

  const consensus = generateConsensus(responses, question);

  return { question, responses, consensus };
}

// ============================================
// START
// ============================================

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    // Seed default board if none exist
    const count = await BoardMember.countDocuments();
    if (count === 0) {
      await BoardMember.insertMany([
        { memberId: 'board_ceo', tenantId: 'demo', role: 'CEO', name: 'AI CEO', expertise: ['strategy', 'vision'] },
        { memberId: 'board_cfo', tenantId: 'demo', role: 'CFO', name: 'AI CFO', expertise: ['financial', 'planning'] },
        { memberId: 'board_coo', tenantId: 'demo', role: 'COO', name: 'AI COO', expertise: ['operations', 'efficiency'] },
        { memberId: 'board_cmo', tenantId: 'demo', role: 'CMO', name: 'AI CMO', expertise: ['marketing', 'growth'] },
        { memberId: 'board_chro', tenantId: 'demo', role: 'CHRO', name: 'AI CHRO', expertise: ['talent', 'culture'] }
      ]);
      console.log('Default board members seeded');
    }

    app.listen(PORT, () => {
      console.log(`\n╔═══════════════════════════════════════════════════╗
║           HOJAI BOARD v1.0.0
╠═══════════════════════════════════════════════════╣
║  Port:     ${PORT}
║  Features: AI CEO, CFO, COO, CMO, CHRO
╚═══════════════════════════════════════════════════╝\n`);
    });
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
}

start();

export default app;
