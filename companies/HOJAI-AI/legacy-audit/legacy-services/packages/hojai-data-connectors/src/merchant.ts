/**
 * REZ Merchant / Rabtul SaaS → Hojai AI Business Connector
 * Privacy Tier 1
 */
import axios from 'axios';

export interface BusinessSignal {
  userId: string;
  businessType: 'owner' | 'employee' | 'partner';
  business: {
    name: string;
    category: string;
    size: 'micro' | 'small' | 'medium' | 'enterprise';
    revenue?: number;
  };
  action?: 'view' | 'signup' | 'upgrade' | 'transaction';
}

export async function emitBusinessSignals(data: BusinessSignal): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/business`, {
    userId: data.userId,
    businessType: data.businessType,
    businessName: data.business.name,
    businessCategory: data.business.category,
    businessSize: data.business.size,
    action: data.action
  });
}
