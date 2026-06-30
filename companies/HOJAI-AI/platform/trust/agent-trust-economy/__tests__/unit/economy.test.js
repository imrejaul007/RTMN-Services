import { describe, it, expect } from 'vitest';

// Agent Trust Economy Unit Tests

function createAccount(agentId, initialCredits = 100) {
  return {
    agentId,
    credits: initialCredits,
    staked: 0,
    reputation: 0,
    totalEarned: 0,
    totalSpent: 0,
    transactionCount: 0
  };
}

function calculateReputation(account) {
  if (account.transactionCount === 0) return 50;
  let rep = Math.min(80, account.transactionCount * 2);
  rep += Math.min(10, account.credits / 100);
  rep += Math.min(10, account.staked / 50);
  return Math.round(rep);
}

describe('Agent Trust Economy - Account Creation', () => {
  it('should create account with default credits', () => {
    const account = createAccount('agent_1');
    expect(account.credits).toBe(100);
    expect(account.staked).toBe(0);
  });

  it('should create account with custom credits', () => {
    const account = createAccount('agent_1', 500);
    expect(account.credits).toBe(500);
  });
});

describe('Agent Trust Economy - Reputation', () => {
  it('should return 50 for new account', () => {
    const account = createAccount('agent_1');
    expect(calculateReputation(account)).toBe(50);
  });

  it('should increase reputation with transactions', () => {
    const account = createAccount('agent_1');
    account.transactionCount = 30;
    const rep = calculateReputation(account);
    expect(rep).toBeGreaterThan(50);
  });

  it('should cap reputation at 100', () => {
    const account = createAccount('agent_1');
    account.transactionCount = 100;
    account.credits = 10000;
    account.staked = 5000;
    const rep = calculateReputation(account);
    expect(rep).toBeLessThanOrEqual(100);
  });

  it('should factor in credits', () => {
    const lowCredits = createAccount('agent_1');
    lowCredits.transactionCount = 10;
    lowCredits.credits = 10;

    const highCredits = createAccount('agent_2');
    highCredits.transactionCount = 10;
    highCredits.credits = 1000;

    expect(calculateReputation(highCredits)).toBeGreaterThan(calculateReputation(lowCredits));
  });
});

describe('Agent Trust Economy - Staking', () => {
  it('should calculate 5% staking reward', () => {
    const stakeAmount = 100;
    const reward = stakeAmount * 0.05;
    expect(reward).toBe(5);
  });

  it('should release stake + reward', () => {
    const staked = 100;
    const reward = staked * 0.05;
    const release = staked + reward;
    expect(release).toBe(105);
  });
});

describe('Agent Trust Economy - Integration', () => {
  it('should model successful agent', () => {
    const agent = createAccount('procurement_agent');
    agent.transactionCount = 50;
    agent.credits = 500;
    agent.staked = 200;
    agent.totalEarned = 1000;
    agent.totalSpent = 500;

    const rep = calculateReputation(agent);
    expect(rep).toBeGreaterThan(70);
  });

  it('should model new agent', () => {
    const agent = createAccount('new_agent', 50);
    const rep = calculateReputation(agent);
    expect(rep).toBe(50);
  });

  it('should model high-volume trader', () => {
    const agent = createAccount('trader');
    agent.transactionCount = 200;
    agent.credits = 10000;
    agent.staked = 5000;

    const rep = calculateReputation(agent);
    expect(rep).toBeGreaterThan(90);
  });
});
