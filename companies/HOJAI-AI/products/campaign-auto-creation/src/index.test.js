/**
 * Unit tests for Campaign Auto-Creation
 */
import { describe, it, expect } from 'vitest';

function generateCampaignTemplates(goal) {
  const templates = [];
  if (goal.includes('recovery') || goal.includes('abandon')) {
    templates.push(
      { channel: 'whatsapp', delay: '15m', template: 'cart_reminder' },
      { channel: 'email', delay: '6h', template: 'abandoned_cart_email' }
    );
  }
  if (goal.includes('win') || goal.includes('retain')) {
    templates.push(
      { channel: 'email', delay: '0h', template: 'win_back_email' },
      { channel: 'whatsapp', delay: '3d', template: 'special_offer' }
    );
  }
  if (goal.includes('welcome') || goal.includes('onboard')) {
    templates.push(
      { channel: 'email', delay: '0h', template: 'welcome' },
      { channel: 'email', delay: '3d', template: 'onboarding' }
    );
  }
  return templates;
}

function estimateCampaignImpact(templates) {
  const channelImpact = { whatsapp: 25000, email: 15000, sms: 10000 };
  return templates.reduce((sum, t) => sum + (channelImpact[t.channel] || 10000), 0);
}

describe('Campaign Auto-Creation', () => {
  it('should generate recovery templates', () => {
    const templates = generateCampaignTemplates('abandoned cart recovery');
    expect(templates.some(t => t.channel === 'whatsapp')).toBe(true);
    expect(templates.some(t => t.channel === 'email')).toBe(true);
  });

  it('should generate win-back templates', () => {
    const templates = generateCampaignTemplates('win back customers');
    expect(templates.some(t => t.template === 'win_back_email')).toBe(true);
    expect(templates.some(t => t.template === 'special_offer')).toBe(true);
  });

  it('should estimate impact', () => {
    const templates = [
      { channel: 'whatsapp' },
      { channel: 'email' }
    ];
    expect(estimateCampaignImpact(templates)).toBe(40000);
  });
});
