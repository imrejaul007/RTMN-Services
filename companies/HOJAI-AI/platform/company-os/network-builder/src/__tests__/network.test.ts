/**
 * Network Builder Tests
 */

import { describe, it, expect } from 'vitest';
import { networkBuilderService } from '../network-builder';

describe('NetworkBuilder', () => {
  it('should create network', () => {
    const network = networkBuilderService.createNetwork({
      name: 'Restaurant Network',
      type: 'industry',
      industry: 'restaurant',
      description: 'Network for restaurants',
      ownerId: 'company_test',
    });
    expect(network.status).toBe('forming');
    expect(network.memberCount).toBe(1);
  });

  it('should activate network', () => {
    const network = networkBuilderService.activateNetwork('net_test');
    expect(network?.status).toBe('active');
  });

  it('should add member', () => {
    const member = networkBuilderService.addMember({
      networkId: 'net_test',
      companyId: 'company_new',
      role: 'member',
    });
    expect(member.role).toBe('member');
  });

  it('should add benefit', () => {
    const benefit = networkBuilderService.addBenefit({
      networkId: 'net_test',
      type: 'procurement',
      title: 'Bulk Discounts',
      description: '10% off supplies',
    });
    expect(benefit.id).toBeDefined();
  });

  it('should get recommended networks', () => {
    const networks = networkBuilderService.getRecommendedNetworks('company_test', 'restaurant');
    expect(Array.isArray(networks));
  });
});
