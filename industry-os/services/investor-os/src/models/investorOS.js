/**
 * InvestorOS - Complete Investment Management System
 *
 * Modules:
 * - CapTableOS: Shareholders, equity, dilution
 * - FundraisingOS: Deals, SAFEs, YCCSAs
 * - ESOPOS: Options, vesting, exercise
 * - BoardOS: Meetings, resolutions
 * - DataRoomOS: Due diligence
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// CAP TABLE MODELS
// ============================================================

class CapTable {
  constructor(companyId) {
    this.companyId = companyId;
    this.shareholders = [];
    this.equities = [];
    this.optionPool = {
      totalShares: 0,
      grantedShares: 0,
      exercisedShares: 0,
      cancelledShares: 0,
      availableShares: 0
    };
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  addShareholder(shareholder) {
    const id = uuidv4();
    const newShareholder = {
      id,
      ...shareholder,
      createdAt: new Date()
    };
    this.shareholders.push(newShareholder);
    this.updatedAt = new Date();
    return newShareholder;
  }

  addEquity(equity) {
    const id = uuidv4();
    const newEquity = {
      id,
      ...equity,
      createdAt: new Date()
    };
    this.equities.push(newEquity);
    this.updatedAt = new Date();
    return newEquity;
  }

  getTotalShares() {
    return this.equities.reduce((sum, e) => sum + e.shares, 0);
  }

  getOwnership() {
    const total = this.getTotalShares();
    return this.shareholders.map(s => {
      const shareholderEquities = this.equities.filter(e => e.shareholderId === s.id);
      const shares = shareholderEquities.reduce((sum, e) => sum + e.shares, 0);
      return {
        shareholder: s,
        shares,
        percentage: total > 0 ? ((shares / total) * 100).toFixed(4) : 0
      };
    }).sort((a, b) => b.shares - a.shares);
  }

  calculateDilution(newInvestment, preMoney) {
    const currentShares = this.getTotalShares();
    const pricePerShare = preMoney / currentShares;
    const newShares = Math.floor(newInvestment / pricePerShare);
    const postMoney = preMoney + newInvestment;

    const newOwnership = {
      shareholders: this.getOwnership().map(o => ({
        ...o,
        percentageAfter: ((o.shares / (currentShares + newShares)) * 100).toFixed(4)
      })),
      investors: {
        shares: newShares,
        percentage: ((newShares / (currentShares + newShares)) * 100).toFixed(4),
        pricePerShare: pricePerShare.toFixed(6),
        investment: newInvestment
      },
      summary: {
        preMoney,
        newInvestment,
        postMoney,
        pricePerShare,
        currentShares,
        newShares,
        totalShares: currentShares + newShares
      }
    };

    return newOwnership;
  }

  getFullyDiluted() {
    const currentShares = this.getTotalShares();
    const totalOptions = this.optionPool.grantedShares - this.optionPool.exercisedShares;
    return {
      basicShares: currentShares,
      optionsOutstanding: totalOptions,
      fullyDilutedShares: currentShares + totalOptions,
      optionPoolPercentage: ((totalOptions / (currentShares + totalOptions)) * 100).toFixed(4)
    };
  }
}

// ============================================================
// FUNDRAISING MODELS
// ============================================================

class FundraisingRound {
  constructor(data) {
    this.id = uuidv4();
    this.companyId = data.companyId;
    this.type = data.type || 'seed';
    this.name = data.name;
    this.targetAmount = data.targetAmount;
    this.raisedAmount = 0;
    this.preMoneyValuation = data.preMoneyValuation;
    this.postMoneyValuation = data.preMoneyValuation;
    this.status = 'planned';
    this.investors = [];
    this.terms = data.terms || {};
    this.createdAt = new Date();
    this.closedAt = null;
  }

  addInvestor(investor) {
    const id = uuidv4();
    const newInvestor = {
      id,
      ...investor,
      status: 'committed',
      committedAt: new Date()
    };
    this.investors.push(newInvestor);
    return newInvestor;
  }

  close(investments) {
    this.status = 'closed';
    this.closedAt = new Date();
    this.raisedAmount = investments.reduce((sum, i) => sum + i.amount, 0);
    this.postMoneyValuation = this.preMoneyValuation + this.raisedAmount;
    return this;
  }

  getPricePerShare(totalShares) {
    return this.preMoneyValuation / totalShares;
  }
}

class SAFE {
  constructor(data) {
    this.id = uuidv4();
    this.investorId = data.investorId;
    this.investorName = data.investorName;
    this.companyId = data.companyId;
    this.type = data.type || 'post-money'; // 'pre-money' or 'post-money'
    this.amount = data.amount;
    this.valuationCap = data.valuationCap || null;
    this.discount = data.discount || null;
    this.converted = false;
    this.convertedAt = null;
    this.convertedShares = null;
    this.convertedPrice = null;
    this.maturityDate = data.maturityDate || null;
    this.status = 'active';
    this.createdAt = new Date();
  }

  calculateConversion(nextRound) {
    if (this.converted) return null;

    const { preMoney, shares } = nextRound;
    let pricePerShare;

    if (this.type === 'post-money-cap' && this.valuationCap) {
      // Post-money cap: Investment / (Cap / price per share from valuation)
      const capShares = this.valuationCap / (preMoney / shares);
      pricePerShare = this.amount / capShares;
    } else if (this.type === 'pre-money' && this.valuationCap) {
      // Pre-money cap
      pricePerShare = Math.min(
        preMoney / shares,
        this.valuationCap / shares
      );
    } else if (this.discount) {
      // Discount
      pricePerShare = (preMoney / shares) * this.discount;
    } else {
      pricePerShare = preMoney / shares;
    }

    const convertedShares = Math.floor(this.amount / pricePerShare);

    return {
      pricePerShare,
      shares: convertedShares,
      effectiveValuation: pricePerShare * shares,
      type: this.type
    };
  }

  convert(nextRound) {
    const conversion = this.calculateConversion(nextRound);
    if (!conversion) return null;

    this.converted = true;
    this.convertedAt = new Date();
    this.convertedShares = conversion.shares;
    this.convertedPrice = conversion.pricePerShare;
    this.status = 'converted';

    return {
      ...this,
      ...conversion
    };
  }
}

// ============================================================
// ESOP MODELS
// ============================================================

class ESOPGrant {
  constructor(data) {
    this.id = uuidv4();
    this.employeeId = data.employeeId;
    this.employeeName = data.employeeName;
    this.grantNumber = `ESOP-${new Date().getFullYear()}-${String(data.sequence || 1).padStart(4, '0')}`;
    this.shares = data.shares;
    this.strikePrice = data.strikePrice;
    this.grantDate = data.grantDate || new Date();
    this.vestingSchedule = {
      totalMonths: data.totalMonths || 48,
      cliffMonths: data.cliffMonths || 12,
      vestingFrequency: data.vestingFrequency || 'monthly'
    };
    this.status = 'active';
    this.exercisedShares = 0;
    this.cancelledShares = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  calculateVestedShares(asOfDate = new Date()) {
    const grantDate = new Date(this.grantDate);
    const monthsElapsed = Math.floor((asOfDate - grantDate) / (30 * 24 * 60 * 60 * 1000));

    // Check cliff
    if (monthsElapsed < this.vestingSchedule.cliffMonths) {
      return {
        vestedShares: 0,
        unvestedShares: this.shares - this.exercisedShares - this.cancelledShares,
        percentage: 0,
        monthsElapsed,
        vestedPercentage: 0
      };
    }

    const effectiveMonths = Math.min(monthsElapsed, this.vestingSchedule.totalMonths);
    let vestedShares;

    if (this.vestingSchedule.vestingFrequency === 'monthly') {
      vestedShares = Math.floor((effectiveMonths / this.vestingSchedule.totalMonths) * this.shares);
    } else {
      // Quarterly
      const quarters = Math.floor(effectiveMonths / 3);
      const totalQuarters = Math.floor(this.vestingSchedule.totalMonths / 3);
      vestedShares = Math.floor((quarters / totalQuarters) * this.shares);
    }

    const availableToExercise = vestedShares - this.exercisedShares - this.cancelledShares;

    return {
      vestedShares,
      unvestedShares: this.shares - vestedShares,
      availableToExercise: Math.max(0, availableToExercise),
      exercisedShares: this.exercisedShares,
      cancelledShares: this.cancelledShares,
      percentage: ((vestedShares / this.shares) * 100).toFixed(2),
      monthsElapsed: effectiveMonths,
      monthsRemaining: this.vestingSchedule.totalMonths - effectiveMonths,
      cliffPassed: true,
      fullyVested: effectiveMonths >= this.vestingSchedule.totalMonths
    };
  }

  calculateExerciseTax(exerciseShares, fairMarketValue) {
    const exercisePrice = this.strikePrice * exerciseShares;
    const fmvTotal = fairMarketValue * exerciseShares;
    const bargainElement = Math.max(0, fmvTotal - exercisePrice);

    // India tax calculation (simplified)
    const taxes = {
      tds194A: bargainElement > 200000 ? bargainElement * 0.10 : 0,
      tds192A: bargainElement > 200000 ? bargainElement * 0.30 : 0,
      employerPF: 0,
      stt: 0
    };

    const totalTax = taxes.tds194A + taxes.tds192A;

    return {
      exerciseShares,
      strikePrice: this.strikePrice,
      exercisePrice,
      fairMarketValue: fmvTotal,
      bargainElement,
      taxes,
      totalTax,
      netSharesValue: fmvTotal - totalTax
    };
  }

  generateVestingTimeline() {
    const timeline = [];
    const grantDate = new Date(this.grantDate);
    const { totalMonths, cliffMonths, vestingFrequency } = this.vestingSchedule;

    // Cliff date
    timeline.push({
      date: new Date(grantDate.getTime() + cliffMonths * 30 * 24 * 60 * 60 * 1000),
      event: 'cliff',
      shares: 0,
      description: `${cliffMonths}-month cliff`
    });

    // Monthly or quarterly vesting
    const interval = vestingFrequency === 'monthly' ? 1 : 3;
    for (let m = cliffMonths + interval; m <= totalMonths; m += interval) {
      const vestedAtDate = new Date(grantDate.getTime() + m * 30 * 24 * 60 * 60 * 1000);
      const vestedShares = vestingFrequency === 'monthly'
        ? Math.floor((m / totalMonths) * this.shares)
        : Math.floor((Math.floor(m / 3) / Math.floor(totalMonths / 3)) * this.shares);

      timeline.push({
        date: vestedAtDate,
        event: 'vest',
        shares: vestedShares,
        description: `${vestingFrequency === 'monthly' ? 'Monthly' : 'Quarterly'} vest`
      });
    }

    // Full vest
    const fullVestDate = new Date(grantDate.getTime() + totalMonths * 30 * 24 * 60 * 60 * 1000);
    timeline.push({
      date: fullVestDate,
      event: 'full_vest',
      shares: this.shares,
      description: 'Fully vested'
    });

    // Expiration (10 years from grant)
    const expirationDate = new Date(grantDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
    timeline.push({
      date: expirationDate,
      event: 'expiration',
      shares: 0,
      description: 'Grant expires'
    });

    return timeline;
  }
}

class ESOPPool {
  constructor(companyId, totalShares) {
    this.id = uuidv4();
    this.companyId = companyId;
    this.totalShares = totalShares;
    this.grantedShares = 0;
    this.exercisedShares = 0;
    this.cancelledShares = 0;
    this.availableShares = totalShares;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  allocate(shares) {
    if (shares > this.availableShares) {
      return { success: false, error: 'Insufficient shares in pool' };
    }
    this.grantedShares += shares;
    this.availableShares -= shares;
    this.updatedAt = new Date();
    return { success: true, remaining: this.availableShares };
  }

  release(shares) {
    this.cancelledShares += shares;
    this.grantedShares -= shares;
    this.availableShares += shares;
    this.updatedAt = new Date();
    return { success: true, available: this.availableShares };
  }

  exercise(shares) {
    this.exercisedShares += shares;
    this.grantedShares -= shares;
    this.updatedAt = new Date();
    return { success: true, exercised: this.exercisedShares };
  }
}

// ============================================================
// BOARD MODELS
// ============================================================

class BoardMeeting {
  constructor(data) {
    this.id = uuidv4();
    this.companyId = data.companyId;
    this.meetingNumber = data.meetingNumber || this.generateMeetingNumber();
    this.type = data.type || 'board';
    this.date = data.date;
    this.time = data.time || '10:00';
    this.location = data.location || 'Virtual';
    this.agenda = data.agenda || [];
    this.attendees = data.attendees || [];
    this.resolutions = [];
    this.minutes = null;
    this.status = 'scheduled';
    this.createdAt = new Date();
  }

  generateMeetingNumber() {
    const year = new Date().getFullYear();
    const count = 1; // Would increment in real system
    return `${year}-${String(count).padStart(2, '0')}`;
  }

  addAgendaItem(item) {
    const id = uuidv4();
    const agendaItem = {
      id,
      order: this.agenda.length + 1,
      ...item,
      documents: [],
      status: 'pending'
    };
    this.agenda.push(agendaItem);
    return agendaItem;
  }

  addResolution(resolution) {
    const id = uuidv4();
    const res = {
      id,
      number: `RES-${this.meetingNumber}-${String(this.resolutions.length + 1).padStart(2, '0')}`,
      ...resolution,
      proposedBy: resolution.proposedBy,
      votesFor: 0,
      votesAgainst: 0,
      votesAbstained: 0,
      votes: [],
      status: 'proposed',
      passedAt: null
    };
    this.resolutions.push(res);
    return res;
  }

  castVote(resolutionId, voterId, voterName, vote) {
    const resolution = this.resolutions.find(r => r.id === resolutionId);
    if (!resolution) return null;

    // Check if already voted
    const existingVote = resolution.votes.find(v => v.voterId === voterId);
    if (existingVote) {
      // Update vote
      resolution[`votes${existingVote.vote.charAt(0).toUpperCase() + existingVote.vote.slice(1)}`]--;
      existingVote.vote = vote;
      existingVote.votedAt = new Date();
    } else {
      // New vote
      resolution.votes.push({
        voterId,
        voterName,
        vote,
        votedAt: new Date()
      });
    }

    resolution[`votes${vote.charAt(0).toUpperCase() + vote.slice(1)}`]++;

    // Check if passed
    const totalVotes = resolution.votesFor + resolution.votesAgainst + resolution.votesAbstained;
    if (resolution.votesFor > totalVotes / 2) {
      resolution.status = 'passed';
      resolution.passedAt = new Date();
    } else if (resolution.votesAgainst > totalVotes / 2) {
      resolution.status = 'failed';
    }

    return resolution;
  }

  close(minutes) {
    this.status = 'completed';
    this.minutes = minutes;
    return this;
  }
}

// ============================================================
// DATA ROOM MODELS
// ============================================================

class DataRoom {
  constructor(data) {
    this.id = uuidv4();
    this.companyId = data.companyId;
    this.name = data.name;
    this.type = data.type || 'fundraising';
    this.status = 'active';
    this.accessList = data.accessList || [];
    this.folders = this.initializeFolders(data.type);
    this.documents = [];
    this.expiresAt = data.expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
    this.createdAt = new Date();
    this.closedAt = null;
  }

  initializeFolders(type) {
    const defaultFolders = [
      { id: uuidv4(), name: 'Legal', order: 1, minAccessLevel: 'admin' },
      { id: uuidv4(), name: 'Financials', order: 2, minAccessLevel: 'member' },
      { id: uuidv4(), name: 'Corporate', order: 3, minAccessLevel: 'member' },
      { id: uuidv4(), name: 'Cap Table', order: 4, minAccessLevel: 'admin' },
      { id: uuidv4(), name: 'Contracts', order: 5, minAccessLevel: 'member' }
    ];

    if (type === 'fundraising') {
      return [
        ...defaultFolders,
        { id: uuidv4(), name: 'Due Diligence', order: 6, minAccessLevel: 'member' },
        { id: uuidv4(), name: 'Pitch Deck', order: 7, minAccessLevel: 'observer' }
      ];
    }

    return defaultFolders;
  }

  addAccess(investor) {
    const access = {
      id: uuidv4(),
      investorId: investor.id,
      investorName: investor.name,
      email: investor.email,
      accessLevel: investor.accessLevel || 'observer',
      loginCount: 0,
      lastAccess: null,
      invitedAt: new Date(),
      acceptedAt: null
    };
    this.accessList.push(access);
    return access;
  }

  removeAccess(accessId) {
    const index = this.accessList.findIndex(a => a.id === accessId);
    if (index === -1) return null;
    this.accessList[index].revokedAt = new Date();
    return this.accessList[index];
  }

  addDocument(folderId, document) {
    const doc = {
      id: uuidv4(),
      folderId,
      ...document,
      uploadedBy: document.uploadedBy,
      uploadedAt: new Date(),
      viewCount: 0,
      downloadCount: 0,
      accessList: []
    };
    this.documents.push(doc);
    return doc;
  }

  trackAccess(investorId) {
    const access = this.accessList.find(a => a.investorId === investorId);
    if (access) {
      access.loginCount++;
      access.lastAccess = new Date();
      if (!access.acceptedAt) {
        access.acceptedAt = new Date();
      }
    }
    return access;
  }
}

module.exports = {
  CapTable,
  FundraisingRound,
  SAFE,
  ESOPGrant,
  ESOPPool,
  BoardMeeting,
  DataRoom
};
