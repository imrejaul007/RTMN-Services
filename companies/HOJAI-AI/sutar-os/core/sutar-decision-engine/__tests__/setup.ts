/**
 * SUTAR Decision Engine — Test Setup
 *
 * Mocks the EventBus module BEFORE any import hits the real ioredis.
 * The events.ts file imports EventBus from @rtmn/shared/event-bus, which
 * loads ioredis (ioredis v5 has a broken native module on this machine).
 * By pre-stubbing the module, we prevent the broken import from crashing
 * the test suite.
 */

// Stub EventBus — minimal shape used by events.ts and its tests
const noop = async () => {};
class StubEventBus {
  serviceName = 'stub';
  publishAsync = async () => ({ eventId: null, streamId: null });
  publish = () => {};
  subscribe = noop;
  connect = noop;
  quit = noop;
  stats = noop;
}

// Provide a working EventBus before any test file imports events.ts
require.cache[require.resolve('@rtmn/shared/event-bus', { paths: [__dirname + '/../../'] })] = {
  id: require.resolve('@rtmn/shared/event-bus', { paths: [__dirname + '/../../'] }),
  filename: '@rtmn/shared/event-bus (stubbed by setup.ts)',
  loaded: true,
  exports: { EventBus: StubEventBus, default: StubEventBus },
};
