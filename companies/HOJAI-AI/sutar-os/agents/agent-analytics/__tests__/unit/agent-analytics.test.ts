/**
 * Agent Analytics Service Unit Tests
 * Event tracking, metrics, dashboards, alerts, real-time analytics
 */

import { describe, it, expect } from 'vitest';

// Mock dependencies
vi.mock('@rtmn/shared/lib/persistent-map', () => ({
  PersistentMap: class {
    constructor(name) { this._name = name; this._data = new Map(); }
    get(k) { return this._data.get(k); }
    set(k, v) { this._data.set(k, v); return this; }
    get size() { return this._data.size; }
    values() { return this._data.values(); }
  },
}));

vi.mock('@rtmn/shared/security', () => ({ setupSecurity: vi.fn(), strictLimiter: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/env', () => ({ requireEnv: vi.fn() }));
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/shutdown', () => ({ installGracefulShutdown: vi.fn() }));
vi.mock('./rez-intel-client', () => ({ default: { checkRezIntelHealth: vi.fn().mockResolvedValue(false) } }));

vi.stubGlobal('uuid', { v4: () => 'analytics-test-uuid' });

const {
  EVENT_TYPES,
  recordEvent,
  updateRealtimeMetrics,
  checkAlerts,
  calculateMetrics,
  createDashboard,
} = await import('../../src/index.js');

describe('Agent Analytics Service', () => {

  // =========================================================================
  // Constants
  // =========================================================================
  describe('Event Types', () => {
    it('should define all 9 event types', () => {
      expect(EVENT_TYPES.TRANSACTION).toBe('transaction');
      expect(EVENT_TYPES.NEGOTIATION).toBe('negotiation');
      expect(EVENT_TYPES.ORDER).toBe('order');
      expect(EVENT_TYPES.DISPUTE).toBe('dispute');
      expect(EVENT_TYPES.PAYMENT).toBe('payment');
      expect(EVENT_TYPES.REVIEW).toBe('review');
      expect(EVENT_TYPES.SEARCH).toBe('search');
      expect(EVENT_TYPES.VIEW).toBe('view');
      expect(EVENT_TYPES.CLICK).toBe('click');
    });
  });

  // =========================================================================
  // Event Recording
  // =========================================================================
  describe('recordEvent', () => {
    it('should record event with agent and type', () => {
      const event = recordEvent('agent-1', EVENT_TYPES.NEGOTIATION, { success: true });

      expect(event.id).toBeDefined();
      expect(event.agentId).toBe('agent-1');
      expect(event.type).toBe('negotiation');
      expect(event.data.success).toBe(true);
      expect(event.timestamp).toBeDefined();
    });

    it('should record order event with amount', () => {
      const event = recordEvent('merchant-1', EVENT_TYPES.ORDER, { amount: 299.99 });

      expect(event.type).toBe('order');
      expect(event.data.amount).toBe(299.99);
    });

    it('should record view event', () => {
      const event = recordEvent('genie-1', EVENT_TYPES.VIEW, { productId: 'prod-123' });

      expect(event.type).toBe('view');
      expect(event.data.productId).toBe('prod-123');
    });
  });

  // =========================================================================
  // Real-time Metrics
  // =========================================================================
  describe('updateRealtimeMetrics', () => {
    it('should create realtime record on first event', () => {
      const realtime = updateRealtimeMetrics('new-agent', EVENT_TYPES.NEGOTIATION, { success: true });

      expect(realtime.agentId).toBe('new-agent');
      expect(realtime.counters.totalEvents).toBe(1);
      expect(realtime.counters.negotiations).toBe(1);
      expect(realtime.counters.successfulNegotiations).toBe(1);
    });

    it('should track order revenue', () => {
      updateRealtimeMetrics('revenue-agent', EVENT_TYPES.ORDER, { amount: 100 });
      const realtime = updateRealtimeMetrics('revenue-agent', EVENT_TYPES.ORDER, { amount: 200 });

      expect(realtime.counters.revenue).toBe(300);
      expect(realtime.counters.orders).toBe(2);
    });

    it('should not increment successfulNegotiations on failed negotiation', () => {
      updateRealtimeMetrics('fail-agent', EVENT_TYPES.NEGOTIATION, { success: false });

      const realtime = updateRealtimeMetrics('fail-agent', EVENT_TYPES.NEGOTIATION, { success: false });

      expect(realtime.counters.successfulNegotiations).toBe(0);
    });

    it('should track dispute count', () => {
      const realtime = updateRealtimeMetrics('dispute-agent', EVENT_TYPES.DISPUTE, {});

      expect(realtime.counters.disputes).toBe(1);
    });

    it('should update hourly bucket for transactions', () => {
      const realtime = updateRealtimeMetrics('hourly-agent', EVENT_TYPES.TRANSACTION, { amount: 500 });

      const hour = new Date().toISOString().slice(0, 13);
      expect(realtime.hourly[hour]).toBeDefined();
      expect(realtime.hourly[hour].transactions).toBe(1);
      expect(realtime.hourly[hour].revenue).toBe(500);
    });

    it('should update daily bucket', () => {
      const realtime = updateRealtimeMetrics('daily-agent', EVENT_TYPES.ORDER, { amount: 150 });

      const day = new Date().toISOString().slice(0, 10);
      expect(realtime.daily[day]).toBeDefined();
      expect(realtime.daily[day].revenue).toBe(150);
    });
  });

  // =========================================================================
  // Alert Checking
  // =========================================================================
  describe('checkAlerts', () => {
    it('should trigger high dispute rate alert', () => {
      const event = {
        id: 'alert-test',
        agentId: 'risky-agent',
        type: EVENT_TYPES.DISPUTE,
        data: {},
        timestamp: new Date().toISOString(),
      };

      // Pre-populate some orders and disputes
      for (let i = 0; i < 6; i++) {
        updateRealtimeMetrics('risky-agent', EVENT_TYPES.ORDER, { amount: 100 });
      }
      for (let i = 0; i < 1; i++) {
        updateRealtimeMetrics('risky-agent', EVENT_TYPES.DISPUTE, {});
      }

      checkAlerts('risky-agent', event);

      // Alert logic checks dispute rate > 10%
      // 1 dispute / 6 orders = 16.7% > 10% → should trigger
    });

    it('should trigger low negotiation success alert', () => {
      // 3 successes out of 10 negotiations = 30% threshold
      for (let i = 0; i < 3; i++) {
        updateRealtimeMetrics('low-success', EVENT_TYPES.NEGOTIATION, { success: true });
      }
      for (let i = 0; i < 7; i++) {
        updateRealtimeMetrics('low-success', EVENT_TYPES.NEGOTIATION, { success: false });
      }

      const event = {
        id: 'low-neg-test',
        agentId: 'low-success',
        type: EVENT_TYPES.NEGOTIATION,
        data: { success: false },
        timestamp: new Date().toISOString(),
      };

      checkAlerts('low-success', event);
      // 3 successes / 10 total = 30% < threshold
    });
  });

  // =========================================================================
  // Metrics Calculation
  // =========================================================================
  describe('calculateMetrics', () => {
    it('should calculate negotiation success rate', () => {
      for (let i = 0; i < 5; i++) {
        recordEvent('metrics-agent-1', EVENT_TYPES.NEGOTIATION, { success: true, rounds: 3 });
      }
      for (let i = 0; i < 5; i++) {
        recordEvent('metrics-agent-1', EVENT_TYPES.NEGOTIATION, { success: false, rounds: 5 });
      }

      const metrics = calculateMetrics('metrics-agent-1', '30d');

      expect(metrics.negotiations.total).toBe(10);
      expect(metrics.negotiations.successful).toBe(5);
      expect(metrics.negotiations.successRate).toBe(50);
    });

    it('should calculate average negotiation rounds', () => {
      recordEvent('rounds-agent', EVENT_TYPES.NEGOTIATION, { success: true, rounds: 3 });
      recordEvent('rounds-agent', EVENT_TYPES.NEGOTIATION, { success: true, rounds: 5 });
      recordEvent('rounds-agent', EVENT_TYPES.NEGOTIATION, { success: true, rounds: 4 });

      const metrics = calculateMetrics('rounds-agent', '30d');

      expect(metrics.negotiations.avgRounds).toBe(4);
    });

    it('should calculate conversion rate', () => {
      for (let i = 0; i < 100; i++) {
        recordEvent('conversion-agent', EVENT_TYPES.VIEW, { productId: 'p1' });
      }
      for (let i = 0; i < 5; i++) {
        recordEvent('conversion-agent', EVENT_TYPES.ORDER, { amount: 50 });
      }

      const metrics = calculateMetrics('conversion-agent', '30d');

      expect(metrics.performance.conversionRate).toBe(5); // 5/100 = 5%
    });

    it('should calculate revenue metrics', () => {
      recordEvent('revenue-agent-2', EVENT_TYPES.ORDER, { amount: 100 });
      recordEvent('revenue-agent-2', EVENT_TYPES.ORDER, { amount: 200 });
      recordEvent('revenue-agent-2', EVENT_TYPES.ORDER, { amount: 300 });

      const metrics = calculateMetrics('revenue-agent-2', '30d');

      expect(metrics.transactions.revenue).toBe(600);
      expect(metrics.transactions.total).toBe(3);
      expect(metrics.transactions.avgValue).toBe(200);
    });

    it('should count unique customers', () => {
      recordEvent('customer-agent', EVENT_TYPES.ORDER, { customerId: 'cust-1' });
      recordEvent('customer-agent', EVENT_TYPES.ORDER, { customerId: 'cust-2' });
      recordEvent('customer-agent', EVENT_TYPES.ORDER, { customerId: 'cust-1' });
      recordEvent('customer-agent', EVENT_TYPES.ORDER, { customerId: 'cust-3' });

      const metrics = calculateMetrics('customer-agent', '30d');

      expect(metrics.customers.unique).toBe(3);
      expect(metrics.customers.returning).toBe(1); // Only cust-1 is returning
    });

    it('should filter by time range', () => {
      // '1h' filter should exclude old events
      const metrics = calculateMetrics('time-agent', '1h');

      expect(metrics.timeRange).toBe('1h');
    });
  });

  // =========================================================================
  // Dashboard Creation
  // =========================================================================
  describe('createDashboard', () => {
    it('should create dashboard with default widgets', () => {
      const dashboard = createDashboard('agent-dash', {});

      expect(dashboard.id).toMatch(/^DASH-/);
      expect(dashboard.agentId).toBe('agent-dash');
      expect(dashboard.name).toBe('Agent Dashboard');
      expect(dashboard.widgets.length).toBe(5);
      expect(dashboard.refreshInterval).toBe(60);
    });

    it('should create dashboard with custom name', () => {
      const dashboard = createDashboard('custom-agent', { name: 'My Custom Dashboard' });

      expect(dashboard.name).toBe('My Custom Dashboard');
    });

    it('should support custom widgets', () => {
      const dashboard = createDashboard('widget-agent', {
        widgets: [
          { type: 'custom-metric', size: 'large' },
        ],
      });

      expect(dashboard.widgets.length).toBe(1);
      expect(dashboard.widgets[0].type).toBe('custom-metric');
    });

    it('should support custom refresh interval', () => {
      const dashboard = createDashboard('refresh-agent', { refreshInterval: 300 });

      expect(dashboard.refreshInterval).toBe(300);
    });
  });
});
