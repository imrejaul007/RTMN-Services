/**
 * Industry Builder Tests
 */

import { describe, it, expect } from 'vitest';
import { industryBuilderService } from '../industry-builder';

describe('IndustryBuilder', () => {
  it('should create builder', () => {
    const builder = industryBuilderService.createBuilder({
      partnerId: 'partner_test',
      name: 'Custom Industry',
      industry: 'restaurant',
    });
    expect(builder.status).toBe('draft');
  });

  it('should add module', () => {
    const builder = industryBuilderService.createBuilder({
      partnerId: 'partner_test',
      name: 'Test Builder',
      industry: 'beauty',
    });
    const mod = industryBuilderService.addModule({
      builderId: builder.id,
      name: 'Appointments',
      type: 'core',
      routes: ['GET /api/appointments'],
    });
    expect(mod.id).toBeDefined();
  });

  it('should approve builder', () => {
    const builder = industryBuilderService.createBuilder({
      partnerId: 'partner_test',
      name: 'Approve Me',
      industry: 'retail',
    });
    const approved = industryBuilderService.approve(builder.id);
    expect(approved?.status).toBe('approved');
  });

  it('should get templates', () => {
    const templates = industryBuilderService.getTemplates({ industry: 'restaurant' });
    expect(Array.isArray(templates));
  });
});
