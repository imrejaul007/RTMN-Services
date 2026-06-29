/**
 * Network Builder Service
 *
 * Create Nexha networks.
 */

import { v4 as uuidv4 } from 'uuid';
import { Network, NetworkMember, NetworkBenefit, NetworkActivity, NetworkType } from './types';

// ============================================
// In-Memory Stores
// ============================================

const networks = new Map<string, Network>();
const members = new Map<string, NetworkMember>();
const benefits = new Map<string, NetworkBenefit>();
const activities = new Map<string, NetworkActivity>();

// ============================================
// Network Builder Service
// ============================================

export class NetworkBuilderService {
  /**
   * Create a network
   */
  createNetwork(params: {
    name: string;
    type: NetworkType;
    industry?: string;
    region?: string;
    description: string;
    ownerId: string;
  }): Network {
    const network: Network = {
      id: `net_${uuidv4().slice(0, 8)}`,
      name: params.name,
      type: params.type,
      industry: params.industry,
      region: params.region,
      description: params.description,
      ownerId: params.ownerId,
      status: 'forming',
      memberCount: 1,
      createdAt: new Date().toISOString(),
    };

    networks.set(network.id, network);

    // Add owner as founder member
    this.addMember({
      networkId: network.id,
      companyId: params.ownerId,
      role: 'founder',
    });

    return network;
  }

  /**
   * Activate network
   */
  activateNetwork(networkId: string): Network | null {
    const network = networks.get(networkId);
    if (!network) return null;

    network.status = 'active';
    return network;
  }

  /**
   * Get network
   */
  getNetwork(networkId: string): Network | null {
    return networks.get(networkId) || null;
  }

  /**
   * List networks
   */
  listNetworks(filter?: { type?: NetworkType; industry?: string; status?: string }): Network[] {
    let list = Array.from(networks.values());

    if (filter?.type) list = list.filter(n => n.type === filter.type);
    if (filter?.industry) list = list.filter(n => n.industry === filter.industry);
    if (filter?.status) list = list.filter(n => n.status === filter.status);

    return list.sort((a, b) => b.memberCount - a.memberCount);
  }

  /**
   * Add member to network
   */
  addMember(params: {
    networkId: string;
    companyId: string;
    role: NetworkMember['role'];
  }): NetworkMember {
    const member: NetworkMember = {
      id: `mbr_${uuidv4().slice(0, 8)}`,
      networkId: params.networkId,
      companyId: params.companyId,
      role: params.role,
      joinedAt: new Date().toISOString(),
      status: 'active',
    };

    members.set(member.id, member);

    // Update member count
    const network = networks.get(params.networkId);
    if (network) {
      network.memberCount++;
    }

    // Record activity
    this.recordActivity({
      networkId: params.networkId,
      type: 'member_joined',
      description: `${params.companyId} joined the network`,
    });

    return member;
  }

  /**
   * Get network members
   */
  getNetworkMembers(networkId: string): NetworkMember[] {
    return Array.from(members.values())
      .filter(m => m.networkId === networkId && m.status === 'active');
  }

  /**
   * Add network benefit
   */
  addBenefit(params: {
    networkId: string;
    type: NetworkBenefit['type'];
    title: string;
    description: string;
  }): NetworkBenefit {
    const benefit: NetworkBenefit = {
      id: `ben_${uuidv4().slice(0, 8)}`,
      networkId: params.networkId,
      type: params.type,
      title: params.title,
      description: params.description,
    };

    benefits.set(benefit.id, benefit);
    return benefit;
  }

  /**
   * Get network benefits
   */
  getNetworkBenefits(networkId: string): NetworkBenefit[] {
    return Array.from(benefits.values())
      .filter(b => b.networkId === networkId);
  }

  /**
   * Record activity
   */
  recordActivity(params: {
    networkId: string;
    type: NetworkActivity['type'];
    description: string;
  }): NetworkActivity {
    const activity: NetworkActivity = {
      id: `act_${uuidv4().slice(0, 8)}`,
      networkId: params.networkId,
      type: params.type,
      description: params.description,
      createdAt: new Date().toISOString(),
    };

    activities.set(activity.id, activity);
    return activity;
  }

  /**
   * Get network activities
   */
  getNetworkActivities(networkId: string, limit = 20): NetworkActivity[] {
    return Array.from(activities.values())
      .filter(a => a.networkId === networkId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get recommended networks for a company
   */
  getRecommendedNetworks(companyId: string, industry?: string): Network[] {
    let list = Array.from(networks.values())
      .filter(n => n.status === 'active');

    if (industry) {
      list = list.filter(n => n.industry === industry || !n.industry);
    }

    return list.sort((a, b) => b.memberCount - a.memberCount).slice(0, 10);
  }

  /**
   * Search networks
   */
  searchNetworks(query: string): Network[] {
    const q = query.toLowerCase();
    return Array.from(networks.values())
      .filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.industry?.toLowerCase().includes(q)
      );
  }

  /**
   * Get network stats
   */
  getStats(): {
    totalNetworks: number;
    byType: Record<string, number>;
    byIndustry: Record<string, number>;
    totalMembers: number;
  } {
    const byType: Record<string, number> = {};
    const byIndustry: Record<string, number> = {};

    for (const network of networks.values()) {
      byType[network.type] = (byType[network.type] || 0) + 1;
      if (network.industry) {
        byIndustry[network.industry] = (byIndustry[network.industry] || 0) + 1;
      }
    }

    return {
      totalNetworks: networks.size,
      byType,
      byIndustry,
      totalMembers: members.size,
    };
  }
}

export const networkBuilderService = new NetworkBuilderService();