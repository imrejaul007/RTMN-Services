import { RedisClientType } from 'redis';

export interface Event {
  id: string;
  type: string;
  source: string;
  company: string;
  userId?: string;
  timestamp: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

type EventHandler = (event: Event) => Promise<void>;

export class EventRouter {
  private handlers: Map<string, EventHandler[]> = new Map();
  private wildcardHandlers: EventHandler[] = [];

  constructor() {
    // Default logger
    this.on('*', async (event) => {
      console.log(`[EventBus] ${event.company} -> ${event.type}:`, JSON.stringify(event.data).slice(0, 200));
    });
  }

  on(pattern: string, handler: EventHandler): () => void {
    if (pattern === '*') {
      this.wildcardHandlers.push(handler);
    } else {
      if (!this.handlers.has(pattern)) {
        this.handlers.set(pattern, []);
      }
      this.handlers.get(pattern)!.push(handler);
    }

    return () => {
      if (pattern === '*') {
        const idx = this.wildcardHandlers.indexOf(handler);
        if (idx > -1) this.wildcardHandlers.splice(idx, 1);
      } else {
        const handlers = this.handlers.get(pattern);
        if (handlers) {
          const idx = handlers.indexOf(handler);
          if (idx > -1) handlers.splice(idx, 1);
        }
      }
    };
  }

  async emit(event: Event): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    const allHandlers = [...this.wildcardHandlers, ...handlers];

    await Promise.allSettled(
      allHandlers.map(handler => handler(event).catch(err => {
        console.error(`Handler error for ${event.type}:`, err);
      }))
    );
  }

  match(pattern: string, eventType: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventType) return true;

    // Support wildcards like 'media.*'
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(eventType);
  }
}
