/**
 * Travel Types — Spec Part 29: TravelOS
 */

export interface Trip {
  id: string;
  userId: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  purpose?: 'business' | 'leisure' | 'family' | 'other';
  flights?: FlightInfo[];
  hotels?: HotelInfo[];
  packingList?: PackingItem[];
  documents?: TravelDocument[];
  status: 'planning' | 'confirmed' | 'active' | 'completed';
}

export interface FlightInfo {
  airline: string;
  flightNumber: string;
  departure: { airport: string; city: string; time: Date };
  arrival: { airport: string; city: string; time: Date };
  confirmationCode?: string;
  seat?: string;
}

export interface HotelInfo {
  name: string;
  address: string;
  checkIn: Date;
  checkOut: Date;
  confirmationCode?: string;
}

export interface PackingItem {
  category: 'clothing' | 'electronics' | 'toiletries' | 'documents' | 'medication' | 'other';
  item: string;
  quantity?: number;
  packed: boolean;
}

export interface TravelDocument {
  type: 'passport' | 'visa' | 'ticket' | 'insurance' | 'vaccination' | 'other';
  name: string;
  expiresAt?: Date;
  reminderSet: boolean;
}

export interface PackingListRequest {
  userId: string;
  tripId: string;
  destination: string;
  durationDays: number;
  purpose?: string;
  season?: 'summer' | 'winter' | 'spring' | 'fall';
}

export interface PackingListResponse {
  tripId: string;
  items: PackingItem[];
  generatedAt: Date;
}

export interface DocumentCheckResult {
  ready: boolean;
  missing: string[];
  expiring: string[];
  recommendations: string[];
}

export interface JetLagPlan {
  destination: string;
  timezoneDiff: number;       // hours
  plan: Array<{
    day: number;
    bedtime: string;
    wakeTime: string;
    activities: string[];
  }>;
}