/**
 * HOJAI Flow Trigger
 */

export type TriggerType =
  | 'webhook'
  | 'schedule'
  | 'event'
  | 'api'
  | 'email'
  | 'form'
  | 'manual';

export interface TriggerConfig {
  // Webhook
  path?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  // Schedule
  cron?: string;
  interval?: number; // milliseconds

  // Event
  source?: string;
  event?: string;
  filter?: Record<string, any>;

  // Email
  filter_patterns?: string[];

  // Form
  fields?: { name: string; type: string; required?: boolean }[];
}

export interface Trigger {
  id: string;
  type: TriggerType;
  name: string;
  config: TriggerConfig;
  enabled: boolean;
}

export function webhookTrigger(id: string, path: string, method: 'GET' | 'POST' = 'POST'): Trigger {
  return {
    id,
    type: 'webhook',
    name: `Webhook: ${path}`,
    config: { path, method },
    enabled: true,
  };
}

export function scheduleTrigger(id: string, cron: string): Trigger {
  return {
    id,
    type: 'schedule',
    name: `Schedule: ${cron}`,
    config: { cron },
    enabled: true,
  };
}

export function eventTrigger(id: string, source: string, event: string, filter?: Record<string, any>): Trigger {
  return {
    id,
    type: 'event',
    name: `Event: ${source}.${event}`,
    config: { source, event, filter },
    enabled: true,
  };
}

export function emailTrigger(id: string, patterns: string[]): Trigger {
  return {
    id,
    type: 'email',
    name: `Email: ${patterns.join(', ')}`,
    config: { filter_patterns: patterns },
    enabled: true,
  };
}

export function manualTrigger(id: string): Trigger {
  return {
    id,
    type: 'manual',
    name: 'Manual Trigger',
    config: {},
    enabled: true,
  };
}
