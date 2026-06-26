/**
 * SUTAR Negotiation Engine — Test Setup
 *
 * Mocks the EventBus module BEFORE any import hits the real ioredis.
 */
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

const eventBusPath = require.resolve('@rtmn/shared/event-bus', { paths: [__dirname + '/../../'] });
require.cache[eventBusPath] = {
  id: eventBusPath,
  filename: '@rtmn/shared/event-bus (stubbed)',
  loaded: true,
  exports: { EventBus: StubEventBus, default: StubEventBus },
};
