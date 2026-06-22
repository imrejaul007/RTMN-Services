/**
 * Integration Tests for Inventory → Reorder Closed Loop
 */

import { InventoryEventEmitter, createEmitter, createInventoryMonitor, generateTestInventoryEvent } from '../src/emitter';
import { LoopOrchestrator, createOrchestrator, LoopState, ActionDecision } from '../src/loop-orchestrator';

// ============================================================================
// Mock Configuration
// ============================================================================

const mockConfig = {
  eventPlatformUrl: 'http://localhost:3000',
  serviceToken: 'test-token',

  intentGraphUrl: 'http://localhost:50051',
  actionEngineUrl: 'http://localhost:50052',
  nextaBizUrl: 'http://localhost:8080',
  nextaBizApiKey: 'test-nextabiz-key',
  feedbackServiceUrl: 'http://localhost:8081',
  feedbackServiceToken: 'test-feedback-token',
  adaptiveAgentUrl: 'http://localhost:50053',
};

// ============================================================================
// Emitter Tests
// ============================================================================

describe('InventoryEventEmitter', () => {
  let emitter: InventoryEventEmitter;

  beforeEach(() => {
    global.fetch = jest.fn();
    emitter = createEmitter(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('emitInventoryLow', () => {
    it('should emit a valid inventory.low event', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ eventId: 'evt_123' }),
      });

      const result = await emitter.emitInventoryLow({
        productId: 'prod_001',
        sku: 'SKU-12345',
        currentStock: 5,
        reorderPoint: 20,
        tenantId: 'tenant_001',
      });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('inventory.low');
      expect(result.eventId).toMatch(/^evt_/);
    });

    it('should include retry on failure', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('Server Error') })
        .mockResolvedValueOnce({ ok: true });

      const result = await emitter.emitInventoryLow({
        productId: 'prod_001',
        sku: 'SKU-12345',
        currentStock: 5,
        reorderPoint: 20,
        tenantId: 'tenant_001',
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
      });

      const result = await emitter.emitInventoryLow({
        productId: 'prod_001',
        sku: 'SKU-12345',
        currentStock: 5,
        reorderPoint: 20,
        tenantId: 'tenant_001',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should record metrics on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await emitter.emitInventoryLow({
        productId: 'prod_001',
        sku: 'SKU-12345',
        currentStock: 5,
        reorderPoint: 20,
        tenantId: 'tenant_001',
      });

      const metrics = emitter.getMetrics();
      expect(metrics.eventsEmitted).toBe(1);
      expect(metrics.eventsSucceeded).toBe(1);
      expect(metrics.eventsFailed).toBe(0);
    });
  });
});

// ============================================================================
// Inventory Monitor Tests
// ============================================================================

describe('InventoryMonitor', () => {
  let emitter: InventoryEventEmitter;
  let monitor: ReturnType<typeof createInventoryMonitor>;
  let emittedEvents: any[] = [];

  beforeEach(() => {
    emittedEvents = [];
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url.includes('/api/v1/events')) {
        emittedEvents.push(JSON.parse(options.body));
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    emitter = createEmitter(mockConfig);
    monitor = createInventoryMonitor(emitter, {
      onLowInventory: async (event) => {
        emittedEvents.push({ type: 'onLowInventory', event });
      },
    });
  });

  it('should emit event when stock is below threshold', async () => {
    const result = await monitor.checkAndEmit(
      'prod_001',
      'SKU-12345',
      5,      // currentStock
      20,     // reorderPoint
      'tenant_001'
    );

    expect(result?.success).toBe(true);
    expect(emittedEvents).toHaveLength(2); // Emitted event + callback
  });

  it('should not emit event when stock is above threshold', async () => {
    const result = await monitor.checkAndEmit(
      'prod_001',
      'SKU-12345',
      25,     // currentStock (above threshold)
      20,     // reorderPoint
      'tenant_001'
    );

    expect(result).toBeNull();
    expect(emittedEvents).toHaveLength(0);
  });

  it('should respect custom threshold check', async () => {
    const customMonitor = createInventoryMonitor(emitter, {
      checkThreshold: (current, reorder) => current < reorder / 2,
    });

    const result = await customMonitor.checkAndEmit(
      'prod_001',
      'SKU-12345',
      5,      // currentStock
      20,     // reorderPoint
      'tenant_001'
    );

    expect(result).toBeNull(); // 5 is not < 10
  });
});

// ============================================================================
// Orchestrator Tests
// ============================================================================

describe('LoopOrchestrator', () => {
  let orchestrator: LoopOrchestrator;
  let stateChanges: any[] = [];

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url.includes('/intents/process')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            intentId: 'intent_001',
            type: 'reorder',
            priority: 'medium',
            suggestedQuantity: 100,
            supplierId: 'sup_001',
            estimatedCost: 1250,
            leadTimeDays: 7,
            confidence: 0.85,
          }),
        });
      }
      if (url.includes('/actions/decide')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            decision: ActionDecision.DRAFT_FOR_APPROVAL,
            reason: 'Order value exceeds auto-approve threshold',
            autoApprove: false,
          }),
        });
      }
      if (url.includes('/procurement/draft-orders')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            draftOrderId: 'po_001',
            approvalUrl: '/orders/po_001/approve',
          }),
        });
      }
      if (url.includes('/feedback/loop-outcomes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ feedbackId: 'fb_001' }),
        });
      }
      if (url.includes('/agent/update-model')) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    stateChanges = [];
    orchestrator = createOrchestrator({
      ...mockConfig,
      onStateChange: (ctx) => stateChanges.push({ loopId: ctx.loopId, state: ctx.state }),
    });
  });

  it('should execute full loop and transition through states', async () => {
    const event = generateTestInventoryEvent();

    // Start the loop (async)
    const context = await orchestrator.startLoop(event);

    // Wait for loop to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify state transitions occurred
    expect(stateChanges.length).toBeGreaterThan(0);

    // Verify metrics
    const metrics = orchestrator.getMetrics();
    expect(metrics.loopsStarted).toBe(1);
  });

  it('should create pending approval for DRAFT_FOR_APPROVAL decision', async () => {
    const event = generateTestInventoryEvent();

    const context = await orchestrator.startLoop(event);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify draft order was created
    expect(context.draftOrderId).toBe('po_001');
    expect(context.approvalUrl).toBe('/orders/po_001/approve');
  });

  it('should get loop status', async () => {
    const event = generateTestInventoryEvent();
    const context = await orchestrator.startLoop(event);

    const status = orchestrator.getLoopStatus(context.loopId);
    expect(status).toBeDefined();
    expect(status?.loopId).toBe(context.loopId);
  });

  it('should get active loops', async () => {
    const event = generateTestInventoryEvent();
    await orchestrator.startLoop(event);

    const activeLoops = orchestrator.getActiveLoops();
    expect(activeLoops.length).toBeGreaterThanOrEqual(0);
  });

  it('should cancel pending loop', async () => {
    const event = generateTestInventoryEvent();
    const context = await orchestrator.startLoop(event);

    const cancelled = orchestrator.cancelLoop(context.loopId);
    expect(cancelled).toBe(true);

    const status = orchestrator.getLoopStatus(context.loopId);
    expect(status?.state).toBe(LoopState.REJECTED);
  });
});

// ============================================================================
// Test Utilities
// ============================================================================

function generateTestInventoryEvent(overrides = {}): ReturnType<typeof import('../src/emitter').InventoryLowEvent.prototype> {
  return {
    eventId: `evt_test_${Date.now()}`,
    eventType: 'inventory.low',
    timestamp: new Date().toISOString(),
    source: 'rez-merchant-service',
    tenantId: 'tenant_test_001',
    payload: {
      productId: 'prod_test_001',
      sku: 'TEST-SKU-001',
      currentStock: Math.floor(Math.random() * 10),
      reorderPoint: 20,
      preferredSupplierId: 'sup_test_001',
      suggestedQuantity: 100,
      tenantId: 'tenant_test_001',
      ...overrides,
    },
  };
}
