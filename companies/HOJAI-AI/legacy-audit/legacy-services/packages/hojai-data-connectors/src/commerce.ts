/**
 * Commerce Apps → Hojai AI Commerce Connector
 * Privacy Tier 1 (Basic)
 */
import axios from 'axios';

export interface CommerceData {
  userId: string;
  event: 'view' | 'cart' | 'purchase' | 'return';
  product?: string;
  category?: string;
  value?: number;
}

export async function emitCommerceSignals(data: CommerceData): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/commerce`, data);
}
