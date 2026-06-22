// ── Events Module Exports ─────────────────────────────────────────────────────────

export {
  EventTriggerManager,
  getEventTriggerManager,
  initializeEventTriggers,
} from './eventTriggers';

export type {
  TriggerEvent,
  EventType,
  NotificationPayload,
  TriggerConfig,
} from './eventTriggers';

export {
  TriggerWorker,
  startTriggerWorker,
  stopTriggerWorker,
  getTriggerWorker,
} from './triggerWorker';

export type { TriggerWorkerConfig } from './triggerWorker';
