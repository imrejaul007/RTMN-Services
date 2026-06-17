/**
 * WealthProfile Model
 * Represents a customer's wealth management profile
 */

export interface WealthProfile {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  phone?: string;

  // Financial Overview
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'very-aggressive';

  // Investment Accounts
  accounts: InvestmentAccount[];

  // Portfolio Summary
  portfolio: PortfolioSummary;

  // Goals
  financialGoals: FinancialGoal[];

  // Status
  status: 'active' | 'inactive' | 'pending-review';
  lastUpdated: Date;
  createdAt: Date;
}

export interface InvestmentAccount {
  id: string;
  type: 'brokerage' | 'retirement' | 'savings' | 'mutual-fund' | 'etf' | 'crypto';
  name: string;
  provider: string;
  balance: number;
  currency: string;
  lastSync: Date;
  accountNumber?: string; // Masked
}

export interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  ytdReturn: number;
  ytdReturnPercent: number;
  sinceInception: number;
  sinceInceptionPercent: number;

  allocations: Allocation[];
  holdings: Holding[];
}

export interface Allocation {
  category: string;
  percentage: number;
  value: number;
  change: number;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  value: number;
  costBasis: number;
  gain: number;
  gainPercent: number;
  assetClass: string;
  sector?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  type: 'retirement' | 'education' | 'home' | 'emergency' | 'custom';
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  monthlyContribution: number;
  expectedReturn: number;
  progress: number;
  status: 'on-track' | 'behind' | 'ahead' | 'completed';
}

// In-memory storage for demo
export class WealthProfileStore {
  private profiles: Map<string, WealthProfile> = new Map();

  create(profile: Omit<WealthProfile, 'id' | 'createdAt' | 'lastUpdated'>): WealthProfile {
    const id = `WMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const fullProfile: WealthProfile = {
      ...profile,
      id,
      createdAt: now,
      lastUpdated: now
    };
    this.profiles.set(id, fullProfile);
    return fullProfile;
  }

  findById(id: string): WealthProfile | undefined {
    return this.profiles.get(id);
  }

  findByCustomerId(customerId: string): WealthProfile | undefined {
    for (const profile of this.profiles.values()) {
      if (profile.customerId === customerId) {
        return profile;
      }
    }
    return undefined;
  }

  update(id: string, updates: Partial<WealthProfile>): WealthProfile | undefined {
    const existing = this.profiles.get(id);
    if (!existing) return undefined;

    const updated: WealthProfile = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      lastUpdated: new Date()
    };

    // Recalculate net worth
    updated.netWorth = updated.totalAssets - updated.totalLiabilities;

    this.profiles.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.profiles.delete(id);
  }

  findAll(): WealthProfile[] {
    return Array.from(this.profiles.values());
  }
}

// Singleton instance
export const wealthProfileStore = new WealthProfileStore();
