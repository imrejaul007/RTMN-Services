import { describe, it, expect } from 'vitest';

// Gmail Connector Constants
const GMAIL_LABELS = ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED', 'IMPORTANT'];
const MESSAGE_TYPES = ['message', 'reply', 'forward', 'autoreply'];

describe('Gmail Connector', () => {
  describe('Gmail Labels', () => {
    it('should have all standard labels', () => {
      expect(GMAIL_LABELS).toContain('INBOX');
      expect(GMAIL_LABELS).toContain('SENT');
      expect(GMAIL_LABELS).toContain('DRAFT');
    });
  });

  describe('Message Validation', () => {
    const validateMessage = (msg: {
      to?: string;
      subject?: string;
      body?: string;
      from?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!msg.to) errors.push('to is required');
      if (msg.to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.to)) {
        errors.push('invalid to email');
      }
      if (!msg.subject) errors.push('subject is required');
      if (msg.subject && msg.subject.length > 255) errors.push('subject too long');

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct message', () => {
      const result = validateMessage({
        to: 'test@example.com',
        subject: 'Hello',
        body: 'Test body',
        from: 'sender@example.com'
      });
      expect(result.valid).toBe(true);
    });

    it('should require to and subject', () => {
      const result = validateMessage({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('to is required');
      expect(result.errors).toContain('subject is required');
    });
  });

  describe('Email Search', () => {
    const searchEmails = (
      messages: Array<{ subject: string; body: string; from: string; to: string; labels: string[] }>,
      query: string
    ) => {
      const q = query.toLowerCase();
      return messages.filter(m =>
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.to.toLowerCase().includes(q)
      );
    };

    it('should search by subject', () => {
      const messages = [
        { subject: 'Meeting Notes', body: '...', from: 'a@b.com', to: 'c@d.com', labels: [] },
        { subject: 'Invoice', body: '...', from: 'a@b.com', to: 'c@d.com', labels: [] }
      ];
      const results = searchEmails(messages, 'Meeting');
      expect(results).toHaveLength(1);
      expect(results[0].subject).toBe('Meeting Notes');
    });

    it('should search by body content', () => {
      const messages = [
        { subject: 'Email 1', body: 'Important project deadline', from: 'a@b.com', to: 'c@d.com', labels: [] },
        { subject: 'Email 2', body: 'Regular update', from: 'a@b.com', to: 'c@d.com', labels: [] }
      ];
      const results = searchEmails(messages, 'deadline');
      expect(results).toHaveLength(1);
    });
  });

  describe('Thread Analysis', () => {
    const analyzeThread = (messages: Array<{ from: string; date: string }>) => {
      const participants = new Set(messages.map(m => m.from));
      const sorted = messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        messageCount: messages.length,
        participantCount: participants.size,
        firstMessage: sorted[sorted.length - 1]?.date,
        lastMessage: sorted[0]?.date
      };
    };

    it('should count thread participants', () => {
      const messages = [
        { from: 'user1@example.com', date: '2026-06-20T10:00:00Z' },
        { from: 'user2@example.com', date: '2026-06-20T11:00:00Z' },
        { from: 'user1@example.com', date: '2026-06-20T12:00:00Z' }
      ];
      const analysis = analyzeThread(messages);
      expect(analysis.messageCount).toBe(3);
      expect(analysis.participantCount).toBe(2);
    });
  });

  describe('Label Filtering', () => {
    const filterByLabels = (messages: Array<{ labels: string[] }>, include: string[], exclude: string[] = []) => {
      return messages.filter(m => {
        const hasInclude = include.length === 0 || include.some(l => m.labels.includes(l));
        const hasExclude = exclude.some(l => m.labels.includes(l));
        return hasInclude && !hasExclude;
      });
    };

    it('should filter by label', () => {
      const messages = [
        { labels: ['INBOX', 'IMPORTANT'] },
        { labels: ['INBOX'] },
        { labels: ['SPAM'] }
      ];
      const results = filterByLabels(messages, ['IMPORTANT']);
      expect(results).toHaveLength(1);
    });

    it('should exclude labels', () => {
      const messages = [
        { labels: ['INBOX', 'STARRED'] },
        { labels: ['INBOX'] },
        { labels: ['SPAM'] }
      ];
      const results = filterByLabels(messages, ['INBOX'], ['STARRED']);
      expect(results).toHaveLength(1);
    });
  });

  describe('Email Priority', () => {
    const calculatePriority = (msg: { subject: string; labels: string[] }): 'urgent' | 'high' | 'normal' | 'low' => {
      let score = 50;

      if (msg.subject.toLowerCase().includes('urgent') || msg.subject.toLowerCase().includes('asap')) {
        score += 30;
      }
      if (msg.labels.includes('IMPORTANT') || msg.labels.includes('STARRED')) {
        score += 20;
      }
      if (msg.labels.includes('SPAM') || msg.labels.includes('TRASH')) {
        score = 10;
      }

      if (score >= 90) return 'urgent';
      if (score >= 70) return 'high';
      if (score >= 40) return 'normal';
      return 'low';
    };

    it('should identify urgent emails', () => {
      const result = calculatePriority({ subject: 'URGENT: Action needed', labels: ['INBOX'] });
      expect(['urgent', 'high']).toContain(result);
    });

    it('should identify low priority spam', () => {
      const result = calculatePriority({ subject: 'Buy now!', labels: ['SPAM'] });
      expect(result).toBe('low');
    });
  });
});