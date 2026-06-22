import axios from 'axios';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4025';

interface Event {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  source: string;
}

/**
 * Publish event to the main event bus
 */
export async function publishEvent(type: string, payload: Record<string, unknown>): Promise<void> {
  const event: Event = {
    type,
    payload,
    timestamp: new Date().toISOString(),
    source: 'boa-os'
  };

  try {
    await axios.post(`${EVENT_BUS_URL}/events`, event, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`Failed to publish event ${type}:`, error);
  }
}
