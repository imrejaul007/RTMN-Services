/**
 * StayOwn Corporate & Group Booking Service
 *
 * Hotel corporate accounts and group booking management
 *
 * Features:
 * - Corporate accounts
 * - Travel agent profiles
 * - Group reservations
 * - Block bookings
 * - Corporate rates
 * - Account management
 *
 * Port: 6030
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 6030;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// DATA STORES
// ============================================

// Corporate accounts
const corporateAccounts = new Map();

// Travel agents
const travelAgents = new Map();

// Group bookings
const groupBookings = new Map();

// Room blocks
const roomBlocks = new Map();

// Corporate contacts
const contacts = new Map();

// Rate agreements
const rateAgreements = new Map();

// Commission records
const commissions = new Map();

// ============================================
// AUTHENTICATION
// ============================================

const authUsers = new Map();
const authSessions = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  const user = { id: 'user_' + Date.now(), businessId, email, passwordHash: hashPassword(password), role: 'corporate_admin', createdAt: new Date().toISOString() };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, role: user.role });
  res.json({ token, user: { id: user.id, email } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId: user.businessId, role: user.role });
  res.json({ token, user: { id: user.id, email } });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============================================
// CORPORATE ACCOUNTS
// ============================================

// Get corporate accounts
app.get('/api/corporate/accounts', requireAuth, (req, res) => {
  const { status, industry, search } = req.query;
  const businessId = req.session.businessId;

  let accounts = Array.from(corporateAccounts.values()).filter(a => a.businessId === businessId);

  if (status) accounts = accounts.filter(a => a.status === status);
  if (industry) accounts = accounts.filter(a => a.industry === industry);
  if (search) {
    const s = search.toLowerCase();
    accounts = accounts.filter(a => a.companyName.toLowerCase().includes(s) || a.accountCode?.toLowerCase().includes(s));
  }

  accounts.sort((a, b) => b.totalRevenue - a.totalRevenue);

  res.json({ accounts, count: accounts.length });
});

// Create corporate account
app.post('/api/corporate/accounts', requireAuth, (req, res) => {
  const { companyName, accountCode, industry, address, website, taxId, creditLimit, paymentTerms } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: 'companyName required' });
  }

  const businessId = req.session.businessId;
  const accountId = 'corp_' + Date.now();
  const accountNumber = 'CA' + Date.now().toString().slice(-8);

  const account = {
    id: accountId,
    businessId,
    accountNumber,
    accountCode: accountCode || accountNumber,
    companyName,
    industry,
    address,
    website,
    taxId,
    creditLimit: creditLimit || 0,
    paymentTerms: paymentTerms || 'net_30', // net_15, net_30, net_45, net_60
    tier: 'standard', // standard, preferred, vip
    status: 'active', // active, on_hold, closed
    primaryContact: null,
    contacts: [],
    totalBookings: 0,
    totalRevenue: 0,
    totalRoomsNights: 0,
    avgRate: 0,
    lastBooking: null,
    agreements: [],
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  corporateAccounts.set(accountId, account);
  res.status(201).json(account);
});

// Get single corporate account
app.get('/api/corporate/accounts/:id', requireAuth, (req, res) => {
  const account = corporateAccounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  // Get associated group bookings
  const groupBookingList = Array.from(groupBookings.values()).filter(g => g.corporateAccountId === account.id);
  const contactsList = Array.from(contacts.values()).filter(c => c.accountId === account.id);

  res.json({ ...account, groupBookings: groupBookingList, contacts: contactsList });
});

// Update corporate account
app.patch('/api/corporate/accounts/:id', requireAuth, (req, res) => {
  const account = corporateAccounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const allowedUpdates = ['companyName', 'industry', 'address', 'website', 'taxId', 'creditLimit', 'paymentTerms', 'tier', 'status'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      account[field] = req.body[field];
    }
  });
  account.updatedAt = new Date().toISOString();

  corporateAccounts.set(account.id, account);
  res.json(account);
});

// Add contact to account
app.post('/api/corporate/accounts/:id/contacts', requireAuth, (req, res) => {
  const { name, email, phone, title, department, isPrimary, bookingAuthority } = req.body;

  const account = corporateAccounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const contactId = 'contact_' + Date.now();
  const contact = {
    id: contactId,
    accountId: account.id,
    name,
    email,
    phone,
    title,
    department,
    isPrimary: isPrimary || account.contacts.length === 0,
    bookingAuthority: bookingAuthority || 'standard', // standard, full, limited
    status: 'active',
    createdAt: new Date().toISOString()
  };

  contacts.set(contactId, contact);
  account.contacts.push(contactId);

  if (contact.isPrimary) {
    account.primaryContact = contactId;
  }

  corporateAccounts.set(account.id, account);
  res.status(201).json(contact);
});

// ============================================
// RATE AGREEMENTS
// ============================================

// Create rate agreement
app.post('/api/corporate/accounts/:id/agreements', requireAuth, (req, res) => {
  const { name, roomTypes, rates, discount, validFrom, validUntil, blackoutDates, policy } = req.body;

  const account = corporateAccounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const agreementId = 'agr_' + Date.now();
  const agreement = {
    id: agreementId,
    accountId: account.id,
    name: name || 'Standard Corporate Rate',
    roomTypes: roomTypes || ['rt_standard', 'rt_deluxe'],
    rates: rates || {},
    discount: discount || 15, // percentage
    validFrom: validFrom || new Date().toISOString(),
    validUntil: validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    blackoutDates: blackoutDates || [],
    policy: policy || 'Standard cancellation policy applies',
    status: 'active', // active, expired, terminated
    totalRevenue: 0,
    totalBookings: 0,
    createdAt: new Date().toISOString(),
    createdBy: req.session.email
  };

  rateAgreements.set(agreementId, agreement);
  account.agreements.push(agreementId);
  corporateAccounts.set(account.id, account);

  res.status(201).json(agreement);
});

// Get agreements for account
app.get('/api/corporate/accounts/:id/agreements', requireAuth, (req, res) => {
  const account = corporateAccounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const agreements = account.agreements.map(id => rateAgreements.get(id)).filter(Boolean);
  res.json({ agreements });
});

// ============================================
// TRAVEL AGENTS
// ============================================

// Get travel agents
app.get('/api/travel-agents', requireAuth, (req, res) => {
  const { status } = req.query;
  const businessId = req.session.businessId;

  let agents = Array.from(travelAgents.values()).filter(a => a.businessId === businessId);
  if (status) agents = agents.filter(a => a.status === status);

  res.json({ agents, count: agents.length });
});

// Create travel agent
app.post('/api/travel-agents', requireAuth, (req, res) => {
  const { agencyName, agentName, email, phone, address, iataNumber, commissionRate } = req.body;

  if (!agencyName || !agentName || !email) {
    return res.status(400).json({ error: 'agencyName, agentName, email required' });
  }

  const businessId = req.session.businessId;
  const agentId = 'ta_' + Date.now();
  const agentCode = 'TA' + Date.now().toString().slice(-8);

  const agent = {
    id: agentId,
    businessId,
    agentCode,
    agencyName,
    agentName,
    email,
    phone,
    address,
    iataNumber,
    commissionRate: commissionRate || 10, // percentage
    tier: 'standard', // standard, preferred, elite
    status: 'active', // active, suspended, closed
    totalBookings: 0,
    totalRevenue: 0,
    totalCommission: 0,
    pendingCommission: 0,
    bookings: [],
    createdAt: new Date().toISOString()
  };

  travelAgents.set(agentId, agent);
  res.status(201).json(agent);
});

// Get single agent
app.get('/api/travel-agents/:id', requireAuth, (req, res) => {
  const agent = travelAgents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const bookingList = Array.from(groupBookings.values()).filter(g => g.travelAgentId === agent.id);
  res.json({ ...agent, bookings: bookingList });
});

// Update agent
app.patch('/api/travel-agents/:id', requireAuth, (req, res) => {
  const agent = travelAgents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  Object.assign(agent, req.body);
  travelAgents.set(agent.id, agent);
  res.json(agent);
});

// ============================================
// GROUP BOOKINGS
// ============================================

// Get group bookings
app.get('/api/group-bookings', requireAuth, (req, res) => {
  const { status, corporateAccountId, fromDate, toDate } = req.query;
  const businessId = req.session.businessId;

  let bookings = Array.from(groupBookings.values()).filter(g => g.businessId === businessId);

  if (status) bookings = bookings.filter(g => g.status === status);
  if (corporateAccountId) bookings = bookings.filter(g => g.corporateAccountId === corporateAccountId);
  if (fromDate) bookings = bookings.filter(g => g.checkIn >= fromDate);
  if (toDate) bookings = bookings.filter(g => g.checkOut <= toDate);

  bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ bookings, count: bookings.length });
});

// Create group booking inquiry
app.post('/api/group-bookings', requireAuth, (req, res) => {
  const { corporateAccountId, travelAgentId, groupName, eventType, contact, rooms, checkIn, checkOut, meetingRooms, specialRequirements } = req.body;

  if (!checkIn || !checkOut || !rooms) {
    return res.status(400).json({ error: 'checkIn, checkOut, rooms required' });
  }

  const businessId = req.session.businessId;
  const bookingId = 'grp_' + Date.now();
  const bookingRef = 'GRP' + Date.now().toString().slice(-6);

  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

  const booking = {
    id: bookingId,
    businessId,
    bookingRef,
    corporateAccountId,
    travelAgentId,
    groupName,
    eventType: eventType || 'meeting',
    contact,
    rooms: {
      total: rooms.total || rooms.rooms?.length || 0,
      breakdown: rooms.breakdown || [],
      blockId: null
    },
    checkIn,
    checkOut,
    nights,
    meetingRooms: meetingRooms || [],
    specialRequirements,
    status: 'inquiry', // inquiry, quote_sent, confirmed, contracted, in_progress, completed, cancelled
    estimatedRevenue: 0,
    actualRevenue: 0,
    roomBlock: null,
    discount: 0,
    contractId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  groupBookings.set(bookingId, booking);
  res.status(201).json(booking);
});

// Get single group booking
app.get('/api/group-bookings/:id', requireAuth, (req, res) => {
  const booking = groupBookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Group booking not found' });

  const corporate = booking.corporateAccountId ? corporateAccounts.get(booking.corporateAccountId) : null;
  const agent = booking.travelAgentId ? travelAgents.get(booking.travelAgentId) : null;

  res.json({ ...booking, corporate, agent });
});

// Update group booking
app.patch('/api/group-bookings/:id', requireAuth, (req, res) => {
  const booking = groupBookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Group booking not found' });

  Object.assign(booking, req.body);
  booking.updatedAt = new Date().toISOString();
  groupBookings.set(booking.id, booking);

  res.json(booking);
});

// Quote group booking
app.post('/api/group-bookings/:id/quote', requireAuth, (req, res) => {
  const { roomRates, meetingRoomRates, packagePrice, discount, notes } = req.body;

  const booking = groupBookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Group booking not found' });

  // Calculate totals
  let roomTotal = 0;
  const roomBreakdown = booking.rooms.breakdown.map(r => {
    const rate = roomRates?.[r.type] || r.rate || 150;
    const total = rate * booking.nights * r.quantity;
    roomTotal += total;
    return { ...r, rate, total };
  });

  let meetingTotal = 0;
  if (meetingRoomRates) {
    meetingTotal = Object.values(meetingRoomRates).reduce((sum, r) => sum + r, 0);
  }

  const subtotal = roomTotal + meetingTotal + (packagePrice || 0);
  const discountAmount = discount || 0;
  const discountPercent = booking.rooms.discount || 0;
  const totalDiscount = discountAmount + (subtotal * discountPercent / 100);
  const finalTotal = subtotal - totalDiscount;
  const tax = finalTotal * 0.1;
  const grandTotal = finalTotal + tax;

  booking.pricing = {
    roomBreakdown,
    roomTotal,
    meetingRoomRates,
    meetingTotal,
    packagePrice: packagePrice || 0,
    subtotal,
    discountAmount,
    discountPercent,
    totalDiscount,
    finalTotal,
    tax,
    grandTotal
  };

  booking.estimatedRevenue = grandTotal;
  booking.status = 'quote_sent';
  booking.quoteValidUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  booking.quoteNotes = notes;
  booking.updatedAt = new Date().toISOString();

  groupBookings.set(booking.id, booking);
  res.json(booking);
});

// Confirm group booking
app.post('/api/group-bookings/:id/confirm', requireAuth, (req, res) => {
  const booking = groupBookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Group booking not found' });

  if (!booking.pricing) {
    return res.status(400).json({ error: 'Please generate a quote first' });
  }

  booking.status = 'confirmed';
  booking.confirmedAt = new Date().toISOString();
  booking.confirmedBy = req.session.email;
  booking.updatedAt = new Date().toISOString();

  // Update corporate account stats
  if (booking.corporateAccountId) {
    const account = corporateAccounts.get(booking.corporateAccountId);
    if (account) {
      account.totalBookings++;
      account.totalRevenue += booking.estimatedRevenue;
      account.lastBooking = booking.checkIn;
      corporateAccounts.set(account.id, account);
    }
  }

  // Update travel agent stats
  if (booking.travelAgentId) {
    const agent = travelAgents.get(booking.travelAgentId);
    if (agent) {
      agent.totalBookings++;
      agent.totalRevenue += booking.estimatedRevenue;
      agent.pendingCommission += booking.estimatedRevenue * (agent.commissionRate / 100);
      travelAgents.set(agent.id, agent);
    }
  }

  groupBookings.set(booking.id, booking);
  res.json(booking);
});

// Cancel group booking
app.post('/api/group-bookings/:id/cancel', requireAuth, (req, res) => {
  const { reason, cancellationCharges } = req.body;

  const booking = groupBookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Group booking not found' });

  booking.status = 'cancelled';
  booking.cancellationReason = reason;
  booking.cancellationCharges = cancellationCharges || 0;
  booking.cancelledAt = new Date().toISOString();
  booking.cancelledBy = req.session.email;
  booking.updatedAt = new Date().toISOString();

  // Release room block
  if (booking.roomBlockId) {
    const block = roomBlocks.get(booking.roomBlockId);
    if (block) {
      block.status = 'released';
      block.releasedAt = new Date().toISOString();
      roomBlocks.set(block.id, block);
    }
  }

  groupBookings.set(booking.id, booking);
  res.json(booking);
});

// ============================================
// ROOM BLOCKS
// ============================================

// Create room block
app.post('/api/room-blocks', requireAuth, (req, res) => {
  const { groupBookingId, rooms, checkIn, checkOut, cutOffDate, releasePercentage } = req.body;

  if (!groupBookingId || !rooms || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'groupBookingId, rooms, checkIn, checkOut required' });
  }

  const groupBooking = groupBookings.get(groupBookingId);
  if (!groupBooking) return res.status(404).json({ error: 'Group booking not found' });

  const blockId = 'block_' + Date.now();
  const block = {
    id: blockId,
    groupBookingId,
    bookingRef: groupBooking.bookingRef,
    rooms,
    checkIn,
    checkOut,
    nights: groupBooking.nights,
    cutOffDate: cutOffDate || new Date(new Date(checkIn).getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days before
    releasePercentage: releasePercentage || 20, // % to release if not filled
    blocked: rooms.reduce((sum, r) => sum + r.quantity, 0),
    booked: 0,
    available: rooms.reduce((sum, r) => sum + r.quantity, 0),
    status: 'active', // active, released, expired, converted
    createdAt: new Date().toISOString()
  };

  roomBlocks.set(blockId, block);
  groupBooking.roomBlockId = blockId;
  groupBookings.set(groupBooking.id, groupBooking);

  res.status(201).json(block);
});

// Get room blocks
app.get('/api/room-blocks', requireAuth, (req, res) => {
  const { status, groupBookingId } = req.query;

  let blocks = Array.from(roomBlocks.values());
  if (status) blocks = blocks.filter(b => b.status === status);
  if (groupBookingId) blocks = blocks.filter(b => b.groupBookingId === groupBookingId);

  res.json({ blocks });
});

// Release rooms from block
app.post('/api/room-blocks/:id/release', requireAuth, (req, res) => {
  const { roomType, quantity, reason } = req.body;

  const block = roomBlocks.get(req.params.id);
  if (!block) return res.status(404).json({ error: 'Room block not found' });

  const roomBlock = block.rooms.find(r => r.type === roomType);
  if (!roomBlock || roomBlock.quantity < quantity) {
    return res.status(400).json({ error: 'Not enough rooms to release' });
  }

  roomBlock.quantity -= quantity;
  block.available -= quantity;
  block.released = block.released || [];
  block.released.push({ roomType, quantity, reason, releasedAt: new Date().toISOString() });

  roomBlocks.set(block.id, block);
  res.json(block);
});

// ============================================
// COMMISSIONS
// ============================================

// Calculate commission for booking
app.get('/api/commissions/calculate', requireAuth, (req, res) => {
  const { bookingId } = req.query;

  const booking = groupBookings.get(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  let commission = 0;
  let agent = null;

  if (booking.travelAgentId) {
    agent = travelAgents.get(booking.travelAgentId);
    if (agent) {
      commission = booking.estimatedRevenue * (agent.commissionRate / 100);
    }
  }

  res.json({
    bookingId,
    bookingRef: booking.bookingRef,
    totalRevenue: booking.estimatedRevenue,
    commissionRate: agent?.commissionRate || 0,
    commission,
    agent: agent ? { id: agent.id, name: agent.agentName } : null
  });
});

// Pay commission
app.post('/api/commissions/pay', requireAuth, (req, res) => {
  const { agentId, amount, period, notes } = req.body;

  const agent = travelAgents.get(agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  if (amount > agent.pendingCommission) {
    return res.status(400).json({ error: 'Amount exceeds pending commission' });
  }

  const paymentId = 'comm_' + Date.now();
  commissions.set(paymentId, {
    id: paymentId,
    agentId,
    agentName: agent.agentName,
    agencyName: agent.agencyName,
    amount,
    period,
    notes,
    status: 'paid',
    paidAt: new Date().toISOString(),
    paidBy: req.session.email
  });

  agent.pendingCommission -= amount;
  agent.totalCommission += amount;
  travelAgents.set(agent.id, agent);

  res.json({ payment: commissions.get(paymentId), agent: { id: agent.id, pendingCommission: agent.pendingCommission } });
});

// Get commission report
app.get('/api/commissions', requireAuth, (req, res) => {
  const { agentId, status, fromDate, toDate } = req.query;

  let report = Array.from(commissions.values());

  if (agentId) report = report.filter(c => c.agentId === agentId);
  if (status) report = report.filter(c => c.status === status);
  if (fromDate) report = report.filter(c => c.paidAt >= fromDate);
  if (toDate) report = report.filter(c => c.paidAt <= toDate);

  const totalPaid = report.reduce((sum, c) => sum + c.amount, 0);

  res.json({
    commissions: report,
    totalPaid,
    count: report.length
  });
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const accounts = Array.from(corporateAccounts.values()).filter(a => a.businessId === businessId);
  const bookings = Array.from(groupBookings.values()).filter(g => g.businessId === businessId);
  const agents = Array.from(travelAgents.values()).filter(a => a.businessId === businessId);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = bookings.filter(b => b.checkIn.startsWith(today.slice(0, 7)));

  res.json({
    corporateAccounts: {
      total: accounts.length,
      active: accounts.filter(a => a.status === 'active').length,
      totalRevenue: accounts.reduce((sum, a) => sum + a.totalRevenue, 0),
      topAccounts: accounts.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5).map(a => ({
        name: a.companyName,
        revenue: a.totalRevenue,
        bookings: a.totalBookings
      }))
    },
    groupBookings: {
      total: bookings.length,
      pending: bookings.filter(b => ['inquiry', 'quote_sent'].includes(b.status)).length,
      confirmed: bookings.filter(b => ['confirmed', 'contracted'].includes(b.status)).length,
      completed: bookings.filter(b => b.status === 'completed').length,
      thisMonth: thisMonth.length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.estimatedRevenue || 0), 0)
    },
    travelAgents: {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      topAgents: agents.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5).map(a => ({
        name: a.agentName,
        agency: a.agencyName,
        revenue: a.totalRevenue,
        commission: a.totalCommission
      }))
    },
    roomBlocks: {
      active: Array.from(roomBlocks.values()).filter(b => b.status === 'active').length
    }
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'StayOwn Corporate Booking Service',
    port: PORT,
    corporateAccounts: corporateAccounts.size,
    groupBookings: groupBookings.size,
    travelAgents: travelAgents.size,
    roomBlocks: roomBlocks.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log('🏢 StayOwn Corporate Booking Service running on port ' + PORT);
  console.log('👥 Accounts: ' + corporateAccounts.size + ' | Groups: ' + groupBookings.size);
});
