/**
 * InvestorOS Tests
 * Run with: node --test __tests__/investor-tests.js
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');

// Import models directly
const {
  CapTable,
  FundraisingRound,
  SAFE,
  ESOPGrant,
  ESOPPool,
  BoardMeeting,
  DataRoom
} = require('../src/models/investorOS');

// ============================================================
// CAP TABLE TESTS
// ============================================================

describe('InvestorOS - CapTable', () => {
  let capTable;

  before(() => {
    capTable = new CapTable('test-company');
  });

  it('should create a new cap table', () => {
    assert.strictEqual(capTable.companyId, 'test-company');
    assert.deepStrictEqual(capTable.shareholders, []);
    assert.deepStrictEqual(capTable.equities, []);
  });

  it('should add shareholders', () => {
    const founder = capTable.addShareholder({
      name: 'Founder One',
      type: 'founder',
      email: 'founder@test.com'
    });

    assert.ok(founder.id);
    assert.strictEqual(founder.name, 'Founder One');
    assert.strictEqual(founder.type, 'founder');
    assert.strictEqual(capTable.shareholders.length, 1);
  });

  it('should add equity', () => {
    const founder = capTable.shareholders[0];
    const equity = capTable.addEquity({
      shareholderId: founder.id,
      type: 'common',
      shares: 1000000,
      pricePerShare: 1,
      investmentAmount: 1000000
    });

    assert.ok(equity.id);
    assert.strictEqual(equity.shares, 1000000);
    assert.strictEqual(capTable.equities.length, 1);
  });

  it('should calculate total shares', () => {
    const total = capTable.getTotalShares();
    assert.strictEqual(total, 1000000);
  });

  it('should calculate ownership percentages', () => {
    const ownership = capTable.getOwnership();
    assert.strictEqual(ownership.length, 1);
    assert.strictEqual(ownership[0].percentage, '100.0000');
  });

  it('should calculate dilution from new investment', () => {
    const dilution = capTable.calculateDilution(5000000, 20000000);

    assert.strictEqual(dilution.summary.preMoney, 20000000);
    assert.strictEqual(dilution.summary.newInvestment, 5000000);
    assert.strictEqual(dilution.summary.postMoney, 25000000);
    assert.ok(dilution.investors.shares > 0);
    assert.ok(dilution.investors.percentage > 0);
  });

  it('should calculate fully diluted shares', () => {
    capTable.optionPool = {
      totalShares: 200000,
      grantedShares: 50000,
      exercisedShares: 0,
      cancelledShares: 0,
      availableShares: 150000
    };

    const diluted = capTable.getFullyDiluted();
    assert.strictEqual(diluted.basicShares, 1000000);
    assert.strictEqual(diluted.optionsOutstanding, 50000);
    assert.strictEqual(diluted.fullyDilutedShares, 1050000);
  });
});

// ============================================================
// FUNDRAISING TESTS
// ============================================================

describe('InvestorOS - FundraisingRound', () => {
  it('should create a new fundraising round', () => {
    const round = new FundraisingRound({
      companyId: 'test-company',
      name: 'Seed Round',
      type: 'seed',
      targetAmount: 5000000,
      preMoneyValuation: 20000000
    });

    assert.ok(round.id);
    assert.strictEqual(round.name, 'Seed Round');
    assert.strictEqual(round.type, 'seed');
    assert.strictEqual(round.targetAmount, 5000000);
    assert.strictEqual(round.status, 'planned');
  });

  it('should add investors to round', () => {
    const round = new FundraisingRound({
      companyId: 'test-company',
      name: 'Seed Round',
      targetAmount: 5000000
    });

    const investor = round.addInvestor({
      name: 'Sequoia Capital',
      type: 'vc',
      amount: 3000000,
      email: 'team@sequoiacap.com'
    });

    assert.ok(investor.id);
    assert.strictEqual(investor.status, 'committed');
    assert.strictEqual(round.investors.length, 1);
  });

  it('should close round with investments', () => {
    const round = new FundraisingRound({
      companyId: 'test-company',
      name: 'Seed Round',
      targetAmount: 5000000
    });

    round.addInvestor({ name: 'Investor A', type: 'angel', amount: 1000000 });
    round.addInvestor({ name: 'Investor B', type: 'vc', amount: 2000000 });

    round.close([{ amount: 1000000 }, { amount: 2000000 }]);

    assert.strictEqual(round.status, 'closed');
    assert.strictEqual(round.raisedAmount, 3000000);
    assert.ok(round.closedAt);
  });
});

// ============================================================
// SAFE TESTS
// ============================================================

describe('InvestorOS - SAFE', () => {
  it('should create a SAFE', () => {
    const safe = new SAFE({
      investorId: 'inv-001',
      investorName: 'Angel Investor',
      companyId: 'test-company',
      type: 'post-money',
      amount: 500000,
      valuationCap: 5000000
    });

    assert.ok(safe.id);
    assert.strictEqual(safe.amount, 500000);
    assert.strictEqual(safe.converted, false);
    assert.strictEqual(safe.status, 'active');
  });

  it('should calculate conversion with valuation cap', () => {
    const safe = new SAFE({
      investorId: 'inv-001',
      investorName: 'Angel',
      companyId: 'test-company',
      type: 'post-money-cap',
      amount: 500000,
      valuationCap: 5000000
    });

    const nextRound = { preMoney: 20000000, shares: 10000000 };
    const conversion = safe.calculateConversion(nextRound);

    assert.ok(conversion);
    assert.ok(conversion.shares > 0);
    assert.ok(conversion.pricePerShare > 0);
  });

  it('should convert SAFE', () => {
    const safe = new SAFE({
      investorId: 'inv-001',
      investorName: 'Angel',
      companyId: 'test-company',
      type: 'post-money',
      amount: 500000
    });

    const nextRound = { preMoney: 20000000, shares: 10000000 };
    const result = safe.convert(nextRound);

    assert.strictEqual(safe.converted, true);
    assert.ok(safe.convertedAt);
    assert.ok(result);
  });
});

// ============================================================
// ESOP TESTS
// ============================================================

describe('InvestorOS - ESOPGrant', () => {
  it('should create ESOP grant', () => {
    const grant = new ESOPGrant({
      employeeId: 'emp-001',
      employeeName: 'John Doe',
      shares: 10000,
      strikePrice: 1,
      totalMonths: 48,
      cliffMonths: 12
    });

    assert.ok(grant.id);
    assert.strictEqual(grant.grantNumber.includes('ESOP-'), true);
    assert.strictEqual(grant.shares, 10000);
    assert.strictEqual(grant.status, 'active');
  });

  it('should calculate vested shares before cliff', () => {
    const grant = new ESOPGrant({
      employeeId: 'emp-001',
      shares: 10000,
      strikePrice: 1,
      cliffMonths: 12
    });

    // Simulate 6 months (before cliff)
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const vesting = grant.calculateVestedShares(sixMonthsLater);

    assert.strictEqual(vesting.vestedShares, 0);
    assert.strictEqual(vesting.cliffPassed, false);
  });

  it('should calculate vested shares after cliff', () => {
    const grant = new ESOPGrant({
      employeeId: 'emp-001',
      shares: 10000,
      strikePrice: 1,
      cliffMonths: 12,
      totalMonths: 48
    });

    // Simulate 18 months (after cliff)
    const eighteenMonthsLater = new Date();
    eighteenMonthsLater.setMonth(eighteenMonthsLater.getMonth() + 18);

    const vesting = grant.calculateVestedShares(eighteenMonthsLater);

    assert.ok(vesting.vestedShares > 0);
    assert.strictEqual(vesting.cliffPassed, true);
    assert.ok(vesting.vestedShares < grant.shares); // Not fully vested
  });

  it('should calculate exercise tax', () => {
    const grant = new ESOPGrant({
      employeeId: 'emp-001',
      shares: 1000,
      strikePrice: 10
    });

    const tax = grant.calculateExerciseTax(1000, 50);

    assert.strictEqual(tax.strikePrice, 10);
    assert.strictEqual(tax.exercisePrice, 10000);
    assert.ok(tax.fairMarketValue > 0);
  });

  it('should generate vesting timeline', () => {
    const grant = new ESOPGrant({
      employeeId: 'emp-001',
      shares: 10000,
      strikePrice: 1
    });

    const timeline = grant.generateVestingTimeline();

    assert.ok(timeline.length > 0);
    assert.ok(timeline.some(t => t.event === 'cliff'));
    assert.ok(timeline.some(t => t.event === 'full_vest'));
    assert.ok(timeline.some(t => t.event === 'expiration'));
  });
});

describe('InvestorOS - ESOPPool', () => {
  it('should create ESOP pool', () => {
    const pool = new ESOPPool('test-company', 200000);

    assert.ok(pool.id);
    assert.strictEqual(pool.totalShares, 200000);
    assert.strictEqual(pool.availableShares, 200000);
  });

  it('should allocate shares from pool', () => {
    const pool = new ESOPPool('test-company', 200000);

    const result = pool.allocate(50000);

    assert.strictEqual(result.success, true);
    assert.strictEqual(pool.grantedShares, 50000);
    assert.strictEqual(pool.availableShares, 150000);
  });

  it('should reject allocation exceeding pool', () => {
    const pool = new ESOPPool('test-company', 200000);

    const result = pool.allocate(300000);

    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Insufficient'));
  });

  it('should release shares back to pool', () => {
    const pool = new ESOPPool('test-company', 200000);
    pool.allocate(50000);

    const result = pool.release(20000);

    assert.strictEqual(result.success, true);
    assert.strictEqual(pool.cancelledShares, 20000);
    assert.strictEqual(pool.availableShares, 170000);
  });
});

// ============================================================
// BOARD MEETING TESTS
// ============================================================

describe('InvestorOS - BoardMeeting', () => {
  it('should create board meeting', () => {
    const meeting = new BoardMeeting({
      companyId: 'test-company',
      type: 'board',
      date: '2024-12-15'
    });

    assert.ok(meeting.id);
    assert.strictEqual(meeting.status, 'scheduled');
    assert.ok(meeting.meetingNumber);
  });

  it('should add agenda items', () => {
    const meeting = new BoardMeeting({
      companyId: 'test-company',
      date: '2024-12-15'
    });

    const item = meeting.addAgendaItem({
      title: 'Approve Budget',
      description: 'Review and approve FY25 budget',
      presenter: 'CFO',
      duration: 30,
      type: 'decision'
    });

    assert.ok(item.id);
    assert.strictEqual(item.order, 1);
  });

  it('should add and vote on resolutions', () => {
    const meeting = new BoardMeeting({
      companyId: 'test-company',
      date: '2024-12-15'
    });

    const resolution = meeting.addResolution({
      title: 'Approve Series A',
      description: 'Approve Series A funding terms',
      resolutionType: 'financial',
      proposedBy: 'CEO'
    });

    assert.ok(resolution.number.includes('RES-'));
    assert.strictEqual(resolution.status, 'proposed');

    // Cast votes
    meeting.castVote(resolution.id, 'dir-001', 'Director A', 'for');
    meeting.castVote(resolution.id, 'dir-002', 'Director B', 'for');
    meeting.castVote(resolution.id, 'dir-003', 'Director C', 'against');

    assert.strictEqual(resolution.votesFor, 2);
    assert.strictEqual(resolution.votesAgainst, 1);
    assert.strictEqual(resolution.status, 'passed');
  });

  it('should close meeting with minutes', () => {
    const meeting = new BoardMeeting({
      companyId: 'test-company',
      date: '2024-12-15'
    });

    meeting.close('Meeting adjourned at 5 PM');

    assert.strictEqual(meeting.status, 'completed');
    assert.ok(meeting.minutes);
  });
});

// ============================================================
// DATA ROOM TESTS
// ============================================================

describe('InvestorOS - DataRoom', () => {
  it('should create data room', () => {
    const room = new DataRoom({
      companyId: 'test-company',
      name: 'Series B DD',
      type: 'fundraising'
    });

    assert.ok(room.id);
    assert.strictEqual(room.name, 'Series B DD');
    assert.strictEqual(room.status, 'active');
    assert.ok(room.folders.length > 0);
  });

  it('should initialize default folders', () => {
    const room = new DataRoom({
      companyId: 'test-company',
      name: 'Test Room',
      type: 'fundraising'
    });

    const folderNames = room.folders.map(f => f.name);

    assert.ok(folderNames.includes('Legal'));
    assert.ok(folderNames.includes('Financials'));
    assert.ok(folderNames.includes('Due Diligence'));
    assert.ok(folderNames.includes('Pitch Deck'));
  });

  it('should add investor access', () => {
    const room = new DataRoom({
      companyId: 'test-company',
      name: 'Test Room'
    });

    const access = room.addAccess({
      id: 'inv-001',
      name: 'Sequoia Capital',
      email: 'team@sequoiacap.com',
      accessLevel: 'member'
    });

    assert.ok(access.id);
    assert.strictEqual(access.accessLevel, 'member');
    assert.strictEqual(room.accessList.length, 1);
  });

  it('should track investor access', () => {
    const room = new DataRoom({
      companyId: 'test-company',
      name: 'Test Room'
    });

    room.addAccess({
      id: 'inv-001',
      name: 'Sequoia',
      email: 'team@sequoiacap.com'
    });

    const access = room.trackAccess('inv-001');

    assert.strictEqual(access.loginCount, 1);
    assert.ok(access.lastAccess);
    assert.ok(access.acceptedAt);
  });

  it('should add documents', () => {
    const room = new DataRoom({
      companyId: 'test-company',
      name: 'Test Room'
    });

    const folderId = room.folders[0].id;
    const doc = room.addDocument(folderId, {
      name: 'Financials Q3.pdf',
      type: 'pdf',
      size: 2048576,
      uploadedBy: 'CFO'
    });

    assert.ok(doc.id);
    assert.strictEqual(doc.name, 'Financials Q3.pdf');
    assert.strictEqual(room.documents.length, 1);
  });
});

// ============================================================
// SUMMARY
// ============================================================

console.log('\n✅ InvestorOS Tests Loaded');
console.log('Run with: node --test __tests__/investor-tests.js\n');
