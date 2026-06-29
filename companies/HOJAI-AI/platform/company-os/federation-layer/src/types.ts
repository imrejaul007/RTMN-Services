/**
 * Federation Layer Types
 *
 * Global commerce, cross-border, settlement.
 */

export interface Federation {
  id: string;
  name: string;
  type: 'regional' | 'national' | 'global';
  countries: string[];
  currencies: string[];
  status: 'active' | 'forming';
  createdAt: string;
}

export interface CrossBorderTransaction {
  id: string;
  fromCompany: string;
  toCompany: string;
  fromCountry: string;
  toCountry: string;
  amount: number;
  currency: string;
  convertedAmount?: number;
  exchangeRate?: number;
  fees: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface Settlement {
  id: string;
  networkId: string;
  parties: string[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'settled';
  settledAt?: string;
}

export interface TradeCompliance {
  id: string;
  transactionId: string;
  checks: {
    name: string;
    passed: boolean;
    details?: string;
  }[];
  status: 'compliant' | 'flagged' | 'blocked';
}
