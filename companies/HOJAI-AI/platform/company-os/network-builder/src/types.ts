/**
 * Network Builder Types
 *
 * Create Nexha networks for industries, regions, etc.
 */

export type NetworkType = 'industry' | 'regional' | 'supply_chain' | 'franchise';

export interface Network {
  id: string;
  name: string;
  type: NetworkType;
  industry?: string;
  region?: string;
  description: string;
  ownerId: string;
  status: 'forming' | 'active' | 'suspended';
  memberCount: number;
  createdAt: string;
}

export interface NetworkMember {
  id: string;
  networkId: string;
  companyId: string;
  role: 'founder' | 'member' | 'admin';
  joinedAt: string;
  status: 'active' | 'pending' | 'removed';
}

export interface NetworkBenefit {
  id: string;
  networkId: string;
  type: 'procurement' | 'marketing' | 'logistics' | 'financing' | 'training';
  title: string;
  description: string;
}

export interface NetworkActivity {
  id: string;
  networkId: string;
  type: 'procurement_deal' | 'member_joined' | 'campaign_launched';
  description: string;
  createdAt: string;
}
