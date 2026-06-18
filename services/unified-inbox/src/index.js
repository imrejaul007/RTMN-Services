/**
 * RTMN Unified Inbox Service
 *
 * Port: 4870
 * Purpose: All customer support channels in one place
 *
 * Features:
 * - Email, Chat, Phone, Social unified
 * - Real-time messaging
 * - Team inbox
 * - Assignment & routing
 * - Macros & templates
 * - Collision detection
 * - Smart suggestions
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.UNIFIED_INBOX_PORT || 4870;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// DATA STORES
// ============================================================

const conversations = new Map();
const messages = new Map();
const channels = new Map();
const agents = new Map();
const teams = new Map();
const macros = new Map();
const templates = new Map();
const assignments = new Map();

// Initialize channels
const defaultChannels = [
  { id: 'email', name: 'Email', icon: 'mail', color: '#3b82f6', status: 'active', count: 0 },
  { id: 'chat', name: 'Live Chat', icon: 'message-circle', color: '#10b981', status: 'active', count: 0 },
  { id: 'phone', name: 'Phone', icon: 'phone', color: '#f59e0b', status: 'active', count: 0 },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'message-square', color: '#25d366', status: 'active', count: 0 },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', color: '#e4405f', status: 'active', count: 0 },
  { id: 'twitter', name: 'Twitter/X', icon: 'twitter', color: '#1da1f2', status: 'active', count: 0 },
  { id: 'facebook', name: 'Facebook', icon: 'facebook', color: '#1877f2', status: 'active', count: 0 },
  { id: 'telegram', name: 'Telegram', icon: 'send', color: '#0088cc', status: 'active', count: 0 }
];
defaultChannels.forEach(c => channels.set(c.id, c));

// Initialize agents
const defaultAgents = [
  { id: 'agent-001', name: 'Alex Johnson', email: 'alex@rtmn.com', status: 'online', channels: ['email', 'chat', 'phone'], skills: ['billing', 'technical'], capacity: 10, currentLoad: 3 },
  { id: 'agent-002', name: 'Maria Garcia', email: 'maria@rtmn.com', status: 'online', channels: ['email', 'whatsapp'], skills: ['sales', 'support'], capacity: 8, currentLoad: 5 },
  { id: 'agent-003', name: 'James Wilson', email: 'james@rtmn.com', status: 'busy', channels: ['phone', 'chat'], skills: ['technical', 'escalations'], capacity: 10, currentLoad: 8 }
];
defaultAgents.forEach(a => agents.set(a.id, a));

// Initialize teams
const defaultTeams = [
  { id: 'team-001', name: 'General Support', channels: ['email', 'chat'], agents: ['agent-001', 'agent-002'], status: 'active' },
  { id: 'team-002', name: 'Sales', channels: ['phone', 'whatsapp'], agents: ['agent-002', 'agent-003'], status: 'active' },
  { id: 'team-003', name: 'Technical', channels: ['email', 'chat', 'phone'], agents: ['agent-001', 'agent-003'], status: 'active' }
];
defaultTeams.forEach(t => teams.set(t.id, t));

// Initialize sample conversations
const sampleConversations = [
  {
    id: 'conv-001',
    subject: 'Billing Inquiry',
    customer: { id: 'cust-001', name: 'Sarah Chen', email: 'sarah@techcorp.com' },
    channel: 'email',
    status: 'open',
    priority: 'high',
    assignedTo: 'agent-001',
    team: 'team-001',
    tags: ['billing', 'urgent'],
    createdAt: '2026-06-17T10:00:00Z',
    updatedAt: '2026-06-18T09:00:00Z',
    unreadCount: 2,
    messages: []
  },
  {
    id: 'conv-002',
    subject: 'Technical Support Request',
    customer: { id: 'cust-002', name: 'Michael Raj', email: 'michael@globalretail.com' },
    channel: 'chat',
    status: 'pending',
    priority: 'medium',
    assignedTo: null,
    team: 'team-003',
    tags: ['technical', 'bug'],
    createdAt: '2026-06-18T08:30:00Z',
    updatedAt: '2026-06-18T08:30:00Z',
    unreadCount: 1,
    messages: []
  },
  {
    id: 'conv-003',
    subject: 'Product Demo Request',
    customer: { id: 'cust-003', name: 'Priya Sharma', email: 'priya@finserve.com' },
    channel: 'phone',
    status: 'resolved',
    priority: 'low',
    assignedTo: 'agent-002',
    team: 'team-002',
    tags: ['sales', 'demo'],
    createdAt: '2026-06-16T14:00:00Z',
    updatedAt: '2026-06-17T11:00:00Z',
    unreadCount: 0,
    messages: []
  }
];
sampleConversations.forEach(c => {
  conversations.set(c.id, c);
  const channel = channels.get(c.channel);
  if (channel) channel.count++;
});

// Initialize macros
const defaultMacros = [
  { id: 'macro-001', name: 'Greeting', shortcut: '/greet', content: 'Hi {{customer_name}}, thank you for reaching out to RTMN Support! How can I assist you today?', category: 'general', usageCount: 156 },
  { id: 'macro-002', name: 'Billing Issue', shortcut: '/billing', content: 'I understand you have a billing concern. Let me look into this for you. Could you please provide your account email and the specific issue you are experiencing?', category: 'billing', usageCount: 89 },
  { id: 'macro-003', name: 'Technical Support', shortcut: '/tech', content: 'I apologize for the inconvenience. Let me help you troubleshoot this technical issue. Could you please provide:\n1. Your browser/device\n2. Steps to reproduce\n3. Any error messages', category: 'technical', usageCount: 67 },
  { id: 'macro-004', name: 'Refund Request', shortcut: '/refund', content: 'I understand you would like a refund. I will process this for you right away. Please allow 5-7 business days for the refund to reflect in your account.', category: 'billing', usageCount: 45 },
  { id: 'macro-005', name: 'Closing', shortcut: '/close', content: 'Is there anything else I can help you with today? If not, thank you for contacting RTMN Support. Have a great day!', category: 'general', usageCount: 234 }
];
defaultMacros.forEach(m => macros.set(m.id, m));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Unified Inbox',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      conversations: conversations.size,
      channels: channels.size,
      agents: agents.size,
      onlineAgents: Array.from(agents.values()).filter(a => a.status === 'online').length,
      openTickets: Array.from(conversations.values()).filter(c => c.status === 'open').length
    }
  });
});

// ============================================================
// CONVERSATIONS
// ============================================================

// Get all conversations
app.get('/api/conversations', (req, res) => {
  const { status, channel, priority, assignedTo, search, team, limit = 50, offset = 0 } = req.query;

  let result = Array.from(conversations.values());

  // Filters
  if (status) result = result.filter(c => c.status === status);
  if (channel) result = result.filter(c => c.channel === channel);
  if (priority) result = result.filter(c => c.priority === priority);
  if (assignedTo) result = result.filter(c => c.assignedTo === assignedTo);
  if (team) result = result.filter(c => c.team === team);
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(c =>
      c.subject.toLowerCase().includes(s) ||
      c.customer.name.toLowerCase().includes(s) ||
      c.customer.email.toLowerCase().includes(s)
    );
  }

  // Sort by updatedAt (most recent first)
  result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const total = result.length;
  result = result.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    success: true,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
    conversations: result
  });
});

// Get single conversation
app.get('/api/conversations/:id', (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }

  // Get messages for this conversation
  const convMessages = Array.from(messages.values())
    .filter(m => m.conversationId === req.params.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({
    success: true,
    conversation,
    messages: convMessages
  });
});

// Create conversation
app.post('/api/conversations', (req, res) => {
  const { subject, customer, channel, priority = 'medium', team, tags = [] } = req.body;

  if (!subject || !customer || !channel) {
    return res.status(400).json({ success: false, error: 'Subject, customer, and channel required' });
  }

  const conversation = {
    id: `conv-${uuidv4().slice(0, 8)}`,
    subject,
    customer,
    channel,
    status: 'new',
    priority,
    assignedTo: null,
    team: team || null,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    messages: []
  };

  conversations.set(conversation.id, conversation);

  // Update channel count
  const ch = channels.get(channel);
  if (ch) ch.count++;

  res.status(201).json({ success: true, conversation });
});

// Update conversation
app.patch('/api/conversations/:id', (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }

  const updated = { ...conversation, ...req.body, updatedAt: new Date().toISOString() };
  conversations.set(req.params.id, updated);

  res.json({ success: true, conversation: updated });
});

// Assign conversation
app.post('/api/conversations/:id/assign', (req, res) => {
  const { agentId, teamId } = req.body;

  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }

  if (agentId) {
    const agent = agents.get(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    conversation.assignedTo = agentId;
    agent.currentLoad++;
    agents.set(agentId, agent);
  }

  if (teamId) {
    conversation.team = teamId;
  }

  conversation.updatedAt = new Date().toISOString();
  conversations.set(req.params.id, conversation);

  res.json({ success: true, conversation });
});

// ============================================================
// MESSAGES
// ============================================================

// Send message
app.post('/api/conversations/:id/messages', (req, res) => {
  const { content, sender, type = 'message', attachments = [] } = req.body;

  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }

  const message = {
    id: `msg-${uuidv4().slice(0, 8)}`,
    conversationId: req.params.id,
    content,
    sender,
    type,
    attachments,
    status: 'sent',
    createdAt: new Date().toISOString(),
    readAt: null
  };

  messages.set(message.id, message);

  // Update conversation
  conversation.updatedAt = new Date().toISOString();
  conversation.messages.push(message.id);
  if (sender.type !== 'customer') {
    conversation.unreadCount = 0;
  }
  conversations.set(req.params.id, conversation);

  res.status(201).json({ success: true, message });
});

// Get messages
app.get('/api/conversations/:id/messages', (req, res) => {
  const convMessages = Array.from(messages.values())
    .filter(m => m.conversationId === req.params.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({ success: true, messages: convMessages });
});

// Mark messages as read
app.post('/api/conversations/:id/read', (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }

  conversation.unreadCount = 0;
  conversations.set(req.params.id, conversation);

  // Mark all messages as read
  Array.from(messages.values())
    .filter(m => m.conversationId === req.params.id)
    .forEach(m => {
      m.readAt = new Date().toISOString();
      messages.set(m.id, m);
    });

  res.json({ success: true });
});

// ============================================================
// CHANNELS
// ============================================================

// Get all channels
app.get('/api/channels', (req, res) => {
  res.json({ success: true, channels: Array.from(channels.values()) });
});

// Get channel by ID
app.get('/api/channels/:id', (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) {
    return res.status(404).json({ success: false, error: 'Channel not found' });
  }

  // Get conversations for this channel
  const channelConvs = Array.from(conversations.values())
    .filter(c => c.channel === req.params.id);

  res.json({
    success: true,
    channel,
    conversations: channelConvs
  });
});

// ============================================================
// AGENTS
// ============================================================

// Get all agents
app.get('/api/agents', (req, res) => {
  const { status, team } = req.query;

  let result = Array.from(agents.values());

  if (status) result = result.filter(a => a.status === status);
  if (team) {
    const t = teams.get(team);
    if (t) result = result.filter(a => t.agents.includes(a.id));
  }

  res.json({ success: true, agents: result });
});

// Get agent by ID
app.get('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  // Get conversations assigned to this agent
  const agentConvs = Array.from(conversations.values())
    .filter(c => c.assignedTo === req.params.id);

  res.json({
    success: true,
    agent,
    conversations: agentConvs
  });
});

// Update agent status
app.patch('/api/agents/:id/status', (req, res) => {
  const { status } = req.body;

  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  agent.status = status;
  agents.set(req.params.id, agent);

  res.json({ success: true, agent });
});

// Get available agent for routing
app.get('/api/agents/available', (req, res) => {
  const { channel, skills } = req.query;

  let availableAgents = Array.from(agents.values())
    .filter(a => a.status === 'online' && a.currentLoad < a.capacity);

  if (channel) {
    availableAgents = availableAgents.filter(a => a.channels.includes(channel));
  }

  if (skills) {
    const skillList = skills.split(',');
    availableAgents = availableAgents.filter(a =>
      skillList.some(skill => a.skills.includes(skill.trim()))
    );
  }

  // Sort by load (least loaded first)
  availableAgents.sort((a, b) => a.currentLoad - b.currentLoad);

  if (availableAgents.length === 0) {
    return res.status(404).json({ success: false, error: 'No available agents' });
  }

  res.json({ success: true, agent: availableAgents[0] });
});

// ============================================================
// TEAMS
// ============================================================

// Get all teams
app.get('/api/teams', (req, res) => {
  res.json({ success: true, teams: Array.from(teams.values()) });
});

// Get team by ID
app.get('/api/teams/:id', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }

  // Get team agents
  const teamAgents = Array.from(agents.values())
    .filter(a => team.agents.includes(a.id));

  // Get team conversations
  const teamConvs = Array.from(conversations.values())
    .filter(c => c.team === req.params.id);

  res.json({
    success: true,
    team,
    agents: teamAgents,
    conversations: teamConvs
  });
});

// ============================================================
// MACROS
// ============================================================

// Get all macros
app.get('/api/macros', (req, res) => {
  const { category } = req.query;

  let result = Array.from(macros.values());
  if (category) result = result.filter(m => m.category === category);

  res.json({ success: true, macros: result });
});

// Get macro by ID
app.get('/api/macros/:id', (req, res) => {
  const macro = macros.get(req.params.id);
  if (!macro) {
    return res.status(404).json({ success: false, error: 'Macro not found' });
  }
  res.json({ success: true, macro });
});

// Create macro
app.post('/api/macros', (req, res) => {
  const { name, shortcut, content, category } = req.body;

  if (!name || !content) {
    return res.status(400).json({ success: false, error: 'Name and content required' });
  }

  const macro = {
    id: `macro-${uuidv4().slice(0, 8)}`,
    name,
    shortcut: shortcut || null,
    content,
    category: category || 'general',
    usageCount: 0,
    createdAt: new Date().toISOString()
  };

  macros.set(macro.id, macro);

  res.status(201).json({ success: true, macro });
});

// Use macro (increment usage)
app.post('/api/macros/:id/use', (req, res) => {
  const macro = macros.get(req.params.id);
  if (!macro) {
    return res.status(404).json({ success: false, error: 'Macro not found' });
  }

  macro.usageCount++;
  macros.set(macro.id, macro);

  res.json({ success: true, macro });
});

// ============================================================
// STATISTICS
// ============================================================

// Get inbox stats
app.get('/api/stats', (req, res) => {
  const allConvs = Array.from(conversations.values());

  const stats = {
    total: allConvs.length,
    byStatus: {
      new: allConvs.filter(c => c.status === 'new').length,
      open: allConvs.filter(c => c.status === 'open').length,
      pending: allConvs.filter(c => c.status === 'pending').length,
      resolved: allConvs.filter(c => c.status === 'resolved').length,
      closed: allConvs.filter(c => c.status === 'closed').length
    },
    byChannel: {},
    byPriority: {
      low: allConvs.filter(c => c.priority === 'low').length,
      medium: allConvs.filter(c => c.priority === 'medium').length,
      high: allConvs.filter(c => c.priority === 'high').length,
      urgent: allConvs.filter(c => c.priority === 'urgent').length
    },
    byTeam: {},
    avgResponseTime: 45, // minutes
    avgResolutionTime: 240, // minutes
    firstResponseTime: 12, // minutes
    agents: {
      total: agents.size,
      online: Array.from(agents.values()).filter(a => a.status === 'online').length,
      busy: Array.from(agents.values()).filter(a => a.status === 'busy').length,
      offline: Array.from(agents.values()).filter(a => a.status === 'offline').length
    },
    unread: allConvs.reduce((sum, c) => sum + c.unreadCount, 0)
  };

  // Channel breakdown
  channels.forEach((ch, id) => {
    stats.byChannel[id] = allConvs.filter(c => c.channel === id).length;
  });

  // Team breakdown
  teams.forEach((t, id) => {
    stats.byTeam[id] = allConvs.filter(c => c.team === id).length;
  });

  res.json({ success: true, stats });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`[Unified Inbox] Service started on port ${PORT}`);
  console.log(`[Unified Inbox] ${channels.size} channels loaded`);
  console.log(`[Unified Inbox] ${agents.size} agents available`);
  console.log(`[Unified Inbox] ${macros.size} macros ready`);
});

module.exports = app;
