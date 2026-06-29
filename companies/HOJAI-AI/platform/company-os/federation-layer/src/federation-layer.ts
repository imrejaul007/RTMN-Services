/**
 * Federation Layer Service
 *
 * Global commerce infrastructure.
 */

import { v4 as uuidv4 } from 'uuid';
import { Federation, CrossBorderTransaction, Settlement, TradeCompliance } from './types';

// ============================================
// In-Memory Stores
// ============================================

const federations = new Map<string, Federation>();
const crossBorderTxns = new Map<string, CrossBorderTransaction>();
const settlements = new Map<string, Settlement>();

// ============================================
// Exchange Rates (mock)
const EXCHANGE_RATES: Record<string, number> = {
  'INR-USD': 0.012,
  'USD-INR': 83.5,
  'INR-EUR': 0.011,
  'EUR-INR': 91.2,
  'INR-GBP': 0.0095,
  'GBP-INR': 105.5,
};

// ============================================
// Federation Layer Service
// ============================================

export class FederationLayer {
  /**
   * Create a federation
   */
  createFederation(params: {
    name: string;
    type: 'regional' | 'national' | 'global';
    countries: string[];
    currencies: string[];
  }): Federation {
    const federation: Federation = {
      id: `fed_${uuidv4().slice(0, 8)}`,
      name: params.name,
      type: params.type,
      countries: params.countries,
      currencies: params.currencies,
      status: 'forming',
      createdAt: new Date().toISOString(),
    };

    federations.set(federation.id, federation);
    return federation;
  }

  /**
   * Activate federation
   */
  activateFederation(federationId: string): Federation | null {
    const federation = federations.get(federationId);
    if (!federation) return null;
    federation.status = 'active';
    return federation;
  }

  /**
   * Get federation
   */
  getFederation(federationId: string): Federation | null {
    return federations.get(federationId) || null;
  }

  /**
   * List federations
   */
  listFederations(filter?: { type?: string; status?: string }): Federation[] {
    let list = Array.from(federations.values());

    if (filter?.type) list = list.filter(f => f.type === filter.type);
    if (filter?.status) list = list.filter(f => f.status === filter.status);

    return list;
  }

  /**
   * Initiate cross-border transaction
   */
  initiateCrossBorder(params: {
    fromCompany: string;
    toCompany: string;
    fromCountry: string;
    toCountry: string;
    amount: number;
    currency: string;
  }): CrossBorderTransaction {
    const rateKey = `${params.currency}-${params.toCountry}`;
    const exchangeRate = EXCHANGE_RATES[rateKey] || 1;
    const convertedAmount = params.amount * exchangeRate;
    const fees = params.amount * 0.01; // 1% fee

    const transaction: CrossBorderTransaction = {
      id: `xborder_${uuidv4().slice(0, 8)}`,
      fromCompany: params.fromCompany,
      toCompany: params.toCompany,
      fromCountry: params.fromCountry,
      toCountry: params.toCountry,
      amount: params.amount,
      currency: params.currency,
      convertedAmount,
      exchangeRate,
      fees,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    crossBorderTxns.set(transaction.id, transaction);
    return transaction;
  }

  /**
   * Process cross-border transaction
   */
  processCrossBorder(transactionId: string): CrossBorderTransaction | null {
    const txn = crossBorderTxns.get(transactionId);
    if (!txn) return null;

    txn.status = 'processing';
    // In production: call banking/payment APIs
    txn.status = 'completed';
    return txn;
  }

  /**
   * Get cross-border transaction
   */
  getCrossBorderTransaction(transactionId: string): CrossBorderTransaction | null {
    return crossBorderTxns.get(transactionId) || null;
  }

  /**
   * Create settlement
   */
  createSettlement(params: {
    networkId: string;
    parties: string[];
    totalAmount: number;
    currency: string;
  }): Settlement {
    const settlement: Settlement = {
      id: `settle_${uuidv4().slice(0, 8)}`,
      networkId: params.networkId,
      parties: params.parties,
      totalAmount: params.totalAmount,
      currency: params.currency,
      status: 'pending',
    };

    settlements.set(settlement.id, settlement);
    return settlement;
  }

  /**
   * Settle
   */
  settle(settlementId: string): Settlement | null {
    const settlement = settlements.get(settlementId);
    if (!settlement) return null;

    settlement.status = 'settled';
    settlement.settledAt = new Date().toISOString();
    return settlement;
  }

  /**
   * Get settlement
   */
  getSettlement(settlementId: string): Settlement | null {
    return settlements.get(settlementId) || null;
  }

  /**
   * Check trade compliance
   */
  checkCompliance(params: {
    transactionId: string;
    fromCountry: string;
    toCountry: string;
    amount: number;
    goodsType?: string;
  }): TradeCompliance {
    const checks = [
      {
        name: 'Sanctions Check',
        passed: true,
      },
      {
        name: 'AML Check',
        passed: params.amount < 1000000,
        details: params.amount >= 1000000 ? 'Amount requires enhanced due diligence' : undefined,
      },
      {
        name: 'Import License',
        passed: true,
      },
      {
        name: 'Tax Compliance',
        passed: true,
      },
    ];

    const compliance: TradeCompliance = {
      id: `comp_${uuidv4().slice(0, 8)}`,
      transactionId: params.transactionId,
      checks,
      status: checks.every(c => c.passed) ? 'compliant' : 'flagged',
    };

    return compliance;
  }

  /**
   * Get exchange rate
   */
  getExchangeRate(from: string, to: string): number {
    return EXCHANGE_RATES[`${from}-${to}`] || 1;
  }

  /**
   * Get federation stats
   */
  getStats(): {
    totalFederations: number;
    activeFederations: number;
    totalCrossBorderTransactions: number;
    totalSettlements: number;
  } {
    return {
      totalFederations: federations.size,
      activeFederations: Array.from(federations.values()).filter(f => f.status === 'active').length,
      totalCrossBorderTransactions: crossBorderTxns.size,
      totalSettlements: settlements.size,
    };
  }
}

export const federationLayer = new FederationLayer();