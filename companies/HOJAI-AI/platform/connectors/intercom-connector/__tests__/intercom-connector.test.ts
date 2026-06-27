import { describe, it, expect } from 'vitest';

// Intercom Connector Constants
const CONVERSATION_STATES = ['open', 'closed', 'snoozed'];
const MESSAGE_TYPES = ['user', 'admin', 'bot'];
const CONVERSATION_SOURCES = ['email', 'chat', 'api', 'bot'];

describe('Intercom Connector', () => {
  describe('Conversation States', () => {
    it('should have all conversation states', () => {
      expect(CONVERSATION_STATES).toContain('open');
      expect(CONVERSATION_STATES).toContain('closed');
      expect(CONVERSATION_STATES).toContain('snoozed');
    });
  });

  describe('Message Types', () => {
    it('should have all message types', () => {
      expect(MESSAGE_TYPES).toContain('user');
      expect(MESSAGE_TYPES).toContain('admin');
      expect(MESSAGE_TYPES).toContain('bot');
    });
  });

  describe('User Validation', () => {
    const validateUser = (user: {
      name?: string;
      email?: string;
      phone?: string;
      custom_attributes?: Record<string, any>;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!user.name) errors.push('name is required');
      if (!user.email) errors.push('email is required');
      if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        errors.push('invalid email');
      }
      if (user.phone && !/^\+?[\d\s-]{10,}$/.test(user.phone)) {
        errors.push('invalid phone');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct user', () => {
      const result = validateUser({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        custom_attributes: { plan: 'pro' }
      });
      expect(result.valid).toBe(true);
    });

    it('should require name and email', () => {
      const result = validateUser({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
      expect(result.errors).toContain('email is required');
    });
  });

  describe('Conversation Validation', () => {
    const validateConversation = (conv: {
      user_id?: string;
      assignee_id?: string;
      state?: string;
      tags?: string[];
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!conv.user_id) errors.push('user_id is required');
      if (conv.state && !CONVERSATION_STATES.includes(conv.state)) {
        errors.push(`invalid state: ${conv.state}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct conversation', () => {
      const result = validateConversation({
        user_id: 'user123',
        assignee_id: 'admin456',
        state: 'open',
        tags: ['urgent', 'billing']
      });
      expect(result.valid).toBe(true);
    });

    it('should require user_id', () => {
      const result = validateConversation({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('user_id is required');
    });
  });

  describe('Message Validation', () => {
    const validateMessage = (msg: {
      conversation_id?: string;
      body?: string;
      message_type?: string;
      author_id?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!msg.conversation_id) errors.push('conversation_id is required');
      if (!msg.body) errors.push('body is required');
      if (msg.message_type && !MESSAGE_TYPES.includes(msg.message_type)) {
        errors.push(`invalid message_type: ${msg.message_type}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct message', () => {
      const result = validateMessage({
        conversation_id: 'conv123',
        body: 'Thank you for reaching out',
        message_type: 'admin',
        author_id: 'admin456'
      });
      expect(result.valid).toBe(true);
    });

    it('should require body', () => {
      const result = validateMessage({ conversation_id: 'conv123' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('body is required');
    });
  });

  describe('Conversation Filtering', () => {
    const filterConversations = (
      convs: Array<{ state: string; user_id: string; tags: string[] }>,
      filters: { state?: string; tag?: string }
    ) => {
      let filtered = [...convs];

      if (filters.state) filtered = filtered.filter(c => c.state === filters.state);
      if (filters.tag) filtered = filtered.filter(c => c.tags.includes(filters.tag));

      return filtered;
    };

    it('should filter by state', () => {
      const convs = [
        { state: 'open', user_id: 'u1', tags: [] },
        { state: 'closed', user_id: 'u2', tags: [] }
      ];
      const results = filterConversations(convs, { state: 'open' });
      expect(results).toHaveLength(1);
    });

    it('should filter by tag', () => {
      const convs = [
        { state: 'open', user_id: 'u1', tags: ['urgent'] },
        { state: 'open', user_id: 'u2', tags: ['billing'] }
      ];
      const results = filterConversations(convs, { tag: 'urgent' });
      expect(results).toHaveLength(1);
    });
  });

  describe('Response Time Analysis', () => {
    const calculateResponseTime = (
      messages: Array<{ message_type: string; created_at: string }>
    ): { avgSeconds: number; byType: Record<string, number> } => {
      const byType: Record<string, number[]> = {};

      messages.forEach((msg, i) => {
        if (msg.message_type === 'admin' || msg.message_type === 'bot') {
          if (i > 0) {
            const prev = messages[i - 1];
            const diff = (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) / 1000;
            const type = msg.message_type;
            if (!byType[type]) byType[type] = [];
            byType[type].push(diff);
          }
        }
      });

      const allTimes = Object.values(byType).flat();
      const avgSeconds = allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0;

      return { avgSeconds, byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]))) };
    };

    it('should calculate average response time', () => {
      const now = new Date();
      const messages = [
        { message_type: 'user', created_at: new Date(now.getTime() - 60000).toISOString() },
        { message_type: 'admin', created_at: new Date(now.getTime() - 30000).toISOString() },
        { message_type: 'user', created_at: new Date(now.getTime() - 10000).toISOString() }
      ];
      const rt = calculateResponseTime(messages);
      expect(rt.avgSeconds).toBe(30);
    });
  });

  describe('Conversation Metrics', () => {
    const calculateMetrics = (
      convs: Array<{ state: string; last_message_at: string; tags: string[] }>
    ) => {
      const now = Date.now();
      const openConvs = convs.filter(c => c.state === 'open');
      const avgTime = openConvs.length > 0 ? openConvs.reduce((sum, c) => {
        return sum + (now - new Date(c.last_message_at).getTime());
      }, 0) / openConvs.length : 0;

      return {
        open: openConvs.length,
        closed: convs.filter(c => c.state === 'closed').length,
        avgWaitTimeMs: avgTime,
        tagged: convs.filter(c => c.tags.length > 0).length
      };
    };

    it('should calculate conversation metrics', () => {
      const now = new Date();
      const convs = [
        { state: 'open', last_message_at: new Date(now.getTime() - 3600000).toISOString(), tags: ['urgent'] },
        { state: 'open', last_message_at: new Date(now.getTime() - 7200000).toISOString(), tags: [] },
        { state: 'closed', last_message_at: now.toISOString(), tags: [] }
      ];
      const metrics = calculateMetrics(convs);
      expect(metrics.open).toBe(2);
      expect(metrics.closed).toBe(1);
      expect(metrics.tagged).toBe(1);
    });
  });
});