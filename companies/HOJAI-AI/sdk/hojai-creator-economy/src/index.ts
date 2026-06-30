/**
 * @hojai/creator-economy-sdk
 *
 * SDK for HOJAI Creator Economy - Partner ecosystem with revenue sharing
 */

export interface Partner {
  id: string;
  name: string;
  type: 'developer' | 'agency' | 'integrator' | 'consultant';
  email: string;
  phone?: string;
  companyId?: string;
  status: 'active' | 'pending' | 'suspended';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalEarnings: number;
  createdAt: string;
}

export interface RevenueShare {
  id: string;
  partnerId: string;
  source: 'company_creation' | 'subscription' | 'transaction' | 'referral';
  amount: number;
  sharePercentage: number;
  shareAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  partnerId: string;
  type: 'bank_transfer' | 'upi' | 'paypal' | 'stripe';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionRef?: string;
  createdAt: string;
  paidAt?: string;
}

export interface Certification {
  id: string;
  partnerId: string;
  type: 'developer' | 'implementer' | 'trainer';
  name: string;
  score: number;
  status: 'active' | 'expired' | 'revoked';
  issuedAt: string;
  expiresAt?: string;
}

export interface EarningsSummary {
  total: number;
  pending: number;
  paid: number;
  withdrawable: number;
  history: RevenueShare[];
}

export interface PartnerDashboard {
  partner: Partner;
  earnings: EarningsSummary;
  referrals: { total: number; completed: number; pending: number };
  benefits: string[];
  tierProgress: {
    tier: string;
    nextTier: string | null;
    progress: number;
    amountToNext: number;
  };
}

export interface PartnerBenefits {
  tier: string;
  benefits: string[];
  limits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
}

export class CreatorEconomySDK {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:4514') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // === Partner Management ===

  async registerPartner(params: {
    name: string;
    type: Partner['type'];
    email: string;
    phone?: string;
    companyId?: string;
  }): Promise<Partner> {
    return this.request<Partner>('/api/partners', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPartner(id: string): Promise<Partner & {
    earnings: EarningsSummary;
    certifications: Certification[];
    benefits: string[];
    referrals: { total: number; completed: number; pending: number };
  }> {
    return this.request(`/api/partners/${id}`);
  }

  async listPartners(query?: { type?: string; status?: string }): Promise<{ partners: Partner[] }> {
    const params = new URLSearchParams(query as any);
    return this.request(`/api/partners${params.toString() ? `?${params}` : ''}`);
  }

  async activatePartner(id: string): Promise<Partner> {
    return this.request<Partner>(`/api/partners/${id}/activate`, { method: 'POST' });
  }

  // === Earnings ===

  async recordEarnings(params: {
    partnerId: string;
    source: RevenueShare['source'];
    amount: number;
    companyId?: string;
    transactionId?: string;
  }): Promise<RevenueShare> {
    return this.request<RevenueShare>('/api/earnings', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPartnerEarnings(partnerId: string): Promise<EarningsSummary & {
    withdrawable: number;
    pendingPayouts: number;
    nextPayoutDate: string;
  }> {
    return this.request(`/api/partners/${partnerId}/earnings`);
  }

  // === Payouts ===

  async requestPayout(params: {
    partnerId: string;
    type: PayoutRequest['type'];
    amount: number;
    bankAccount?: PayoutRequest['bankAccount'];
    upiId?: string;
  }): Promise<PayoutRequest> {
    return this.request<PayoutRequest>('/api/payouts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPayout(id: string): Promise<PayoutRequest> {
    return this.request<PayoutRequest>(`/api/payouts/${id}`);
  }

  async listPayouts(query?: { partnerId?: string; status?: string }): Promise<{ payouts: PayoutRequest[] }> {
    const params = new URLSearchParams(query as any);
    return this.request(`/api/payouts${params.toString() ? `?${params}` : ''}`);
  }

  async processPayout(id: string): Promise<PayoutRequest> {
    return this.request<PayoutRequest>(`/api/payouts/${id}/process`, { method: 'POST' });
  }

  async cancelPayout(id: string): Promise<PayoutRequest> {
    return this.request<PayoutRequest>(`/api/payouts/${id}/cancel`, { method: 'POST' });
  }

  // === Dashboard ===

  async getDashboard(partnerId: string): Promise<PartnerDashboard> {
    return this.request<PartnerDashboard>(`/api/dashboard/${partnerId}`);
  }

  async getAdminDashboard(): Promise<{
    totalPartners: number;
    activePartners: number;
    byTier: Record<string, number>;
    totalPayouts: number;
    pendingPayouts: number;
    topEarners: Array<{ id: string; name: string; tier: string; earnings: number }>;
  }> {
    return this.request('/api/admin/dashboard');
  }

  // === Certifications ===

  async issueCertification(params: {
    partnerId: string;
    type: Certification['type'];
    name: string;
    score: number;
  }): Promise<Certification> {
    return this.request<Certification>('/api/certifications', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPartnerCertifications(partnerId: string): Promise<{ certifications: Certification[] }> {
    return this.request(`/api/partners/${partnerId}/certifications`);
  }

  // === Referrals ===

  async createReferral(referrerId: string, refereeId: string): Promise<{
    id: string;
    referrerId: string;
    refereeId: string;
    reward: number;
    status: string;
  }> {
    return this.request('/api/referrals', {
      method: 'POST',
      body: JSON.stringify({ referrerId, refereeId }),
    });
  }

  async getReferralStats(partnerId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
  }> {
    return this.request(`/api/partners/${partnerId}/referrals`);
  }

  // === Benefits ===

  async getPartnerBenefits(partnerId: string): Promise<PartnerBenefits> {
    const partner = await this.getPartner(partnerId);
    const benefits = partner.benefits;

    const limits: PartnerBenefits['limits'] = {
      minAmount: 500,
      maxAmount: partner.partner.tier === 'platinum' ? 1000000 :
                partner.partner.tier === 'gold' ? 250000 :
                partner.partner.tier === 'silver' ? 100000 : 50000,
      dailyLimit: 0,
      monthlyLimit: 0,
    };

    return { tier: partner.partner.tier, benefits, limits };
  }
}

export default CreatorEconomySDK;
export { CreatorEconomySDK as Client };
