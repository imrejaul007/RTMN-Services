/**
 * InvestorOS API Routes - Complete Investment Management
 */

const express = require('express');
const router = express.Router();
const {
  CapTable,
  FundraisingRound,
  SAFE,
  ESOPGrant,
  ESOPPool,
  BoardMeeting,
  DataRoom
} = require('../models/investorOS');

// ============================================================
// IN-MEMORY STORAGE (Replace with database)
// ============================================================

const storage = {
  companies: new Map(),
  capTables: new Map(),
  fundraisingRounds: new Map(),
  safes: new Map(),
  esopPools: new Map(),
  esopGrants: new Map(),
  boardMeetings: new Map(),
  dataRooms: new Map()
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getOrCreateCapTable(companyId) {
  if (!storage.capTables.has(companyId)) {
    storage.capTables.set(companyId, new CapTable(companyId));
  }
  return storage.capTables.get(companyId);
}

// ============================================================
// COMPANY SETUP
// ============================================================

router.post('/company/setup', (req, res) => {
  const { companyId, companyName, incorporationDate, jurisdiction } = req.body;

  if (!companyId) {
    return res.status(400).json({ error: 'companyId is required' });
  }

  const company = {
    id: companyId,
    name: companyName,
    incorporationDate: incorporationDate || new Date(),
    jurisdiction: jurisdiction || 'India',
    createdAt: new Date()
  };

  storage.companies.set(companyId, company);

  // Initialize cap table
  const capTable = getOrCreateCapTable(companyId);

  res.json({
    company,
    capTable: {
      totalShares: capTable.getTotalShares(),
      shareholders: capTable.shareholders.length
    }
  });
});

router.get('/company/:companyId', (req, res) => {
  const company = storage.companies.get(req.params.companyId);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.json(company);
});

// ============================================================
// CAP TABLE ROUTES
// ============================================================

router.get('/cap-table/:companyId', (req, res) => {
  const capTable = storage.capTables.get(req.params.companyId);

  if (!capTable) {
    return res.status(404).json({ error: 'Cap table not found' });
  }

  res.json({
    capTable: {
      companyId: capTable.companyId,
      shareholders: capTable.shareholders,
      equities: capTable.equities,
      ownership: capTable.getOwnership(),
      fullyDiluted: capTable.getFullyDiluted(),
      optionPool: capTable.optionPool,
      updatedAt: capTable.updatedAt
    }
  });
});

router.post('/cap-table/:companyId/shareholders', (req, res) => {
  const { name, type, email, jurisdiction, initialShares, pricePerShare } = req.body;

  const capTable = getOrCreateCapTable(req.params.companyId);

  // Add shareholder
  const shareholder = capTable.addShareholder({
    name,
    type, // 'founder' | 'employee' | 'investor' | 'advisor'
    email,
    jurisdiction
  });

  // Add initial equity if provided
  if (initialShares && pricePerShare) {
    capTable.addEquity({
      shareholderId: shareholder.id,
      type: 'common',
      shares: initialShares,
      pricePerShare,
      investmentAmount: initialShares * pricePerShare,
      date: new Date()
    });
  }

  res.json({ shareholder, ownership: capTable.getOwnership() });
});

router.post('/cap-table/:companyId/equity', (req, res) => {
  const { shareholderId, shares, pricePerShare, type = 'common', series } = req.body;

  const capTable = getOrCreateCapTable(req.params.companyId);

  const equity = capTable.addEquity({
    shareholderId,
    type, // 'common' | 'preferred'
    series, // 'A' | 'B' | 'C' | etc.
    shares,
    pricePerShare,
    investmentAmount: shares * pricePerShare,
    date: new Date()
  });

  res.json({ equity, ownership: capTable.getOwnership() });
});

router.post('/cap-table/:companyId/dilution', (req, res) => {
  const { newInvestment, preMoney } = req.body;

  if (!newInvestment || !preMoney) {
    return res.status(400).json({ error: 'newInvestment and preMoney are required' });
  }

  const capTable = getOrCreateCapTable(req.params.companyId);

  const dilution = capTable.calculateDilution(newInvestment, preMoney);

  res.json({
    dilution,
    warnings: dilution.investors.percentage > 25
      ? ['Investor gets >25% - verify anti-dilution terms']
      : []
  });
});

router.get('/cap-table/:companyId/ownership', (req, res) => {
  const capTable = storage.capTables.get(req.params.companyId);

  if (!capTable) {
    return res.status(404).json({ error: 'Cap table not found' });
  }

  res.json({
    ownership: capTable.getOwnership(),
    fullyDiluted: capTable.getFullyDiluted()
  });
});

// ============================================================
// OPTION POOL ROUTES
// ============================================================

router.post('/cap-table/:companyId/option-pool', (req, res) => {
  const { totalShares } = req.body;

  if (!totalShares) {
    return res.status(400).json({ error: 'totalShares is required' });
  }

  const capTable = getOrCreateCapTable(req.params.companyId);
  capTable.optionPool.totalShares = totalShares;
  capTable.optionPool.availableShares = totalShares;

  res.json({ optionPool: capTable.optionPool });
});

router.get('/cap-table/:companyId/option-pool', (req, res) => {
  const capTable = storage.capTables.get(req.params.companyId);

  if (!capTable) {
    return res.status(404).json({ error: 'Cap table not found' });
  }

  res.json({ optionPool: capTable.optionPool });
});

// ============================================================
// FUNDRAISING ROUTES
// ============================================================

router.post('/rounds', (req, res) => {
  const { companyId, name, type, targetAmount, preMoneyValuation, terms } = req.body;

  if (!companyId || !name || !targetAmount) {
    return res.status(400).json({ error: 'companyId, name, and targetAmount are required' });
  }

  const round = new FundraisingRound({
    companyId,
    name,
    type, // 'pre-seed' | 'seed' | 'series-a' | etc.
    targetAmount,
    preMoneyValuation,
    terms
  });

  storage.fundraisingRounds.set(round.id, round);

  res.json({ round });
});

router.get('/rounds/:companyId', (req, res) => {
  const rounds = Array.from(storage.fundraisingRounds.values())
    .filter(r => r.companyId === req.params.companyId);

  res.json({ rounds });
});

router.get('/rounds/:roundId/details', (req, res) => {
  const round = storage.fundraisingRounds.get(req.params.roundId);

  if (!round) {
    return res.status(404).json({ error: 'Round not found' });
  }

  res.json({ round });
});

router.post('/rounds/:roundId/investor', (req, res) => {
  const { name, type, amount, email } = req.body;

  const round = storage.fundraisingRounds.get(req.params.roundId);

  if (!round) {
    return res.status(404).json({ error: 'Round not found' });
  }

  const investor = round.addInvestor({
    name,
    type, // 'angel' | 'vc' | 'family_office' | 'strategic'
    amount,
    email
  });

  res.json({ investor, round });
});

router.post('/rounds/:roundId/commit', (req, res) => {
  const { investorId, amount } = req.body;

  const round = storage.fundraisingRounds.get(req.params.roundId);

  if (!round) {
    return res.status(404).json({ error: 'Round not found' });
  }

  const investor = round.investors.find(i => i.id === investorId);
  if (investor) {
    investor.committedAmount = amount;
    investor.status = 'committed';
  }

  res.json({ round });
});

router.post('/rounds/:roundId/close', (req, res) => {
  const round = storage.fundraisingRounds.get(req.params.roundId);

  if (!round) {
    return res.status(404).json({ error: 'Round not found' });
  }

  const investments = round.investors.map(i => ({ amount: i.amount || i.committedAmount || 0 }));
  round.close(investments);

  // Update cap table with new equity
  const capTable = getOrCreateCapTable(round.companyId);
  round.investors.forEach(investor => {
    const amount = investor.amount || investor.committedAmount || 0;
    if (amount > 0) {
      const pricePerShare = round.preMoneyValuation / capTable.getTotalShares();
      const shares = Math.floor(amount / pricePerShare);

      capTable.addShareholder({
        name: investor.name,
        type: 'investor',
        email: investor.email
      });

      // Note: In real system, would link to shareholder
      capTable.addEquity({
        shareholderId: investor.id,
        type: investor.type === 'vc' ? 'preferred' : 'common',
        series: round.type.includes('series') ? round.type.split('-')[1].toUpperCase() : undefined,
        shares,
        pricePerShare,
        investmentAmount: amount,
        date: new Date()
      });
    }
  });

  res.json({
    round,
    message: `Round closed successfully. Raised ₹${round.raisedAmount.toLocaleString()}`
  });
});

// ============================================================
// SAFE ROUTES
// ============================================================

router.post('/safes', (req, res) => {
  const { investorId, investorName, companyId, type, amount, valuationCap, discount } = req.body;

  if (!companyId || !investorId || !amount) {
    return res.status(400).json({ error: 'companyId, investorId, and amount are required' });
  }

  const safe = new SAFE({
    investorId,
    investorName,
    companyId,
    type, // 'pre-money' | 'post-money' | 'post-money-cap'
    amount,
    valuationCap,
    discount
  });

  storage.safes.set(safe.id, safe);

  res.json({ safe });
});

router.get('/safes/:companyId', (req, res) => {
  const safes = Array.from(storage.safes.values())
    .filter(s => s.companyId === req.params.companyId);

  const summary = {
    total: safes.length,
    active: safes.filter(s => s.status === 'active').length,
    converted: safes.filter(s => s.converted).length,
    totalAmount: safes.reduce((sum, s) => sum + s.amount, 0),
    safes
  };

  res.json(summary);
});

router.post('/safes/:safeId/convert', (req, res) => {
  const { preMoney, totalShares } = req.body;

  const safe = storage.safes.get(req.params.safeId);

  if (!safe) {
    return res.status(404).json({ error: 'SAFE not found' });
  }

  if (safe.converted) {
    return res.status(400).json({ error: 'SAFE already converted' });
  }

  const nextRound = { preMoney, shares: totalShares };
  const conversion = safe.convert(nextRound);

  res.json({
    conversion,
    safe,
    message: 'SAFE converted successfully'
  });
});

// ============================================================
// ESOP ROUTES
// ============================================================

router.post('/esop/pool', (req, res) => {
  const { companyId, totalShares } = req.body;

  if (!companyId || !totalShares) {
    return res.status(400).json({ error: 'companyId and totalShares are required' });
  }

  const pool = new ESOPPool(companyId, totalShares);
  storage.esopPools.set(companyId, pool);

  res.json({ pool });
});

router.get('/esop/pool/:companyId', (req, res) => {
  const pool = storage.esopPools.get(req.params.companyId);

  if (!pool) {
    return res.status(404).json({ error: 'ESOP pool not found' });
  }

  res.json({ pool });
});

router.post('/esop/grants', (req, res) => {
  const {
    companyId,
    employeeId,
    employeeName,
    shares,
    strikePrice,
    totalMonths = 48,
    cliffMonths = 12,
    vestingFrequency = 'monthly'
  } = req.body;

  if (!companyId || !employeeId || !shares || !strikePrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check pool availability
  const pool = storage.esopPools.get(companyId);
  if (pool && shares > pool.availableShares) {
    return res.status(400).json({ error: 'Insufficient shares in pool' });
  }

  const grant = new ESOPGrant({
    employeeId,
    employeeName,
    shares,
    strikePrice,
    totalMonths,
    cliffMonths,
    vestingFrequency,
    sequence: storage.esopGrants.size + 1
  });

  storage.esopGrants.set(grant.id, grant);

  // Update pool
  if (pool) {
    pool.allocate(shares);
  }

  res.json({
    grant,
    vesting: grant.calculateVestedShares(),
    timeline: grant.generateVestingTimeline()
  });
});

router.get('/esop/grants/:grantId', (req, res) => {
  const grant = storage.esopGrants.get(req.params.grantId);

  if (!grant) {
    return res.status(404).json({ error: 'Grant not found' });
  }

  res.json({
    grant,
    vesting: grant.calculateVestedShares(),
    timeline: grant.generateVestingTimeline()
  });
});

router.get('/esop/grants/:grantId/vesting', (req, res) => {
  const grant = storage.esopGrants.get(req.params.grantId);

  if (!grant) {
    return res.status(404).json({ error: 'Grant not found' });
  }

  const asOfDate = req.query.asOf ? new Date(req.query.asOf) : new Date();

  res.json({
    grantId: grant.id,
    asOf: asOfDate,
    vesting: grant.calculateVestedShares(asOfDate),
    timeline: grant.generateVestingTimeline()
  });
});

router.post('/esop/grants/:grantId/exercise', (req, res) => {
  const { shares, fairMarketValue } = req.body;

  const grant = storage.esopGrants.get(req.params.grantId);

  if (!grant) {
    return res.status(404).json({ error: 'Grant not found' });
  }

  const vesting = grant.calculateVestedShares();
  if (shares > vesting.availableToExercise) {
    return res.status(400).json({ error: 'Cannot exercise more than vested shares' });
  }

  const exercise = grant.calculateExerciseTax(shares, fairMarketValue);
  grant.exercisedShares += shares;

  res.json({
    exercise,
    vesting: grant.calculateVestedShares(),
    message: `Exercised ${shares} shares successfully`
  });
});

// ============================================================
// BOARD MEETING ROUTES
// ============================================================

router.post('/board/meetings', (req, res) => {
  const { companyId, type, date, time, agenda, attendees } = req.body;

  if (!companyId || !date) {
    return res.status(400).json({ error: 'companyId and date are required' });
  }

  const meeting = new BoardMeeting({
    companyId,
    type: type || 'board',
    date,
    time,
    agenda,
    attendees
  });

  storage.boardMeetings.set(meeting.id, meeting);

  res.json({ meeting });
});

router.get('/board/meetings/:companyId', (req, res) => {
  const meetings = Array.from(storage.boardMeetings.values())
    .filter(m => m.companyId === req.params.companyId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({ meetings });
});

router.post('/board/meetings/:meetingId/agenda', (req, res) => {
  const { title, description, presenter, duration, type } = req.body;

  const meeting = storage.boardMeetings.get(req.params.meetingId);

  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }

  const item = meeting.addAgendaItem({
    title,
    description,
    presenter,
    duration,
    type // 'presentation' | 'discussion' | 'decision'
  });

  res.json({ agendaItem: item, meeting });
});

router.post('/board/meetings/:meetingId/resolutions', (req, res) => {
  const { title, description, type, proposedBy } = req.body;

  const meeting = storage.boardMeetings.get(req.params.meetingId);

  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }

  const resolution = meeting.addResolution({
    title,
    description,
    resolutionType: type, // 'appointment' | 'financial' | 'corporate'
    proposedBy
  });

  res.json({ resolution });
});

router.post('/resolutions/:resolutionId/vote', (req, res) => {
  const { voterId, voterName, vote } = req.body;

  let resolution = null;
  let meeting = null;

  for (const m of storage.boardMeetings.values()) {
    const r = m.resolutions.find(r => r.id === req.params.resolutionId);
    if (r) {
      resolution = r;
      meeting = m;
      break;
    }
  }

  if (!resolution) {
    return res.status(404).json({ error: 'Resolution not found' });
  }

  const result = meeting.castVote(req.params.resolutionId, voterId, voterName, vote);

  res.json({
    resolution: result,
    summary: {
      votesFor: result.votesFor,
      votesAgainst: result.votesAgainst,
      votesAbstained: result.votesAbstained,
      status: result.status
    }
  });
});

// ============================================================
// DATA ROOM ROUTES
// ============================================================

router.post('/data-rooms', (req, res) => {
  const { companyId, name, type, accessList, expiration } = req.body;

  if (!companyId || !name) {
    return res.status(400).json({ error: 'companyId and name are required' });
  }

  const dataRoom = new DataRoom({
    companyId,
    name,
    type: type || 'fundraising',
    accessList,
    expiresAt: expiration ? new Date(expiration) : undefined
  });

  storage.dataRooms.set(dataRoom.id, dataRoom);

  res.json({ dataRoom });
});

router.get('/data-rooms/:companyId', (req, res) => {
  const rooms = Array.from(storage.dataRooms.values())
    .filter(r => r.companyId === req.params.companyId);

  res.json({ dataRooms: rooms });
});

router.post('/data-rooms/:roomId/access', (req, res) => {
  const { id, name, email, accessLevel } = req.body;

  const room = storage.dataRooms.get(req.params.roomId);

  if (!room) {
    return res.status(404).json({ error: 'Data room not found' });
  }

  const access = room.addAccess({ id, name, email, accessLevel });

  res.json({ access, room });
});

router.post('/data-rooms/:roomId/documents', (req, res) => {
  const { folderId, name, type, size, uploadedBy } = req.body;

  const room = storage.dataRooms.get(req.params.roomId);

  if (!room) {
    return res.status(404).json({ error: 'Data room not found' });
  }

  const document = room.addDocument(folderId, {
    name,
    type,
    size,
    uploadedBy,
    url: `/documents/${uuidv4()}`
  });

  res.json({ document });
});

// ============================================================
// DASHBOARD
// ============================================================

router.get('/dashboard/:companyId', (req, res) => {
  const companyId = req.params.companyId;

  // Get all data
  const capTable = storage.capTables.get(companyId);
  const rounds = Array.from(storage.fundraisingRounds.values())
    .filter(r => r.companyId === companyId);
  const safes = Array.from(storage.safes.values())
    .filter(s => s.companyId === companyId);
  const pool = storage.esopPools.get(companyId);
  const grants = Array.from(storage.esopGrants.values())
    .filter(g => g.employeeId.includes(companyId) || g.employeeName); // Simplified
  const meetings = Array.from(storage.boardMeetings.values())
    .filter(m => m.companyId === companyId);
  const dataRooms = Array.from(storage.dataRooms.values())
    .filter(r => r.companyId === companyId);

  // Calculate metrics
  const totalRaised = rounds
    .filter(r => r.status === 'closed')
    .reduce((sum, r) => sum + r.raisedAmount, 0);

  const fullyDiluted = capTable?.getFullyDiluted() || {};
  const ownership = capTable?.getOwnership() || [];

  res.json({
    company: storage.companies.get(companyId) || { id: companyId },
    summary: {
      totalRaised,
      totalInvestors: rounds.reduce((sum, r) => sum + r.investors.length, 0),
      esopGrants: grants.length,
      fullyDilutedShares: fullyDiluted.fullyDilutedShares || 0,
      boardMeetings: meetings.length
    },
    fundraising: {
      active: rounds.filter(r => r.status === 'active').length,
      closed: rounds.filter(r => r.status === 'closed').length,
      total: rounds.length
    },
    esop: pool ? {
      total: pool.totalShares,
      granted: pool.grantedShares,
      exercised: pool.exercisedShares,
      available: pool.availableShares
    } : null,
    recentActivity: meetings.slice(0, 3),
    dataRooms: dataRooms.length
  });
});

module.exports = router;
