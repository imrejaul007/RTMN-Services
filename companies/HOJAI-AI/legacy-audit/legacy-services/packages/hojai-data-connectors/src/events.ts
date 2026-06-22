/**
 * Z Events → Hojai AI Events Connector
 * Privacy Tier 1
 */
import axios from 'axios';

export interface EventSignal {
  userId: string;
  action: 'view' | 'rsvp' | 'attend' | 'share';
  event: {
    id: string;
    name: string;
    category: string;
    location: string;
  };
}

export async function emitEventSignals(data: EventSignal): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/events`, {
    userId: data.userId,
    action: data.action,
    eventId: data.event.id,
    eventCategory: data.event.category
  });
}
