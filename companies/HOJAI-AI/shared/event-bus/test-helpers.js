/**
 * Shared test helpers for EventBus-based services (ADR-0009 Phase 2).
 *
 * Each SUTAR / HOJAI service that wires `@rtmn/shared/event-bus` should
 * have a vitest suite that imports from here. The helpers:
 *
 *   - mockEventBus()       — replace the lazy-singleton bus with a stub that
 *                            records every publishAsync() call in-memory.
 *   - captureLastEvent()   — return the last captured publishAsync payload.
 *   - resetEvents()        — clear the captured list between tests.
 *   - stubRequestTenant()  — build a fake Express req with the given tenant.
 *   - withServiceName()    — temporarily override process.env.SERVICE_NAME.
 *
 * The mocks intentionally do NOT spin up ioredis. Service tests should
 * focus on the wiring (right type prefix, right payload, right tenant)
 * without coupling to a live Redis.
 */

import { vi } from 'vitest';

const recorded = [];

/**
 * Replace the singleton EventBus inside ./services/events.{js,ts} with a
 * stub that records publishAsync() calls.
 *
 * Usage:
 *   import { mockEventBus, captureLastEvent, resetEvents } from '@rtmn/shared/event-bus/test-helpers';
 *   import * as events from '../../src/services/events.js';
 *
 *   beforeEach(() => {
 *     resetEvents();
 *     mockEventBus(events);
 *   });
 *
 *   it('emits decision.made', () => {
 *     events.emit(null, 'decision.made', { x: 1 });
 *     expect(captureLastEvent().type).toBe('decision.made');
 *   });
 */
export function mockEventBus(eventsModule) {
  recorded.length = 0;
  // Replace the bus with a minimal stub.
  eventsModule._bus = {
    _isMock: true,
    publishAsync: (type, payload, opts) => {
      recorded.push({ type, payload, opts });
    },
    publish: async (type, payload, opts) => {
      recorded.push({ type, payload, opts });
    },
    subscribe: async () => ({}),
    connect: async () => ({}),
    quit: async () => ({}),
  };
  return eventsModule._bus;
}

export function captureLastEvent() {
  return recorded.length ? recorded[recorded.length - 1] : null;
}

export function captureAllEvents() {
  return [...recorded];
}

export function resetEvents() {
  recorded.length = 0;
}

export function stubRequestTenant(companyId, source = 'auth') {
  return { tenant: { companyId, source } };
}

export function stubRequestWithoutTenant() {
  return {};
}

export function withServiceName(name, fn) {
  const previous = process.env.SERVICE_NAME;
  process.env.SERVICE_NAME = name;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.SERVICE_NAME;
    else process.env.SERVICE_NAME = previous;
  }
}

/**
 * Convenience helper: run `fn` with SERVICE_NAME temporarily set to `name`.
 * Returns the value of `fn()`.
 */
export async function withServiceNameAsync(name, fn) {
  const previous = process.env.SERVICE_NAME;
  process.env.SERVICE_NAME = name;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.SERVICE_NAME;
    else process.env.SERVICE_NAME = previous;
  }
}