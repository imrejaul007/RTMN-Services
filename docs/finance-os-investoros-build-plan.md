# InvestorOS Build Plan
**Duration:** 6 weeks  
**Priority:** CRITICAL — Every startup needs this, no ERP has it well

---

## What is InvestorOS?

InvestorOS is the **missing layer** in every finance system — the tools founders need to manage their investors, not just their accounting.

```
Traditional ERP:
  Accounting ✓ → Treasury ✓ → Reporting ✓ → InvestorOS ✗

Modern Startup Stack:
  Accounting ✓ → Treasury ✓ → Reporting ✓ → InvestorOS ✓ (with cap table, ESOP, fundraising)
```

---

## InvestorOS Architecture

```
InvestorOS (Port 4802)
│
├── CapTableOS
│   ├── Shareholder Registry
│   ├── Equity Types
│   ├── Cap Table Engine
│   └── Dilution Modeling
│
├── FundraisingOS
│   ├── Deal Tracking
│   ├── Term Sheets
│   ├── SAFE/YCCSA
│   └── Investment Ledger
│
├── ESOPOS
│   ├── Option Pool
│   ├── Grants
│   ├── Vesting Calculator
│   └── Exercise Workflow
│
├── BoardOS
│   ├── Meeting Management
│   ├── Minutes
│   └── Resolutions
│
├── InvestorPortalOS
│   ├── Financial Access
│   ├── Reporting
│   └── Document Room
│
└── DueDiligenceOS
    ├── Data Room
    ├── Document Management
    └── Access Controls
```

---

## Module 1: CapTableOS (Week 1-2)

### 1.1 Data Model

```typescript
// src/models/capTable.ts

interface Shareholder {
  id: string;
  type: 'individual' | 'institutional' | 'employee' | 'founder';
  name: string;
  email: string;
  jurisdiction: string;  // India, USA, UAE, etc.
  kycStatus: 'pending' | 'verified' | 'failed';
  createdAt: Date;
}

interface Equity {
  id: string;
  shareholderId: string;
  type: 'common' | 'preferred' | 'ccps' | 'sweat_equity';
  series?: 'A' | 'B' | 'C' | 'D';  // Only for preferred
  shares: number;
  pricePerShare: number;  // In base currency
  investmentAmount: number;
  date: Date;
  terms?: PreferredTerms;
}

interface PreferredTerms {
  LiquidationPreference: '1x' | '2x' | 'non-participating' | 'participating';
  AntiDilution: 'full' | 'weighted_average' | 'none';
  VotingRights: '1:1' | '1:10' | 'none';
  Dividend: 'participating' | 'non-participating' | 'cumulative';
  ProRata: boolean;
}

interface Option {
  id: string;
  employeeId: string;
  grantNumber: string;
  shares: number;
  strikePrice: number;
  grantDate: Date;
  vestingSchedule: VestingSchedule;
  status: 'active' | 'exercised' | 'cancelled' | 'expired';
}

interface VestingSchedule {
  totalMonths: number;  // Typically 48
  cliffMonths: number;   // Typically 12
  vestingFrequency: 'monthly' | 'quarterly';
  vestedShares: (asOf: Date) => number;
}

interface CapTable {
  companyId: string;
  shareholders: Shareholder[];
  equities: Equity[];
  options: Option[];
  optionPool: {
    totalShares: number;
    grantedShares: number;
    availableShares: number;
  };
  lastUpdated: Date;
}
```

### 1.2 Cap Table Engine

```typescript
// src/services/capTableEngine.ts

class CapTableEngine {
  
  // Calculate ownership percentage
  calculateOwnership(capTable: CapTable): OwnershipBreakdown[] {
    const totalShares = this.getTotalShares(capTable);
    
    return capTable.shareholders.map(s => {
      const equity = capTable.equities.filter(e => e.shareholderId === s.id);
      const shares = equity.reduce((sum, e) => sum + e.shares, 0);
      
      return {
        shareholder: s,
        shares,
        percentage: (shares / totalShares) * 100,
        type: s.type
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }
  
  // Calculate dilution from new investment
  calculateDilution(
    capTable: CapTable, 
    newInvestment: number, 
    preMoney: number
  ): DilutionResult {
    const postMoney = preMoney + newInvestment;
    const pricePerShare = preMoney / this.getTotalShares(capTable);
    const newShares = newInvestment / pricePerShare;
    
    const dilutedCapTable = {
      ...capTable,
      equities: [
        ...capTable.equities,
        {
          id: uuid(),
          type: 'common',
          shares: newShares,
          pricePerShare,
          investmentAmount: newInvestment
        }
      ]
    };
    
    return {
      newShares,
      pricePerShare,
      postMoney,
      ownershipBefore: this.calculateOwnership(capTable),
      ownershipAfter: this.calculateOwnership(dilutedCapTable)
    };
  }
  
  // Generate cap table snapshot
  generateSnapshot(capTable: CapTable, asOf: Date): CapTableSnapshot {
    return {
      ...capTable,
      asOf,
      ownership: this.calculateOwnership(capTable),
      valuation: this.calculateValuation(capTable),
      fullyDiluted: this.calculateFullyDiluted(capTable)
    };
  }
}
```

### 1.3 API Endpoints

```typescript
// src/routes/capTable.ts

router.get('/cap-table', async (req, res) => {
  const { companyId } = req.auth;
  const capTable = await CapTable.findOne({ companyId });
  const ownership = capTableEngine.calculateOwnership(capTable);
  
  res.json({
    capTable,
    ownership,
    summary: {
      totalShares: getTotalShares(capTable),
      totalInvestors: capTable.shareholders.length,
      optionPool: capTable.optionPool,
      lastUpdated: capTable.lastUpdated
    }
  });
});

router.post('/cap-table/dilution', async (req, res) => {
  const { newInvestment, preMoney, investorType, terms } = req.body;
  const capTable = await getCapTable(req.auth.companyId);
  
  const result = capTableEngine.calculateDilution(capTable, newInvestment, preMoney);
  
  res.json({
    dilution: result,
    recommendation: generateDilutionAdvice(result)
  });
});

router.post('/cap-table/snapshot', async (req, res) => {
  const capTable = await getCapTable(req.auth.companyId);
  const snapshot = capTableEngine.generateSnapshot(capTable, new Date());
  
  await CapTableSnapshot.create({
    ...snapshot,
    companyId: req.auth.companyId
  });
  
  res.json(snapshot);
});
```

---

## Module 2: FundraisingOS (Week 2-3)

### 2.1 Data Model

```typescript
interface FundraisingRound {
  id: string;
  companyId: string;
  type: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'bridge';
  name: string;  // "Seed Round 2024"
  targetAmount: number;
  raisedAmount: number;
  preMoneyValuation: number;
  postMoneyValuation: number;
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  
  // Timeline
  startedAt?: Date;
  closedAt?: Date;
  
  // Investors
  leadInvestor?: string;
  coInvestors: Investor[];
  
  // Terms
  terms?: RoundTerms;
  
  createdAt: Date;
}

interface Investor {
  id: string;
  name: string;
  type: 'angel' | 'vc' | 'family_office' | 'strategic' | 'institutional';
  commitmentAmount: number;
  committedAt?: Date;
  closedAmount?: number;
  status: 'interested' | 'committed' | 'closed';
  
  // Contact
  email: string;
  phone?: string;
  firm?: string;
}

interface TermSheet {
  id: string;
  roundId: string;
  
  // Valuation
  preMoney: number;
  postMoney: number;
  pricePerShare: number;
  
  // Investment terms
  minimumInvestment: number;
  maximumInvestment: number;
  
  // Preferred stock terms
  liquidationPreference: '1x' | '1.5x' | '2x';
  participation: 'full' | 'non' | 'cap';
  antiDilution: 'full' | 'weighted' | 'none';
  proRataRights: boolean;
  vetoRights: string[];
  
  // Board
  boardSeat: boolean;
  observerRights: boolean;
  
  // Other
  informationRights: boolean;
  dragAlong: boolean;
  tagAlong: boolean;
  
  status: 'draft' | 'sent' | 'negotiating' | 'signed' | 'rejected';
  signedAt?: Date;
}

interface Safe {
  id: string;
  investorId: string;
  companyId: string;
  
  type: 'pre-money' | 'post-money' | 'post-money-cap';
  
  // YC Safe terms
  amount: number;
  valuationCap?: number;
  discount?: number;  // e.g., 0.8 = 20% discount
  
  // Conversion
  converted: boolean;
  convertedAt?: Date;
  convertedShares?: number;
  convertedPrice?: number;
  
  // Maturity
  maturityDate?: Date;  // For post-money cap
  uncappedDeadline?: Date;  // For pre-money cap
  
  status: 'active' | 'converted' | 'repaid';
}

interface YCSA {
  id: string;
  investorId: string;
  companyId: string;
  
  // MFN protection
  valuationCap?: number;
  discount?: number;
  
  // Most Favored Nation
  mfnApplied: boolean;
  
  // Conversion
  converted: boolean;
  convertedAt?: Date;
  convertedShares?: number;
  
  status: 'active' | 'converted';
}
```

### 2.2 Fundraising Workflow

```typescript
// src/services/fundraisingWorkflow.ts

class FundraisingWorkflow {
  
  async createRound(data: CreateRoundInput): Promise<FundraisingRound> {
    const round = await FundraisingRound.create({
      ...data,
      status: 'planned',
      companyId: req.auth.companyId
    });
    
    // Create initial tasks
    await this.createRoundTasks(round);
    
    return round;
  }
  
  async closeRound(roundId: string, investments: Investment[]): Promise<void> {
    const round = await FundraisingRound.findById(roundId);
    
    // Update cap table
    for (const investment of investments) {
      await this.processInvestment(investment);
    }
    
    // Update round status
    round.status = 'closed';
    round.closedAt = new Date();
    round.raisedAmount = investments.reduce((sum, i) => sum + i.amount, 0);
    await round.save();
    
    // Notify all investors
    await this.notifyInvestors(round, 'closed');
  }
  
  async convertSafes(roundId: string): Promise<void> {
    const round = await FundraisingRound.findById(roundId);
    const safes = await Safe.find({ 
      companyId: round.companyId, 
      status: 'active' 
    });
    
    for (const safe of safes) {
      await this.convertSafe(safe, round);
    }
  }
  
  private async convertSafe(safe: Safe, round: FundraisingRound): Promise<void> {
    const { pricePerShare, shares } = this.calculateSafeConversion(safe, round);
    
    safe.converted = true;
    safe.convertedAt = new Date();
    safe.convertedShares = shares;
    safe.convertedPrice = pricePerShare;
    await safe.save();
    
    // Update cap table
    await capTableEngine.addEquity({
      shareholderId: safe.investorId,
      type: 'common',
      shares,
      pricePerShare,
      investmentAmount: safe.amount
    });
  }
}
```

### 2.3 API Endpoints

```typescript
router.post('/rounds', async (req, res) => {
  const round = await fundraisingWorkflow.createRound(req.body);
  res.json(round);
});

router.post('/rounds/:id/commit', async (req, res) => {
  const { investorId, amount } = req.body;
  
  await InvestorCommitment.create({
    roundId: req.params.id,
    investorId,
    amount,
    committedAt: new Date()
  });
  
  res.json({ success: true });
});

router.post('/rounds/:id/close', async (req, res) => {
  const investments = await Investment.find({ roundId: req.params.id });
  await fundraisingWorkflow.closeRound(req.params.id, investments);
  res.json({ success: true });
});

router.get('/safes', async (req, res) => {
  const safes = await Safe.find({ 
    companyId: req.auth.companyId 
  });
  res.json(safes);
});

router.post('/safes/convert/:roundId', async (req, res) => {
  await fundraisingWorkflow.convertSafes(req.params.roundId);
  res.json({ success: true });
});
```

---

## Module 3: ESOPOS (Week 3-4)

### 3.1 Data Model

```typescript
interface ESOPPool {
  id: string;
  companyId: string;
  totalShares: number;
  grantedShares: number;
  exercisedShares: number;
  cancelledShares: number;
  availableShares: number;
  createdAt: Date;
}

interface ESOPGrant {
  id: string;
  employeeId: string;
  grantNumber: string;  // e.g., "ESOP-2024-001"
  
  // Grant details
  shares: number;
  strikePrice: number;
  grantDate: Date;
  vestingSchedule: VestingSchedule;
  
  // Vested/unvested
  vestedShares: number;  // Calculated
  unvestedShares: number;  // Calculated
  
  // Status
  status: 'active' | 'exercised' | 'cancelled' | 'expired' | 'forfeited';
  
  // Exercise
  exercisedShares: number;
  exercisedAt?: Date;
  
  // Cancellation
  cancelledShares?: number;
  cancelledAt?: Date;
  cancellationReason?: string;
  
  // Expiration
  expirationDate?: Date;  // Typically grant date + 10 years
  
  createdAt: Date;
  updatedAt: Date;
}

interface ESOPExercise {
  id: string;
  grantId: string;
  employeeId: string;
  
  shares: number;
  strikePrice: number;  // Price at grant
  
  // Payment
  exercisePrice: number;  // strikePrice * shares
  paymentMethod: 'cash' | 'net_exercise' | 'cashless';
  
  // Tax
  taxAmount?: number;  // India: 194A, 192A
  taxWithheld?: boolean;
  
  // Shares issued
  sharesIssued: number;
  certificateNumber?: string;
  
  // FMV at exercise
  fairMarketValue: number;
  bargainElement: number;  // FMV - ExercisePrice
  
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  
  createdAt: Date;
  completedAt?: Date;
}
```

### 3.2 Vesting Calculator

```typescript
// src/services/vestingCalculator.ts

class VestingCalculator {
  
  calculateVestedShares(
    grant: ESOPGrant, 
    asOfDate: Date = new Date()
  ): VestedSharesResult {
    const { grantDate, shares, vestingSchedule } = grant;
    
    // Check if cliff passed
    const cliffDate = addMonths(grantDate, vestingSchedule.cliffMonths);
    if (asOfDate < cliffDate) {
      return { vestedShares: 0, unvestedShares: shares, percentage: 0 };
    }
    
    // Calculate months vested
    const monthsElapsed = differenceInMonths(asOfDate, grantDate);
    const totalMonths = Math.min(monthsElapsed, vestingSchedule.totalMonths);
    
    let vestedShares: number;
    
    if (vestingSchedule.vestingFrequency === 'monthly') {
      vestedShares = Math.floor((totalMonths / vestingSchedule.totalMonths) * shares);
    } else {
      // Quarterly
      const quartersElapsed = Math.floor(totalMonths / 3);
      const totalQuarters = Math.floor(vestingSchedule.totalMonths / 3);
      vestedShares = Math.floor((quartersElapsed / totalQuarters) * shares);
    }
    
    return {
      vestedShares,
      unvestedShares: shares - vestedShares,
      percentage: (vestedShares / shares) * 100,
      monthsElapsed: totalMonths,
      monthsRemaining: vestingSchedule.totalMonths - totalMonths
    };
  }
  
  calculateExerciseTax(grant: ESOPGrant, exerciseDate: Date): TaxCalculation {
    const { strikePrice, shares } = grant;
    const exercisePrice = strikePrice * shares;
    
    // Get FMV at exercise (from 409A valuation or latest cap table)
    const fmv = getFairMarketValue(grant.employeeId, exerciseDate);
    const bargainElement = (fmv - strikePrice) * shares;
    
    // India tax treatment
    const taxes = {
      // TDS on exercise (employer withholds)
      tds194A: bargainElement > 0 ? bargainElement * 0.10 : 0,  // 10% if > 20L
      tds192A: bargainElement > 0 ? bargainElement * 0.30 : 0,  // 30% if > 20L
      
      // Employer PF contribution on equity (if applicable)
      employerPf: 0,
      
      // STT on sale (when shares sold)
      stt: 0,  // 0.2% on delivery
    };
    
    return {
      exercisePrice,
      fairMarketValue: fmv * shares,
      bargainElement,
      taxes,
      totalTax: taxes.tds194A + taxes.tds192A,
      netSharesAfterTax: shares  // Actual calculation needs tax rates
    };
  }
  
  generateVestingSchedule(grant: ESOPGrant): VestingTimeline[] {
    const timeline: VestingTimeline[] = [];
    const { grantDate, shares, vestingSchedule } = grant;
    
    // Cliff
    timeline.push({
      date: addMonths(grantDate, vestingSchedule.cliffMonths),
      event: 'cliff',
      shares: 0,
      cumulativeShares: Math.floor((shares * vestingSchedule.cliffMonths) / vestingSchedule.totalMonths),
      percentage: (vestingSchedule.cliffMonths / vestingSchedule.totalMonths) * 100
    });
    
    // Regular vesting
    if (vestingSchedule.vestingFrequency === 'monthly') {
      for (let month = vestingSchedule.cliffMonths + 1; month <= vestingSchedule.totalMonths; month++) {
        const date = addMonths(grantDate, month);
        const cumulative = Math.floor((month / vestingSchedule.totalMonths) * shares);
        timeline.push({
          date,
          event: 'vest',
          shares: Math.floor(shares / vestingSchedule.totalMonths),
          cumulativeShares: cumulative,
          percentage: (month / vestingSchedule.totalMonths) * 100
        });
      }
    }
    
    // Full vest
    timeline.push({
      date: addMonths(grantDate, vestingSchedule.totalMonths),
      event: 'full_vest',
      shares: 0,
      cumulativeShares: shares,
      percentage: 100
    });
    
    // Expiration
    timeline.push({
      date: addYears(grantDate, 10),
      event: 'expiration',
      shares: shares - this.calculateVestedShares(grant, addYears(grantDate, 10)).vestedShares,
      cumulativeShares: shares,
      percentage: 100
    });
    
    return timeline;
  }
}
```

### 3.3 API Endpoints

```typescript
// ESOP Pool
router.get('/esop/pool', async (req, res) => {
  const pool = await ESOPPool.findOne({ companyId: req.auth.companyId });
  res.json(pool);
});

router.post('/esop/pool', async (req, res) => {
  const { totalShares } = req.body;
  const pool = await ESOPPool.create({
    companyId: req.auth.companyId,
    totalShares,
    grantedShares: 0,
    exercisedShares: 0,
    cancelledShares: 0,
    availableShares: totalShares
  });
  res.json(pool);
});

// Grants
router.post('/esop/grants', async (req, res) => {
  const { employeeId, shares, strikePrice, vestingSchedule } = req.body;
  
  const grant = await ESOPGrant.create({
    employeeId,
    grantNumber: `ESOP-${new Date().getFullYear()}-${uuid().slice(0, 4)}`,
    shares,
    strikePrice,
    grantDate: new Date(),
    vestingSchedule,
    status: 'active'
  });
  
  // Update pool
  await ESOPPool.updateOne(
    { companyId: req.auth.companyId },
    { $inc: { grantedShares: shares, availableShares: -shares } }
  );
  
  res.json(grant);
});

router.get('/esop/grants/:id', async (req, res) => {
  const grant = await ESOPGrant.findById(req.params.id);
  const vesting = vestingCalculator.calculateVestedShares(grant);
  const schedule = vestingCalculator.generateVestingSchedule(grant);
  
  res.json({ grant, vesting, schedule });
});

router.post('/esop/grants/:id/exercise', async (req, res) => {
  const { shares, paymentMethod } = req.body;
  const grant = await ESOPGrant.findById(req.params.id);
  
  // Validate
  const vesting = vestingCalculator.calculateVestedShares(grant);
  if (shares > vesting.vestedShares) {
    return res.status(400).json({ error: 'Cannot exercise more than vested shares' });
  }
  
  // Calculate tax
  const tax = vestingCalculator.calculateExerciseTax(grant, new Date());
  
  // Create exercise record
  const exercise = await ESOPExercise.create({
    grantId: grant.id,
    employeeId: grant.employeeId,
    shares,
    strikePrice: grant.strikePrice,
    exercisePrice: grant.strikePrice * shares,
    paymentMethod,
    taxAmount: tax.totalTax,
    fairMarketValue: tax.fairMarketValue,
    bargainElement: tax.bargainElement,
    status: 'pending'
  });
  
  res.json({ exercise, tax });
});

router.post('/esop/exercises/:id/approve', async (req, res) => {
  // Manager approval
  const exercise = await ESOPExercise.findById(req.params.id);
  exercise.status = 'approved';
  exercise.approvedBy = req.auth.userId;
  exercise.approvedAt = new Date();
  await exercise.save();
  
  // Complete exercise
  exercise.status = 'completed';
  exercise.completedAt = new Date();
  exercise.sharesIssued = exercise.shares;  // Simplified
  await exercise.save();
  
  // Update grant
  await ESOPGrant.updateOne(
    { _id: exercise.grantId },
    { 
      $inc: { exercisedShares: exercise.shares },
      $set: { status: exercise.shares === vesting.shares ? 'exercised' : 'active' }
    }
  );
  
  res.json({ success: true });
});
```

---

## Module 4: BoardOS (Week 4-5)

### 4.1 Data Model

```typescript
interface BoardMeeting {
  id: string;
  companyId: string;
  
  meetingNumber: string;  // e.g., "2024-05"
  type: 'annual' | 'board' | 'committee';
  date: Date;
  time?: string;
  location?: string;
  virtualLink?: string;
  
  // Agenda
  agenda: AgendaItem[];
  
  // Attendees
  attendees: BoardAttendee[];
  
  // Materials
  materials: Document[];
  
  // Outcomes
  minutes?: string;
  resolutions: Resolution[];
  
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  
  createdBy: string;
  createdAt: Date;
}

interface AgendaItem {
  id: string;
  order: number;
  title: string;
  description?: string;
  presenter?: string;
  duration: number;  // minutes
  type: 'presentation' | 'discussion' | 'decision' | 'report';
  documents: Document[];
}

interface BoardAttendee {
  userId: string;
  name: string;
  role: 'chairman' | 'director' | 'observer' | 'invitee';
  attending: boolean;
  attendedAt?: Date;
  apologies?: boolean;
}

interface Resolution {
  id: string;
  number: string;  // e.g., "RES-2024-05-01"
  
  title: string;
  description: string;
  
  resolutionType: 
    | 'appointment'
    | 'financial'
    | 'corporate'
    | 'regulatory'
    | 'general';
  
  proposedBy: string;
  secondedBy?: string;
  
  votes: Vote[];
  votesFor: number;
  votesAgainst: number;
  votesAbstained: number;
  
  status: 'proposed' | 'passed' | 'failed' | 'withdrawn';
  passedAt?: Date;
  
  executed: boolean;
  executedAt?: Date;
  executionDetails?: string;
}

interface Vote {
  voterId: string;
  voterName: string;
  vote: 'for' | 'against' | 'abstain';
  votedAt: Date;
}
```

### 4.2 API Endpoints

```typescript
// Meetings
router.get('/meetings', async (req, res) => {
  const meetings = await BoardMeeting.find({ companyId: req.auth.companyId })
    .sort({ date: -1 });
  res.json(meetings);
});

router.post('/meetings', async (req, res) => {
  const { type, date, agenda, attendees } = req.body;
  
  // Generate meeting number
  const count = await BoardMeeting.countDocuments({
    companyId: req.auth.companyId,
    date: { $gte: new Date(new Date().getFullYear(), 0, 1) }
  });
  
  const meeting = await BoardMeeting.create({
    companyId: req.auth.companyId,
    meetingNumber: `${new Date().getFullYear()}-${String(count + 1).padStart(2, '0')}`,
    type,
    date,
    agenda,
    attendees,
    status: 'scheduled'
  });
  
  // Send calendar invites
  await this.sendCalendarInvites(meeting);
  
  res.json(meeting);
});

router.post('/meetings/:id/resolutions', async (req, res) => {
  const { title, description, type, proposedBy } = req.body;
  
  const meeting = await BoardMeeting.findById(req.params.id);
  
  // Generate resolution number
  const resNumber = `${meeting.meetingNumber}-${String(meeting.resolutions.length + 1).padStart(2, '0')}`;
  
  const resolution = await Resolution.create({
    meetingId: meeting.id,
    number: resNumber,
    title,
    description,
    resolutionType: type,
    proposedBy,
    status: 'proposed'
  });
  
  meeting.resolutions.push(resolution);
  await meeting.save();
  
  res.json(resolution);
});

router.post('/resolutions/:id/vote', async (req, res) => {
  const { vote } = req.body;  // 'for' | 'against' | 'abstain'
  
  const resolution = await Resolution.findById(req.params.id);
  
  // Check if voter is eligible
  // Update vote
  
  resolution.votes.push({
    voterId: req.auth.userId,
    voterName: req.auth.name,
    vote,
    votedAt: new Date()
  });
  
  // Update counts
  resolution[`votes${vote.charAt(0).toUpperCase() + vote.slice(1)}`]++;
  
  // Check if passed/failed
  if (resolution.votesFor > resolution.votes.length / 2) {
    resolution.status = 'passed';
    resolution.passedAt = new Date();
  } else if (resolution.votesAgainst > resolution.votes.length / 2) {
    resolution.status = 'failed';
  }
  
  await resolution.save();
  
  res.json(resolution);
});
```

---

## Module 5: Investor Portal (Week 5-6)

### 5.1 Features

```
Investor Portal (Port 4803)
│
├── Dashboard
│   ├── Portfolio summary
│   ├── Recent updates
│   └── Key metrics
│
├── Cap Table Access
│   ├── View holdings
│   ├── View dilution
│   └── Download reports
│
├── Financial Reports
│   ├── Monthly financials
│   ├── Quarterly reports
│   ├── Annual reports
│   └── Board decks
│
├── Document Room
│   ├── Legal documents
│   ├── Cap table
│   └── Audit reports
│
├── Communication
│   ├── Founder updates
│   ├── Investor announcements
│   └── Q&A
│
└── K-1 Generation (US investors)
    ├── Year-end K-1
    ├── Tax estimates
    └── Document upload
```

### 5.2 API Endpoints

```typescript
// Investor Portal routes
router.use('/portal/investor', investorAuth);  // Special investor auth

router.get('/portal/dashboard', async (req, res) => {
  // Get investor's portfolio
  const investor = await getInvestor(req.auth.investorId);
  
  res.json({
    summary: {
      totalInvestment: investor.totalCommitted,
      currentValue: await calculateCurrentValue(investor),
      ownership: await calculateOwnership(investor),
      multiple: await calculateMOIC(investor)
    },
    recentUpdates: await getRecentUpdates(investor.companyId),
    upcomingEvents: await getUpcomingEvents(investor.companyId)
  });
});

router.get('/portal/cap-table', async (req, res) => {
  // Investor can see full cap table
  const capTable = await getCapTable(req.auth.companyId);
  const myHoldings = capTable.equities.filter(
    e => e.shareholderId === req.auth.investorId
  );
  
  res.json({
    fullCapTable: capTable,
    myHoldings,
    ownership: calculateMyOwnership(myHoldings, capTable)
  });
});

router.get('/portal/documents', async (req, res) => {
  const { type } = req.query;  // 'financial' | 'legal' | 'board'
  
  const documents = await Document.find({
    companyId: req.auth.companyId,
    investorVisible: true,
    type
  }).sort({ date: -1 });
  
  res.json(documents);
});

router.get('/portal/k1/:year', async (req, res) => {
  const { year } = req.params;
  
  const k1 = await K1Generator.generate({
    investorId: req.auth.investorId,
    companyId: req.auth.companyId,
    taxYear: year
  });
  
  res.json(k1);
});
```

---

## Module 6: Due Diligence Room (Week 6)

### 6.1 Data Model

```typescript
interface DataRoom {
  id: string;
  companyId: string;
  
  name: string;  // "Series B Due Diligence"
  type: 'fundraising' | 'acquisition' | 'audit' | 'legal';
  status: 'active' | 'closed' | 'archived';
  
  // Access
  accessList: DataRoomAccess[];
  
  // Documents
  folders: DataRoomFolder[];
  
  // Activity
  activityLog: Activity[];
  
  // Expiration
  expiresAt?: Date;
  
  createdAt: Date;
  closedAt?: Date;
}

interface DataRoomFolder {
  id: string;
  name: string;
  parentId?: string;
  order: number;
  
  // Permissions
  minAccessLevel: 'observer' | 'member' | 'admin';
  
  documents: DataRoomDocument[];
}

interface DataRoomDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  
  uploadedBy: string;
  uploadedAt: Date;
  
  // Access
  accessList: string[];  // Investor IDs
  viewCount: number;
  downloadCount: number;
}

interface DataRoomAccess {
  investorId: string;
  investorName: string;
  email: string;
  accessLevel: 'observer' | 'member' | 'admin';
  
  // Access log
  loginCount: number;
  lastAccess?: Date;
  
  // Permissions
  canView: string[];  // Folder IDs
  canDownload: boolean;
  canUpload: boolean;
  
  invitedAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
}
```

### 6.2 API Endpoints

```typescript
// Data Room Management
router.post('/data-rooms', async (req, res) => {
  const { name, type, accessList, expiration } = req.body;
  
  const dataRoom = await DataRoom.create({
    companyId: req.auth.companyId,
    name,
    type,
    status: 'active',
    accessList,
    folders: getDefaultFolders(type),
    expiresAt: expiration
  });
  
  // Send access invites
  for (const access of accessList) {
    await sendDataRoomInvite(access.email, dataRoom.id);
  }
  
  res.json(dataRoom);
});

router.post('/data-rooms/:id/documents', upload.array('files'), async (req, res) => {
  const { folderId } = req.body;
  
  const documents = [];
  for (const file of req.files) {
    const doc = await DataRoomDocument.create({
      roomId: req.params.id,
      folderId,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      url: await uploadToStorage(file),
      uploadedBy: req.auth.userId,
      uploadedAt: new Date()
    });
    documents.push(doc);
  }
  
  res.json(documents);
});

router.get('/data-rooms/:id/activity', async (req, res) => {
  const activity = await Activity.find({ roomId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(100);
  
  res.json(activity);
});
```

---

## InvestorOS Service Structure

```
services/investor-os/
├── src/
│   ├── index.ts                 # Express server (port 4802)
│   ├── models/
│   │   ├── capTable.ts
│   │   ├── fundraising.ts
│   │   ├── esop.ts
│   │   ├── boardMeeting.ts
│   │   └── dataRoom.ts
│   ├── services/
│   │   ├── capTableEngine.ts
│   │   ├── fundraisingWorkflow.ts
│   │   ├── vestingCalculator.ts
│   │   └── k1Generator.ts
│   ├── routes/
│   │   ├── capTable.ts
│   │   ├── fundraising.ts
│   │   ├── esop.ts
│   │   ├── board.ts
│   │   └── dataRoom.ts
│   ├── middleware/
│   │   ├── investorAuth.ts      # Special investor portal auth
│   │   └── capTableAccess.ts   # Shareholder verification
│   └── integrations/
│       ├── treasury.ts          # Connect to RABTUL Treasury
│       ├── accounting.ts        # Connect to Finance OS
│       └── notifications.ts     # Email/in-app notifications
├── tests/
│   ├── capTable.test.ts
│   ├── fundraising.test.ts
│   ├── esop.test.ts
│   └── vesting.test.ts
└── package.json
```

---

## Estimated Lines of Code

| Module | TypeScript Lines |
|--------|------------------|
| CapTableOS | ~800 |
| FundraisingOS | ~600 |
| ESOPOS | ~700 |
| BoardOS | ~500 |
| Investor Portal | ~400 |
| Due Diligence Room | ~300 |
| Integrations | ~200 |
| **Total** | **~3,500** |

---

## Integration Points

```
InvestorOS
│
├── RABTUL Treasury (4055)
│   └── Pull cash position for valuation
│
├── Finance OS (4801)
│   └── Pull financial statements for investor reports
│
├── CorpID (4702)
│   └── Investor identity verification
│
├── TwinOS (4705)
│   └── Investor Financial Twin
│
├── MemoryOS (4703)
│   └── Investor communication history
│
└── Notification Service
    └── Investor updates, K-1 notifications
```

---

## Testing

```bash
# Test cap table calculations
curl -X POST http://localhost:4802/api/cap-table/dilution \
  -H 'Content-Type: application/json' \
  -d '{"newInvestment": 5000000, "preMoney": 20000000}'

# Test ESOP vesting
curl http://localhost:4802/api/esop/grants/GRANT-ID \
  -H 'Authorization: Bearer TOKEN'

# Test board resolution
curl -X POST http://localhost:4802/api/resolutions/RES-ID/vote \
  -H 'Content-Type: application/json' \
  -d '{"vote": "for"}'

# Test investor portal
curl http://localhost:4802/portal/dashboard \
  -H 'X-Investor-Token: INVESTOR_TOKEN'
```

---

*InvestorOS Build Plan*
*Duration: 6 weeks*
*Status: Ready to build*
