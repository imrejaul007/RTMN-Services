/**
 * Creator Economy Types
 *
 * Partner ecosystem, revenue sharing, certification.
 */

export type PartnerType = 'developer' | 'agency' | 'integrator' | 'consultant';

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  email: string;
  phone?: string;
  companyId?: string;
  status: 'active' | 'pending' | 'suspended';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  revenueShare: number;        // Percentage
  totalEarnings: number;
  createdAt: string;
}

export interface RevenueShare {
  id: string;
  partnerId: string;
  source: 'company_creation' | 'subscription' | 'transaction' | 'referral';
  amount: number;
  companyId?: string;
  transactionId?: string;
  sharePercentage: number;
  shareAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
}

export interface Certification {
  id: string;
  partnerId: string;
  type: 'developer' | 'implementer' | 'trainer';
  name: string;
  issuedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked';
  score: number;               // 0-100
}

export interface PartnerReferral {
  id: string;
  referrerId: string;
  refereeId: string;
  reward: number;
  status: 'pending' | 'completed';
  createdAt: string;
}
