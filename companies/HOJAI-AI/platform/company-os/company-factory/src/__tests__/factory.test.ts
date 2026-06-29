/**
 * Company Factory Tests
 */

import { describe, it, expect } from 'vitest';
import {
  companyFactory,
  FACTORY_TEMPLATES,
  getTemplate,
  listTemplates,
} from '../index';

describe('Company Factory', () => {
  describe('Templates', () => {
    it('should have 26 industry templates', () => {
      expect(FACTORY_TEMPLATES.length).toBe(26);
    });

    it('should have all required industries', () => {
      const industries = FACTORY_TEMPLATES.map(t => t.industry);
      expect(industries).toContain('restaurant');
      expect(industries).toContain('beauty');
      expect(industries).toContain('hotel');
      expect(industries).toContain('retail');
      expect(industries).toContain('healthcare');
      expect(industries).toContain('education');
      expect(industries).toContain('exhibitions');
    });

    it('should have all stages defined for each template', () => {
      for (const template of FACTORY_TEMPLATES) {
        expect(template.capabilities.startup).toBeDefined();
        expect(template.capabilities.growth).toBeDefined();
        expect(template.capabilities.enterprise).toBeDefined();
        expect(template.capabilities.franchise).toBeDefined();
      }
    });

    it('should have channels for each template', () => {
      for (const template of FACTORY_TEMPLATES) {
        expect(template.defaultChannels.length).toBeGreaterThan(0);
      }
    });

    it('should have AI workers for each template', () => {
      for (const template of FACTORY_TEMPLATES) {
        expect(template.defaultAIWorkers.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Template Lookup', () => {
    it('should get template by industry', () => {
      const restaurant = getTemplate('restaurant');
      expect(restaurant).toBeDefined();
      expect(restaurant?.industry).toBe('restaurant');
    });

    it('should return undefined for unknown industry', () => {
      const unknown = getTemplate('unknown_industry');
      expect(unknown).toBeUndefined();
    });

    it('should list all templates', () => {
      const templates = listTemplates();
      expect(templates.length).toBe(26);
    });
  });

  describe('Deployment', () => {
    it('should deploy restaurant company', async () => {
      const deployment = await companyFactory.deployCompany({
        industry: 'restaurant',
        companyName: 'My Test Restaurant',
      });

      expect(deployment.companyId).toBeDefined();
      expect(deployment.companyName).toBe('My Test Restaurant');
      expect(deployment.status).toBe('active');
      expect(deployment.components.companyOS).toBe(true);
      expect(deployment.components.industryExtension).toBe(true);
      expect(deployment.components.aiWorkers.length).toBeGreaterThan(0);
      expect(deployment.components.distributionChannels.length).toBeGreaterThan(0);
      expect(deployment.components.wallets).toBe(true);
      expect(deployment.components.trust).toBe(true);
    });

    it('should deploy healthcare company', async () => {
      const deployment = await companyFactory.deployCompany({
        industry: 'healthcare',
      });

      expect(deployment.status).toBe('active');
      expect(deployment.template.industry).toBe('healthcare');
    });

    it('should support customizations', async () => {
      const deployment = await companyFactory.deployCompany({
        industry: 'beauty',
        customizations: {
          departments: ['finance'],
          aiWorkers: ['ai-cfo'],
          stage: 'growth',
        },
      });

      expect(deployment.components.aiWorkers).toEqual(['ai-cfo']);
      expect(deployment.stage).toBe('growth');
    });

    it('should fail for unknown industry', async () => {
      await expect(
        companyFactory.deployCompany({ industry: 'unknown' })
      ).rejects.toThrow('Unknown industry');
    });
  });

  describe('Deployment Management', () => {
    it('should get deployment by company ID', async () => {
      const deployment = await companyFactory.deployCompany({
        industry: 'retail',
      });

      const retrieved = companyFactory.getDeployment(deployment.companyId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.companyId).toBe(deployment.companyId);
    });

    it('should list all deployments', async () => {
      await companyFactory.deployCompany({ industry: 'hotel' });
      await companyFactory.deployCompany({ industry: 'fitness' });

      const all = companyFactory.listDeployments();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should upgrade company stage', async () => {
      const deployment = await companyFactory.deployCompany({
        industry: 'education',
      });

      const upgraded = companyFactory.upgradeStage(deployment.companyId, 'enterprise');
      expect(upgraded?.stage).toBe('enterprise');
    });
  });
});