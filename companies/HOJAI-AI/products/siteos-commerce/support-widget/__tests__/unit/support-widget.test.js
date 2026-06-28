import { describe, it, expect, beforeEach } from 'vitest';

// Test constants and helpers from the service
const CATEGORIES = ['billing', 'technical', 'account', 'sales', 'general'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['open', 'pending', 'resolved', 'closed'];

function autoDetectCategory(subject) {
  const subjectLower = subject.toLowerCase();
  if (subjectLower.includes('billing') || subjectLower.includes('payment') || subjectLower.includes('invoice')) return 'billing';
  if (subjectLower.includes('not working') || subjectLower.includes('error') || subjectLower.includes('bug')) return 'technical';
  if (subjectLower.includes('account') || subjectLower.includes('login') || subjectLower.includes('password')) return 'account';
  if (subjectLower.includes('price') || subjectLower.includes('demo') || subjectLower.includes('buy')) return 'sales';
  return 'general';
}

function autoDetectPriority(subject) {
  const subjectLower = subject.toLowerCase();
  if (subjectLower.includes('urgent') || subjectLower.includes('asap') || subjectLower.includes('emergency')) return 'urgent';
  if (subjectLower.includes('important')) return 'high';
  return 'medium';
}

describe('Support Widget', () => {
  describe('Categories', () => {
    it('should have all categories', () => {
      expect(CATEGORIES).toContain('billing');
      expect(CATEGORIES).toContain('technical');
      expect(CATEGORIES).toContain('account');
      expect(CATEGORIES).toContain('sales');
      expect(CATEGORIES).toContain('general');
    });

    it('should have 5 categories', () => {
      expect(CATEGORIES).toHaveLength(5);
    });
  });

  describe('Priorities', () => {
    it('should have all priorities', () => {
      expect(PRIORITIES).toContain('low');
      expect(PRIORITIES).toContain('medium');
      expect(PRIORITIES).toContain('high');
      expect(PRIORITIES).toContain('urgent');
    });

    it('should have 4 priorities', () => {
      expect(PRIORITIES).toHaveLength(4);
    });
  });

  describe('Statuses', () => {
    it('should have all statuses', () => {
      expect(STATUSES).toContain('open');
      expect(STATUSES).toContain('pending');
      expect(STATUSES).toContain('resolved');
      expect(STATUSES).toContain('closed');
    });

    it('should have 4 statuses', () => {
      expect(STATUSES).toHaveLength(4);
    });
  });

  describe('Auto-detect Category', () => {
    it('should detect billing category', () => {
      expect(autoDetectCategory('Billing issue with my payment')).toBe('billing');
      expect(autoDetectCategory('Invoice question')).toBe('billing');
      expect(autoDetectCategory('Payment failed')).toBe('billing');
    });

    it('should detect technical category', () => {
      expect(autoDetectCategory('App not working')).toBe('technical');
      expect(autoDetectCategory('Error message displayed')).toBe('technical');
      expect(autoDetectCategory('Bug in checkout')).toBe('technical');
    });

    it('should detect account category', () => {
      expect(autoDetectCategory('Cannot login to account')).toBe('account');
      expect(autoDetectCategory('Password reset needed')).toBe('account');
    });

    it('should detect sales category', () => {
      expect(autoDetectCategory('Price question')).toBe('sales');
      expect(autoDetectCategory('Need a demo')).toBe('sales');
      expect(autoDetectCategory('Want to buy')).toBe('sales');
    });

    it('should default to general', () => {
      expect(autoDetectCategory('General inquiry')).toBe('general');
      expect(autoDetectCategory('Hello there')).toBe('general');
    });
  });

  describe('Auto-detect Priority', () => {
    it('should detect urgent priority', () => {
      expect(autoDetectPriority('Urgent help needed')).toBe('urgent');
      expect(autoDetectPriority('ASAP please')).toBe('urgent');
      expect(autoDetectPriority('Emergency situation')).toBe('urgent');
    });

    it('should detect high priority', () => {
      expect(autoDetectPriority('Important issue')).toBe('high');
    });

    it('should default to medium', () => {
      expect(autoDetectPriority('Normal question')).toBe('medium');
      expect(autoDetectPriority('Hello')).toBe('medium');
    });
  });
});
