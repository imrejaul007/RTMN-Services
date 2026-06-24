/**
 * REZ Coin — Type definitions
 *
 * REZ is a utility token + loyalty points hybrid for the RTMN ecosystem.
 * 1 REZ = 1 INR of merchant-funded commission value.
 */

/** REZ transaction kinds. */
export type RezTxKind =
  | 'mint'              // Mint (merchant pays commission → REZ minted to wallet)
  | 'burn'              // Burn (customer spends REZ → REZ burned)
  | 'transfer'          // P2P transfer
  | 'reward'            // System reward (referral, sign-up, etc.)
  | 'cashback'          // Cashback from a purchase
  | 'stake'             // Locked in staking
  | 'unstake'           // Released from staking
  | 'fee'               // Network fee
  | 'expire';           // Inactive wallet decay (2%/year)

/** Wallet status. */
export type WalletStatus = 'active' | 'frozen' | 'pending-kyc' | 'closed';

/** A REZ wallet. */
export interface Wallet {
  id: string;
  /** Owner identifier (Nexha id, customer id, merchant id, agent id) */
  ownerId: string;
  ownerType: 'nexha' | 'customer' | 'merchant' | 'agent' | 'system';
  /** Display name (cached for UI) */
  displayName: string;
  /** Balance in REZ (1 REZ = 1 INR) */
  balance: number;
  /** Balance locked in staking */
  stakedBalance: number;
  /** Lifetime earned (all time) */
  lifetimeEarned: number;
  /** Lifetime spent (all time) */
  lifetimeSpent: number;
  /** Last activity timestamp (for decay calculation) */
  lastActivityAt: string;
  /** Wallet status */
  status: WalletStatus;
  /** Created/updated timestamps */
  createdAt: string;
  updatedAt: string;
}

/** A REZ transaction. */
export interface RezTransaction {
  id: string;
  kind: RezTxKind;
  fromWalletId?: string;  // optional for mint
  toWalletId?: string;    // optional for burn
  amount: number;          // positive for credit, negative for debit
  /** Reference (e.g. purchase id, referral id) */
  reference?: string;
  /** Memo / description */
  memo?: string;
  /** Balance after this transaction (for sender or recipient) */
  balanceAfter?: number;
  /** Hash for audit trail (mock hash for MVP) */
  hash: string;
  /** When */
  occurredAt: string;
}

/** Supply stats. */
export interface SupplyStats {
  totalSupply: number;
  totalWallets: number;
  totalTransactions: number;
  totalBurned: number;
  totalMinted: number;
  averageBalance: number;
  topHolders: Array<{ ownerId: string; displayName: string; balance: number }>;
  /** Decay rate (2%/year for inactive wallets) */
  annualDecayRate: number;
  generatedAt: string;
}

/** Health response. */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  uptime: number;
  totalSupply: number;
  totalWallets: number;
  timestamp: string;
}