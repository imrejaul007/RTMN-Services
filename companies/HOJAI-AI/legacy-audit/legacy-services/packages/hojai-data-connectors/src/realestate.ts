/**
 * RisnaEstate → Hojai AI Real Estate Connector
 * Privacy Tier 2
 */
import axios from 'axios';

export interface RealEstateSignal {
  userId: string;
  action: 'view' | 'inquiry' | 'visit' | 'purchase';
  property: {
    type: 'apartment' | 'house' | 'plot' | 'commercial';
    budget: number;
    location: string;
  };
}

export async function emitRealEstateSignals(data: RealEstateSignal): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/realestate`, {
    userId: data.userId,
    action: data.action,
    propertyType: data.property.type,
    budget: data.property.budget,
    location: data.property.location
  });
}
