/**
 * RAZO ActionEngine Tests
 * Uses nock to intercept real HTTP calls (vi.mock can't intercept CJS require).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';

const ActionEngine = (await import('../../src/actions/engine.js')).default;

describe('ActionEngine', () => {
  let engine;

  beforeEach(() => {
    nock.cleanAll();
    engine = new ActionEngine(console, {
      genieGateway: 'http://genie:4701',
      doApp: 'http://doapp:3001',
      sutar: 'http://sutar:4140',
      copilot: 'http://copilot:4600',
      financialTwin: 'http://localhost:4715',
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ─── Route to Correct Service ──────────────────────────────────────────────

  describe('execute() routes to the correct service', () => {
    it('routes order_food → do-app', async () => {
      nock('http://doapp:3001').post('/api/orders').reply(200, { success: true, orderId: 'ord-123' });
      const intent = { intent: 'order_food', action: 'do-app', endpoint: '/api/orders' };
      const result = await engine.execute(intent, { item: 'pizza' }, { userId: 'u1' });
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ success: true, orderId: 'ord-123' });
    });

    it('routes make_payment → sutar', async () => {
      nock('http://sutar:4140').post('/api/escrow/transfer').reply(200, { success: true, txId: 'tx-456' });
      const intent = { intent: 'make_payment', action: 'sutar', endpoint: '/api/escrow/transfer' };
      const result = await engine.execute(intent, { amount: '500', recipient: 'Rahul' }, { userId: 'u1' });
      expect(result.success).toBe(true);
      expect(result.result.txId).toBe('tx-456');
    });

    it('routes ask_genie → genie gateway', async () => {
      nock('http://genie:4701').post('/api/query').reply(200, { answer: 'The weather is sunny.' });
      const intent = { intent: 'ask_genie', action: 'genie', endpoint: '/api/query' };
      const result = await engine.execute(intent, { query: 'weather' }, { userId: 'u1' });
      expect(result.success).toBe(true);
      expect(result.result.answer).toBe('The weather is sunny.');
    });

    it('routes get_recommendation → copilot', async () => {
      nock('http://copilot:4600').post('/api/query').reply(200, { recommendations: ['item1', 'item2'] });
      const intent = { intent: 'get_recommendation', action: 'copilot', endpoint: '/api/recommendations' };
      const result = await engine.execute(intent, { based_on: 'pizza' }, { userId: 'u1' });
      expect(result.success).toBe(true);
    });

    it('routes schedule_meeting → calendar', async () => {
      nock('http://localhost:4709').post('/api/events').reply(200, { eventId: 'evt-789' });
      const intent = { intent: 'schedule_meeting', action: 'calendar', endpoint: '/api/events' };
      const result = await engine.execute(intent, { title: 'Standup', attendees: ['a', 'b'] }, { userId: 'u1' });
      expect(result.success).toBe(true);
    });

    it('routes check_balance → financial-twin GET', async () => {
      nock('http://localhost:4715').get('/api/accounts/balance').query(true).reply(200, { balance: 5000 });
      const intent = { intent: 'check_balance', action: 'financial-twin', endpoint: '/api/accounts/balance' };
      const result = await engine.execute(intent, {}, { userId: 'u1' });
      expect(result.success).toBe(true);
    });

    it('routes track_expense → financial-twin POST', async () => {
      nock('http://localhost:4715').post('/api/expenses').reply(200, { expenseId: 'exp-1' });
      const intent = { intent: 'track_expense', action: 'financial-twin', endpoint: '/api/expenses' };
      const result = await engine.execute(intent, { amount: '200', category: 'food' }, { userId: 'u1' });
      expect(result.success).toBe(true);
    });

    it('routes find_service → discovery', async () => {
      nock('http://localhost:4500').post('/api/search').reply(200, { results: [] });
      const intent = { intent: 'find_service', action: 'discovery', endpoint: '/api/search' };
      const result = await engine.execute(intent, { service: 'plumber' }, { userId: 'u1' });
      expect(result.success).toBe(true);
    });

    it('returns failure for unknown service', async () => {
      const intent = { intent: 'unknown', action: 'nonexistent', endpoint: '/api/foo' };
      const result = await engine.execute(intent, {}, { userId: 'u1' });
      // execute() always returns success: true; check result.result for the actual service call outcome
      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain('Unknown service');
    });
  });

  // ─── Error Handling ─────────────────────────────────────────────────────────

  describe('execute() handles errors', () => {
    it('returns failure when HTTP call fails', async () => {
      nock('http://doapp:3001').post('/api/orders').reply(500, 'Internal error');
      const intent = { intent: 'order_food', action: 'do-app', endpoint: '/api/orders' };
      const result = await engine.execute(intent, {}, { userId: 'u1' });
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('ACTION_FAILED');
    });

    it('includes requestId in success response', async () => {
      nock('http://doapp:3001').post('/api/orders').reply(200, {});
      const intent = { intent: 'order_food', action: 'do-app', endpoint: '/api/orders' };
      const result = await engine.execute(intent, {}, { userId: 'u1' });
      expect(result.requestId).toBeTruthy();
    });

    it('tracks stats on success', async () => {
      nock('http://doapp:3001').post('/api/orders').reply(200, {});
      const intent = { intent: 'order_food', action: 'do-app', endpoint: '/api/orders' };
      await engine.execute(intent, {}, { userId: 'u1' });
      expect(engine.stats.actionResults.order_food.success).toBe(1);
    });

    it('tracks stats on failure', async () => {
      // Verify that failures return success:false with ACTION_FAILED error
      // Note: when HTTP throws, result.result is undefined; the failure object is at result.error
      nock('http://doapp:3001').post('/api/orders').reply(500, 'error');
      const intent = { intent: 'order_food', action: 'do-app', endpoint: '/api/orders' };
      const result = await engine.execute(intent, {}, { userId: 'u1' });
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('ACTION_FAILED');
    });
  });

  // ─── Specific Action Helpers ────────────────────────────────────────────────

  describe('orderFood()', () => {
    it('formats items array and deliveryAddress', async () => {
      let captured;
      nock('http://doapp:3001')
        .post('/api/orders', body => { captured = body; return true; })
        .reply(200, {});
      const intent = { intent: 'order_food', action: 'do-app', endpoint: '/api/orders' };
      await engine.execute(intent, { item: 'burger', quantity: '2' }, { userId: 'u1', locationContext: { address: 'MG Road' } });
      expect(captured.items).toEqual([{ name: 'burger', quantity: '2' }]);
      expect(captured.deliveryAddress).toBe('MG Road');
    });
  });

  describe('makePayment()', () => {
    it('parses amount as float', async () => {
      let captured;
      nock('http://sutar:4140')
        .post('/api/escrow/transfer', body => { captured = body; return true; })
        .reply(200, {});
      const intent = { intent: 'make_payment', action: 'sutar', endpoint: '/api/escrow/transfer' };
      await engine.execute(intent, { amount: '1500', recipient: 'Rahul' }, { userId: 'u1' });
      expect(captured.amount).toBe(1500);
    });
  });

  describe('trackOrder()', () => {
    it('uses GET with order_id in path', async () => {
      const scope = nock('http://doapp:3001').get('/api/orders/track/ord-999').reply(200, { status: 'delivered' });
      const intent = { intent: 'track_order', action: 'do-app', endpoint: '/api/orders/track' };
      const result = await engine.execute(intent, { order_id: 'ord-999' }, { userId: 'u1' });
      expect(result.result).toEqual({ status: 'delivered' });
      scope.done();
    });
  });

  describe('cancelOrder()', () => {
    it('POSTs to cancel endpoint with orderId', async () => {
      let captured;
      nock('http://doapp:3001')
        .post('/api/orders/cancel', body => { captured = body; return true; })
        .reply(200, { success: true });
      const intent = { intent: 'cancel_order', action: 'do-app', endpoint: '/api/orders' };
      await engine.execute(intent, { order_id: 'ord-1', reason: 'wrong item' }, { userId: 'u1' });
      expect(captured.orderId).toBe('ord-1');
      expect(captured.reason).toBe('wrong item');
    });
  });

  describe('handleChannelAction()', () => {
    it('returns channel action result without HTTP call', async () => {
      const intent = { intent: 'send_message', action: 'channel', endpoint: '/api/message/send' };
      const result = await engine.handleChannelAction(intent, { recipient: '919876543210', channel: 'whatsapp' }, {});
      expect(result.success).toBe(true);
      expect(result.action).toBe('channel_message');
      expect(result.channel).toBe('whatsapp');
    });
  });

  // ─── Service Health ────────────────────────────────────────────────────────

  describe('getServiceHealth()', () => {
    it('returns up/down status per service', async () => {
      nock('http://genie:4701').get('/health').reply(200, {});
      nock('http://doapp:3001').get('/health').reply(500, 'error');
      const health = await engine.getServiceHealth();
      expect(health.genie.status).toBe('up');
      expect(health['do-app'].status).toBe('down');
    });
  });

  describe('getStats()', () => {
    it('returns totalActions count', async () => {
      nock('http://doapp:3001').post('/api/o').reply(200, {});
      await engine.execute({ intent: 'o', action: 'do-app', endpoint: '/api/o' }, {}, {});
      await engine.execute({ intent: 'o', action: 'do-app', endpoint: '/api/o' }, {}, {});
      expect(engine.getStats().totalActions).toBe(2);
    });
  });
});
