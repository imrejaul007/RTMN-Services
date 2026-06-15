import axios from 'axios';
import { logger } from './logger';
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
export class EventBus {
  private url = EVENT_BUS_URL; private enabled = process.env.EVENT_BUS_ENABLED !== 'false';
  async publish(topic: string, data: any): Promise<boolean> {
    if (!this.enabled) return false;
    try { await axios.post(`${this.url}/api/v1/publish`, { topic, data, source: 'rez-breach-detector', timestamp: new Date().toISOString() }, { timeout: 3000 }); return true; }
    catch (error: any) { logger.warn(`[EventBus] ${topic}: ${error.message}`); return false; }
  }
}
export const eventBus = new EventBus();
export default eventBus;
