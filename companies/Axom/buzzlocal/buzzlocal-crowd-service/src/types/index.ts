/**
 * BuzzLocal Crowd Service - Types
 *
 * Real-time crowd intelligence
 */

export interface CrowdReport {
  id: string;
  type: 'traffic' | 'queue' | 'parking' | 'mall' | 'restaurant' | 'atm' | 'petrol_pump' | 'custom';
  placeName: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    area: string;
    city: string;
  };
  status: 'light' | 'moderate' | 'heavy' | 'unknown';
  waitTimeMinutes?: number;
  capacity?: number;
  currentCount?: number;
  lastUpdated: string;
  reports: CrowdReportEntry[];
  expiresAt: string;
}

export interface CrowdReportEntry {
  userId: string;
  userName: string;
  status: 'light' | 'moderate' | 'heavy' | 'clear';
  waitTime?: number;
  timestamp: string;
}

export interface CrowdCheckIn {
  id: string;
  userId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  placeType: string;
  placeName: string;
  arrivalTime: string;
  departureTime?: string;
  status: 'checked_in' | 'checked_out';
}
